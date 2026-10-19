# leads-e-cio

Canal de captação de leads do **17º e-CIO** (Belago | Luxor): chat da bela com
quiz de abertura, cadastro com aceite LGPD e código para girar a roleta no
estande.

Recorte do monorepo `GabeMentores/bela-deskone`: o app e só os pacotes do
design system que ele usa (`packages/ui`, `packages/tokens`, `packages/types`),
na mesma estrutura de pastas — nenhum import precisou mudar.

```
npm install
npm run dev        # http://localhost:5195
npm run estresse   # suíte de roteiros do chat
```

Detalhes do app (variáveis de ambiente, rotas, export do comercial) em
[apps/leads-17-e-CIO/README.md](apps/leads-17-e-CIO/README.md).

## Links

| Link | Quem usa |
|---|---|
| `https://leads-e-cio.vercel.app/` | participante (QR do estande) |
| `https://leads-e-cio.vercel.app/validar#t=<LEADS_STAFF_TOKEN>` | staff do estande |
| `https://leads-e-cio.vercel.app/leads#t=<LEADS_ADMIN_TOKEN>` | comercial — tabela + PDF |

## Vercel

- **Root Directory:** `apps/leads-17-e-CIO`
- **Variáveis:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LEADS_STAFF_TOKEN`,
  `LEADS_ADMIN_TOKEN` (ver `.env.example`).
- **Banco:** mesmo projeto Supabase do HDI, tabela própria `leads_17_e_cio`
  (`apps/leads-17-e-CIO/supabase/schema.sql`).
