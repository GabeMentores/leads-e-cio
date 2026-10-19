// Store real: Supabase (Postgres, sa-east-1) via supabase-js com a SERVICE
// KEY — só roda em função/servidor, nunca no navegador (a tabela tem RLS
// ligada sem policy nenhuma: anon não lê nem escreve nada).
// Sem Prisma de propósito (decisão 08-25): serverless + pool de conexão não
// combinam; o client HTTP do Supabase não mantém conexão.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { LeadRecord, LeadsStore } from './handlers.js';

// Mesmo projeto Supabase do evento anterior, tabela PRÓPRIA deste evento —
// os leads não se misturam (schema em supabase/schema.sql).
const TABELA = 'leads_17_e_cio';

interface LinhaLead {
  nome: string; email: string; celular: string; empresa: string; cargo: string;
  consentimento_em: string; codigo: string; codigo_usado_em: string | null;
  origem: string; criado_em?: string;
}

function paraRecord(l: LinhaLead): LeadRecord {
  return {
    nome: l.nome, email: l.email, celular: l.celular, empresa: l.empresa, cargo: l.cargo,
    consentimentoEm: l.consentimento_em, codigo: l.codigo, codigoUsadoEm: l.codigo_usado_em,
    origem: l.origem, criadoEm: l.criado_em,
  };
}

function paraLinha(r: LeadRecord): LinhaLead {
  return {
    nome: r.nome, email: r.email, celular: r.celular, empresa: r.empresa, cargo: r.cargo,
    consentimento_em: r.consentimentoEm, codigo: r.codigo, codigo_usado_em: r.codigoUsadoEm,
    origem: r.origem,
  };
}

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados');
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export function supabaseDisponivel(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function supabaseStore(): LeadsStore {
  const db = supabase();
  return {
    async findByEmail(email) {
      const { data, error } = await db.from(TABELA).select('*').eq('email', email).maybeSingle();
      if (error) throw error;
      return data ? paraRecord(data as LinhaLead) : null;
    },

    async findByCodigo(codigo) {
      const { data, error } = await db.from(TABELA).select('*').eq('codigo', codigo).maybeSingle();
      if (error) throw error;
      return data ? paraRecord(data as LinhaLead) : null;
    },

    async insert(lead) {
      const { data, error } = await db.from(TABELA).insert(paraLinha(lead)).select().single();
      if (error) {
        // 23505 = unique_violation; a mensagem carrega o nome da constraint
        if (error.code === '23505') {
          const dup = /codigo/i.test(error.message) ? 'DUP_CODIGO' : 'DUP_EMAIL';
          throw Object.assign(new Error(error.message), { code: dup });
        }
        throw error;
      }
      return paraRecord(data as LinhaLead);
    },

    async markUsado(codigo, quando) {
      // Atômico: o filtro `is('codigo_usado_em', null)` faz o UPDATE só ganhar
      // uma vez — a corrida entre dois staffs volta 0 linhas para o perdedor.
      const { data, error } = await db
        .from(TABELA)
        .update({ codigo_usado_em: quando })
        .eq('codigo', codigo)
        .is('codigo_usado_em', null)
        .select();
      if (error) throw error;
      return data && data.length > 0 ? paraRecord(data[0] as LinhaLead) : null;
    },

    async listAll() {
      const { data, error } = await db.from(TABELA).select('*').order('criado_em', { ascending: true });
      if (error) throw error;
      return (data as LinhaLead[]).map(paraRecord);
    },
  };
}
