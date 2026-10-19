import * as React from 'react';
import { useSyncExternalStore } from 'react';
import { recordServiceUsage } from '../usage/store';
import { getActiveProfile, subscribeProfile } from '../profile/store';
import { useLiveEvents } from '../live/client';
import { userTicketStatusLabel } from './status';

/**
 * Shared ticket store — the single source of truth for chamados across the
 * prototype (Catálogo, Nova Solicitação, Meus Chamados and the BELA chat all
 * read/write here). Vanilla store + `useSyncExternalStore` (no Provider needed).
 *
 * NOW BACKED BY THE REAL API (@bela/server → @bela/db). The four mutators were
 * swapped from localStorage to `fetch` while the component API is preserved
 * (`useTickets` / `openTicket` / `openCountForService` / `resetTickets`), so
 * Catálogo, Nova Solicitação and the chat keep working. `openTicket` is now
 * async (fetch is async) — its two callers await the returned protocolo.
 *
 * SEPARAÇÃO DE ORIGEM (CLAUDE §2): os campos ITSM-nativos (protocolo, título,
 * grupo responsável, status/workflow, SLA, canal, categoria) vêm do DB via DTO;
 * os campos da CAMADA BELA (belaSummary, ações rápidas, satisfação) são
 * SINTETIZADOS aqui no front (camada BELA simulada) — NÃO vêm do DB. O
 * single-switch continua no componente: com BELA off o card mostra `rawStatus`
 * e ignora belaSummary/ações (regra intacta).
 *
 * IDENTIDADE (interina): o solicitante logado = persona do switcher
 * (profile/store.ts); enviamos o e-mail dela no header `X-Persona`. Troca-se por
 * auth/RBAC real depois; mesmo assim o BACKEND filtra por solicitante.
 */

export type TicketStatus = 'open' | 'awaiting-user' | 'awaiting-approval' | 'closed';
/** Mirrors @bela/tokens `Status` (kept inline to avoid a package dep). */
export type TicketSlaStatus = 'on-track' | 'at-risk' | 'critical' | 'regular';
/** Rótulo de canal na visão do SOLICITANTE (2026-09-09): ou ele usou o
 *  catálogo, ou falou com a bela — as quatro superfícies do chat (portal,
 *  widget, Teams, WhatsApp) são a mesma conversa para quem abriu. */
export type TicketChannel = 'Catálogo' | 'bela chat';

/** Superset of the old meus-tickets `Ticket` (all original fields kept so
 *  `TicketCard` renders unchanged) + the fields the store flow needs. */
export interface Ticket {
  id: string; // protocolo "#4501"
  title: string;
  responsavel: string;
  workflow: string; // rótulo de status do USUÁRIO FINAL (6, ver tickets/status.ts)
  /** Status CRU do workflow ITSM (8 estados) — decide a COR do chip. */
  statusRaw: string;
  slaStatus: TicketSlaStatus;
  slaLabel: string; // No prazo / Em risco / Atrasado / Encerrado
  belaSummary: string;
  rawStatus: string; // ITSM fallback shown when BELA is off
  actions?: string[]; // BELA quick actions
  /** A pergunta REAL do time (waiting_requester) — alimenta o resumo da bela e
   *  a resposta pronta de 1 toque (useSmartReply). */
  pendingNote?: string | null;
  closed?: boolean;
  feedback?: boolean;
  // — superset —
  serviceId?: string; // catalog slug this chamado belongs to (open-count)
  category: string;
  channel: TicketChannel; // origin
  needsApproval: boolean;
  aiResolvable?: boolean;
  status: TicketStatus;
  createdAt: string; // ISO
}

export interface OpenTicketInput {
  serviceId?: string;
  title: string;
  description?: string;
  category?: string;
  channel: TicketChannel;
  needsApproval?: boolean;
  aiResolvable?: boolean;
  /** Ativo relacionado — cuid OU code do CMDB ("CORP-NTB-0142"); o backend
   *  resolve os dois e grava a FK real (entra na timeline do ativo). */
  assetId?: string;
  /** Nomes dos anexos da abertura — viram mensagem com chip na conversa. */
  attachments?: string[];
  requester?: string;
  responsavel?: string;
  /** PARA QUEM (2026-08-27): 'institutional' manda o ticket para a tela da
   *  EQUIPE; 'other_user' registra o beneficiário. Ausente = pessoal. */
  ownership?: 'personal' | 'institutional' | 'other_user';
  beneficiaryId?: string;
}

