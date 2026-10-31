
(function(){
"use strict";
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const INITIAL = (() => { try{ return JSON.parse(document.getElementById("initial-data").textContent); }catch(e){ return {}; } })();
const STATE = (INITIAL.state && typeof INITIAL.state === "object") ? INITIAL.state : {};
let saveTimer = null, dirty = false;
function flushState(beacon){
  if(!dirty) return;
  dirty = false; clearTimeout(saveTimer);
  const body = JSON.stringify(STATE);
  if(beacon && navigator.sendBeacon){ navigator.sendBeacon("/api/state", new Blob([body], {type:"application/json"})); return; }
  fetch("/api/state", {method:"PUT", headers:{"Content-Type":"application/json"}, body, keepalive: body.length < 60000})
    .catch(() => { dirty = true; });
}
addEventListener("pagehide", () => flushState(true));
document.addEventListener("visibilitychange", () => { if(document.visibilityState === "hidden") flushState(true); });
const store = {
  get(k, d){ return Object.prototype.hasOwnProperty.call(STATE, k) ? JSON.parse(JSON.stringify(STATE[k])) : d; },
  set(k, v){ STATE[k] = v; dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(() => flushState(false), 1500); }
};
/* Chamadas à IA pelo servidor */
async function api(path, body, signal){
  let res;
  try{ res = await fetch(path, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body), signal}); }
  catch(e){ throw {code: e && e.name === "AbortError" ? "cancelled" : "upstream_error"}; }
  const data = await res.json().catch(() => ({}));
  if(!res.ok){
    if(data.code === "no_access"){ location.href = "/assinar"; }
    if(res.status === 401){ location.href = "/login"; }
    throw {code: data.code || "upstream_error", message: data.message};
  }
  return data;
}
const norm = s => String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/`([^`]+)`/g,"<code>$1</code>");
function md(s){
  return String(s||"").split(/\n\s*\n/).map(block => {
    const lines = block.split("\n").filter(l => l.trim());
    if(lines.length && lines.every(l => /^\s*[-•*]\s+/.test(l))) return "<ul>" + lines.map(l => "<li>" + inline(l.replace(/^\s*[-•*]\s+/,"")) + "</li>").join("") + "</ul>";
    return "<p>" + lines.map(inline).join("<br>") + "</p>";
  }).join("");
}
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = n => String(n).padStart(2,"0");
const ymd = (d=new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const LOADER = `<span class="loader" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>`;
const ERRS = {
  cancelled:"Interrompido.",
  not_granted:"Para usar a IA, permita que esta página use o Claude.",
  sampling_disabled:"A IA não está disponível nesta conta.",
  rate_limited:"Muitos pedidos seguidos. Espere alguns minutos e tente de novo.",
  invalid_json:"A resposta veio incompleta. Tente de novo.",
  refused:"Não foi possível gerar com esse pedido. Ajuste o texto e tente de novo.",
  session_expired:"Sua sessão expirou. Entre no Claude novamente.",
  noai:"A IA está indisponível no momento. Tente de novo em instantes.",
  limit:"Você atingiu o limite de uso da IA por hoje. Volte amanhã!",
  no_access:"Seu período de teste terminou. Assine para continuar.",
  upstream_error:"A IA não conseguiu responder agora. Tente de novo em instantes.",
  ai_not_configured:"A IA ainda não está configurada no servidor. Avise o suporte.",
  rate_limited:"Muita gente usando a IA agora. Tente de novo em 1 minuto."
};
const errMsg = e => ERRS[e && e.code] || "Algo deu errado na conexão. Tente de novo.";
const ICON = {
  Concursos:"M3 21h18M5 21V10M19 21V10M9.7 21V10M14.3 21V10M2 10l10-6 10 6",
  ENEM:"M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3",
  Faculdade:"M2 9l10-5 10 5-10 5-10-5zM6 11v5c3 2 9 2 12 0v-5M22 9v6",
  Exames:"M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM9 3h6l-1.5 6h-3zM9.8 15l1.6 1.6 3-3",
  Idiomas:"M4 5h11v8H9l-4 3v-3H4zM15 9h5v7h-1v3l-3-3h-5v-3",
  Tecnologia:"M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
  "Negócios":"M3 20h18M6 16l4-5 3 3 6-7M15 7h4v4",
  Habilidades:"M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  Plano:"M4 5h16v15H4zM4 10h16M9 3v4M15 3v4",
  bolt:"M13 2L4 14h7l-1 8 9-12h-7z",
  flame:"M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 2-5 5-5 8 0 4 3 7 7 7z",
  medal:"M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8 3h8l-2 6h-4zM12 12.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z",
  lock:"M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3"
};
const svg = (p, cls="i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${p}"/></svg>`;
const cv = c => `--c:var(--c-${norm(c)});--cs:var(--cs-${norm(c)})`;

