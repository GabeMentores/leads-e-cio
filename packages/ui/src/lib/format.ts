/**
 * Formatação de data/tempo compartilhada (pt-BR). Promovida de
 * `@bela/console-admin` quando a segunda tela precisou das mesmas funções.
 * O protótipo roda com relógio fictício no seed — por isso os relativos são
 * calculados contra `Date.now()` sem arredondamentos espertos.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** "08/08/2026 às 14:32" — timestamps de publicação/trilha. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "há 5 min" / "há 3 h" / "há 2 dias" — SÓ para timestamps do RELÓGIO REAL
 *  (ex.: `checkedAt` de status derivado, calculado na resposta da API).
 *  Timestamp de REGISTRO usa `formatDateTime`: o seed roda com relógio
 *  congelado (NOW = 2026-07-31) e um relativo contra `Date.now()` mentiria
 *  mais a cada dia (decisão "datas absolutas" dos Assets, 2026-08-09). */
export function formatRelative(iso: string | null): string {
  if (!iso) return 'nunca';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'agora há pouco';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.round(hours / 24)} dias`;
}

/** Rótulo de produto para o `entityType` técnico da trilha de auditoria
 *  (AuditEvent). Sem isto, nomes de MODELO do schema ("DeskOneConfig") vazavam
 *  crus na tela — e "DeskOne" nem é mais o nome do produto (2026-08-20: é
 *  bela desk). Fallback = o tipo cru, para tipo novo nunca sumir da trilha. */
const AUDIT_ENTITY_LABELS: Record<string, string> = {
  BelaInstance: 'Config da bela',
  DeskOneConfig: 'Config do bela desk',
  DeskOneIntegration: 'Integração GLPI',
  DeskOneProfile: 'Perfil de acesso',
  BelaProfile: 'Perfil do bela core',
  ApprovalDelegation: 'Ausência de aprovador',
  UsagePeriod: 'Medição de consumo',
  PredictAlert: 'Alerta Predict',
  AutomationRule: 'Automação',
  Asset: 'Ativo',
  DiscoveredDevice: 'Discovery',
  Ticket: 'Chamado',
  KBArticle: 'Artigo',
  RagSource: 'Fonte RAG',
  RagAnswerReview: 'Curadoria RAG',
};
export function auditEntityLabel(entityType: string): string {
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType;
}

/** AUDIT_ACTION (@bela/types) em voz de produto. O código cru ("update") vazava
 *  na linha do tempo do ativo — log de sistema, não texto de tela. */
const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: 'Cadastro criado',
  update: 'Cadastro atualizado',
  delete: 'Registro removido',
  status_change: 'Mudança de status',
  decision: 'Decisão sobre recomendação',
  execute: 'Ação executada',
  simulate: 'Simulação',
  publish: 'Publicação',
  login: 'Acesso',
  view: 'Consulta',
};
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

/** "00:01:42" — duração de execução (Biblioteca §2.4). `null` → em andamento. */
export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