/** Contagens dos 4 buckets da tela (Meus Chamados). Espelha `MyTicketCounts`
 *  de @bela/types (definido aqui para manter o front desacoplado do contrato). */
export interface TicketCounts {
  open: number;
  awaitingUser: number;
  approval: number;
  /** Resolvidos aguardando avaliação — tile próprio desde 2026-08-28. */
  resolved: number;
  closed: number;
}

/* ── wire shape (subset dos DTOs @bela/types que o front consome) ──────────── */
interface TicketDTO {
  code: string;
  title: string;
  status: string; // raw 8-state ITSM status
  statusLabel: string;
  slaRisk: string;
  slaRiskLabel: string;
  slaConsumedPct: number;
  categoryName: string | null;
  serviceName: string | null;
  serviceSlug: string | null;
  requesterName: string;
  groupName: string | null;
  assigneeName: string | null;
  channel: string;
  openedAt: string;
  updatedAt: string;
  /** Só em waiting_requester: última mensagem pública do time (a pendência). */
  pendingNote?: string | null;
}
interface MineResponse {
  items: TicketDTO[];
  counts: TicketCounts;
}

const EMPTY_COUNTS: TicketCounts = { open: 0, awaitingUser: 0, approval: 0, resolved: 0, closed: 0 };

/* ── DTO (ITSM nativo) → Ticket + camada BELA (simulada) ───────────────────── */

/** raw 8-state ITSM status → the store's 4-state model. */
function toStoreStatus(raw: string): TicketStatus {
  switch (raw) {
    case 'waiting_requester':
      return 'awaiting-user';
    case 'waiting_approval':
      return 'awaiting-approval';
    // RESOLVIDO NÃO É ENCERRADO (regra do user, 2026-08-28): fica na lista dos
    // EM ABERTO até o solicitante avaliar — e avaliar é o que encerra. Os dois
    // caíam em 'closed' aqui e o chamado sumia da aba "Em aberto" justamente
    // quando esperava uma ação dele. Só `closed` fecha.
    case 'closed':
      return 'closed';
    default:
      return 'open'; // open | triaged | in_progress | reopened | resolved
  }
}

function toStoreSla(risk: string): TicketSlaStatus {
  switch (risk) {
    case 'at_risk':
      return 'at-risk';
    case 'critical':
    case 'breached':
      return 'critical';
    default:
      return 'on-track';
  }
}

function toStoreChannel(channel: string): TicketChannel {
  return channel === 'catalog' ? 'Catálogo' : 'bela chat';
}
function toDbChannel(channel: TicketChannel): string {
  return channel === 'Catálogo' ? 'catalog' : 'bela_chat';
}

/* — CAMADA BELA (SIMULADA) — resumo/ações NÃO vêm do DB (CLAUDE §2). —————————— */
/** Resumo em linguagem simples do chamado (o que a BELA "diria"). No
 *  waiting_requester o resumo é a PERGUNTA REAL do time (pendingNote) — "qual
 *  informação?" era exatamente a crítica do dono (2026-08-23): resumo vago não
 *  agrega; a bela mostra o que foi pedido e oferece a resposta pronta. */
