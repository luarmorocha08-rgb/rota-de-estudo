# Rota de Estudo

Plataforma de estudos com IA: 75 trilhas (concursos, ENEM, faculdade, exames, idiomas, tecnologia, negócios e habilidades), planejador de rotina, aulas geradas na hora, professor para dúvidas, XP, níveis, sequência de dias e conquistas.

**Modelo de negócio:** 7 dias grátis sem cartão, depois R$ 29,90/mês pelo Stripe.

## Como é feito

| Parte | Tecnologia |
|---|---|
| Site e servidor | Next.js 15 (App Router), hospedado na Vercel |
| Login e banco de dados | Supabase (projeto `rota-de-estudo`, São Paulo) |
| IA | Claude, pela API da Anthropic, só no servidor |
| Cobrança | Stripe Checkout + Portal do cliente + webhook |

```
app/
  page.tsx              página de entrada (vendas)
  login, cadastro       entrar e criar conta (7 dias grátis começam no cadastro)
  app/                  o app de estudos (só para quem está no teste ou assinou)
  assinar, conta        assinatura e dados da conta
  api/ai/*              aulas, planos e professor (Claude)
  api/state             salva XP, sequência, aulas concluídas e planos
  api/stripe/*          checkout, portal e webhook
lib/                    Supabase, Claude, Stripe e regras de acesso
public/app/app.js       a interface do app (trilhas, aulas, foco, progresso)
supabase/migrations     estrutura do banco (já aplicada)
```

## Variáveis de ambiente

Veja `.env.example`. Na Vercel, cadastre em **Settings > Environment Variables**.

| Nome | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | já preenchido no `.env.example` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase > Project Settings > API Keys (chave `sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API Keys > chave secreta. **Nunca exponha.** |
| `ANTHROPIC_API_KEY` | console.anthropic.com > API Keys |
| `CLAUDE_MODEL` | opcional. Padrão `claude-opus-5-5`. Para gastar menos: `claude-sonnet-5-5` ou `claude-haiku-5-5` |
| `AI_DAILY_LIMIT` | opcional. Pedidos de IA por pessoa por dia (padrão 40) |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com > Developers > API keys |
| `STRIPE_WEBHOOK_SECRET` | criado no passo do webhook abaixo |
| `STRIPE_PRICE_ID` | opcional. Sem ele, cobra R$ 29,90/mês automaticamente |
| `NEXT_PUBLIC_SITE_URL` | endereço do site, ex.: `https://rota-de-estudo.vercel.app` |

## Colocar no ar

1. **Vercel:** importe este repositório e cadastre as variáveis acima. Faça o deploy.
2. **Supabase > Authentication > URL Configuration:** em *Site URL* coloque o endereço do site e, em *Redirect URLs*, adicione `https://SEU-SITE/auth/callback`.
3. **Stripe > Developers > Webhooks:** crie um endpoint para `https://SEU-SITE/api/stripe/webhook` com os eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`. Copie o *Signing secret* para `STRIPE_WEBHOOK_SECRET` e faça um novo deploy.
4. **Stripe > Settings > Billing > Customer portal:** ative o portal para as pessoas cancelarem ou trocarem o cartão sozinhas.
5. **E-mails de login (recomendado):** o e-mail padrão do Supabase tem limite baixo de envios por hora. Antes de divulgar, configure um SMTP próprio (ex.: Resend) em Authentication > Emails.

Teste com o cartão `4242 4242 4242 4242` enquanto o Stripe estiver em modo de teste.

## Rodar no computador

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev                  # http://localhost:3000
```

## Custos e limites

- A IA só roda no servidor e cada pessoa tem um limite diário (`AI_DAILY_LIMIT`).
- Aulas já geradas ficam salvas e abrem de novo sem gastar crédito.
- O progresso (XP, sequência, conquistas, planos) fica salvo na conta, em qualquer aparelho.