/* ---------- Trilhas ---------- */
const CATS = [
  ["Concursos","Concursos públicos","Federais, policiais, bancários, fiscais e tribunais"],
  ["ENEM","ENEM e vestibulares","As 4 áreas, redação e matemática do zero"],
  ["Faculdade","Faculdade","Das exatas à saúde, com as matérias que mais reprovam"],
  ["Exames","Exames e certificações","OAB, CPA-20, IELTS, AWS, residência e CNH"],
  ["Idiomas","Idiomas","Inglês, espanhol, francês, alemão e Libras"],
  ["Tecnologia","Tecnologia","Programação, dados, design, segurança e IA"],
  ["Negócios","Marketing e negócios","Anúncios, vendas, SEO, finanças e liderança"],
  ["Habilidades","Habilidades","Oratória, memória, escrita e inteligência emocional"]
];
const CI = (banca,sal,esc_,ult) => [["Banca",banca],["Salário inicial",sal],["Escolaridade",esc_],["Último edital",ult]];
const GI = (nivel,dur,quem) => [["Nível",nivel],["Duração sugerida",dur],["Para quem",quem]];
const TRILHAS = [
  /* Concursos */
  {id:"inss",cat:"Concursos",nome:"Técnico do Seguro Social",sub:"INSS",info:CI("Cebraspe","≈ R$ 5.900","Confira o edital","2022"),
   mods:[["Direito Previdenciário","Seguridade social, RGPS, benefícios e Lei 8.213/91.","alta"],["Língua Portuguesa","Interpretação, sintaxe, pontuação e reescrita.","alta"],["Direito Constitucional","Direitos fundamentais e seguridade na CF.","media"],["Direito Administrativo","Atos, poderes, agentes e Lei 8.112/90.","media"],["Raciocínio Lógico","Proposições, equivalências e problemas.","media"],["Informática","Internet, segurança e pacote Office.","base"],["Ética no Serviço Público","Decreto 1.171/94.","base"]],
   extraT:"Etapas",extra:["Prova objetiva (certo/errado)"],dicas:["Direito Previdenciário é a matéria que mais pesa: comece por ela.","Na Cebraspe uma errada anula uma certa. Treine deixar em branco na dúvida."]},
  {id:"bb",cat:"Concursos",nome:"Escriturário (Agente Comercial)",sub:"Banco do Brasil",info:CI("Cesgranrio","≈ R$ 3.600 + benefícios","Médio","2023"),
   mods:[["Vendas e Negociação","Marketing, atendimento e técnicas de vendas.","alta"],["Conhecimentos Bancários","Sistema Financeiro Nacional e produtos.","alta"],["Matemática Financeira","Juros, descontos e amortização.","alta"],["Língua Portuguesa","Interpretação e gramática.","media"],["Informática","Conceitos de TI e segurança.","media"],["Inglês","Leitura e compreensão.","base"]],
   extraT:"Etapas",extra:["Prova objetiva","Redação"],dicas:["Vendas e Negociação tem peso alto e conteúdo enxuto.","Escreva uma redação por semana nas últimas 6 semanas."]},
  {id:"caixa",cat:"Concursos",nome:"Técnico Bancário Novo",sub:"Caixa Econômica Federal",info:CI("Cesgranrio","≈ R$ 3.800 + benefícios","Médio","2024"),
   mods:[["Conhecimentos Bancários","SFN, produtos e garantias.","alta"],["Matemática Financeira","Juros, rendas e amortização.","alta"],["Atendimento e Vendas","Marketing de serviços e relacionamento.","alta"],["Língua Portuguesa","Interpretação e gramática.","media"],["Informática","Segurança e ferramentas.","media"],["Legislação Específica","PLD-FT e Código de Ética.","base"]],
   extraT:"Etapas",extra:["Prova objetiva","Redação"],dicas:["As provas da Caixa e do BB são parecidas: estude as duas juntas."]},
  {id:"pf",cat:"Concursos",nome:"Agente de Polícia Federal",sub:"Polícia Federal",info:CI("Cebraspe","≈ R$ 14.100","Superior","2025"),
   mods:[["Direito Penal e Processual Penal","Crimes, inquérito, prisões e provas.","alta"],["Língua Portuguesa","Interpretação e reescrita.","alta"],["Informática","Redes, segurança, Linux, banco de dados e Python.","alta"],["Direito Constitucional","Direitos e garantias, segurança pública.","media"],["Direito Administrativo","Atos, poderes e improbidade.","media"],["Estatística e Raciocínio Lógico","Probabilidade e estatística descritiva.","media"],["Legislação Especial","Drogas, armas e abuso de autoridade.","media"]],
   extraT:"Etapas",extra:["Objetiva e discursiva","Teste físico","Exames médico e psicológico","Investigação social","Curso de formação"],dicas:["Comece o treino físico junto com os estudos.","Informática na PF é técnica: reserve tempo fixo."]},
  {id:"prf",cat:"Concursos",nome:"Policial Rodoviário Federal",sub:"PRF",info:CI("Cebraspe","≈ R$ 10.300 (edital 2021)","Superior + CNH B","2021"),
   mods:[["Legislação de Trânsito","CTB e resoluções do Contran.","alta"],["Língua Portuguesa","Interpretação e semântica.","alta"],["Direito Penal","Parte geral e crimes.","media"],["Física","Cinemática e dinâmica aplicadas ao trânsito.","media"],["Direitos Humanos","Tratados e legislação.","media"],["Raciocínio Lógico e Matemática","Lógica e porcentagem.","media"]],
   extraT:"Etapas",extra:["Objetiva e discursiva","Teste físico","Exames","Investigação social","Curso de formação"],dicas:["Leia o CTB inteiro, artigo por artigo."]},
  {id:"receita",cat:"Concursos",nome:"Auditor-Fiscal",sub:"Receita Federal",info:CI("FGV","≈ R$ 21.000","Superior","2022"),
   mods:[["Direito Tributário","CTN, obrigação e crédito tributário.","alta"],["Contabilidade Geral","Lançamentos, demonstrações e CPCs.","alta"],["Legislação Tributária Federal","IR, IPI, PIS/Cofins.","alta"],["Comércio Internacional","Regulamento Aduaneiro.","media"],["Auditoria","Normas e procedimentos.","media"],["Língua Portuguesa","Interpretação no estilo FGV.","media"]],
   extraT:"Etapas",extra:["Provas objetivas","Discursiva"],dicas:["Planeje de 12 a 24 meses.","Contabilidade se aprende fazendo exercícios."]},
  {id:"trt",cat:"Concursos",nome:"Técnico e Analista Judiciário",sub:"Tribunais (TRT, TRF, TRE, TJ)",info:CI("FCC, FGV ou Cebraspe","≈ R$ 8.500 a R$ 14.000","Superior","Varia por tribunal"),
   mods:[["Direito Processual do ramo","Civil, Trabalho ou Eleitoral.","alta"],["Direito Material do ramo","Trabalho, Civil, Eleitoral ou Penal.","alta"],["Língua Portuguesa","Gramática e interpretação.","alta"],["Direito Constitucional","Poder Judiciário.","media"],["Direito Administrativo","Lei 8.112/90 e licitações.","media"],["Regimento Interno","Do tribunal do edital.","media"]],
   extraT:"Etapas",extra:["Prova objetiva","Discursiva (alguns cargos)"],dicas:["Escolha um ramo e foque nele.","Regimento interno é ponto fácil que muita gente ignora."]},
  {id:"correios",cat:"Concursos",nome:"Agente de Correios",sub:"Correios",info:CI("IBFC","≈ R$ 2.400 + benefícios","Médio","2024"),
   mods:[["Língua Portuguesa","Interpretação e gramática.","alta"],["Matemática","Porcentagem, razão e proporção.","alta"],["Conhecimentos Gerais","Atualidades e cidadania.","media"],["Informática","Windows, Office e internet.","media"],["Conhecimentos Específicos","Atividade postal.","media"]],
   extraT:"Etapas",extra:["Prova objetiva","Avaliação médica"],dicas:["Matemática básica decide a classificação."]},
  {id:"cnu",cat:"Concursos",nome:"Concurso Nacional Unificado",sub:"CNU (federal)",info:CI("Cesgranrio","≈ R$ 4.000 a R$ 22.000","Médio e Superior","2025"),
   mods:[["Língua Portuguesa","Interpretação e redação oficial.","alta"],["Políticas Públicas","Ciclo de políticas e avaliação.","alta"],["Ética e Integridade","Conduta, transparência e LAI.","media"],["Diversidade e Inclusão","Direitos humanos e equidade.","media"],["Administração Pública Federal","Organização e orçamento.","media"]],
   extraT:"Etapas",extra:["Objetiva geral","Objetiva específica","Discursiva (superior)"],dicas:["Escolha o bloco temático pela sua formação."]},
  {id:"pm",cat:"Concursos",nome:"Soldado PM",sub:"Polícia Militar (estaduais)",info:CI("Vunesp, Ibade e outras","≈ R$ 4.000 a R$ 6.500","Médio ou Superior (varia)","Varia por estado"),
   mods:[["Língua Portuguesa","Interpretação e gramática.","alta"],["Matemática","Porcentagem, equações e geometria.","alta"],["Noções de Direito","Constitucional, Penal e Direitos Humanos.","media"],["Conhecimentos Gerais","Atualidades, história e geografia.","media"],["Informática","Noções básicas.","base"]],
   extraT:"Etapas",extra:["Prova objetiva","Teste físico","Exames médico e psicológico","Investigação social"],dicas:["O teste físico elimina muito: treine desde o primeiro dia."]},
  {id:"pc",cat:"Concursos",nome:"Escrivão e Investigador",sub:"Polícia Civil (estaduais)",info:CI("Vunesp, FGV, Cebraspe","≈ R$ 4.000 a R$ 12.000","Superior","Varia por estado"),
   mods:[["Direito Penal","Parte geral e crimes em espécie.","alta"],["Direito Processual Penal","Inquérito, provas e prisões.","alta"],["Língua Portuguesa","Interpretação.","alta"],["Direito Constitucional","Direitos fundamentais.","media"],["Legislação Especial","Drogas, ECA, Maria da Penha.","media"],["Informática","Noções e segurança.","base"]],
   extraT:"Etapas",extra:["Prova objetiva","Teste físico","Exames","Investigação social","Academia de polícia"],dicas:["Penal e Processo Penal são o coração da prova."]},
  {id:"prof",cat:"Concursos",nome:"Professor da Rede Pública",sub:"Prefeituras e estados",info:CI("Varia","Piso nacional ≈ R$ 4.800 (40h)","Licenciatura","Contínuo"),
   mods:[["Legislação Educacional","LDB, ECA, BNCC e PNE.","alta"],["Didática e Teorias da Aprendizagem","Piaget, Vygotsky, Freire.","alta"],["Conhecimentos Específicos","Da disciplina do cargo.","alta"],["Língua Portuguesa","Interpretação.","media"],["Educação Inclusiva","AEE e legislação.","media"]],
   extraT:"Etapas",extra:["Prova objetiva","Discursiva (alguns)","Títulos"],dicas:["A LDB cai em quase todos os concursos de professor."]},
  {id:"petro",cat:"Concursos",nome:"Técnico (nível médio)",sub:"Petrobras",info:CI("Cesgranrio","≈ R$ 5.900","Médio técnico","2024"),
   mods:[["Língua Portuguesa","Interpretação.","alta"],["Matemática","Funções, geometria e estatística.","alta"],["Conhecimentos Específicos","Da ênfase técnica escolhida.","alta"],["Inglês","Leitura técnica.","base"]],
   extraT:"Etapas",extra:["Prova objetiva","Comprovação de requisitos"],dicas:["Conhecimentos específicos têm o maior peso."]},
  /* ENEM */
  {id:"enem",cat:"ENEM",nome:"ENEM completo",sub:"Exame Nacional do Ensino Médio",info:[["Prova","180 questões + redação"],["Dias","2 domingos"],["Nota","TRI (teoria de resposta ao item)"],["Usado em","Sisu, Prouni e Fies"]],
   mods:[["Matemática","Porcentagem, funções, geometria, estatística e probabilidade."],["Linguagens","Interpretação, gêneros textuais, literatura e inglês/espanhol."],["Ciências Humanas","História do Brasil, geografia, filosofia e sociologia."],["Ciências da Natureza","Física, química e biologia contextualizadas."],["Redação","Dissertativo-argumentativa com proposta de intervenção."],["TRI e estratégia de prova","Como a nota é calculada e como usar o tempo."]],
   extraT:"Como funciona",extra:["1º dia: Linguagens, Humanas e Redação","2º dia: Matemática e Natureza"],dicas:["Na TRI, acertar as fáceis vale mais que chutar as difíceis.","Faça provas antigas do Inep cronometradas."]},
  {id:"redacao",cat:"ENEM",nome:"Redação nota 1000",sub:"ENEM e vestibulares",info:GI("Todos","8 semanas","Quem vai fazer ENEM ou vestibular"),
   mods:[["As 5 competências","O que a banca avalia em cada uma."],["Estrutura dissertativa","Introdução, desenvolvimento e conclusão."],["Repertório sociocultural","Como usar dados, leis e autores."],["Coesão e conectivos","Ligar ideias sem repetir."],["Proposta de intervenção","Agente, ação, meio, finalidade e detalhamento."]],
   extraT:"Resultado esperado",extra:["Escrever uma redação completa em 60 minutos"],dicas:["Escreva uma redação por semana e peça correção."]},
  {id:"fuvest",cat:"ENEM",nome:"Fuvest, Unicamp e vestibulares",sub:"Vestibulares tradicionais",info:GI("Intermediário","6 a 12 meses","Quem mira USP, Unicamp e federais com prova própria"),
   mods:[["Obras literárias obrigatórias","Leitura e análise das obras da lista."],["Matemática aprofundada","Questões discursivas."],["Física e Química","Resolução passo a passo."],["História e Geografia","Questões analíticas."],["Segunda fase discursiva","Como escrever respostas completas."]],
   extraT:"Como funciona",extra:["1ª fase objetiva","2ª fase discursiva"],dicas:["Leia as obras obrigatórias cedo."]},
  /* Faculdade */
  {id:"calculo",cat:"Faculdade",nome:"Cálculo I",sub:"Engenharias, exatas e economia",info:GI("Iniciante","1 semestre","Calouros de exatas"),
   mods:[["Funções e gráficos","Domínio, imagem e funções elementares."],["Limites","Definição intuitiva, propriedades e limites notáveis."],["Derivadas","Regras de derivação e regra da cadeia."],["Aplicações de derivadas","Máximos, mínimos e taxas relacionadas."],["Integrais","Antiderivada, integral definida e substituição."]],
   extraT:"Resultado esperado",extra:["Resolver listas de exercícios e provas de Cálculo I"],dicas:["Faça muitos exercícios: Cálculo se aprende com lápis na mão."]},
  {id:"estat",cat:"Faculdade",nome:"Estatística",sub:"Saúde, humanas, exatas e negócios",info:GI("Iniciante","1 semestre","Universitários de qualquer curso"),
   mods:[["Estatística descritiva","Média, mediana, moda e desvio padrão."],["Probabilidade","Eventos, regra da soma e do produto."],["Distribuição normal","Curva normal e escore Z."],["Amostragem e intervalos de confiança","Como estimar a partir de amostras."],["Testes de hipótese","p-valor e significância."]],
   extraT:"Resultado esperado",extra:["Interpretar pesquisas e analisar dados simples"],dicas:["Use exemplos do seu curso para fixar."]},
  {id:"anatomia",cat:"Faculdade",nome:"Anatomia Humana",sub:"Medicina, enfermagem, fisioterapia",info:GI("Iniciante","1 semestre","Estudantes da saúde"),
   mods:[["Introdução e planos anatômicos","Posição anatômica e terminologia."],["Sistema esquelético","Ossos e articulações."],["Sistema muscular","Músculos principais e ações."],["Sistema cardiovascular","Coração e grandes vasos."],["Sistema nervoso","Encéfalo, medula e nervos."]],
   extraT:"Resultado esperado",extra:["Identificar estruturas em provas práticas"],dicas:["Desenhe as estruturas: memória visual ajuda muito."]},
  {id:"dircivil",cat:"Faculdade",nome:"Direito Civil: Parte Geral",sub:"Direito",info:GI("Iniciante","1 semestre","Estudantes de Direito"),
   mods:[["Pessoa natural e jurídica","Personalidade e capacidade."],["Bens","Classificação dos bens."],["Negócio jurídico","Elementos, defeitos e invalidade."],["Prescrição e decadência","Prazos e diferenças."],["Atos ilícitos","Responsabilidade e abuso de direito."]],
   extraT:"Resultado esperado",extra:["Aplicar o Código Civil a casos práticos"],dicas:["Leia o artigo da lei antes da doutrina."]},
  {id:"contab",cat:"Faculdade",nome:"Contabilidade Básica",sub:"Ciências contábeis, administração",info:GI("Iniciante","1 semestre","Universitários e quem vai fazer o CFC"),
   mods:[["Patrimônio","Ativo, passivo e patrimônio líquido."],["Débito e crédito","Partidas dobradas."],["Lançamentos contábeis","Razonete e balancete."],["Balanço Patrimonial","Estrutura e classificação."],["DRE","Receitas, custos e despesas."]],
   extraT:"Resultado esperado",extra:["Montar balanço e DRE simples"],dicas:["Faça os lançamentos à mão no começo."]},
  {id:"tcc",cat:"Faculdade",nome:"TCC e Metodologia Científica",sub:"Qualquer curso",info:GI("Todos","1 a 2 semestres","Quem vai escrever o TCC"),
   mods:[["Escolha do tema e problema de pesquisa","Como delimitar."],["Revisão de literatura","Buscar e organizar referências."],["Metodologia","Tipos de pesquisa e coleta de dados."],["Normas ABNT","Citações e referências."],["Escrita e defesa","Estrutura do texto e apresentação."]],
   extraT:"Resultado esperado",extra:["TCC escrito e apresentação pronta"],dicas:["Escreva um pouco todo dia em vez de deixar para o fim."]},
  {id:"fisica",cat:"Faculdade",nome:"Física I: Mecânica",sub:"Engenharias e exatas",info:GI("Iniciante","1 semestre","Calouros de exatas"),
   mods:[["Cinemática","Movimento em 1 e 2 dimensões."],["Leis de Newton","Força, massa e aceleração."],["Trabalho e energia","Conservação de energia."],["Momento linear","Colisões e impulso."],["Rotação","Torque e momento de inércia."]],
   extraT:"Resultado esperado",extra:["Resolver problemas de mecânica clássica"],dicas:["Desenhe o diagrama de forças sempre."]},
  /* Exames */
  {id:"oab",cat:"Exames",nome:"Exame da OAB (1ª fase)",sub:"Ordem dos Advogados do Brasil",info:[["Banca","FGV"],["Prova","80 questões objetivas"],["Aprovação","40 acertos (50%)"],["Frequência","3 edições por ano"]],
   mods:[["Ética Profissional","Estatuto da OAB e Código de Ética.","alta"],["Direito Constitucional","Direitos fundamentais e controle.","alta"],["Direito Civil","Parte geral, contratos e família.","alta"],["Processo Civil","CPC/2015.","alta"],["Direito Penal e Processo Penal","Parte geral e procedimentos.","media"],["Direito do Trabalho","CLT e processo do trabalho.","media"],["Direito Administrativo e Tributário","Atos e tributos.","media"]],
   extraT:"Etapas",extra:["1ª fase objetiva","2ª fase prático-profissional"],dicas:["Ética vale 8 questões e é a mais fácil de garantir."]},
  {id:"cpa",cat:"Exames",nome:"CPA-20",sub:"Certificação ANBIMA",info:[["Banca","ANBIMA"],["Prova","60 questões"],["Aprovação","70%"],["Para quem","Profissionais de investimentos"]],
   mods:[["Sistema Financeiro Nacional","Órgãos e participantes."],["Ética e regulamentação","PLD e normas."],["Noções de economia","Juros, inflação e indicadores."],["Princípios de investimento","Risco, retorno e diversificação."],["Fundos de investimento","Tipos e tributação."],["Previdência complementar","PGBL e VGBL."]],
   extraT:"Como funciona",extra:["Prova online ou presencial agendada"],dicas:["Faça simulados até passar de 80% com folga."]},
  {id:"cfc",cat:"Exames",nome:"Exame de Suficiência CFC",sub:"Conselho Federal de Contabilidade",info:[["Banca","Consulplan"],["Prova","50 questões"],["Aprovação","50%"],["Para quem","Bacharéis em Contábeis"]],
   mods:[["Contabilidade Geral","Lançamentos e demonstrações.","alta"],["Contabilidade de Custos","Custeio e análise.","alta"],["Contabilidade Pública","NBC TSP.","media"],["Legislação e Ética","Código de Ética do Contador.","media"],["Matemática Financeira e Estatística","Juros e medidas.","base"]],
   extraT:"Etapas",extra:["Prova objetiva"],dicas:["Contabilidade Geral é metade da prova."]},
  {id:"cnh",cat:"Exames",nome:"Prova teórica da CNH",sub:"Detran",info:[["Prova","30 questões"],["Aprovação","21 acertos (70%)"],["Duração","Até 1 hora"],["Para quem","Quem vai tirar a carteira"]],
   mods:[["Legislação de trânsito","Infrações, penalidades e pontos."],["Sinalização","Placas, marcas e gestos."],["Direção defensiva","Condições adversas e prevenção."],["Primeiros socorros","Como agir em acidentes."],["Meio ambiente e mecânica básica","Poluição e manutenção."]],
   extraT:"Como funciona",extra:["Prova teórica no Detran","Depois, exame prático"],dicas:["Placas são as questões mais fáceis: decore todas."]},
  /* Idiomas */
  {id:"ingles",cat:"Idiomas",nome:"Inglês do zero ao intermediário",sub:"Inglês geral",info:GI("Iniciante","6 a 12 meses","Quem nunca estudou ou parou no básico"),
   mods:[["Verb to be e pronomes","Frases básicas de apresentação."],["Simple present","Rotina e hábitos."],["Simple past","Contar o que aconteceu."],["Future e planos","Will e going to."],["Present perfect","Experiências de vida."],["Vocabulário do dia a dia","500 palavras mais usadas."]],
   extraT:"Resultado esperado",extra:["Manter conversas simples e entender séries com legenda em inglês"],dicas:["15 minutos por dia valem mais que 2 horas no sábado."]},
  {id:"inglestrab",cat:"Idiomas",nome:"Inglês para o trabalho",sub:"Entrevistas, reuniões e e-mails",info:GI("Intermediário","3 meses","Quem precisa usar inglês na carreira"),
   mods:[["Entrevista de emprego","Tell me about yourself e respostas comuns."],["E-mails profissionais","Estrutura e expressões."],["Reuniões e calls","Como opinar e pedir esclarecimento."],["Apresentações","Estruturar e conduzir."],["Small talk","Conversas informais no trabalho."]],
   extraT:"Resultado esperado",extra:["Fazer uma entrevista e conduzir reuniões em inglês"],dicas:["Grave sua voz respondendo perguntas de entrevista."]},
  {id:"espanhol",cat:"Idiomas",nome:"Espanhol básico",sub:"Espanhol geral",info:GI("Iniciante","4 a 6 meses","Viagem, trabalho ou ENEM"),
   mods:[["Falsos cognatos","Palavras que enganam brasileiros."],["Presente do indicativo","Verbos regulares e irregulares."],["Pretérito","Indefinido e perfecto."],["Pronúncia e acentuação","Sons que diferem do português."],["Conversação básica","Viagem, restaurante e compras."]],
   extraT:"Resultado esperado",extra:["Se comunicar em situações do dia a dia"],dicas:["Cuidado com o portunhol: estude os falsos cognatos cedo."]},
  /* Tecnologia */
  {id:"logica",cat:"Tecnologia",nome:"Lógica de programação",sub:"Primeiro passo em tecnologia",info:GI("Iniciante","4 semanas","Quem nunca programou"),
   mods:[["Algoritmos","Pensar em passos."],["Variáveis e tipos","Guardar e usar dados."],["Condicionais","If, else e decisões."],["Laços de repetição","For e while."],["Funções","Organizar e reaproveitar código."]],
   extraT:"Resultado esperado",extra:["Resolver problemas simples com código"],dicas:["Escreva o algoritmo em português antes de programar."]},
  {id:"python",cat:"Tecnologia",nome:"Python",sub:"Programação",info:GI("Iniciante","8 a 12 semanas","Quem quer programar, automatizar ou trabalhar com dados"),
   mods:[["Sintaxe e variáveis","Primeiro programa e tipos."],["Listas e dicionários","Estruturas de dados."],["Condicionais e laços","Controle de fluxo."],["Funções e módulos","Organização do código."],["Arquivos e bibliotecas","Ler CSV e usar pip."],["Projeto: automação","Automatizar uma tarefa real."]],
   extraT:"Resultado esperado",extra:["Criar scripts e pequenos projetos"],dicas:["Programe todo dia, nem que sejam 20 minutos."]},
  {id:"web",cat:"Tecnologia",nome:"Desenvolvimento web",sub:"HTML, CSS e JavaScript",info:GI("Iniciante","3 a 6 meses","Quem quer criar sites ou mudar de carreira"),
   mods:[["HTML","Estrutura de páginas."],["CSS","Estilo, flexbox e grid."],["JavaScript básico","Variáveis, funções e eventos."],["DOM","Manipular a página."],["Projeto: landing page","Publicar um site real."]],
   extraT:"Resultado esperado",extra:["Criar e publicar sites responsivos"],dicas:["Construa projetos desde a primeira semana."]},
  {id:"excel",cat:"Tecnologia",nome:"Excel e planilhas",sub:"Excel e Google Sheets",info:GI("Iniciante","4 semanas","Qualquer profissional"),
   mods:[["Fórmulas básicas","SOMA, MÉDIA, SE."],["PROCV e PROCX","Buscar informações."],["Tabela dinâmica","Resumir dados."],["Gráficos","Visualizar resultados."],["Formatação condicional","Destacar o que importa."]],
   extraT:"Resultado esperado",extra:["Montar relatórios e controles do trabalho"],dicas:["Use suas próprias planilhas do trabalho para praticar."]},
  {id:"dados",cat:"Tecnologia",nome:"Análise de dados",sub:"SQL e Power BI",info:GI("Iniciante","3 meses","Quem quer trabalhar com dados"),
   mods:[["Pensamento analítico","Perguntas certas para os dados."],["SQL: SELECT e filtros","Consultar tabelas."],["SQL: JOIN e agregações","Cruzar e resumir."],["Power BI","Dashboards e medidas DAX."],["Storytelling com dados","Apresentar conclusões."]],
   extraT:"Resultado esperado",extra:["Construir dashboards e responder perguntas de negócio"],dicas:["Monte um portfólio com dados públicos."]},
  {id:"ia",cat:"Tecnologia",nome:"IA no dia a dia",sub:"Ferramentas e prompts",info:GI("Iniciante","2 semanas","Qualquer pessoa"),
   mods:[["Como funcionam os modelos de IA","O que conseguem e o que não."],["Escrevendo bons prompts","Contexto, tarefa e formato."],["IA para estudar","Resumos, flashcards e explicações."],["IA no trabalho","E-mails, planilhas e análises."],["Limites e ética","Erros, privacidade e checagem."]],
   extraT:"Resultado esperado",extra:["Usar IA para ganhar tempo com segurança"],dicas:["Sempre confira fatos importantes em fontes oficiais."]},
  /* Negócios */
  {id:"mkt",cat:"Negócios",nome:"Marketing digital",sub:"Fundamentos completos",info:GI("Iniciante","8 semanas","Empreendedores e quem quer trabalhar com marketing"),
   mods:[["Funil de vendas","Topo, meio e fundo."],["Persona e posicionamento","Para quem você vende."],["Métricas e KPIs","CTR, CPC, CPA, ROI e ROAS."],["Conteúdo e redes sociais","Planejamento e calendário."],["E-mail marketing","Listas e automações."],["Google Analytics 4","Eventos e relatórios."]],
   extraT:"Resultado esperado",extra:["Planejar e medir uma estratégia digital"],dicas:["Escolha um negócio real para aplicar cada aula."]},
  {id:"gads",cat:"Negócios",nome:"Google Ads",sub:"Tráfego pago no Google",info:GI("Iniciante","4 semanas","Gestores de tráfego e donos de negócio"),
   mods:[["Estrutura de campanhas","Conta, campanha, grupo, anúncio e palavra-chave."],["Pesquisa de palavras-chave","Planejador e intenção de busca."],["Anúncios responsivos","Títulos, descrições e recursos."],["Lances e orçamento","Estratégias de lance."],["Conversões e otimização","Medir e melhorar resultados."]],
   extraT:"Resultado esperado",extra:["Criar e otimizar campanhas de Pesquisa"],dicas:["Comece com orçamento pequeno e uma campanha só."]},
  {id:"meta",cat:"Negócios",nome:"Meta Ads",sub:"Anúncios no Instagram e Facebook",info:GI("Iniciante","4 semanas","Quem vende pelas redes sociais"),
   mods:[["Gerenciador de anúncios","Estrutura e objetivos."],["Públicos","Interesses, personalizados e semelhantes."],["Criativos","Imagem, vídeo e copy."],["Pixel e conversões","Rastreamento."],["Testes e escala","Teste A/B e aumento de verba."]],
   extraT:"Resultado esperado",extra:["Rodar campanhas lucrativas nas redes"],dicas:["O criativo é o que mais influencia o resultado."]},
  {id:"copy",cat:"Negócios",nome:"Copywriting",sub:"Escrita persuasiva",info:GI("Iniciante","4 semanas","Marketing, vendas e criadores"),
   mods:[["Fundamentos da copy","Benefício x característica."],["Headlines","Títulos que fazem parar."],["Gatilhos mentais","Escassez, prova social e autoridade."],["Estruturas AIDA e PAS","Roteiros de texto."],["Páginas de venda","Do título à chamada final."]],
   extraT:"Resultado esperado",extra:["Escrever anúncios e páginas que convertem"],dicas:["Copie à mão boas cartas de venda para treinar o ritmo."]},
  {id:"financas",cat:"Negócios",nome:"Finanças pessoais e investimentos",sub:"Dinheiro no dia a dia",info:GI("Iniciante","4 semanas","Qualquer pessoa"),
   mods:[["Orçamento pessoal","Regra 50-30-20."],["Dívidas e juros","Como sair do vermelho."],["Reserva de emergência","Onde e quanto guardar."],["Renda fixa","Tesouro Direto, CDB e LCI."],["Renda variável","Ações, FIIs e ETFs."]],
   extraT:"Resultado esperado",extra:["Organizar as contas e começar a investir"],dicas:["Anote todos os gastos por um mês antes de cortar."]},
  {id:"empreend",cat:"Negócios",nome:"Empreendedorismo",sub:"Do zero ao primeiro cliente",info:GI("Iniciante","6 semanas","Quem quer abrir um negócio"),
   mods:[["Validação de ideia","Testar antes de investir."],["Modelo de negócio","Canvas."],["Precificação","Custos, margem e preço."],["MEI e formalização","Abrir CNPJ e impostos."],["Primeiras vendas","Canais e abordagem."]],
   extraT:"Resultado esperado",extra:["Lançar e vender a primeira oferta"],dicas:["Venda antes de construir."]},
  /* Habilidades */
  {id:"aprender",cat:"Habilidades",nome:"Como estudar melhor",sub:"Aprender a aprender",info:GI("Todos","2 semanas","Qualquer estudante"),
   mods:[["Como a memória funciona","Curva do esquecimento."],["Recuperação ativa","Testar-se em vez de reler."],["Revisão espaçada","Quando revisar."],["Mapas mentais e resumos","Organizar o conteúdo."],["Foco e procrastinação","Pomodoro e ambiente."]],
   extraT:"Resultado esperado",extra:["Estudar menos horas e lembrar mais"],dicas:["Reler não é estudar: faça perguntas a si mesmo."]},
  {id:"oratoria",cat:"Habilidades",nome:"Oratória",sub:"Falar em público",info:GI("Todos","4 semanas","Quem trava ao apresentar"),
   mods:[["Controlando o nervosismo","Respiração e preparação."],["Estrutura da fala","Abertura, corpo e fechamento."],["Voz e ritmo","Pausas e entonação."],["Linguagem corporal","Postura e gestos."],["Apresentações com slides","Menos texto, mais história."]],
   extraT:"Resultado esperado",extra:["Apresentar com segurança em aulas e reuniões"],dicas:["Grave-se em vídeo e assista."]},
  {id:"produtiv",cat:"Habilidades",nome:"Produtividade e gestão do tempo",sub:"Rotina e organização",info:GI("Todos","2 semanas","Quem estuda e trabalha"),
   mods:[["Prioridades","Matriz de Eisenhower."],["Planejamento semanal","Revisão de domingo."],["Blocos de tempo","Time blocking."],["Hábitos","Como criar e manter."],["Descanso","Sono e pausas."]],
   extraT:"Resultado esperado",extra:["Uma rotina que cabe estudo, trabalho e descanso"],dicas:["Planeje a semana no domingo em 20 minutos."]},
  /* Novas: Concursos */
  {id:"bacen",cat:"Concursos",nome:"Analista do Banco Central",sub:"Bacen",info:CI("Cebraspe","≈ R$ 20.900","Superior","2024"),
   mods:[["Economia e Finanças","Macroeconomia, política monetária e câmbio.","alta"],["Sistema Financeiro Nacional","Estrutura, regulação e Basileia.","alta"],["Língua Portuguesa","Interpretação e reescrita.","alta"],["Matemática e Estatística","Juros, probabilidade e inferência.","media"],["Direito Administrativo e Constitucional","Atos, poderes e ordem econômica.","media"],["Tecnologia da Informação","Dados, segurança e governança (área TI).","base"]],
   extraT:"Etapas",extra:["Objetiva","Discursiva","Curso de formação (quando previsto)"],dicas:["Economia é o diferencial: estude política monetária a fundo."]},
  {id:"sefaz",cat:"Concursos",nome:"Auditor Fiscal Estadual",sub:"SEFAZ (ICMS)",info:CI("FGV, FCC ou Cebraspe","≈ R$ 10.000 a R$ 30.000","Superior","Varia por estado"),
   mods:[["Legislação do ICMS","Lei Kandir e regulamento estadual.","alta"],["Direito Tributário","CTN e sistema tributário nacional.","alta"],["Contabilidade Geral e Avançada","Demonstrações e CPCs.","alta"],["Auditoria","Normas e procedimentos.","media"],["Língua Portuguesa","Interpretação.","media"],["Raciocínio Lógico e Estatística","Lógica e medidas.","base"]],
   extraT:"Etapas",extra:["Provas objetivas","Discursiva (alguns estados)"],dicas:["A legislação estadual muda tudo: estude o regulamento do seu estado."]},
  {id:"penal",cat:"Concursos",nome:"Policial Penal",sub:"Polícia Penal (federal e estaduais)",info:CI("Varia","≈ R$ 3.500 a R$ 8.000","Médio ou Superior","Varia por estado"),
   mods:[["Lei de Execução Penal","LEP completa.","alta"],["Direito Penal","Parte geral e crimes.","alta"],["Língua Portuguesa","Interpretação.","alta"],["Direitos Humanos","Regras de Mandela e tratados.","media"],["Direito Constitucional","Direitos fundamentais.","media"]],
   extraT:"Etapas",extra:["Objetiva","Teste físico","Exames","Investigação social","Curso de formação"],dicas:["A LEP é a matéria mais cobrada: leia artigo por artigo."]},
  {id:"bombeiro",cat:"Concursos",nome:"Soldado Bombeiro Militar",sub:"Corpo de Bombeiros (estaduais)",info:CI("Varia","≈ R$ 3.500 a R$ 6.500","Médio ou Superior","Varia por estado"),
   mods:[["Língua Portuguesa","Interpretação e gramática.","alta"],["Matemática","Porcentagem e geometria.","alta"],["Física e Química","Conceitos aplicados a incêndio.","media"],["Noções de Direito","Constitucional e Administrativo.","media"],["Primeiros socorros","Noções básicas.","base"]],
   extraT:"Etapas",extra:["Objetiva","Teste físico (inclui natação em alguns estados)","Exames","Investigação social"],dicas:["Treine natação cedo se o seu estado cobrar."]},
  {id:"guarda",cat:"Concursos",nome:"Guarda Civil Municipal",sub:"Prefeituras",info:CI("Varia","≈ R$ 2.500 a R$ 6.000","Médio","Contínuo"),
   mods:[["Língua Portuguesa","Interpretação.","alta"],["Estatuto Geral das Guardas","Lei 13.022/2014.","alta"],["Noções de Direito","Constitucional, Penal e Administrativo.","media"],["Matemática","Operações e porcentagem.","media"],["Legislação Municipal","Lei orgânica do município.","base"]],
   extraT:"Etapas",extra:["Objetiva","Teste físico","Exames","Investigação social"],dicas:["Há concursos abertos o ano todo: acompanhe várias cidades."]},
  /* Novas: ENEM */
  {id:"matbasica",cat:"ENEM",nome:"Matemática básica do zero",sub:"Para ENEM e concursos",info:GI("Iniciante","6 semanas","Quem tem trauma de matemática"),
   mods:[["Operações e frações","Somar, multiplicar e simplificar."],["Porcentagem","Aumentos, descontos e juros simples."],["Razão e proporção","Regra de três."],["Equações do 1º grau","Resolver e montar problemas."],["Gráficos e tabelas","Interpretar dados."]],
   extraT:"Resultado esperado",extra:["Resolver as questões básicas que mais caem"],dicas:["Refaça as contas sem calculadora."]},
  {id:"bio",cat:"ENEM",nome:"Biologia para o ENEM",sub:"Ciências da Natureza",info:GI("Intermediário","8 semanas","Vestibulandos"),
   mods:[["Ecologia","Cadeias, ciclos e impactos ambientais."],["Citologia","Célula e organelas."],["Genética","Leis de Mendel e heredogramas."],["Fisiologia humana","Sistemas do corpo."],["Evolução","Seleção natural."]],
   extraT:"Resultado esperado",extra:["Dominar os temas mais cobrados de Biologia"],dicas:["Ecologia é o tema que mais aparece no ENEM."]},
  {id:"histbr",cat:"ENEM",nome:"História do Brasil",sub:"Ciências Humanas",info:GI("Intermediário","8 semanas","Vestibulandos e concurseiros"),
   mods:[["Brasil Colônia","Economia açucareira e mineração."],["Império","Independência e Segundo Reinado."],["República Velha","Café com leite e revoltas."],["Era Vargas","Estado Novo e trabalhismo."],["Ditadura e redemocratização","1964 a 1988."]],
   extraT:"Resultado esperado",extra:["Relacionar fatos históricos com o presente"],dicas:["Monte uma linha do tempo e cole na parede."]},
  /* Novas: Faculdade */
  {id:"farmaco",cat:"Faculdade",nome:"Farmacologia",sub:"Medicina, enfermagem, farmácia",info:GI("Intermediário","1 semestre","Estudantes da saúde"),
   mods:[["Farmacocinética","Absorção, distribuição e excreção."],["Farmacodinâmica","Receptores e mecanismos."],["Sistema nervoso autônomo","Agonistas e antagonistas."],["Anti-inflamatórios e analgésicos","AINEs e opioides."],["Antibióticos","Classes e mecanismos."]],
   extraT:"Resultado esperado",extra:["Entender como os medicamentos agem"],dicas:["Agrupe os fármacos por classe, não decore um a um."]},
  {id:"micro",cat:"Faculdade",nome:"Microeconomia",sub:"Economia e administração",info:GI("Iniciante","1 semestre","Universitários"),
   mods:[["Oferta e demanda","Equilíbrio de mercado."],["Elasticidade","Sensibilidade a preço e renda."],["Teoria do consumidor","Utilidade e restrição orçamentária."],["Custos de produção","Curto e longo prazo."],["Estruturas de mercado","Concorrência e monopólio."]],
   extraT:"Resultado esperado",extra:["Analisar decisões de preço e mercado"],dicas:["Desenhe os gráficos sempre."]},
  {id:"quimica",cat:"Faculdade",nome:"Química Geral",sub:"Exatas, saúde e engenharias",info:GI("Iniciante","1 semestre","Calouros"),
   mods:[["Estrutura atômica","Modelos e distribuição eletrônica."],["Tabela periódica","Propriedades periódicas."],["Ligações químicas","Iônica, covalente e metálica."],["Estequiometria","Mol e cálculos."],["Soluções","Concentração e diluição."]],
   extraT:"Resultado esperado",extra:["Resolver exercícios de química básica"],dicas:["Estequiometria se aprende fazendo contas."]},
  {id:"algo",cat:"Faculdade",nome:"Algoritmos e Estruturas de Dados",sub:"Computação e sistemas",info:GI("Intermediário","1 semestre","Estudantes de TI"),
   mods:[["Complexidade","Notação Big O."],["Listas, pilhas e filas","Estruturas lineares."],["Árvores","Binárias e de busca."],["Ordenação","Bubble, merge e quick sort."],["Grafos","BFS e DFS."]],
   extraT:"Resultado esperado",extra:["Resolver problemas de entrevista técnica"],dicas:["Implemente cada estrutura do zero pelo menos uma vez."]},
  {id:"adm",cat:"Faculdade",nome:"Administração Geral",sub:"Administração e gestão",info:GI("Iniciante","1 semestre","Universitários e concurseiros"),
   mods:[["Teorias da administração","Clássica, científica e humanista."],["Planejamento","Estratégico, tático e operacional."],["Organização","Estruturas e departamentalização."],["Direção e liderança","Estilos e motivação."],["Controle","Indicadores e feedback."]],
   extraT:"Resultado esperado",extra:["Aplicar o ciclo PODC em casos reais"],dicas:["Relacione cada teoria a uma empresa que você conhece."]},
  /* Novas: Exames */
  {id:"ielts",cat:"Exames",nome:"IELTS e TOEFL",sub:"Proficiência em inglês",info:[["Prova","Listening, Reading, Writing e Speaking"],["Nota IELTS","Bandas de 0 a 9"],["Para quem","Intercâmbio, mestrado e imigração"]],
   mods:[["Listening","Estratégias para áudios."],["Reading","Leitura rápida e skimming."],["Writing Task 1 e 2","Gráficos e ensaios."],["Speaking","As 3 partes da entrevista."],["Vocabulário acadêmico","Palavras que elevam a nota."]],
   extraT:"Como funciona",extra:["4 módulos no mesmo dia (Speaking pode ser em outro)"],dicas:["Faça simulados cronometrados do Writing."]},
  {id:"aws",cat:"Exames",nome:"AWS Cloud Practitioner",sub:"Certificação de nuvem",info:[["Prova","65 questões em 90 min"],["Aprovação","700 de 1000"],["Para quem","Quem começa em cloud"]],
   mods:[["Conceitos de nuvem","IaaS, PaaS, SaaS e benefícios."],["Serviços principais","EC2, S3, RDS e Lambda."],["Segurança","Modelo de responsabilidade compartilhada e IAM."],["Preços e suporte","Modelos de cobrança."],["Arquitetura","Well-Architected Framework."]],
   extraT:"Como funciona",extra:["Prova online ou em centro de testes"],dicas:["Use o nível gratuito da AWS para praticar."]},
  {id:"residencia",cat:"Exames",nome:"Residência Médica",sub:"Provas de residência (ENARE e outras)",info:[["Prova","100 a 120 questões"],["Áreas","Clínica, cirurgia, pediatria, GO e preventiva"],["Para quem","Médicos e internos"]],
   mods:[["Clínica médica","Cardiologia, endocrinologia e infecto.","alta"],["Cirurgia geral","Trauma e abdome agudo.","alta"],["Pediatria","Neonatologia e puericultura.","alta"],["Ginecologia e Obstetrícia","Pré-natal e emergências.","alta"],["Medicina preventiva","SUS e epidemiologia.","alta"]],
   extraT:"Etapas",extra:["Prova objetiva","Análise de currículo ou prova prática (algumas)"],dicas:["Preventiva tem conteúdo enxuto e muitas questões."]},
  /* Novas: Idiomas */
  {id:"frances",cat:"Idiomas",nome:"Francês básico",sub:"Francês geral",info:GI("Iniciante","4 a 6 meses","Viagem, estudo e cultura"),
   mods:[["Pronúncia","Sons nasais e letras mudas."],["Apresentações","Se apresentar e cumprimentar."],["Presente","Verbos être, avoir e regulares."],["Passado composto","Contar o que aconteceu."],["Situações de viagem","Hotel, restaurante e transporte."]],
   extraT:"Resultado esperado",extra:["Conversar em situações básicas"],dicas:["Ouça músicas francesas com a letra na tela."]},
  {id:"libras",cat:"Idiomas",nome:"Libras",sub:"Língua Brasileira de Sinais",info:GI("Iniciante","3 a 6 meses","Professores, saúde e qualquer pessoa"),
   mods:[["Cultura e identidade surda","História e comunidade."],["Alfabeto manual e números","Datilologia."],["Parâmetros da Libras","Configuração, movimento e locação."],["Vocabulário do dia a dia","Família, tempo e lugares."],["Frases e diálogos","Estrutura gramatical."]],
   extraT:"Resultado esperado",extra:["Manter conversas simples em Libras"],dicas:["Pratique com vídeos de pessoas surdas, não só cursos."]},
  {id:"alemao",cat:"Idiomas",nome:"Alemão básico",sub:"Alemão geral",info:GI("Iniciante","6 a 12 meses","Intercâmbio e trabalho"),
   mods:[["Pronúncia e alfabeto","Sons do alemão."],["Artigos e gêneros","Der, die, das."],["Casos","Nominativo e acusativo."],["Verbos e ordem da frase","Verbo na segunda posição."],["Conversação básica","Situações do cotidiano."]],
   extraT:"Resultado esperado",extra:["Atingir o nível A1/A2"],dicas:["Aprenda cada substantivo já com o artigo."]},
  /* Novas: Tecnologia */
  {id:"react",cat:"Tecnologia",nome:"JavaScript e React",sub:"Front-end moderno",info:GI("Intermediário","3 meses","Quem já sabe HTML e CSS"),
   mods:[["JavaScript moderno","Arrow functions, desestruturação e módulos."],["Assincronismo","Promises, async e fetch."],["Componentes React","JSX e props."],["Estado e efeitos","useState e useEffect."],["Projeto completo","Um app publicado."]],
   extraT:"Resultado esperado",extra:["Criar aplicações web interativas"],dicas:["Construa um projeto pessoal em vez de só ver vídeos."]},
  {id:"ux",cat:"Tecnologia",nome:"UX/UI Design",sub:"Design de produtos digitais",info:GI("Iniciante","3 meses","Quem quer migrar para design"),
   mods:[["Fundamentos de UX","Pesquisa e empatia."],["Arquitetura da informação","Fluxos e navegação."],["Wireframes e protótipos","Do papel ao Figma."],["UI: cores e tipografia","Hierarquia visual."],["Testes de usabilidade","Validar com usuários."]],
   extraT:"Resultado esperado",extra:["Montar um portfólio com 2 estudos de caso"],dicas:["Redesenhe um app que você usa e documente o processo."]},
  {id:"ciber",cat:"Tecnologia",nome:"Cibersegurança",sub:"Segurança da informação",info:GI("Iniciante","3 meses","TI e curiosos por segurança"),
   mods:[["Pilares da segurança","Confidencialidade, integridade e disponibilidade."],["Ameaças comuns","Phishing, malware e ransomware."],["Redes e protocolos","TCP/IP e portas."],["Criptografia","Simétrica, assimétrica e hash."],["Boas práticas e LGPD","Senhas, MFA e privacidade."]],
   extraT:"Resultado esperado",extra:["Proteger contas e entender ataques comuns"],dicas:["Pratique em laboratórios legais como CTFs."]},
  /* Novas: Negócios */
  {id:"vendas",cat:"Negócios",nome:"Vendas e negociação",sub:"Comercial",info:GI("Iniciante","4 semanas","Vendedores e empreendedores"),
   mods:[["Prospecção","Encontrar clientes."],["Diagnóstico","Perguntas certas (SPIN)."],["Apresentação de valor","Benefício antes do preço."],["Objeções","Como responder."],["Fechamento e pós-venda","Fechar e fidelizar."]],
   extraT:"Resultado esperado",extra:["Conduzir uma venda do início ao fim"],dicas:["Grave suas ligações e ouça depois."]},
  {id:"social",cat:"Negócios",nome:"Social media",sub:"Gestão de redes sociais",info:GI("Iniciante","6 semanas","Quem quer trabalhar com redes"),
   mods:[["Estratégia de conteúdo","Pilares e objetivos."],["Calendário editorial","Planejar o mês."],["Reels e vídeos curtos","Ganchos e roteiros."],["Métricas de redes","Alcance, engajamento e salvamentos."],["Atendendo clientes","Proposta e precificação."]],
   extraT:"Resultado esperado",extra:["Gerenciar perfis de clientes com estratégia"],dicas:["Os 3 primeiros segundos do vídeo decidem tudo."]},
  {id:"seo",cat:"Negócios",nome:"SEO",sub:"Aparecer no Google sem pagar",info:GI("Iniciante","6 semanas","Donos de site e profissionais de marketing"),
   mods:[["Como o Google funciona","Rastreamento, indexação e ranqueamento."],["Pesquisa de palavras-chave","Intenção de busca."],["SEO on-page","Títulos, conteúdo e estrutura."],["SEO técnico","Velocidade e mobile."],["Links e autoridade","Backlinks."]],
   extraT:"Resultado esperado",extra:["Posicionar páginas no Google"],dicas:["Escreva para pessoas primeiro, para o Google depois."]},
  {id:"lider",cat:"Negócios",nome:"Liderança e gestão de equipes",sub:"Carreira",info:GI("Intermediário","6 semanas","Novos gestores"),
   mods:[["De colega a líder","A primeira transição."],["Feedback","Dar e receber."],["Delegação","O que e como delegar."],["Reuniões 1:1","Estrutura e frequência."],["Conflitos","Mediação e decisões difíceis."]],
   extraT:"Resultado esperado",extra:["Liderar um time com confiança"],dicas:["Faça 1:1 semanal com cada pessoa do time."]},
  /* Novas: Habilidades */
  {id:"portugues",cat:"Habilidades",nome:"Português sem erros",sub:"Escrita do dia a dia",info:GI("Todos","4 semanas","Quem quer escrever melhor no trabalho"),
   mods:[["Crase","Quando usar."],["Vírgula","As regras que mais aparecem."],["Concordância","Verbal e nominal."],["Por que, porque, porquê e por quê","Os quatro porquês."],["Escrita clara","Frases curtas e diretas."]],
   extraT:"Resultado esperado",extra:["E-mails e textos sem erros"],dicas:["Leia seu texto em voz alta antes de enviar."]},
  {id:"memoria",cat:"Habilidades",nome:"Memorização e leitura rápida",sub:"Técnicas de estudo",info:GI("Todos","2 semanas","Estudantes e concurseiros"),
   mods:[["Palácio da memória","Associar a lugares."],["Mnemônicos","Siglas e histórias."],["Flashcards eficientes","Como criar bons cartões."],["Leitura dinâmica","Ler mais rápido sem perder."],["Mapas mentais","Organizar o conteúdo."]],
   extraT:"Resultado esperado",extra:["Lembrar mais em menos tempo"],dicas:["Use imagens absurdas: o cérebro lembra do estranho."]},
  {id:"emocional",cat:"Habilidades",nome:"Inteligência emocional",sub:"Autoconhecimento",info:GI("Todos","4 semanas","Quem sente ansiedade com estudos e trabalho"),
   mods:[["Autoconhecimento","Reconhecer emoções."],["Ansiedade de prova","Técnicas de respiração."],["Autocontrole","Pausar antes de reagir."],["Motivação","Metas e propósito."],["Empatia e relações","Comunicação não violenta."]],
   extraT:"Resultado esperado",extra:["Lidar melhor com pressão e ansiedade"],dicas:["Escreva por 5 minutos o que está sentindo antes de estudar."]},
  {id:"video",cat:"Habilidades",nome:"Edição de vídeo",sub:"CapCut, Premiere e afins",info:GI("Iniciante","4 semanas","Criadores de conteúdo"),
   mods:[["Linguagem do vídeo","Planos e enquadramentos."],["Cortes e ritmo","Prender a atenção."],["Áudio e trilha","Som limpo e música."],["Legendas e textos","Acessibilidade e retenção."],["Exportação para redes","Formatos e qualidade."]],
   extraT:"Resultado esperado",extra:["Editar vídeos curtos com qualidade profissional"],dicas:["Corte tudo que não acrescenta: vídeo bom é vídeo enxuto."]}
];
const PRIO = {alta:"Alta", media:"Média", base:"Base"};
const keyOf = (materia, topico) => norm(materia) + "|" + norm(topico);
const catName = c => (CATS.find(x => x[0]===c) || [c, c])[1];

