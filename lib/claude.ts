import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new AIError("ai_not_configured", 500, "ANTHROPIC_API_KEY não configurada na Vercel");
  client ??= new Anthropic();
  return client;
}
export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

// Fallback automático no servidor quando o modelo recusa um pedido (só nos modelos que aceitam)
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"]);
function fallbackParams() {
  return FALLBACK_MODELS.has(MODEL)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
    : {};
}

export class AIError extends Error {
  constructor(public code: string, public status = 502, public detail?: string) {
    super(detail ?? code);
    this.name = "AIError";
  }
}

export const LessonSchema = z.object({
  titulo: z.string(),
  objetivo: z.string(),
  duracao_min: z.number(),
  secoes: z.array(z.object({ titulo: z.string(), texto: z.string(), exemplo: z.string() })),
  pontos_chave: z.array(z.string()),
  termos: z.array(z.object({ termo: z.string(), definicao: z.string() })),
  quiz: z.array(z.object({ pergunta: z.string(), opcoes: z.array(z.string()), correta: z.number(), explicacao: z.string() })),
  exercicio: z.string(),
  proximos: z.array(z.string()),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const PlanSchema = z.object({
  titulo: z.string(),
  resumo: z.string(),
  horas_semana: z.number(),
  semanas: z.number(),
  semana: z.array(
    z.object({
      dia: z.string(),
      blocos: z.array(
        z.object({
          inicio: z.string(),
          fim: z.string(),
          materia: z.string(),
          atividade: z.string(),
          tipo: z.enum(["teoria", "questoes", "revisao", "simulado", "pausa"]),
        }),
      ),
    }),
  ),
  fases: z.array(z.object({ nome: z.string(), semanas: z.string(), foco: z.string(), metas: z.array(z.string()) })),
  revisao: z.array(z.string()),
  foco: z.array(z.string()),
  materiais: z.array(z.string()),
  checklist: z.array(z.string()),
});
export type Plan = z.infer<typeof PlanSchema>;

function mapError(e: unknown): never {
  if (e instanceof AIError) throw e;
  const detail = e instanceof Error ? `${e.name}${(e as { status?: number }).status ? " " + (e as { status?: number }).status : ""}: ${e.message}` : String(e);
  if (e instanceof Anthropic.RateLimitError) throw new AIError("rate_limited", 429, detail);
  if (e instanceof Anthropic.AuthenticationError) throw new AIError("ai_not_configured", 500, detail);
  if (e instanceof Anthropic.PermissionDeniedError) throw new AIError("ai_not_configured", 500, detail);
  if (e instanceof Anthropic.APIError) throw new AIError("upstream_error", 502, detail);
  throw new AIError("upstream_error", 502, detail);
}

async function generate<T extends z.ZodType>(schema: T, prompt: string, effort: "low" | "medium"): Promise<z.infer<T>> {
  try {
    const res = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort, format: betaZodOutputFormat(schema) },
      messages: [{ role: "user", content: prompt }],
      ...fallbackParams(),
    });
    if (res.stop_reason === "refusal") throw new AIError("refused", 422);
    if (!res.parsed_output) throw new AIError("invalid_json", 502);
    return res.parsed_output as z.infer<T>;
  } catch (e) {
    mapError(e);
  }
}

export type LessonReq = { materia: string; topico: string; desc?: string; contexto?: string; nivel?: string };

