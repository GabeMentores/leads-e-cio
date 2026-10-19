// Forma e formatação de um lead — compartilhadas pela tabela (tela 3) e pelo
// PDF. O banco guarda celular só com dígitos e datas em ISO.

export interface Lead {
  nome: string;
  email: string;
  celular: string;
  empresa: string;
  cargo: string;
  consentimentoEm: string;
  codigo: string;
  codigoUsadoEm: string | null;
  origem: string;
  criadoEm?: string;
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** 51992022940 → (51) 99202-2940. O banco guarda só dígitos. */
export function formatarCelular(digitos: string): string {
  const d = digitos.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digitos;
}

/** Lead com o número de chegada: #1 é o primeiro cadastro do evento. */
export type LeadNumerado = Lead & { numero: number };

/** Numera pela ordem de cadastro e devolve do mais RECENTE para o mais antigo —
 *  quem acabou de passar no estande aparece primeiro, e o número não muda. */
export function numerarLeads(leads: Lead[]): LeadNumerado[] {
  return [...leads]
    .sort((a, b) => String(a.criadoEm ?? '').localeCompare(String(b.criadoEm ?? '')))
    .map((l, i) => ({ ...l, numero: i + 1 }))
    .reverse();
}