function belaSummaryFor(raw: string, serviceName: string | null, pendingNote?: string | null): string {
  const svc = serviceName ? `"${serviceName}"` : 'seu chamado';
  switch (raw) {
    case 'waiting_requester': {
      const note = pendingNote?.trim();
      if (note) return `O time pergunta: "${note.length > 180 ? `${note.slice(0, 177)}…` : note}"`;
      return 'Precisamos de uma informação sua para dar continuidade ao atendimento.';
    }
    case 'waiting_approval':
      return 'Aguardando a aprovação do seu gestor para liberar o pedido.';
    case 'resolved':
      return 'Seu chamado foi resolvido. Confirme se está tudo certo, por favor.';
    case 'closed':
      return `Chamado encerrado. ${svc[0].toUpperCase()}${svc.slice(1)} foi concluído.`;
    case 'in_progress':
      return 'O time responsável já está trabalhando no seu chamado.';
    case 'triaged':
      return 'Seu chamado foi triado e encaminhado ao time responsável.';
    case 'reopened':
      return 'Seu chamado foi reaberto e voltou para o time responsável.';
    default:
      return 'Recebemos seu chamado e já encaminhamos ao time responsável.';
  }
}
/** Ações rápidas — só quando o chamado espera uma ação do solicitante. Regra do
 *  dono (2026-08-23): ação rápida da bela RESOLVE, não orienta. A resposta
 *  pronta (useSmartReply) é injetada pelos cards como primeira ação quando a
 *  pergunta pede um dado que a bela já tem; estas são o caminho de fallback. */
function quickActionsFor(raw: string): string[] | undefined {
  if (raw === 'waiting_requester') {
    return ['Responder agora', 'Acessar detalhes'];
  }
  return undefined;
}

/** ITSM fallback (BELA off): status + quando foi atualizado — também no
 *  vocabulário do usuário (a simplificação é da TELA, não da camada BELA). */
function rawStatusFor(dto: TicketDTO): string {
  const when = new Date(dto.updatedAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return `Status: ${userTicketStatusLabel(dto.status).toLowerCase()} · atualizado ${when}`;
}

function fromDTO(dto: TicketDTO): Ticket {
  const status = toStoreStatus(dto.status);
  const closed = status === 'closed';
  const isResolved = dto.status === 'resolved';
  // O CHIP DE PRAZO some no resolvido também: não há SLA correndo em chamado
  // já atendido. Antes vinha de graça no `closed`; com o resolvido migrando
  // para a lista dos abertos, precisa ser dito.
  const semPrazoCorrendo = closed || isResolved;
  return {
    id: dto.code,
    title: dto.title,
    responsavel: dto.groupName ?? dto.assigneeName ?? 'Service Desk',
    // Vocabulário do USUÁRIO FINAL (6 rótulos, decisão 2026-08-23) — o
    // operacional (dto.statusLabel) é da fila, não desta tela.
    workflow: userTicketStatusLabel(dto.status),
    statusRaw: dto.status,
    slaStatus: toStoreSla(dto.slaRisk),
    slaLabel: semPrazoCorrendo ? (isResolved ? 'Resolvido' : 'Encerrado') : dto.slaRiskLabel,
    rawStatus: rawStatusFor(dto),
    // — camada BELA (simulada) —
    belaSummary: belaSummaryFor(dto.status, dto.serviceName, dto.pendingNote),
    actions: quickActionsFor(dto.status),
    pendingNote: dto.pendingNote ?? null,
    feedback: isResolved || undefined, // resolvido → oferece satisfação rápida
    closed: semPrazoCorrendo,
    serviceId: dto.serviceSlug ?? undefined,
    category: dto.categoryName ?? '—',
    channel: toStoreChannel(dto.channel),
    needsApproval: dto.status === 'waiting_approval',
    status,
    createdAt: dto.openedAt,
  };
}

/* ── store state ──────────────────────────────────────────────────────────── */
export interface TicketStoreState {
  tickets: Ticket[];
  counts: TicketCounts;
  loading: boolean;
  error: string | null;
  loaded: boolean; // já completou ao menos um fetch (para distinguir vazio de "ainda carregando")
}

let state: TicketStoreState = {
  tickets: [],
  counts: EMPTY_COUNTS,
  loading: false,
  error: null,
  loaded: false,
};

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
/** Hidrata na PRIMEIRA assinatura, não no carregamento do módulo. Antes o
 *  bootstrap chamava `hydrate()` direto, e todo app que importasse `@bela/ui`
 *  buscava `/api/tickets` — o Console BELA, que não tem tela de chamado nem essa
 *  rota no proxy, recebia o index.html e logava erro de JSON. Um store que
 *  ninguém lê não deve buscar dado. */
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!used) {
    used = true;
    void hydrate();
  }
  return () => {
    listeners.delete(cb);
  };
}
function getSnapshot() {
  return state;
}
function setState(patch: Partial<TicketStoreState>) {
  state = { ...state, ...patch };
  emit();
}

