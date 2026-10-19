import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listarLeads } from '../server/handlers.js';
import { supabaseStore } from '../server/supabase-store.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'METODO' });
  try {
    const token = req.headers['x-admin-token'];
    const formato = typeof req.query.format === 'string' ? req.query.format : undefined;
    const r = await listarLeads(
      supabaseStore(),
      typeof token === 'string' ? token : undefined,
      process.env.LEADS_ADMIN_TOKEN,
      formato,
    );
    if (formato === 'csv' && r.status === 200) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
      return res.status(200).send(r.body as string);
    }
    return res.status(r.status).json(r.body);
  } catch (err) {
    console.error('[leads] GET /api/leads', err);
    return res.status(500).json({ erro: 'INTERNO' });
  }
}