/* ---------- Aula de exemplo ---------- */
const AULA_EXEMPLO = {
  exemplo:true, titulo:"Estrutura de uma campanha no Google Ads", duracao_min:25,
  objetivo:"Entender como conta, campanha, grupo de anúncios, palavras-chave e anúncios se encaixam, e desenhar sua primeira estrutura de campanha.",
  secoes:[
    {titulo:"A hierarquia do Google Ads", texto:"Tudo no Google Ads segue uma hierarquia de quatro níveis: **Conta → Campanha → Grupo de anúncios → Anúncios e palavras-chave**.\n\nA **conta** guarda o faturamento e os acessos. A **campanha** define orçamento diário, objetivo (vendas, leads, tráfego), rede (Pesquisa, Display, YouTube) e localização. O **grupo de anúncios** reúne palavras-chave de um mesmo tema. Os **anúncios** são o texto que aparece para quem pesquisa.\n\nUma estrutura organizada facilita entender o que funciona e onde cortar gastos.", exemplo:"Uma escola de inglês em São Paulo pode criar a campanha \"Pesquisa – Curso de inglês SP\" com três grupos: \"inglês para iniciantes\", \"inglês para empresas\" e \"inglês online\"."},
    {titulo:"Palavras-chave e tipos de correspondência", texto:"Palavra-chave é o termo que você quer que dispare o anúncio. O tipo de correspondência define o quanto a busca precisa se parecer com ele:\n\n- **Ampla**: alcança buscas relacionadas e sinônimos. Mais volume, menos controle.\n- **Frase** (\"curso de inglês\"): a busca precisa conter o sentido da frase.\n- **Exata** ([curso de inglês]): a busca precisa ter o mesmo sentido do termo.\n\nUse **palavras-chave negativas** para bloquear buscas que não interessam, como \"grátis\" ou \"apostila pdf\".", exemplo:"Com a negativa \"grátis\", quem pesquisar \"curso de inglês grátis\" não verá o anúncio da escola, que é paga."},
    {titulo:"O leilão e o Índice de Qualidade", texto:"Cada pesquisa gera um leilão. Quem aparece primeiro não é só quem paga mais: o Google combina o **lance** com o **Índice de Qualidade**, uma nota de 1 a 10 que avalia três coisas:\n\n- a relevância do anúncio para a busca;\n- a taxa de cliques esperada (CTR);\n- a experiência na página de destino.\n\nNa prática, um anúncio muito relevante pode ficar acima de um concorrente que oferece mais e ainda pagar menos por clique."},
    {titulo:"Métricas que você vai acompanhar", texto:"- **Impressões**: quantas vezes o anúncio apareceu.\n- **CTR** = cliques ÷ impressões. Em campanhas de Pesquisa, acima de 3% costuma ser um bom sinal.\n- **CPC** = custo ÷ cliques.\n- **Conversões**: ações que geram valor (compra, formulário, WhatsApp).\n- **CPA** = custo ÷ conversões. É o número que mostra se a campanha dá lucro.", exemplo:"Gastou R$ 300, teve 10.000 impressões, 400 cliques e 12 vendas. CTR = 4%, CPC = R$ 0,75 e CPA = R$ 25. Se cada venda gera R$ 80 de lucro, a campanha se paga."}
  ],
  pontos_chave:["Conta → Campanha → Grupo de anúncios → Anúncios e palavras-chave.","Cada grupo de anúncios deve ter um tema só.","Negativas evitam gastar com buscas erradas.","Índice de Qualidade alto reduz o custo por clique.","O CPA diz se a campanha dá lucro."],
  termos:[{termo:"CTR",definicao:"Taxa de cliques: cliques divididos por impressões."},{termo:"CPC",definicao:"Custo por clique: quanto você paga, em média, por clique."},{termo:"CPA",definicao:"Custo por aquisição: custo dividido pelo número de conversões."},{termo:"Índice de Qualidade",definicao:"Nota de 1 a 10 sobre relevância, CTR esperado e página de destino."},{termo:"Palavra-chave negativa",definicao:"Termo que impede o anúncio de aparecer em certas buscas."},{termo:"Grupo de anúncios",definicao:"Conjunto de palavras-chave e anúncios de um mesmo tema."}],
  quiz:[
    {pergunta:"Qual é a ordem correta da hierarquia do Google Ads?",opcoes:["Campanha → Conta → Anúncio → Grupo","Conta → Campanha → Grupo de anúncios → Anúncios","Grupo → Campanha → Conta → Anúncios","Anúncio → Grupo → Campanha → Conta"],correta:1,explicacao:"A conta contém campanhas, que contêm grupos, que contêm anúncios e palavras-chave."},
    {pergunta:"Em qual nível você define o orçamento diário?",opcoes:["Anúncio","Palavra-chave","Campanha","Grupo de anúncios"],correta:2,explicacao:"Orçamento, objetivo, rede e localização são definidos na campanha."},
    {pergunta:"Uma campanha gastou R$ 200 e gerou 8 vendas. Qual é o CPA?",opcoes:["R$ 8","R$ 16","R$ 25","R$ 40"],correta:2,explicacao:"CPA = custo ÷ conversões = 200 ÷ 8 = R$ 25."},
    {pergunta:"Para não aparecer em buscas com a palavra \"grátis\", você deve:",opcoes:["Aumentar o lance","Adicionar \"grátis\" como palavra-chave negativa","Usar correspondência ampla","Criar outra conta"],correta:1,explicacao:"Palavras-chave negativas bloqueiam buscas que contêm aquele termo."},
    {pergunta:"O que um Índice de Qualidade alto costuma trazer?",opcoes:["Custo por clique menor","Mais impressões garantidas","Aprovação automática de anúncios","Orçamento maior"],correta:0,explicacao:"Anúncios mais relevantes ganham posições melhores pagando menos por clique."}
  ],
  exercicio:"Escolha um negócio (real ou inventado) e desenhe no papel: 1 campanha de Pesquisa, 3 grupos de anúncios, 5 palavras-chave por grupo (com o tipo de correspondência) e 5 palavras-chave negativas.",
  proximos:["Pesquisa de palavras-chave com o Planejador","Escrever anúncios responsivos de pesquisa","Configurar acompanhamento de conversões"]
};
const aulas = store.get("rde-aulas", {});
const lessonCache = {};
const EX_KEY = keyOf("Google Ads","Estrutura de campanhas");
lessonCache[EX_KEY] = AULA_EXEMPLO;
if(!aulas[EX_KEY]) aulas[EX_KEY] = {req:{materia:"Google Ads",topico:"Estrutura de campanhas",desc:"",contexto:"Trilha Google Ads",nivel:"Iniciante",origem:"trilha-gads",cat:"Negócios"}, titulo:AULA_EXEMPLO.titulo, t:0};
const saveAulas = () => {
  Object.keys(aulas).sort((a,b) => (aulas[b].t||0) - (aulas[a].t||0)).slice(60).forEach(k => delete aulas[k]);
  store.set("rde-aulas", aulas);
};
let done = store.get("rde-done", {});

