# @bela/leads — chat da bela para captação (roleta de prêmios)

> Deploy de produção: Vercel (root `apps/leads`) + Supabase sa-east-1.
> Build de referência: 2026-09-01 · imports das funções com extensão `.js` (nodenext).

Canal apartado, mobile-first, acessado por QR code no evento. A bela (simulada,
sem LLM) conduz a conversa, valida os dados, registra o consentimento LGPD e
emite o **código da roleta**. O staff valida o código num segundo link e libera
o giro — cada código gira uma vez.

Passo 1 aprovado em `docs/leads-chat-passo1-RASCUNHO.md` (raiz do repo).

## Rotas

| Link | Quem usa | O quê |
|---|---|---|
| `/` | visitante (QR) | conversa com a bela → código da roleta |
| `/validar#t=CHAVE` | staff do estande (link separado) | valida código e confirma o giro |
| `/leads#t=CHAVE` | comercial (chave = `LEADS_ADMIN_TOKEN`) | tabela completa dos leads, ordenável, com exportação em PDF |

São dois links distintos, um por público: o QR só aponta para `/`; o link do
validador circula só entre o pessoal do estande. A chave viaja no *fragmento*
da URL (nunca chega a servidor/log) e fica em `sessionStorage`. Sem ela, a
tela pede a chave. (`#/validar?t=CHAVE` por hash segue aceito como fallback.)

## API (funções Vercel em `api/`)

| Endpoint | Proteção | O quê |
|---|---|---|
| `POST /api/lead` | — (pública) | valida tudo de novo no servidor, grava e emite o código; idempotente por e-mail |
| `POST /api/validar` | header `X-Staff-Token` | consulta (`confirmar:false`) e confirmação do giro (`confirmar:true`, atômica) |
| `GET /api/leads` | header `X-Admin-Token` | lista JSON; `?format=csv` baixa CSV |

Validação de e-mail em 4 camadas (`shared/email.ts` — módulo único front+API):
formato → **só corporativo** (provedor gratuito recusado, typo a 1 edição
conta como gratuito) → descartável recusado → **MX do domínio** (só servidor;
falha de DNS transitória não bloqueia o lead).

## Rodar local

```
npm install            # na raiz do monorepo
npm run leads          # http://localhost:5194
```

Sem `.env`, a API local usa store em **memória** (zera no restart). Para falar
com o Supabase real, copie `.env.example` → `.env` e preencha.

## Subir (Vercel + Supabase)

1. **Supabase**: criar projeto na região `sa-east-1` e rodar
   `supabase/schema.sql` no SQL Editor. Free tier **pausa após ~1 semana
   ocioso — despausar antes do evento**.
2. **Vercel**: importar o repo, *Root Directory* = `apps/leads` (deixar o
   "Include source files outside of the Root Directory" ligado — o app importa
   `packages/tokens` e `packages/ui` do monorepo). Framework: Vite.
3. **Env vars na Vercel** (Production): `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `LEADS_STAFF_TOKEN`, `LEADS_ADMIN_TOKEN`.
4. QR do evento → `https://<app>.vercel.app/`
   · link do staff (separado) → `https://<app>.vercel.app/validar#t=<LEADS_STAFF_TOKEN>`
   · tabela do comercial → `https://<app>.vercel.app/leads#t=<LEADS_ADMIN_TOKEN>`
5. Export do comercial: painel do Supabase (Table Editor → export) ou
   `GET /api/leads?format=csv` com o header `X-Admin-Token`.

## O que NUNCA fazer aqui

- Apontar para a nuvem de teste (re-seeda a cada restart — lead evapora).
- Expor `SUPABASE_SERVICE_ROLE_KEY` / tokens no front ou no bundle.
- Gerar código no navegador (o servidor emite; o front só exibe).
- Texto que revele demo/protótipo (voz de produto na UI inteira).