export function generateLesson(r: LessonReq) {
  const prompt = `Você é um professor brasileiro excelente e didático. Crie uma aula completa, em português do Brasil, para o aluno estudar sozinho dentro de uma plataforma de estudos.

Curso/assunto: ${r.materia}
Tópico desta aula: ${r.topico}
${r.desc ? "O que a aula deve cobrir: " + r.desc : ""}
Contexto: ${r.contexto || "estudo livre"}
Nível do aluno: ${r.nivel || "Iniciante"}

Como escrever:
- Explique do zero, com linguagem simples e envolvente, como numa boa aula particular.
- Use exemplos concretos e brasileiros, com números quando fizer sentido.
- Escreva 4 ou 5 seções, cada uma com 100 a 180 palavras. No texto pode usar **negrito**, listas com "- " e quebras de linha. "exemplo" pode ficar vazio quando não ajudar.
- Se o contexto for concurso, exame ou vestibular, faça o quiz no estilo dessas provas.
- Quiz: 5 questões de múltipla escolha com 4 opções e só uma correta; "correta" é o índice da opção certa (0 a 3).
- Termos: 6 conceitos importantes com definição curta.
- "duracao_min": tempo estimado de estudo em minutos.
- "exercicio": uma atividade prática para fazer agora. "proximos": 3 tópicos para estudar depois.
- Se o tema tiver dados que mudam (leis, editais, valores), avise para conferir a fonte oficial.`;
  return generate(LessonSchema, prompt, "medium");
}

export type PlanForm = {
  objetivo: string; assunto: string; topicos: string; horas: string; dias: string;
  inicio: string; prova: string; nivel: string; dificuldades: string; hoje: string;
};

export function generatePlan(f: PlanForm) {
  const prompt = `Você é um coach de estudos brasileiro, especialista em montar rotinas para qualquer objetivo: concursos, ENEM, faculdade, certificações, idiomas, tecnologia, negócios e habilidades. Monte um plano personalizado em português do Brasil.

DADOS DO ESTUDANTE
- Objetivo: ${f.objetivo}
- O que quer estudar: ${f.assunto}
- Tópicos/matérias: ${f.topicos || "escolha os tópicos mais importantes, na ordem certa de aprendizado"}
- Horas por dia: ${f.horas}
- Dias de estudo por semana: ${f.dias}
- Horário de início: ${f.inicio || "19:00"}
- Data de hoje: ${f.hoje}
- Data da prova ou meta: ${f.prova || "não definida (planeje 8 a 16 semanas conforme o assunto)"}
- Nível: ${f.nivel}
- Dificuldades/observações: ${f.dificuldades || "nenhuma"}

REGRAS
- "semana" cobre os 7 dias (Segunda a Domingo). Dias sem estudo têm um único bloco tipo "pausa" com materia "Descanso" e horários vazios.
- Respeite as horas por dia e o horário de início. Inclua pausas curtas entre blocos longos.
- "materia" é a disciplina ou área (ex.: "Google Ads", "Direito Previdenciário", "Cálculo I").
- "atividade" é o tópico específico daquele bloco (ex.: "Estrutura de campanhas", "Limites", "Simple past"). Cada bloco vira uma aula, então seja específico.
- Matérias mais importantes aparecem mais vezes. Inclua ao menos um bloco de revisão e um de prática, simulado ou projeto por semana.
- Calcule "semanas" até a meta e divida em 2 a 4 fases. Textos curtos. No máximo 5 blocos por dia.
- revisao: 3 a 4 itens. foco: 3 a 5 dicas ligadas às dificuldades. materiais: 3 a 5 itens. checklist: 4 a 6 primeiras ações.`;
  return generate(PlanSchema, prompt, "medium");
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function chatAboutLesson(lesson: Lesson, turns: ChatTurn[]) {
  const resumo = (`Aula: ${lesson.titulo}\nObjetivo: ${lesson.objetivo}\n` +
    lesson.secoes.map((s) => `## ${s.titulo}\n${s.texto}`).join("\n")).slice(0, 8000);
  const system = `Você é o professor desta aula numa plataforma de estudos. Responda dúvidas do aluno em português do Brasil, de forma curta (até 150 palavras), didática, encorajadora e com exemplo quando ajudar. Se a pergunta fugir do assunto, responda brevemente e traga de volta para a aula. Pode usar **negrito** e listas com "- ".\n\nCONTEÚDO DA AULA:\n${resumo}`;
  try {
    const res = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system,
      output_config: { effort: "low" },
      messages: turns,
      ...fallbackParams(),
    });
    if (res.stop_reason === "refusal") throw new AIError("refused", 422);
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    if (!text) throw new AIError("upstream_error", 502);
    return text;
  } catch (e) {
    mapError(e);
  }
}