/* ================= Gamificação ================= */
const GOAL = 100;
const LEVELS = [[0,"Calouro"],[100,"Estudante"],[250,"Dedicado"],[500,"Focado"],[900,"Especialista"],[1500,"Mestre"],[2400,"Sábio"],[3600,"Lenda"]];
const levelOf = xp => {
  let i = 0; while(i+1 < LEVELS.length && xp >= LEVELS[i+1][0]) i++;
  return {i, name:LEVELS[i][1], min:LEVELS[i][0], next:LEVELS[i+1] ? LEVELS[i+1][0] : null, nextName:LEVELS[i+1] ? LEVELS[i+1][1] : null};
};
const game = Object.assign({xp:0, days:{}, badges:{}, stats:{}, focusDays:{}, awarded:{}, cats:{}, goals:{}, best:0}, store.get("rde-game", {}));
game.stats = Object.assign({aulas:0, acertos:0, perguntas:0, focos:0, planos:0, perfect:0}, game.stats);
const saveGame = () => store.set("rde-game", game);
function streak(){
  let s = 0; const d = new Date();
  if(!(game.days[ymd(d)] > 0)) d.setDate(d.getDate()-1);
  while(game.days[ymd(d)] > 0){ s++; d.setDate(d.getDate()-1); }
  return s;
}
const BADGES = [
  ["primeira","Primeiro passo","Conclua sua primeira aula", g => g.stats.aulas >= 1],
  ["cinco","Maratonista","Conclua 5 aulas", g => g.stats.aulas >= 5],
  ["quinze","Imparável","Conclua 15 aulas", g => g.stats.aulas >= 15],
  ["gabarito","Gabaritou","Acerte 100% de um quiz", g => g.stats.perfect >= 1],
  ["acertos","Mira certeira","Acerte 50 exercícios", g => g.stats.acertos >= 50],
  ["foco4","Foco total","Faça 4 ciclos de foco em um dia", g => Object.values(g.focusDays).some(n => n >= 4)],
  ["streak3","Embalado","Estude 3 dias seguidos", g => g.best >= 3],
  ["streak7","Semana de ouro","Estude 7 dias seguidos", g => g.best >= 7],
  ["plano","Estrategista","Gere um plano com IA", g => g.stats.planos >= 1],
  ["curioso","Curioso","Faça 5 perguntas ao professor", g => g.stats.perguntas >= 5],
  ["explorador","Explorador","Conclua aulas de 3 áreas diferentes", g => Object.keys(g.cats).length >= 3],
  ["meta","Meta batida","Alcance 100 XP em um dia", g => Object.keys(g.goals).length >= 1]
];
function checkBadges(){
  const fresh = BADGES.filter(b => !game.badges[b[0]] && b[3](game));
  fresh.forEach(b => game.badges[b[0]] = ymd());
  return fresh;
}
function gain(n, label){
  const before = levelOf(game.xp);
  game.xp += n;
  const t = ymd();
  game.days[t] = (game.days[t]||0) + n;
  game.best = Math.max(game.best||0, streak());
  let goalHit = false;
  if(game.days[t] >= GOAL && !game.goals[t]){ game.goals[t] = true; goalHit = true; }
  const fresh = checkBadges();
  saveGame();
  toast(`<span class="xp">+${n} XP</span> ${esc(label)}`);
  refreshGame();
  const after = levelOf(game.xp);
  let delay = 700;
  if(after.i > before.i){ setTimeout(() => levelUp(after), delay); delay += 1200; }
  if(goalHit){ setTimeout(() => { toast(`${svg(ICON.flame)} Meta do dia batida! Volte amanhã para manter a sequência.`, "badge"); confetti(120); }, delay); delay += 900; }
  fresh.forEach((b,i) => setTimeout(() => { toast(`${svg(ICON.medal)} Conquista desbloqueada: ${esc(b[1])}`, "badge"); confetti(90); }, delay + i*1000));
}
function once(key, n, label){
  if(game.awarded[key]) return false;
  game.awarded[key] = 1; gain(n, label); return true;
}

