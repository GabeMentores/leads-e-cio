import type { VercelRequest, VercelResponse } from '@vercel/node';
import { criarLead } from '../server/handlers.js';
import { supabaseStore } from '../server/supabase-store.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'METODO' });
  try {
    const r = await criarLead(supabaseStore(), req.body ?? {});
    return res.status(r.status).json(r.body);
  } catch (err) {
    console.error('[leads] POST /api/lead', err);
    // Diagnóstico TEMPORÁRIO (09-01): com o cabeçalho certo, devolve a
    // mensagem do erro (nunca chave/stack) para depurar produção de fora.
    // Remover depois que a gravação estiver estável.
    if (req.headers['x-debug'] === 'bela0901') {
      const e = err as { message?: string; code?: string; details?: string; hint?: string };
      return res.status(500).json({ erro: 'INTERNO', detalhe: String(e?.message ?? err), code: e?.code, details: e?.details, hint: e?.hint });
    }
    return res.status(500).json({ erro: 'INTERNO' });
  }
}
