import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validarCodigo } from '../server/handlers.js';
import { supabaseStore } from '../server/supabase-store.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'METODO' });
  try {
    const token = req.headers['x-staff-token'];
    const r = await validarCodigo(
      supabaseStore(), req.body ?? {},
      typeof token === 'string' ? token : undefined,
      process.env.LEADS_STAFF_TOKEN,
    );
    return res.status(r.status).json(r.body);
  } catch (err) {
    console.error('[leads] POST /api/validar', err);
    return res.status(500).json({ erro: 'INTERNO' });
  }
}
