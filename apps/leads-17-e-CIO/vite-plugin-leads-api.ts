// Middleware de dev: serve /api/lead, /api/validar e /api/leads no próprio
// vite (espelho das funções da Vercel em api/*.ts — mesmos handlers, outro
// adaptador). Com SUPABASE_URL + SERVICE KEY no .env fala com o banco real;
// sem, cai num store em memória (que zera a cada restart — dev apenas).
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { criarLead, validarCodigo, listarLeads, type LeadsStore, type HandlerResult } from './server/handlers';
import { memoryStore } from './server/memory-store';

async function lerJson(req: IncomingMessage): Promise<unknown> {
  const pedacos: Buffer[] = [];
  for await (const p of req) pedacos.push(p as Buffer);
  const bruto = Buffer.concat(pedacos).toString('utf-8');
  if (!bruto) return {};
  try { return JSON.parse(bruto); } catch { return {}; }
}

function responder(res: ServerResponse, r: HandlerResult, csv = false) {
  res.statusCode = r.status;
  if (csv && r.status === 200) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.end(r.body as string);
  } else {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(r.body));
  }
}

export function leadsApiPlugin(env: Record<string, string | undefined>): Plugin {
  let store: LeadsStore | null = null;
  let usandoMemoria = false;

  async function obterStore(): Promise<LeadsStore> {
    if (store) return store;
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      process.env.SUPABASE_URL = env.SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
      const { supabaseStore } = await import('./server/supabase-store');
      store = supabaseStore();
    } else {
      store = memoryStore();
      usandoMemoria = true;
    }
    return store;
  }

  return {
    name: 'leads-api',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        void obterStore().then(() => {
          // eslint-disable-next-line no-console
          console.log(usandoMemoria
            ? '  [leads] API local em MEMÓRIA (sem Supabase no .env — dados zeram no restart)'
            : '  [leads] API local falando com o Supabase real');
        });
      });

      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (!url.startsWith('/api/')) return next();
        try {
          const db = await obterStore();
          if (url === '/api/lead' && req.method === 'POST') {
            return responder(res, await criarLead(db, (await lerJson(req)) as never));
          }
          if (url === '/api/validar' && req.method === 'POST') {
            const token = req.headers['x-staff-token'];
            return responder(res, await validarCodigo(
              db, (await lerJson(req)) as never,
              typeof token === 'string' ? token : undefined,
              env.LEADS_STAFF_TOKEN,
            ));
          }
          if (url === '/api/leads' && req.method === 'GET') {
            const token = req.headers['x-admin-token'];
            const formato = new URL(req.url ?? '', 'http://x').searchParams.get('format') ?? undefined;
            return responder(res, await listarLeads(
              db, typeof token === 'string' ? token : undefined, env.LEADS_ADMIN_TOKEN, formato,
            ), formato === 'csv');
          }
          return next();
        } catch (err) {
          console.error('[leads] API dev', err);
          responder(res, { status: 500, body: { erro: 'INTERNO' } });
        }
      });
    },
  };
}