/* ── data access (fetch) ──────────────────────────────────────────────────── */
function personaHeader(): string {
  return getActiveProfile().email;
}

/** Guard contra corrida ao trocar de persona rápido: só o fetch mais recente
 *  aplica o resultado. */
let hydrateSeq = 0;
/** Alguma tela já assinou este store? Gate da hidratação preguiçosa (ver `subscribe`). */
let used = false;

async function fetchMine(): Promise<{ tickets: Ticket[]; counts: TicketCounts }> {
  const res = await fetch('/api/tickets?scope=mine', {
    headers: { 'X-Persona': personaHeader() },
  });
  if (!res.ok) throw new Error(`GET /api/tickets?scope=mine → ${res.status}`);
  const data = (await res.json()) as MineResponse;
  return { tickets: data.items.map(fromDTO), counts: data.counts };
}

/** (Re)hidrata a visão pessoal a partir do backend, escopada pela persona logada.
 *  `silent` não acende o carregamento — é o modo dos updates ao vivo, para a
 *  lista mudar sozinha sem piscar a tela de quem está só olhando. */
async function hydrate(silent = false): Promise<void> {
  const seq = ++hydrateSeq;
  if (!silent) setState({ loading: true, error: null });
  try {
    const { tickets, counts } = await fetchMine();
    if (seq !== hydrateSeq) return; // foi superado por um fetch mais novo
    setState({ tickets, counts, loading: false, error: null, loaded: true });
  } catch (e) {
    if (seq !== hydrateSeq) return;
    setState({
      loading: false,
      loaded: true,
      error: 'Não foi possível carregar seus chamados. Verifique a conexão e tente novamente.',
    });
    // eslint-disable-next-line no-console
    console.error('[tickets] hydrate falhou:', e);
  }
}

/* ── public hooks ─────────────────────────────────────────────────────────── */

/**
 * Mantém a visão pessoal fresca via canal ao vivo. Só reage ao que é DESTA
 * persona: um analista respondendo o meu chamado me interessa; a fila inteira da
 * empresa, não. Como o evento traz `requesterId` (id do banco) e o front conhece
 * a persona por e-mail, casamos pelo protocolo (`code`) já presente na lista —
 * e aceitamos `ticket.created` sem código conhecido, que é o caso de um chamado
 * aberto por outro canal em nome do usuário.
 */
function useLiveTicketSync(): void {
  useLiveEvents((e) => {
    if (!e.type.startsWith('ticket.') && e.type !== 'approval.decided') return;
    const mine = e.code ? state.tickets.some((t) => t.id === e.code) : false;
    if (mine || e.type === 'ticket.created') void hydrate(true);
  });
}

/** Reactive read — components re-render when any chamado changes. */
export function useTickets(): Ticket[] {
  useLiveTicketSync();
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).tickets;
}

