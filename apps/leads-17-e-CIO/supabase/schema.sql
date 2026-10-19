-- Canal de captação (roleta de prêmios do evento) — rodar no SQL Editor do
-- Supabase (projeto na região sa-east-1). Uma tabela só.
create table if not exists public.leads_17_e_cio (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  email            text not null unique,
  celular          text not null,
  empresa          text not null,
  cargo            text not null,
  consentimento_em timestamptz not null,       -- aceite LGPD afirmativo no chat
  codigo           text not null unique,       -- código da roleta (6 chars, sem O/0/I/1)
  codigo_usado_em  timestamptz,                -- null = ainda não girou
  origem           text not null default 'evento-qr',
  criado_em        timestamptz not null default now()
);

-- RLS ligada SEM policy nenhuma: anon/authenticated não leem nem escrevem
-- nada. Só a service key (que ignora RLS) acessa — e ela vive apenas nas
-- funções serverless, nunca no navegador.
alter table public.leads_17_e_cio enable row level security;

create index if not exists leads_17_e_cio_codigo_idx on public.leads_17_e_cio (codigo);
