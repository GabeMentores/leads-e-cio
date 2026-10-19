// Store em memória — SÓ para o dev server local (sem Supabase configurado).
// Em produção nunca entra: lead de verdade não pode evaporar (o motivo de a
// captação não usar a nuvem de teste, que re-seeda a cada restart).
import type { LeadRecord, LeadsStore } from './handlers.js';

export function memoryStore(): LeadsStore {
  const porEmail = new Map<string, LeadRecord>();

  return {
    async findByEmail(email) {
      return porEmail.get(email) ?? null;
    },
    async findByCodigo(codigo) {
      for (const lead of porEmail.values()) if (lead.codigo === codigo) return lead;
      return null;
    },
    async insert(lead) {
      if (porEmail.has(lead.email)) throw Object.assign(new Error('dup email'), { code: 'DUP_EMAIL' });
      for (const l of porEmail.values()) {
        if (l.codigo === lead.codigo) throw Object.assign(new Error('dup codigo'), { code: 'DUP_CODIGO' });
      }
      const registro = { ...lead, criadoEm: new Date().toISOString() };
      porEmail.set(lead.email, registro);
      return registro;
    },
    async markUsado(codigo, quando) {
      for (const lead of porEmail.values()) {
        if (lead.codigo === codigo) {
          if (lead.codigoUsadoEm) return null;
          lead.codigoUsadoEm = quando;
          return lead;
        }
      }
      return null;
    },
    async listAll() {
      return [...porEmail.values()];
    },
  };
}