/** Full reactive state (tickets + counts + loading/empty/error) para a tela. */
export function useTicketStore(): TicketStoreState {
  useLiveTicketSync();
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/* ── Tickets da EQUIPE (3.c, 2026-08-27) ──────────────────────────────────── *
 * Escopo próprio, fora do store singleton: a visão pessoal e a da equipe têm
 * ciclos de vida diferentes (a pessoal hidrata no login e vive em toda tela; a
 * da equipe só existe na tela dela). Reusa `fromDTO` — o cartão é o mesmo, o
 * recorte é que muda. */
export function useInstitutionalTickets(): TicketStoreState {
  const [state, setState] = React.useState<TicketStoreState>({
    tickets: [], counts: { open: 0, awaitingUser: 0, approval: 0, resolved: 0, closed: 0 },
    loading: true, loaded: false, error: null,
  });
  const recarregar = React.useCallback(() => {
    let vivo = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch('/api/tickets?scope=institutional', { headers: { 'X-Persona': personaHeader() } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET /api/tickets?scope=institutional → ${res.status}`);
        return (await res.json()) as MineResponse;
      })
      .then((data) => {
        if (!vivo) return;
        setState({ tickets: data.items.map(fromDTO), counts: data.counts, loading: false, loaded: true, error: null });
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        setState((s) => ({ ...s, loading: false, loaded: true, error: e instanceof Error ? e.message : 'Falha ao carregar' }));
      });
    return () => { vivo = false; };
  }, []);
  React.useEffect(() => recarregar(), [recarregar]);
  // Mesma doutrina da 3.a: evento ao vivo de OUTRA pessoa recarrega a lista.
  useLiveEvents((ev) => { if (ev.type?.startsWith('ticket')) recarregar(); });
  return state;
}

/** Contagens dos 4 buckets (vindas do backend, não recomputadas no cliente). */
export function useTicketCounts(): TicketCounts {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).counts;
}

/* ── mutators ─────────────────────────────────────────────────────────────── */

/** Create a chamado from any surface (Nova Solicitação, chat). POSTa ao backend
 *  (persiste no DB), refaz o fetch da visão pessoal e retorna o chamado criado
 *  (com o protocolo REAL do DB). */
export async function openTicket(input: OpenTicketInput): Promise<Ticket> {
  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Persona': personaHeader() },
    body: JSON.stringify({
      title: input.title,
      description: input.description || input.title,
      serviceId: input.serviceId,
      category: input.category,
      channel: toDbChannel(input.channel),
      needsApproval: input.needsApproval,
      ownership: input.ownership ?? 'personal',
      beneficiaryId: input.beneficiaryId,
      assetId: input.assetId,
      attachments: input.attachments,
    }),
  });
  if (!res.ok) throw new Error(`POST /api/tickets → ${res.status}`);
  const dto = (await res.json()) as TicketDTO;
  // Feed the personal-usage signal (Catálogo "Você costuma pedir") — whenever
  // the chamado ties back to a catalog service. O chat também alimenta: o draft
  // do motor carrega o slug do serviço desde 2026-08-18.
  if (input.serviceId) recordServiceUsage(input.serviceId);
  await hydrate(); // reflete o novo chamado (lista + contagens) na UI
  return fromDTO(dto);
}

/** How many NON-closed chamados exist for a catalog service (card badge).
 *  Derivado do snapshot pessoal (os chamados do solicitante logado). */
export function openCountForService(serviceId: string): number {
  return state.tickets.filter((t) => t.serviceId === serviceId && t.status !== 'closed').length;
}

/** Resposta do SOLICITANTE num chamado (canal chat, widget "Aguardando sua
 *  ação"): POSTa a mensagem e o BACKEND retoma o fluxo (waiting_requester →
 *  in_progress/triaged; aprovação devolvida → volta ao gestor). Re-hidrata em
 *  modo silencioso — o card sai do carrossel sem piscar a tela. */
export async function replyToTicket(code: string, text: string): Promise<void> {
  const res = await fetch(`/api/tickets/${encodeURIComponent(code)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Persona': personaHeader() },
    body: JSON.stringify({ body: text, kind: 'user' }),
  });
  if (!res.ok) throw new Error(`POST /api/tickets/${code}/messages → ${res.status}`);
  await hydrate(true);
}

/* — satisfação rápida do usuário final (PATCH status) — */
async function patchStatus(code: string, status: string, note?: string): Promise<void> {
  const res = await fetch(`/api/tickets/${encodeURIComponent(code)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Persona': personaHeader() },
    body: JSON.stringify({ status, note }),
  });
  if (!res.ok) throw new Error(`PATCH /api/tickets/${code}/status → ${res.status}`);
  await hydrate();
}

/** "Resolvido" — o solicitante confirma a resolução → encerra o chamado. */
export async function confirmResolved(code: string): Promise<void> {
  await patchStatus(code, 'closed', 'Confirmado pelo solicitante (satisfação rápida).');
}

/** AVALIAÇÃO do atendimento (CSAT, 2026-08-28). Rota própria, separada do
 *  status: avaliar não é transição de estado, e só o solicitante avalia. */
export async function avaliarAtendimento(code: string, nota: number, comentario?: string): Promise<void> {
  const res = await fetch(`/api/tickets/${encodeURIComponent(code)}/satisfacao`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Persona': getActiveProfile().email },
    body: JSON.stringify({ satisfaction: nota, comment: comentario }),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message ?? 'Não foi possível registrar a avaliação.');
  }
}

/** Recusa da reabertura sem motivo — mesma frase em toda superfície que reabre
 *  (o card de Meus Chamados e o detalhe do chamado). */
export const MOTIVO_REABERTURA_ERRO = 'Conte por que precisa reabrir antes de continuar';

/** "Ainda preciso de ajuda" — reabre o chamado resolvido.
 *
 *  MOTIVO OBRIGATÓRIO (regra do user, 2026-09-02): quem reabre diz por quê ANTES
 *  de o chamado voltar para o time — sem isso o analista recebe de volta um
 *  chamado que ele acabou de dar por resolvido, sem saber o que faltou. O motivo
 *  vira a nota da transição e aparece na linha do tempo. */
export async function reopenTicket(code: string, motivo: string): Promise<void> {
  await patchStatus(code, 'reopened', `Reaberto pelo solicitante: ${motivo.trim()}`);
}

/** Dev helper — re-hidrata a visão pessoal do backend (entre demos). Um reset
 *  REAL do dataset é `npm run db:reset` no servidor. */
export function resetTickets(): void {
  void hydrate();
}

/* ── bootstrap ────────────────────────────────────────────────────────────── */
if (typeof window !== 'undefined') {
  (window as unknown as { __belaResetTickets?: () => void }).__belaResetTickets = resetTickets;
  // Re-hidrata ao TROCAR de persona (o escopo pessoal muda) — mas só se alguma
  // tela já usou o store. Sem essa guarda, trocar de persona no Console dispara
  // um fetch de chamados que aquele app nunca vai exibir.
  subscribeProfile(() => {
    if (used) void hydrate();
  });
}

/* ── chamados de ativo EM LOTE ────────────────────────────────────────────── *
 * Um chamado POR ATIVO, amarrado ao ativo (o POST resolve pelo código) — é o
 * que distingue este lote de N chamados soltos. Nasce INSTITUCIONAL (regra do
 * dono, 2026-08-27): o lote é da operação, vai para "Tickets da equipe" e
 * qualquer membro do grupo responde.
 *
 * Extraído do provider do chat em 2026-08-28, quando a tela de Assets ganhou
 * ação em lote: as duas portas — a conversa e a seleção da tabela — precisam
 * abrir o chamado do MESMO jeito, senão divergem no título, na descrição ou no
 * dono, e o mesmo pedido vira dois formatos de registro. */
export interface AtivoDoLote {
  code: string;
  model?: string | null;
  /** Por que este ativo entrou no lote (vai na descrição). */
  reason: string;
}

export interface ResultadoDoLote {
  /** "#4231 · CORP-NTB-0142" por chamado aberto. */
  abertos: string[];
  /** Códigos dos ativos que falharam. */
  falhas: string[];
}

export async function abrirChamadosDeAtivos(
  ativos: AtivoDoLote[],
  servico: { serviceId: string; serviceLabel: string },
  canal: TicketChannel = 'bela chat',
): Promise<ResultadoDoLote> {
  const abertos: string[] = [];
  const falhas: string[] = [];
  for (const a of ativos) {
    try {
      const t = await openTicket({
        title: `${servico.serviceLabel[0].toUpperCase()}${servico.serviceLabel.slice(1)} — ${a.code}`,
        description: `Ativo ${a.code}${a.model ? ` (${a.model})` : ''} — ${a.reason}. Solicitação de ${servico.serviceLabel} aberta a partir do inventário.`,
        serviceId: servico.serviceId,
        assetId: a.code,
        channel: canal,
        ownership: 'institutional',
      });
      abertos.push(`${t.id} · ${a.code}`);
    } catch {
      falhas.push(a.code);
    }
  }
  return { abertos, falhas };
}