/* toasts, confete e modal */
function toast(html, kind){
  const box = $("#toasts");
  while(box.children.length >= 3) box.firstChild.remove();
  const d = document.createElement("div");
  d.className = "toast" + (kind ? " " + kind : "");
  d.innerHTML = html;
  box.appendChild(d);
  setTimeout(() => { d.classList.add("out"); setTimeout(() => d.remove(), 450); }, 2800);
}
const cvs = $("#confetti"), ctx = cvs.getContext("2d");
let parts = [], raf = null;
const CONF_COLORS = ["#3456F0","#FFC83D","#17955D","#FF6B2C","#D23A8C","#0E9F9A","#7C4DEB"];
function confetti(count=160){
  if(REDUCED) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cvs.width = innerWidth * dpr; cvs.height = innerHeight * dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  for(let i=0;i<count;i++){
    const side = i % 2 ? 1 : -1;
    parts.push({x: innerWidth/2 + side*innerWidth*0.15, y: innerHeight*0.35, vx:(Math.random()*8+2)*side*(Math.random()<.3?-.5:1), vy:-(Math.random()*11+6),
      r:Math.random()*6+4, a:Math.random()*6.28, va:(Math.random()-.5)*.3, c:CONF_COLORS[i % CONF_COLORS.length], s:Math.random()<.5, life:0});
  }
  if(!raf) raf = requestAnimationFrame(tick);
}
function tick(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  parts.forEach(p => {
    p.life++; p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
    if(p.s) ctx.fillRect(-p.r/2,-p.r/4,p.r,p.r/2); else { ctx.beginPath(); ctx.arc(0,0,p.r/2.4,0,6.28); ctx.fill(); }
    ctx.restore();
  });
  parts = parts.filter(p => p.y < innerHeight + 40 && p.life < 260);
  raf = parts.length ? requestAnimationFrame(tick) : (ctx.clearRect(0,0,innerWidth,innerHeight), null);
}
function levelUp(lv){
  const o = document.createElement("div");
  o.className = "overlay";
  o.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="lvTitle">
    <div class="medal">${svg(ICON.bolt)}</div>
    <small>Você subiu de nível</small>
    <h2 id="lvTitle">Nível ${lv.i+1} · ${esc(lv.name)}</h2>
    <p>${game.xp} XP acumulados. ${lv.nextName ? `Faltam ${lv.next - game.xp} XP para ${esc(lv.nextName)}.` : "Você chegou ao topo. Lenda!"}</p>
    <button class="btn btn-gold" type="button" id="lvOk">Continuar estudando</button>
  </div>`;
  document.body.appendChild(o);
  const close = () => { o.remove(); removeEventListener("keydown", onKey); };
  const onKey = e => { if(e.key === "Escape") close(); };
  addEventListener("keydown", onKey);
  o.addEventListener("click", e => { if(e.target === o) close(); });
  $("#lvOk", o).addEventListener("click", close);
  $("#lvOk", o).focus();
  confetti(240);
}
function animateNum(el, to){
  if(!el) return;
  const from = parseInt(el.textContent, 10) || 0;
  if(REDUCED || from === to){ el.textContent = to; return; }
  const t0 = performance.now(), dur = 700;
  const step = now => { const k = Math.min(1, (now - t0)/dur), e = 1 - Math.pow(1-k, 3); el.textContent = Math.round(from + (to-from)*e); if(k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function refreshGame(){
  const s = streak(), lv = levelOf(game.xp), today = game.days[ymd()] || 0, active = today > 0;
  const pct = lv.next ? (game.xp - lv.min) / (lv.next - lv.min) : 1;
  $("#pillStreak").innerHTML = `${svg(ICON.flame)}<span>${s}</span>`;
  $("#pillStreak").classList.toggle("on", active);
  $("#pillStreak").title = `${s} ${s===1?"dia seguido":"dias seguidos"} estudando`;
  $("#pillXp").innerHTML = `${svg(ICON.bolt)}<span>Nv ${lv.i+1}</span><span class="mbar"><i style="width:${Math.round(pct*100)}%"></i></span>`;
  $("#pillXp").title = `${lv.name} · ${game.xp} XP`;
  animateNum($("#hStreak"), s);
  $("#hStreakTxt").textContent = s === 0 ? "Estude hoje e comece sua sequência" : (s===1 ? "dia seguido. " : "dias seguidos. ") + (active ? "Mandou bem hoje!" : "Estude hoje para não perder!");
  $("#hFlame").classList.toggle("on", active);
  const gp = Math.min(1, today/GOAL);
  $("#hRing").setAttribute("stroke-dashoffset", (169.6*(1-gp)).toFixed(1));
  $("#hRingPct").textContent = Math.round(gp*100) + "%";
  animateNum($("#hGoal"), today);
  if(!$("#progresso").hidden) renderProgresso();
}

/* ================= Início ================= */
const ALL_MODS = TRILHAS.flatMap(t => t.mods.map(m => [t, m]));
const dayNum = Math.floor((Date.now() - new Date().getTimezoneOffset()*60000) / 86400000);
const [DT, DM] = ALL_MODS[dayNum % ALL_MODS.length];
const DAILY_KEY = keyOf(DT.nome, DM[0]);
const QUOTES = [
  "Constância vence intensidade. 25 minutos hoje valem mais que 5 horas no domingo.",
  "Quem revisa, lembra. Quem lembra, acerta.",
  "Você não precisa estudar tudo hoje. Só precisa estudar hoje.",
  "Cada questão errada agora é uma questão certa no dia da prova.",
  "O seu eu do futuro vai agradecer por esta aula.",
  "Pequenos blocos, grandes resultados.",
  "Disciplina é lembrar do que você quer.",
  "Começar é a parte mais difícil. Abra uma aula e o resto vem."
];
$("#quote").textContent = QUOTES[dayNum % QUOTES.length];
$("#sheetRows").innerHTML = [1,3,0,4,2,1].map((m,i) => `<div class="sheet-row"><span class="q">${pad(i+1)}</span><span class="opts">${"ABCDE".split("").map((l,j)=>`<span class="${j===m?"on":""}" style="animation-delay:${.5 + i*.35}s">${l}</span>`).join("")}</span></div>`).join("");
animateNum($("#nTrilhas"), TRILHAS.length);
animateNum($("#nAulas"), ALL_MODS.length);
(function rotate(){
  const words = ["concurso","ENEM","faculdade","inglês","Python","OAB","marketing","Libras","Cálculo","Excel"];
  let i = 0;
  if(REDUCED) return;
  setInterval(() => { if($("[data-view=inicio]").hidden) return; i = (i+1) % words.length; $("#rot").innerHTML = `<span>${words[i]}</span>`; }, 2400);
})();
function renderDaily(){
  const isDone = !!done[DAILY_KEY];
  $("#daily").innerHTML = `<div><span class="lbl">Aula do dia · +50 XP e bônus de 20</span><h3>${esc(DM[0])}</h3><p>${esc(DT.nome)} · ${esc(catName(DT.cat))}</p></div>
    <button class="btn ${isDone ? "btn-ghost" : "btn-gold"}" type="button" id="dailyBtn">${isDone ? "Concluída. Revisar" : "Começar agora"}</button>`;
  $("#dailyBtn").addEventListener("click", () => openAula(reqFromTrilha(DT, DM)));
}
$("#cats").innerHTML = CATS.map(([id,n,d], i) => {
  const n_ = TRILHAS.filter(t => t.cat===id).length;
  return `<button class="cat" type="button" data-cat="${esc(id)}" style="${cv(id)};--i:${i}"><span class="ico">${svg(ICON[id])}</span><small>${n_} trilhas</small><b>${esc(n)}</b><span>${esc(d)}</span></button>`;
}).join("");
$("#cats").addEventListener("click", e => {
  const b = e.target.closest("[data-cat]"); if(!b) return;
  setCat(b.dataset.cat); location.hash = "trilhas";
});
function renderRecent(){
  const list = Object.entries(aulas).filter(([,v]) => v.t).sort((a,b) => b[1].t - a[1].t).slice(0,3);
  $("#recentBox").hidden = !list.length;
  $("#recent").innerHTML = list.map(([k,v]) => { const c = v.req.cat || "Plano"; return `<button class="panel" type="button" data-k="${esc(k)}" style="${cv(c)}"><span class="ico">${svg(ICON[c] || ICON.Plano)}</span><div><small>${esc(v.req.materia)}${done[k] ? " · concluída" : ""}</small><b>${esc(v.titulo || v.req.topico)}</b></div></button>`; }).join("");
}
$("#recent").addEventListener("click", e => {
  const b = e.target.closest("[data-k]"); if(!b) return;
  const v = aulas[b.dataset.k]; if(v) openAula(v.req);
});

/* ================= Catálogo ================= */
let cat = "Todas";
function setCat(c){
  cat = c;
  $$("[data-chip]").forEach(x => x.setAttribute("aria-pressed", x.dataset.chip===cat));
  renderGrid();
}
$("#catChips").innerHTML = [["Todas","Todas"], ...CATS.map(c => [c[0], c[1]])].map(([id,n]) => `<button class="chip" type="button" data-chip="${esc(id)}" aria-pressed="${id===cat}" ${id==="Todas" ? "" : `style="${cv(id)}"`}>${esc(n)}</button>`).join("");
$("#catChips").addEventListener("click", e => { const b = e.target.closest("[data-chip]"); if(b) setCat(b.dataset.chip); });
$("#q").addEventListener("input", renderGrid);
const progressOf = t => [t.mods.filter(m => done[keyOf(t.nome, m[0])]).length, t.mods.length];
function renderGrid(){
  const q = norm($("#q").value);
  const list = TRILHAS.filter(t => (cat==="Todas" || t.cat===cat) && (!q || norm([t.nome,t.sub,catName(t.cat),...t.mods.map(m=>m[0]),...t.info.map(i=>i[1])].join(" ")).includes(q)));
  $("#count").textContent = `${list.length} ${list.length===1?"trilha":"trilhas"} · ${list.reduce((s,t)=>s+t.mods.length,0)} aulas`;
  $("#grid").className = "grid stagger";
  $("#grid").innerHTML = list.length ? list.map((t,i) => {
    const [d,n] = progressOf(t);
    return `<a class="panel card" href="#trilha-${t.id}" style="${cv(t.cat)};--i:${i}">
      <div class="card-top"><span class="ico">${svg(ICON[t.cat])}</span><div><span class="org">${esc(t.sub)}</span><h3>${esc(t.nome)}</h3></div></div>
      <div class="meta"><span class="tag area">${esc(catName(t.cat))}</span><span class="tag">${n} aulas</span>${d ? `<span class="tag" style="background:var(--ok-soft);color:var(--ok)">${d} concluídas</span>` : ""}</div>
      <dl class="kv">${t.info.slice(0,2).map(([k,v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
      <div class="bar" title="${d} de ${n} aulas concluídas"><i style="width:${Math.round(d/n*100)}%"></i></div>
    </a>`;
  }).join("") : `<div class="panel empty" style="grid-column:1/-1">Nenhuma trilha encontrada. Use o <a href="#planejador">Planejador IA</a> para criar um plano sobre qualquer assunto.</div>`;
}
renderGrid();

const reqFromTrilha = (t, m) => ({materia:t.nome, topico:m[0], desc:m[1], contexto:`Trilha ${t.nome} (${t.sub}, categoria ${catName(t.cat)})`, nivel:(t.info.find(i=>i[0]==="Nível")||[])[1] || "Iniciante", origem:"trilha-"+t.id, cat:t.cat});

function renderTrilha(id){
  const t = TRILHAS.find(x => x.id===id);
  if(!t){ location.hash = "trilhas"; return; }
  const isC = t.mods.some(m => m[2]);
  const [d,n] = progressOf(t);
  const next = t.mods.findIndex(m => !done[keyOf(t.nome, m[0])]);
  const sec = $("#trilha");
  sec.setAttribute("style", cv(t.cat));
  sec.innerHTML = `
    <a class="back" href="#trilhas">← Todas as trilhas</a>
    <div class="panel thead">
      <span class="ico">${svg(ICON[t.cat])}</span>
      <div>
        <span class="eyebrow">${esc(catName(t.cat))} · ${esc(t.sub)}</span>
        <h1>${esc(t.nome)}</h1>
        <div class="meta"><span class="tag" style="background:var(--surface)">${n} aulas</span><span class="tag" style="background:var(--surface)">${d} concluídas</span><span class="tag" style="background:var(--surface);color:var(--accent)">até ${n*50 + n*50} XP</span></div>
      </div>
      ${next >= 0 ? `<button class="btn btn-primary" type="button" id="nextMod">${d ? "Continuar trilha" : "Começar trilha"}</button>` : `<span class="badge ai">Trilha concluída</span>`}
    </div>
    <div class="dgrid">
      <div class="panel block">
        <h2>${isC ? "Matérias e aulas" : "Módulos e aulas"}</h2>
        ${isC ? `<p class="note">Prioridade estimada pelo peso nas últimas provas. O conteúdo exato está sempre no edital.</p>` : `<p class="note">Siga na ordem. Cada aula concluída vale 50 XP, e cada exercício certo, mais 10.</p>`}
        <div class="mods">${t.mods.map((m,i) => {
          const k = keyOf(t.nome, m[0]);
          return `<div class="mod ${done[k]?"done":""}"><span class="num">${done[k] ? "✓" : i+1}</span><b>${esc(m[0])}${m[2] ? `<span class="prio ${m[2]}">${PRIO[m[2]]}</span>` : ""}</b><small>${esc(m[1])}</small><button class="btn ${done[k] || aulas[k] ? "btn-ghost" : "btn-primary"} btn-sm" type="button" data-mod="${i}">${done[k] ? "Revisar" : aulas[k] ? "Continuar" : "Abrir aula"}</button></div>`;
        }).join("")}</div>
      </div>
      <div style="display:grid;gap:20px">
        <div class="panel block">
          <h2>Resumo</h2>
          <dl class="kv">${t.info.map(([k,v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
          <div style="display:grid;gap:6px"><div class="bar"><i style="width:${Math.round(d/n*100)}%"></i></div><small style="color:var(--muted)">${Math.round(d/n*100)}% da trilha concluída</small></div>
          <button class="btn btn-ghost" type="button" id="usePlan">Montar rotina para esta trilha</button>
        </div>
        <div class="panel block"><h2>${esc(t.extraT)}</h2><ol class="etapas">${t.extra.map(e=>`<li>${esc(e)}</li>`).join("")}</ol></div>
        <div class="panel block"><h2>Dicas</h2><ul class="dicas">${t.dicas.map(e=>`<li>${esc(e)}</li>`).join("")}</ul></div>
      </div>
    </div>`;
  sec.querySelectorAll("[data-mod]").forEach(b => b.addEventListener("click", () => openAula(reqFromTrilha(t, t.mods[+b.dataset.mod]))));
  const nb = $("#nextMod"); if(nb) nb.addEventListener("click", () => openAula(reqFromTrilha(t, t.mods[next])));
  $("#usePlan").addEventListener("click", () => {
    const objMap = {Concursos:"Passar em concurso público",ENEM:"ENEM ou vestibular",Faculdade:"Matéria ou prova da faculdade",Exames:"Exame ou certificação (OAB, CPA, CNH...)",Idiomas:"Aprender um idioma"};
    $("#fObj").value = objMap[t.cat] || "Aprender uma habilidade nova";
    $("#fConcurso").value = `${t.nome} (${t.sub})`;
    $("#fMaterias").value = t.mods.map(m => m[0] + (m[2] ? ` (prioridade ${PRIO[m[2]].toLowerCase()})` : "")).join(", ");
    location.hash = "planejador";
  });
}

/* ================= IA ================= */


/* ================= Aula ================= */
let aulaReq = store.get("rde-aula-req", null) || aulas[EX_KEY].req;
let aulaCtl = null, chatTurns = [], chatCtl = null;
function openAula(req){
  aulaReq = req; store.set("rde-aula-req", req); chatTurns = [];
  if(location.hash === "#aula") route(); else location.hash = "aula";
}
function backLink(r){
  if(r.origem && r.origem.startsWith("trilha-")) return `<a class="back" href="#${esc(r.origem)}">← Voltar para a trilha</a>`;
  if(r.origem === "planejador") return `<a class="back" href="#planejador">← Voltar para a rotina</a>`;
  return `<a class="back" href="#trilhas">← Trilhas</a>`;
}
const GEN_TIPS = ["Enquanto isso, separe papel e caneta para a prática.","Coloque o celular no modo avião.","Dica: tente lembrar o que você já sabe sobre o assunto antes de ler.","Cada exercício certo vale 10 XP."];
async function renderAula(){
  const r = aulaReq, k = keyOf(r.materia, r.topico), cached = aulas[k];
  $("#aula").setAttribute("style", cv(r.cat || "Plano"));
  if(cached && lessonCache[k]){ cached.t = Date.now(); saveAulas(); return drawAula(r, lessonCache[k]); }
  $("#aula").innerHTML = `${backLink(r)}
    <div class="dhead"><span class="eyebrow">${esc(r.materia)}</span><h1>${esc(r.topico)}</h1></div>
    <div class="panel gen" id="genBox">
      ${LOADER}
      <h2 style="font-size:22px">Preparando sua aula</h2>
      <p id="genMsg">O professor está escrevendo a explicação, os exemplos e os exercícios. Leva cerca de um minuto.</p>
      <p class="tipbox">${esc(GEN_TIPS[Math.floor(Math.random()*GEN_TIPS.length)])}</p>
      <button class="btn btn-ghost" type="button" id="genStop">Cancelar</button>
    </div>`;
  aulaCtl && aulaCtl.abort();
  const ctl = aulaCtl = new AbortController();
  $("#genStop").addEventListener("click", () => ctl.abort());
  try{
    const {lesson: aula} = await api("/api/ai/lesson", {key:k, req:r}, ctl.signal);
    if(!aula || !Array.isArray(aula.secoes)) throw {code:"invalid_json"};
    lessonCache[k] = aula;
    aulas[k] = {req:r, titulo:aula.titulo, t:Date.now()}; saveAulas();
    if(aulaReq === r && location.hash === "#aula") drawAula(r, aula);
  }catch(e){
    if(aulaReq !== r) return;
    const box = $("#genBox"); if(!box) return;
    box.innerHTML = `<h2 style="font-size:20px">${e && e.code==="cancelled" ? "Geração cancelada" : "Não deu para gerar a aula"}</h2><p>${esc(errMsg(e))}</p>${e && (e.code==="limit"||e.code==="no_access") ? "" : `<button class="btn btn-primary" type="button" id="genRetry">Tentar de novo</button>`}`;
    const rb = $("#genRetry"); if(rb) rb.addEventListener("click", renderAula);
  }finally{ if(aulaCtl===ctl) aulaCtl = null; }
}

function drawAula(r, a){
  const k = keyOf(r.materia, r.topico);
  const secs = a.secoes || [], quiz = a.quiz || [];
  const toc = [...secs.map((s,i) => [`sec-${i}`, s.titulo]), ["sec-keys","Pontos-chave"], ["sec-flash","Flashcards"], ["sec-quiz","Exercícios"], ["sec-pratica","Prática"]];
  const isDaily = k === DAILY_KEY;
  const sec = $("#aula");
  sec.innerHTML = `${backLink(r)}
    <div class="dhead">
      <span class="eyebrow">${esc(r.materia)}</span>
      <h1>${esc(a.titulo || r.topico)}</h1>
      <div class="meta">${a.exemplo ? `<span class="badge">Aula de exemplo</span>` : `<span class="badge ai">Gerada pela IA</span>`}<span class="tag">≈ ${esc(a.duracao_min || 25)} min</span><span class="tag">${esc(r.nivel || "Iniciante")}</span><span class="tag area">até ${50 + quiz.length*10 + 20} XP</span>${isDaily ? `<span class="tag" style="background:var(--ink);color:var(--mark)">Aula do dia</span>` : ""}</div>
    </div>
    <div class="progressline" aria-hidden="true"><i id="readBar"></i></div>
    <div class="agrid">
      <article class="lesson" id="lesson">
        <div class="panel obj"><span class="ico" style="background:var(--surface)">${svg(ICON[r.cat] || ICON.Plano)}</span><div><b>Objetivo da aula</b><p>${esc(a.objetivo)}</p></div></div>
        ${secs.map((s,i) => `<div class="panel lsec" id="sec-${i}"><span class="snum">Parte ${i+1} de ${secs.length}</span><h2>${esc(s.titulo)}</h2><div class="prose">${md(s.texto)}</div>${s.exemplo ? `<div class="ex"><b>Exemplo</b><div>${inline(s.exemplo)}</div></div>` : ""}</div>`).join("")}
        <div class="panel lsec" id="sec-keys"><h2>Pontos-chave</h2><ul class="keys">${(a.pontos_chave||[]).map(p=>`<li><span>${inline(p)}</span></li>`).join("")}</ul></div>
        <div class="panel lsec" id="sec-flash"><h2>Flashcards</h2><p style="color:var(--muted)">Tente lembrar a definição antes de virar o cartão.</p><div class="flash">${(a.termos||[]).map((t,i)=>`<button class="fc" type="button" data-fc="${i}" aria-label="Virar cartão ${esc(t.termo)}"><div class="inner"><div class="face"><small>Termo</small><b>${esc(t.termo)}</b></div><div class="face fback"><small>${esc(t.termo)}</small><b>${esc(t.definicao)}</b></div></div></button>`).join("")}</div></div>
        <div class="panel lsec" id="sec-quiz"><h2>Exercícios</h2><p style="color:var(--muted)">Cada resposta certa vale 10 XP. Acerte todas para ganhar o bônus.</p><div class="quiz" id="quiz">${quiz.map((q,i)=>`<div class="qq" data-q="${i}"><p>${i+1}. ${inline(q.pergunta)}</p>${(q.opcoes||[]).map((o,j)=>`<button class="opt" type="button" data-o="${j}"><span class="l">${"ABCDE"[j]}</span><span>${inline(o)}</span></button>`).join("")}<div class="expl" hidden></div></div>`).join("")}</div><div class="score" id="score" hidden></div></div>
        <div class="panel lsec" id="sec-pratica"><h2>Prática</h2><div class="prose">${md(a.exercicio)}</div>${(a.proximos||[]).length ? `<h3 style="font-size:16px;margin-top:6px">Próximas aulas sugeridas</h3><div class="meta">${a.proximos.map((p,i)=>`<button class="chip" type="button" data-next="${i}">${esc(p)} →</button>`).join("")}</div>` : ""}</div>
        <div class="panel donebox ${done[k]?"isdone":""}" id="doneBox"></div>
      </article>
      <aside class="aside">
        <div class="panel block" style="gap:8px"><h2 style="font-size:15px">Roteiro da aula</h2><div class="toc">${toc.map(([id,n]) => `<button type="button" data-goto="${id}">${esc(n)}</button>`).join("")}</div></div>
        <div class="panel block" style="gap:10px"><h2 style="font-size:15px">Cronômetro de foco</h2><div class="mini"><b data-clock>25:00</b><button class="btn btn-primary btn-sm" type="button" data-tstart>Iniciar</button></div></div>
        <div class="panel block chat"><h2 style="font-size:15px">Pergunte ao professor</h2>
          <div class="msgs" id="msgs"><div class="msg ai">Ficou com alguma dúvida sobre esta aula? Pergunte aqui, por exemplo: “me dá outro exemplo” ou “explica de um jeito mais simples”.</div></div>
          <form id="chatForm"><input id="chatIn" placeholder="Digite sua dúvida" aria-label="Sua dúvida" autocomplete="off"><button class="btn btn-primary btn-sm" type="submit" id="chatBtn">Enviar</button></form>
        </div>
      </aside>
    </div>`;
  once("open:"+k, 5, "Aula iniciada");

  function drawDone(){
    const b = $("#doneBox"); if(!b) return;
    b.className = "panel donebox" + (done[k] ? " isdone" : "");
    b.innerHTML = done[k]
      ? `<div><b style="font-size:18px">Aula concluída</b><p>Revise em 7 dias para fixar de vez.</p></div><button class="btn btn-ghost" type="button" id="doneBtn">Desmarcar</button>`
      : `<div><b style="font-size:18px">Terminou de estudar?</b><p>Marque a aula para ganhar 50 XP${isDaily ? " e o bônus da aula do dia" : ""}.</p></div><button class="btn btn-gold" type="button" id="doneBtn">Concluir aula · +50 XP</button>`;
    $("#doneBtn").addEventListener("click", () => {
      if(done[k]){ delete done[k]; store.set("rde-done", done); drawDone(); refreshAfterDone(); return; }
      done[k] = true; store.set("rde-done", done);
      if(!game.awarded["done:"+k]){ game.stats.aulas++; game.cats[r.cat || "Plano"] = 1; }
      once("done:"+k, 50, "Aula concluída");
      if(isDaily) once("daily:"+ymd(), 20, "Bônus da aula do dia");
      confetti(170);
      drawDone(); refreshAfterDone();
    });
  }
  drawDone();
  const refreshAfterDone = () => { renderGrid(); renderRecent(); renderDaily(); };

  sec.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => document.getElementById(b.dataset.goto).scrollIntoView({behavior: REDUCED ? "auto" : "smooth"})));
  sec.querySelectorAll("[data-fc]").forEach(b => b.addEventListener("click", () => b.classList.toggle("flip")));
  let answered = 0, right = 0;
  sec.querySelectorAll(".qq").forEach(box => box.addEventListener("click", e => {
    const b = e.target.closest(".opt"); if(!b || b.disabled) return;
    const qi = +box.dataset.q, q = quiz[qi], j = +b.dataset.o, ok = j === +q.correta;
    box.querySelectorAll(".opt").forEach((o,i) => { o.disabled = true; if(i === +q.correta) o.classList.add("right"); });
    if(!ok) b.classList.add("wrong");
    const ex = box.querySelector(".expl"); ex.hidden = false;
    ex.innerHTML = `<b style="color:var(${ok?"--ok":"--bad"})">${ok ? "Correto!" : "Não foi dessa vez."}</b> ${inline(q.explicacao)}`;
    answered++;
    if(ok){ right++; if(!game.awarded["q:"+k+":"+qi]) game.stats.acertos++; once("q:"+k+":"+qi, 10, "Resposta certa"); }
    if(answered === quiz.length){
      const s = $("#score"); s.hidden = false;
      const perfect = right === quiz.length;
      s.textContent = perfect ? `Gabaritou! ${right} de ${quiz.length}. Você domina este assunto.` : `Você acertou ${right} de ${quiz.length}. ${right/quiz.length >= .6 ? "Bom resultado! Revise o que errou." : "Releia as partes em que errou e tente a prática."}`;
      if(perfect){ if(!game.awarded["perfect:"+k]) game.stats.perfect++; once("perfect:"+k, 20, "Gabaritou o quiz"); confetti(200); }
    }
  }));
  sec.querySelectorAll("[data-next]").forEach(b => b.addEventListener("click", () => openAula({materia:r.materia, topico:a.proximos[+b.dataset.next], desc:"", contexto:r.contexto, nivel:r.nivel, origem:r.origem, cat:r.cat})));
  sec.querySelectorAll("[data-tstart]").forEach(b => b.addEventListener("click", toggleTimer));
  drawClock();
  onScroll();

  const msgs = $("#msgs");
  function addMsg(who, text){ const d = document.createElement("div"); d.className = "msg " + who; d.innerHTML = who==="me" ? esc(text) : md(text); msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  chatTurns.forEach(t => addMsg(t.role === "user" ? "me" : "ai", t.content));
  $("#chatForm").addEventListener("submit", async e => {
    e.preventDefault();
    const q = $("#chatIn").value.trim(); if(!q || chatCtl) return;
    $("#chatIn").value = ""; addMsg("me", q);
    chatTurns.push({role:"user", content:q});
    const bubble = addMsg("ai", "Pensando…");
    const ctl = chatCtl = new AbortController(); $("#chatBtn").disabled = true;
    try{
      const {text} = await api("/api/ai/chat", {key:k, lesson: a.exemplo ? a : null, turns: chatTurns.slice(-8)}, ctl.signal);
      bubble.innerHTML = md(text); msgs.scrollTop = msgs.scrollHeight;
      chatTurns.push({role:"assistant", content:text});
      const n = Object.keys(game.awarded).filter(x => x.startsWith("ask:"+k+":")).length;
      if(n < 5){ game.stats.perguntas++; once(`ask:${k}:${n}`, 5, "Pergunta ao professor"); }
    }catch(err){
      chatTurns.pop();
      bubble.innerHTML = (err && err.text ? md(err.text) + "<br>" : "") + `<i>${esc(errMsg(err))}</i>`;
    }finally{ chatCtl = null; const b = $("#chatBtn"); if(b) b.disabled = false; }
  });
}
function onScroll(){
  if($("#aula").hidden) return;
  const les = $("#lesson"), bar = $("#readBar"); if(!les || !bar) return;
  const r = les.getBoundingClientRect();
  const p = Math.max(0, Math.min(1, (innerHeight*0.6 - r.top) / r.height));
  bar.style.width = (p*100).toFixed(1) + "%";
  $$("#aula [data-goto]").forEach(b => { const el = document.getElementById(b.dataset.goto); if(el && el.getBoundingClientRect().top < innerHeight*0.6) b.classList.add("seen"); });
}
addEventListener("scroll", onScroll, {passive:true});

/* ================= Planejador ================= */
const DIAS = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
const EXEMPLO = {
  exemplo:true, titulo:"Marketing digital em 8 semanas",
  resumo:"Plano de exemplo para quem estuda 1h30 por dia à noite e quer aprender a planejar e medir campanhas. Clique em qualquer bloco para abrir a aula.",
  horas_semana:9, semanas:8,
  semana:[
    {dia:"Segunda",blocos:[{inicio:"19:00",fim:"19:50",materia:"Marketing digital",atividade:"Funil de vendas",tipo:"teoria"},{inicio:"19:50",fim:"20:00",materia:"Pausa",atividade:"",tipo:"pausa"},{inicio:"20:00",fim:"20:30",materia:"Marketing digital",atividade:"Persona e posicionamento",tipo:"teoria"}]},
    {dia:"Terça",blocos:[{inicio:"19:00",fim:"19:50",materia:"Google Ads",atividade:"Estrutura de campanhas",tipo:"teoria"},{inicio:"19:50",fim:"20:00",materia:"Pausa",atividade:"",tipo:"pausa"},{inicio:"20:00",fim:"20:30",materia:"Google Ads",atividade:"Pesquisa de palavras-chave",tipo:"questoes"}]},
    {dia:"Quarta",blocos:[{inicio:"19:00",fim:"19:50",materia:"Marketing digital",atividade:"Métricas e KPIs: CTR, CPC, CPA e ROAS",tipo:"teoria"},{inicio:"19:50",fim:"20:00",materia:"Pausa",atividade:"",tipo:"pausa"},{inicio:"20:00",fim:"20:30",materia:"Marketing digital",atividade:"Exercícios de cálculo de métricas",tipo:"questoes"}]},
    {dia:"Quinta",blocos:[{inicio:"19:00",fim:"19:50",materia:"Meta Ads",atividade:"Públicos",tipo:"teoria"},{inicio:"19:50",fim:"20:00",materia:"Pausa",atividade:"",tipo:"pausa"},{inicio:"20:00",fim:"20:30",materia:"Copywriting",atividade:"Headlines",tipo:"questoes"}]},
    {dia:"Sexta",blocos:[{inicio:"19:00",fim:"19:50",materia:"Marketing digital",atividade:"Google Analytics 4",tipo:"teoria"},{inicio:"19:50",fim:"20:30",materia:"Revisão da semana",atividade:"Revisão de métricas e Google Ads",tipo:"revisao"}]},
    {dia:"Sábado",blocos:[{inicio:"09:00",fim:"10:30",materia:"Projeto prático",atividade:"Montar uma campanha simulada completa",tipo:"simulado"}]},
    {dia:"Domingo",blocos:[{inicio:"",fim:"",materia:"Descanso",atividade:"Dia livre",tipo:"pausa"}]}
  ],
  fases:[
    {nome:"Fundamentos",semanas:"Semanas 1–2",foco:"Funil, persona e as principais métricas.",metas:["Saber calcular CTR, CPC e CPA","Definir a persona de um negócio"]},
    {nome:"Tráfego pago",semanas:"Semanas 3–5",foco:"Google Ads e Meta Ads na prática.",metas:["Montar uma campanha de Pesquisa","Criar 3 públicos no Meta Ads"]},
    {nome:"Medição e otimização",semanas:"Semanas 6–8",foco:"GA4, testes A/B e relatórios.",metas:["Montar um relatório semanal de resultados","Apresentar um plano de mídia completo"]}
  ],
  revisao:["24 horas depois: refaça o quiz da aula anterior.","7 dias depois: revise os flashcards da semana.","30 dias depois: refaça o projeto prático com o que aprendeu."],
  foco:["Blocos de 50 minutos com 10 de pausa.","Feche redes sociais durante o estudo (ironia à parte).","Aplique cada aula em um negócio real ou inventado."],
  materiais:["Aulas da plataforma para cada bloco","Conta de teste no Google Ads e no Gerenciador de Anúncios da Meta","Certificações gratuitas do Google Skillshop"],
  checklist:["Escolher um negócio para usar como exemplo","Criar conta no Google Ads (sem ativar pagamento)","Fazer a aula de Estrutura de campanhas","Anotar dúvidas para o professor"]
};

let current = store.get("rde-current", null) || EXEMPLO;
let ctl = null;
const genBtn = $("#gen"), stopBtn = $("#stop"), statusEl = $("#status");
function setStatus(html, err){ statusEl.innerHTML = html; statusEl.classList.toggle("err", !!err); }
const blockReq = (p, b) => ({materia: /revis|projeto|simulado/i.test(b.materia) ? (p.titulo || b.materia) : b.materia, topico: b.atividade || b.materia, desc:"", contexto:`Plano de estudos "${p.titulo}". Tipo de bloco: ${b.tipo}.`, nivel:$("#fNivel").value, origem:"planejador", cat:"Plano"});

function renderPlan(p){
  const blocos = (p.semana||[]).flatMap(d => d.blocos||[]);
  const ck = "rde-checks-" + (p.titulo||"");
  const checks = store.get(ck, {});
  const todayIdx = (new Date().getDay() + 6) % 7;
  const byDay = DIAS.map(n => (p.semana||[]).find(d => norm(d.dia).startsWith(norm(n).slice(0,3))) || {dia:n, blocos:[]});
  const studyBlocks = blocos.filter(b => b.tipo !== "pausa");
  const doneCount = studyBlocks.filter(b => { const q = blockReq(p,b); return done[keyOf(q.materia, q.topico)]; }).length;
  $("#plan").innerHTML = `
    <div class="panel plan-head">
      ${p.exemplo ? `<span class="badge">Exemplo</span>` : `<span class="badge ai">Gerado pela IA</span>`}
      <h2>${esc(p.titulo)}</h2>
      <p class="lead">${esc(p.resumo)}</p>
      <div class="stats">
        <div class="stat"><b>${esc(p.horas_semana ?? "–")}h</b><span>por semana</span></div>
        <div class="stat"><b>${esc(p.semanas ?? "–")}</b><span>semanas de plano</span></div>
        <div class="stat"><b>${doneCount}/${studyBlocks.length}</b><span>aulas da semana feitas</span></div>
      </div>
      <div class="bar" style="--c:var(--ok)"><i style="width:${studyBlocks.length ? Math.round(doneCount/studyBlocks.length*100) : 0}%"></i></div>
      <div class="plan-actions">
        <button class="btn btn-ghost" type="button" id="copyPlan">Copiar rotina</button>
        ${p.exemplo ? "" : `<button class="btn btn-ghost" type="button" id="savePlan">Salvar plano</button>`}
        <a class="btn btn-ghost" href="#foco">Abrir modo foco</a>
      </div>
    </div>
    <div class="panel block">
      <h2>Rotina semanal</h2>
      <div class="legend">
        <span><i style="background:var(--t-teoria)"></i>Teoria</span><span><i style="background:var(--t-questoes)"></i>Prática</span>
        <span><i style="background:var(--t-revisao)"></i>Revisão</span><span><i style="background:var(--t-simulado)"></i>Simulado ou projeto</span><span><i style="background:var(--t-pausa)"></i>Pausa</span><span><i style="background:var(--ok-soft);outline:1px solid var(--ok)"></i>Concluída</span>
      </div>
      <div class="week-scroll"><div class="week">${byDay.map((d,di) => `
        <div class="day ${di===todayIdx?"now":""}"><h4>${esc(d.dia)}${di===todayIdx?" · hoje":""}</h4>${(d.blocos||[]).length ? d.blocos.map((b,bi) => {
          const inner = `${b.inicio ? `<time>${esc(b.inicio)}–${esc(b.fim)}</time>` : ""}<b>${esc(b.materia)}</b>${b.atividade ? `<span>${esc(b.atividade)}</span>` : ""}`;
          if(b.tipo === "pausa") return `<div class="blk pausa">${inner}</div>`;
          const q = blockReq(p,b), isd = done[keyOf(q.materia, q.topico)];
          return `<button class="blk ${esc(b.tipo)} ${isd?"isdone":""}" type="button" data-d="${di}" data-b="${bi}">${inner}<span class="go">${isd ? "Concluída ✓" : "Abrir aula →"}</span></button>`;
        }).join("") : `<div class="blk pausa"><b>Livre</b></div>`}
        </div>`).join("")}</div></div>
    </div>
    <div class="panel block">
      <h2>Fases até a meta</h2>
      <div class="fases">${(p.fases||[]).map(f => `
        <div class="fase"><div class="when">${esc(f.semanas)}</div><div><h3>${esc(f.nome)}</h3><p>${esc(f.foco)}</p>${(f.metas||[]).length ? `<ul>${f.metas.map(m=>`<li>${esc(m)}</li>`).join("")}</ul>` : ""}</div></div>`).join("")}</div>
    </div>
    <div class="two">
      <div class="panel block"><h2>Plano de revisão</h2><ul class="dicas">${(p.revisao||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="panel block"><h2>Concentração</h2><ul class="dicas">${(p.foco||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
    </div>
    <div class="two">
      <div class="panel block"><h2>Materiais recomendados</h2><ul class="dicas">${(p.materiais||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="panel block"><h2>Checklist para começar</h2><ul class="check">${(p.checklist||[]).map((x,i)=>`<li><label><input type="checkbox" id="chk-${i}" data-i="${i}" ${checks[i]?"checked":""}><span>${esc(x)}</span></label></li>`).join("")}</ul></div>
    </div>`;
  $("#plan").querySelectorAll("button.blk").forEach(btn => btn.addEventListener("click", () => openAula(blockReq(p, byDay[+btn.dataset.d].blocos[+btn.dataset.b]))));
  $("#plan").querySelectorAll(".check input").forEach(inp => inp.addEventListener("change", () => {
    const c = store.get(ck, {}); c[inp.dataset.i] = inp.checked; store.set(ck, c);
    if(inp.checked) once(`chk:${p.titulo}:${inp.dataset.i}`, 5, "Item do checklist");
  }));
  $("#copyPlan").addEventListener("click", async e => {
    const txt = byDay.map(d => d.dia + "\n" + (d.blocos||[]).map(b => `  ${b.inicio ? b.inicio+"–"+b.fim+"  " : ""}${b.materia}${b.atividade ? " · "+b.atividade : ""}`).join("\n")).join("\n\n");
    try{ await navigator.clipboard.writeText(p.titulo + "\n\n" + txt); e.target.textContent = "Rotina copiada"; }
    catch(err){ e.target.textContent = "Não foi possível copiar"; }
    setTimeout(() => { e.target.textContent = "Copiar rotina"; }, 2000);
  });
  const sv = $("#savePlan");
  if(sv) sv.addEventListener("click", () => {
    const list = store.get("rde-saved", []).filter(x => x.titulo !== p.titulo);
    list.unshift({...p, salvoEm: new Date().toLocaleDateString("pt-BR")});
    store.set("rde-saved", list.slice(0,8)); sv.textContent = "Plano salvo"; renderSaved();
  });
}
function renderSaved(){
  const list = store.get("rde-saved", []);
  $("#savedBox").hidden = !list.length;
  $("#savedList").innerHTML = list.map((p,i) => `<button type="button" data-i="${i}"><span>${esc(p.titulo)}</span><small>${esc(p.salvoEm)}</small></button>`).join("");
}
$("#savedList").addEventListener("click", e => {
  const b = e.target.closest("button"); if(!b) return;
  const p = store.get("rde-saved", [])[b.dataset.i]; if(p){ current = p; store.set("rde-current", p); renderPlan(p); }
});
function planForm(){
  return {objetivo:$("#fObj").value, assunto:$("#fConcurso").value.trim(), topicos:$("#fMaterias").value.trim(), horas:$("#fHoras").value, dias:$("#fDias").value, inicio:$("#fInicio").value, prova:$("#fProva").value, nivel:$("#fNivel").value, dificuldades:$("#fDif").value.trim(), hoje:ymd()};
}
$("#pform").addEventListener("submit", async e => {
  e.preventDefault();
  ctl = new AbortController();
  genBtn.disabled = true; stopBtn.hidden = false;
  setStatus(LOADER + " Montando seu plano. Isso pode levar até um minuto.");
  try{
    const {plan} = await api("/api/ai/plan", planForm(), ctl.signal);
    if(!plan || !Array.isArray(plan.semana)) throw {code:"invalid_json"};
    current = plan; store.set("rde-current", plan); renderPlan(plan);
    setStatus("Plano pronto. Clique em um bloco para abrir a aula.");
    game.stats.planos++; gain(30, "Plano criado"); confetti(140);
    $("#plan").scrollIntoView({behavior: REDUCED ? "auto" : "smooth", block:"start"});
  }catch(err){
    setStatus(errMsg(err), err && err.code !== "cancelled");
  }finally{
    genBtn.disabled = false; stopBtn.hidden = true; ctl = null;
  }
});
stopBtn.addEventListener("click", () => ctl && ctl.abort());


/* ================= Modo foco ================= */
const MODES = {foco:[25,"Foco"], pausa:[5,"Pausa"], longa:[15,"Pausa longa"]};
const CIRC = 326.7;
let mode = "foco", left = 25*60, total = 25*60, timer = null;
let cyc = store.get("rde-cycles", {d:ymd(),n:0}); if(cyc.d !== ymd()) cyc = {d:ymd(),n:0};
function drawClock(){
  const t = `${pad(Math.floor(left/60))}:${pad(left%60)}`;
  $("#clock").textContent = t;
  $$("[data-clock]").forEach(el => el.textContent = t);
  $$("[data-tstart]").forEach(el => el.textContent = timer ? "Pausar" : (left < total ? "Continuar" : "Iniciar"));
  $("#clockLabel").textContent = MODES[mode][1];
  $("#arc").setAttribute("stroke-dashoffset", (CIRC*(1-left/total)).toFixed(1));
  $("#arc").setAttribute("stroke", mode==="foco" ? "var(--accent)" : "var(--ok)");
  $("#cycles").textContent = `${cyc.n} ${cyc.n===1?"ciclo":"ciclos"} de foco ${cyc.n===1?"concluído":"concluídos"} hoje`;
  $$("#dots i").forEach((d,i) => d.classList.toggle("on", i < (cyc.n % 4 || (cyc.n ? 4 : 0))));
}
function setMode(m){
  clearInterval(timer); timer = null; mode = m; total = left = MODES[m][0]*60;
  $$("[data-mode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode===m));
  drawClock();
}
function toggleTimer(){
  if(timer){ clearInterval(timer); timer = null; drawClock(); return; }
  timer = setInterval(() => {
    left--;
    if(left <= 0){
      clearInterval(timer); timer = null;
      if(mode==="foco"){
        cyc.n++; store.set("rde-cycles", cyc);
        game.stats.focos++; game.focusDays[ymd()] = (game.focusDays[ymd()]||0) + 1;
        gain(25, "Ciclo de foco concluído"); confetti(100);
        setMode(cyc.n % 4 === 0 ? "longa" : "pausa");
      } else setMode("foco");
      return;
    }
    drawClock();
  }, 1000);
  drawClock();
}
$$("[data-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
$("#tStart").addEventListener("click", toggleTimer);
$("#tReset").addEventListener("click", () => setMode(mode));

/* ================= Progresso ================= */
function renderProgresso(){
  const lv = levelOf(game.xp), s = streak(), today = game.days[ymd()] || 0;
  const pct = lv.next ? (game.xp - lv.min)/(lv.next - lv.min) : 1;
  const cells = [];
  const start = new Date(); start.setDate(start.getDate() - 34);
  for(let i=0;i<35;i++){ const d = new Date(start); d.setDate(start.getDate()+i); const v = game.days[ymd(d)] || 0; cells.push(`<i class="${v>=100?"l3":v>=50?"l2":v>0?"l1":""} ${i===34?"today":""}" title="${d.toLocaleDateString("pt-BR")}: ${v} XP"></i>`); }
  const nb = Object.keys(game.badges).length;
  $("#progresso").innerHTML = `
    <div class="dhead"><span class="eyebrow">Meu progresso</span><h1>Cada dia conta</h1><p class="lead">Seu nível, sua sequência e suas conquistas. Estude um pouco todo dia para manter a chama acesa.</p></div>
    <div class="pgrid3">
      <div class="panel lvl"><small>Nível ${lv.i+1}</small><h2>${esc(lv.name)}</h2><div class="xpbar"><i style="width:${Math.round(pct*100)}%"></i></div><p>${game.xp} XP no total. ${lv.nextName ? `Faltam <b>${lv.next - game.xp} XP</b> para ${esc(lv.nextName)}.` : "Nível máximo alcançado."}</p></div>
      <div class="panel bigstat"><div class="flame ${today>0?"on":""}">${svg(ICON.flame)}</div><span class="n">${s}</span><p>${s===1?"dia seguido":"dias seguidos"} · recorde de ${game.best||0}</p></div>
      <div class="panel bigstat"><div class="ringbox"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--sunk)" stroke-width="7"/><circle cx="32" cy="32" r="27" fill="none" stroke="var(--ok)" stroke-width="7" stroke-linecap="round" stroke-dasharray="169.6" stroke-dashoffset="${(169.6*(1-Math.min(1,today/GOAL))).toFixed(1)}"/></svg><b>${Math.round(Math.min(1,today/GOAL)*100)}%</b></div><span class="n">${today}</span><p>de ${GOAL} XP na meta de hoje</p></div>
    </div>
    <div class="kpis">
      <div class="panel kpi"><b>${game.stats.aulas}</b><span>aulas concluídas</span></div>
      <div class="panel kpi"><b>${game.stats.acertos}</b><span>exercícios certos</span></div>
      <div class="panel kpi"><b>${game.stats.focos}</b><span>ciclos de foco</span></div>
      <div class="panel kpi"><b>${game.stats.perguntas}</b><span>perguntas ao professor</span></div>
    </div>
    <div class="two">
      <div class="panel block"><h2>Últimas 5 semanas</h2><div class="heat">${cells.join("")}</div><div class="heat-legend">Menos <i style="background:var(--sunk)"></i><i style="background:#C9D3FF"></i><i style="background:#8FA3FA"></i><i style="background:var(--accent)"></i> Mais</div></div>
      <div class="panel block"><h2>Como ganhar XP</h2><div class="howxp" style="grid-template-columns:1fr 1fr">
        <div><span>Concluir aula</span><b>+50</b></div><div><span>Exercício certo</span><b>+10</b></div>
        <div><span>Gabaritar quiz</span><b>+20</b></div><div><span>Ciclo de foco</span><b>+25</b></div>
        <div><span>Gerar plano</span><b>+30</b></div><div><span>Aula do dia</span><b>+20</b></div>
        <div><span>Pergunta ao professor</span><b>+5</b></div><div><span>Abrir aula nova</span><b>+5</b></div>
      </div></div>
    </div>
    <div style="display:grid;gap:14px">
      <div class="sec-title"><h2>Conquistas</h2><span class="count">${nb} de ${BADGES.length} desbloqueadas</span></div>
      <div class="badges stagger">${BADGES.map((b,i) => { const on = !!game.badges[b[0]]; return `<div class="bdg ${on?"on":""}" style="--i:${i}"><div class="medal">${svg(on ? ICON.medal : ICON.lock)}</div><b>${esc(b[1])}</b><span>${esc(b[2])}</span></div>`; }).join("")}</div>
    </div>`;
}

/* ================= Rotas ================= */
function route(){
  const h = (location.hash || "#inicio").slice(1);
  let view = h, tab = h;
  if(h.startsWith("trilha-")){ view = "trilha"; tab = "trilhas"; renderTrilha(h.slice(7)); }
  else if(h === "aula"){ tab = (aulaReq && aulaReq.origem === "planejador") ? "planejador" : "trilhas"; renderAula(); }
  else if(h === "trilhas") renderGrid();
  else if(h === "planejador") renderPlan(current);
  else if(h === "progresso") renderProgresso();
  if(!document.querySelector(`[data-view="${view}"]`)){ view = tab = "inicio"; }
  if(view === "inicio"){ renderRecent(); renderDaily(); }
  $$("[data-view]").forEach(s => {
    const show = s.dataset.view === view;
    s.hidden = !show;
    if(show && !REDUCED){ s.classList.remove("enter"); void s.offsetWidth; s.classList.add("enter"); }
  });
  $$("[data-tab]").forEach(a => { if(a.dataset.tab===tab) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
  window.scrollTo(0,0);
}
addEventListener("hashchange", route);
(function account(){
  const acc = INITIAL.account || {};
  const bar = document.getElementById("trialBar");
  if(bar && acc.trial && !acc.subscribed){
    bar.hidden = false;
    bar.querySelector("b").textContent = acc.daysLeft <= 0 ? "Seu teste termina hoje." : `Faltam ${acc.daysLeft} ${acc.daysLeft===1?"dia":"dias"} de teste grátis.`;
  }
  if(new URLSearchParams(location.search).get("assinatura") === "ok"){ setTimeout(() => { toast("Assinatura ativada. Bons estudos!", "badge"); confetti(200); }, 600); history.replaceState(null, "", location.pathname + location.hash); }
})();
renderPlan(current); renderSaved(); drawClock();
route();
refreshGame();
})();
