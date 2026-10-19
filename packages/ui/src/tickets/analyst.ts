import { useCallback, useEffect, useRef, useState } from 'react';
import { getActiveProfile } from '../profile/store';
import { useLiveEvents, eventTouchesTicket } from '../live/client';
import { resetTickets } from './store';

/**
 * ANALYST/GESTOR side of the ticket store (@bela/ui) — the RESPONSÁVEL surface,
 * distinct from the personal "Meus Chamados" view in `store.ts` (SOLICITANTE).
 * Same DB (@bela/server → @bela/db); consumes the REAL API, sending the logged
 * persona's e-mail in `X-Persona` (identidade interina; RBAC validado no BACKEND
 * — o filtro do front é só UX). Ver [[bela-deskone-ticket-store]], §4.3.
 *
 * SEPARAÇÃO DE ORIGEM (CLAUDE §2): os campos ITSM (status, grupo, SLA, mensagens)
 * vêm do DB via DTO; a CAMADA BELA (resumo/recomendação/ação sugerida) é
 * SINTETIZADA no front (camada BELA simulada) pelos componentes de tela, não
 * mora aqui. Estes hooks/verbos só falam ITSM nativo.
 */

/* ── wire shapes (subset dos DTOs @bela/types; o front não depende do pacote) ─ */
export interface QueueItemDTO {
  id: string;
  code: string;
  title: string;
  status: string;
  statusLabel: string;
  priority: string;
  priorityLabel: string;
  slaRisk: string;
  slaRiskLabel: string;
  slaConsumedPct: number;
  categoryName: string | null;
  serviceName: string | null;
  serviceSlug: string | null;
  /** No ticket INSTITUCIONAL este campo traz a ÁREA, não a pessoa (2026-08-27):
   *  o pedido é da equipe. Quem apertou o botão vem em `openedByName`. */
  requesterName: string;
  openedByName?: string;
  /** Quem se beneficia quando o pedido foi aberto para outra pessoa. Nas listas
   *  ele JÁ vem em `requesterName`; o detalhe mostra os dois. */
  beneficiaryName?: string | null;
  /** 'personal' | 'institutional' | 'other_user' */
  ownership?: string;
  groupName: string | null;
  assigneeName: string | null;
  /** Aprovador CADASTRADO da aprovação em aberto — null quando não há nenhuma.
   *  Existe na LISTA (e não só no detalhe) porque a linha precisa nomear quem
   *  segura o chamado e rotular a ação de cobrança (user, 2026-09-11). */
  approverName?: string | null;
  channel: string;
  openedAt: string;
  updatedAt: string;
  /** Presença efêmera: nome de OUTRO analista com o ticket aberto agora (ou null). */
  viewingBy?: string | null;
  /* ── contexto que a BELA lê (2026-08-25) — o que a fila não mostra ── */
  /** Motivo da abertura nas palavras do solicitante (1ª frase). */
  openingReason?: string | null;
  reopenCount?: number;
  /** Última fala pública: de quem e há quantas horas (âncora dos registros). */
  lastTalk?: { by: 'requester' | 'analyst'; hoursAgo: number; excerpt: string } | null;
  /** Horas sem toque no estado atual. */
  idleHours?: number;
  /** Chamado anterior do mesmo solicitante+serviço, já encerrado. */
  previousTicket?: { code: string; daysAgo: number } | null;
}

export interface GroupDTO {
  id: string;
  name: string;
  specialty: string | null;
}

export interface TicketMessageDTO {
  id: string;
  kind: 'user' | 'analyst' | 'system' | 'bela';
  /** FK real para o autor (null em mensagens de sistema). */
  authorId: string | null;
  authorName: string;
  authorRole: string | null;
  body: string;
  attachment: string | null;
  internal: boolean;
  createdAt: string;
}

export interface ApprovalDTO {
  id: string;
  ticketId: string;
  ticketCode: string;
  ticketTitle: string;
  /** Categoria do chamado — alimenta o filtro real da tela Aprovações. */
  ticketCategoryName: string | null;
  /** PRIORIDADE do chamado + rótulo pronto: a coluna da fila de aprovações
   *  (2026-09-02). Quem decide precisa do peso do pedido; o status era o mesmo
   *  em todas as linhas de uma aba. */
  ticketPriority: string;
  ticketPriorityLabel: string;
  /** Quem PEDIU (solicitante do chamado) — a coluna "Solicitante" da fila.
   *  Distinto de `approverName` (quem decide). */
  requesterName: string;
  approverName: string;
  /** Titular original quando a aprovação nasceu redirecionada por janela de
   *  ausência — sustenta o selo "no lugar de Fulano". */
  onBehalfOfName: string | null;
  status: string;
  statusLabel: string;
  belaSummary: string | null;
  riskNote: string | null;
  justification: string | null;
  requestedAt: string;
  dueAt: string | null;
  decidedAt: string | null;
  /** Quem decidiu de fato (ops/admin podem decidir pelo aprovador designado). */
  decidedByName: string | null;
  /** Para quem foi delegada (status = delegated). */
  delegatedToName: string | null;
}

/** Evento da trilha operacional (espelha `TicketLogDTO` de @bela/types) —
 *  alimenta o "Histórico de logs" do 4.a. */
export interface TicketLogDTO {
  action: 'status_change' | 'assign' | 'reassign_group' | 'escalate';
  at: string;
  byName: string | null;
  /** Status de destino CRU — o front escolhe o vocabulário da superfície. */
  toStatus: string | null;
  toStatusLabel: string | null;
  reason: string | null;
}

export interface TicketDetailDTO extends QueueItemDTO {
  description: string;
  impact: string;
  urgency: string;
  /** Rótulos pt-BR — só o painel do ANALISTA os usa (ver `ticketFacts`). */
  impactLabel: string;
  urgencyLabel: string;
  localityName: string | null;
  slaLabel: string | null;
  reopenCount: number;
  solution: string | null;
  assetCode: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  /** CSAT: 1–5 dada pelo solicitante. Nulo = encerrado sem avaliar (nunca 0). */
  satisfaction: number | null;
  satisfactionComment: string | null;
  satisfactionAt: string | null;
  messages: TicketMessageDTO[];
  approvals: ApprovalDTO[];
  /** Preenchida só no GET de detalhe (as mutações devolvem o detalhe sem ela). */
  logs?: TicketLogDTO[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/* ── data access ──────────────────────────────────────────────────────────── */
function personaHeader(): Record<string, string> {
  return { 'X-Persona': getActiveProfile().email };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : null),
      ...personaHeader(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status} ${msg}`);
  }
  return (await res.json()) as T;
}

/* ── verbos (analista/gestor) — consomem a API e reidratam a visão pessoal ──── */

export interface QueueFilters {
  /** 'team' → fila POR EQUIPE (só os grupos do analista logado; ops/admin veem tudo). */
  scope?: 'team';
  status?: string;
  group?: string;
  assignee?: string;
  slaRisk?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  /** Poll opcional (ms) — mantém a presença (viewingBy) atualizada na fila. */
  pollMs?: number;
}

function queueQuery(f: QueueFilters): string {
  const p = new URLSearchParams();
  if (f.scope) p.set('scope', f.scope);
  if (f.status) p.set('status', f.status);
  if (f.group) p.set('group', f.group);
  if (f.assignee) p.set('assignee', f.assignee);
  if (f.slaRisk) p.set('slaRisk', f.slaRisk);
  if (f.q) p.set('q', f.q);
  if (f.page) p.set('page', String(f.page));
  if (f.pageSize) p.set('pageSize', String(f.pageSize));
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Responder / nota interna (composer do detalhe/drawer). */
export async function postMessage(
  code: string,
  input: { body: string; kind?: 'user' | 'analyst' | 'system'; internal?: boolean; attachment?: string },
): Promise<TicketDetailDTO> {
  const dto = await api<TicketDetailDTO>(`/api/tickets/${encodeURIComponent(code)}/messages`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  void refreshMine();
  return dto;
}

/** Atribuir / escalar. `assigneeId` aceita id OU e-mail; `escalate` → grupo de escalonamento. */
export async function assignTicket(
  code: string,
  input: { assigneeId?: string; groupId?: string; escalate?: boolean; note?: string },
): Promise<TicketDetailDTO> {
  const dto = await api<TicketDetailDTO>(`/api/tickets/${encodeURIComponent(code)}/assign`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  void refreshMine();
  return dto;
}

/** Mudar estado (transição nomeada mora nos wrappers abaixo). */
export async function changeTicketStatus(code: string, status: string, note?: string): Promise<TicketDetailDTO> {
  const dto = await api<TicketDetailDTO>(`/api/tickets/${encodeURIComponent(code)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
  void refreshMine();
  return dto;
}

/* Transições nomeadas (a máquina de estados; ver DetalheTicket/Drawer). */
/** Assumir: atribui a si + coloca em atendimento (open/triaged → in_progress). */
export async function assumirTicket(code: string): Promise<TicketDetailDTO> {
  await assignTicket(code, { assigneeId: getActiveProfile().email, note: 'Assumido pelo responsável.' });
  return changeTicketStatus(code, 'in_progress', 'Em atendimento.');
}
export function devolverAoSolicitante(code: string, note?: string): Promise<TicketDetailDTO> {
  return changeTicketStatus(code, 'waiting_requester', note ?? 'Devolvido ao solicitante para informação.');
}
export function resolverTicket(code: string, note?: string): Promise<TicketDetailDTO> {
  return changeTicketStatus(code, 'resolved', note ?? 'Solução aplicada pelo responsável.');
}
export function encerrarTicket(code: string, note?: string): Promise<TicketDetailDTO> {
  return changeTicketStatus(code, 'closed', note ?? 'Encerrado pelo responsável.');
}
/** Escalar (§7): reencaminha ao grupo de ESCALONAMENTO do grupo atual (vertical,
 *  ex.: N1→N2). Volta o ticket p/ a triagem da nova equipe. */
export function escalarTicket(code: string, note?: string): Promise<TicketDetailDTO> {
  return assignTicket(code, { escalate: true, note: note ?? 'Escalado ao próximo nível.' });
}
/** Realocar/encaminhar (LATERAL): transfere o ticket para OUTRA equipe escolhida
 *  (ex.: Acessos→Aquisição). Limpa o responsável e volta p/ a triagem da nova
 *  equipe. Distinto de escalar (que vai ao grupo de escalonamento configurado). */
export function realocarTicket(code: string, groupId: string, note?: string): Promise<TicketDetailDTO> {
  return assignTicket(code, { groupId, note: note ?? 'Realocado para outra equipe.' });
}

/** Membro da equipe do ticket (picker do "pedir atuação"). */
export interface GroupMemberDTO {
  id: string;
  name: string;
  jobTitle: string | null;
  /** Carga AGORA na fila (2026-09-09): tickets abertos com este responsável.
   *  Só vem de `/api/groups/:id/members`; o endpoint por ticket não conta. */
  open?: number;
}

/** Membros da EQUIPE do ticket (analistas ativos) — GET /api/tickets/:id/members. */
export function useTicketMembers(code: string | null | undefined): { members: GroupMemberDTO[]; loading: boolean } {
  const [members, setMembers] = useState<GroupMemberDTO[]>([]);
  const [loading, setLoading] = useState(!!code);
  useEffect(() => {
    if (!code) {
      setMembers([]);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    api<GroupMemberDTO[]>(`/api/tickets/${encodeURIComponent(code)}/members`)
      .then((m) => { if (live) { setMembers(m); setLoading(false); } })
      .catch(() => { if (live) { setMembers([]); setLoading(false); } });
    return () => { live = false; };
  }, [code]);
  return { members, loading };
}

/** "Pedir atuação" (gestor de operação, decisão 2026-08-19): o gestor ACOMPANHA
 *  a fila e não atua — encaminha a solicitação a um membro da equipe do ticket
 *  (vira nota interna + trilha; o SSE avisa o analista na hora). */
export async function pedirAtuacao(code: string, memberId: string, note?: string): Promise<TicketDetailDTO> {
  return api<TicketDetailDTO>(`/api/tickets/${encodeURIComponent(code)}/notify`, {
    method: 'POST',
    body: JSON.stringify({ memberId, note }),
  });
}

/** "Cobrar aprovação" (user, 2026-09-11): com o chamado em aguardando aprovação
 *  o atendimento não tinha verbo nenhum. Analista, operação e admin cobram; o
 *  destinatário NÃO é escolhido na tela — é o aprovador cadastrado da aprovação
 *  em aberto. Vira nota interna + trilha, e o SSE avisa o aprovador na hora. */
export async function cobrarAprovacao(code: string, note?: string): Promise<TicketDetailDTO> {
  return api<TicketDetailDTO>(`/api/tickets/${encodeURIComponent(code)}/nudge-approval`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

/** Decisão sobre a RECOMENDAÇÃO da bela (§7 Executar/Aceitar/Ignorar) — grava
 *  na trilha de auditoria (feedback de calibração; consultável na Auditoria do
 *  Console). `reason` = motivo opcional do Ignorar. */
export async function decideRecommendation(
  code: string,
  input: { verb: 'execute' | 'accept' | 'ignore'; recommendation?: string; reason?: string },
): Promise<void> {
  await api(`/api/tickets/${encodeURIComponent(code)}/recommendation`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/* ── presença de atendimento (in-memory no servidor; sem persistência) ─────── */
/** Marca/renova a presença do analista logado no ticket (heartbeat). */
export async function startViewing(code: string): Promise<void> {
  await fetch(`/api/tickets/${encodeURIComponent(code)}/viewing`, { method: 'POST', headers: personaHeader() }).catch(() => {});
}
/** Libera a presença (ao fechar o detalhe). */
export async function stopViewing(code: string): Promise<void> {
  await fetch(`/api/tickets/${encodeURIComponent(code)}/viewing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...personaHeader() },
    body: JSON.stringify({ release: true }),
  }).catch(() => {});
}

/** Decidir aprovação (aprovar/reprovar/devolver/pedir evidência/delegar) → muda
 *  o status do ticket no backend. */
export type ApprovalDecision = 'approve' | 'reject' | 'return' | 'request_evidence' | 'delegate';

/**
 * Verbo ÚNICO sugerido pela bela para uma aprovação pendente (CLAUDE §6): risco
 * alto + acesso sensível → Reprovar; risco alto → Pedir evidência; demais →
 * Aprovar.
 *
 * Mora aqui, e não na tela, porque a MESMA sugestão aparece em dois lugares — a
 * linha da fila de Aprovações e o drawer 4.b — e as duas instâncias nunca podem
 * divergir (§7). Camada BELA simulada, determinística sobre o risco calculado.
 */
export function suggestedApprovalDecision(
  riskNote: string | null | undefined,
  ticketTitle = '',
): { label: string; decision: ApprovalDecision } {
  const risk = (riskNote ?? '').toLowerCase();
  const sensitive = /produção|sensível|obrigatóri/.test(`${riskNote ?? ''} ${ticketTitle}`.toLowerCase());
  if (risk.startsWith('alto') && sensitive) return { label: 'Reprovar', decision: 'reject' };
  if (risk.startsWith('alto')) return { label: 'Pedir evidência', decision: 'request_evidence' };
  return { label: 'Aprovar', decision: 'approve' };
}
export async function decideApproval(
  id: string,
  input: { decision: ApprovalDecision; justification?: string; delegateToId?: string },
): Promise<ApprovalDTO> {
  const dto = await api<ApprovalDTO>(`/api/approvals/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  void refreshMine();
  // Reidrata as filas de aprovação MONTADAS nesta janela: o SSE filtra o eco do
  // próprio autor, então uma decisão vinda do chat da bela (mesma persona) não
  // chegaria à tela sem este aviso local (2026-08-24).
  notifyApprovals();
  return dto;
}

/** Verbo de trabalho vindo do CHAT contextual da fila (payload `queueAction`,
 *  2026-08-25): executa pelos MESMOS verbos da tela (RBAC no backend) e devolve
 *  o que de fato mudou — a bela confirma só o que aconteceu. */
/** Membros que OPERAM uma fila (para o "pedir atuação" do dashboard). */
export function useGroupMembers(groupId: string | null): { members: GroupMemberDTO[] } {
  const [members, setMembers] = useState<GroupMemberDTO[]>([]);
  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      return;
    }
    let vivo = true;
    api<GroupMemberDTO[]>(`/api/groups/${encodeURIComponent(groupId)}/members`)
      .then((r) => vivo && setMembers(r))
      .catch(() => vivo && setMembers([]));
    return () => {
      vivo = false;
    };
  }, [groupId]);
  return { members };
}

/** Pedir atuação NA FILA (gestão): cutuca os N chamados mais críticos dela. */
export async function pedirAtuacaoNaFila(
  groupId: string,
  memberId: string,
  note?: string,
): Promise<{ groupName: string; memberName: string; notified: string[] }> {
  return api(`/api/groups/${encodeURIComponent(groupId)}/notify`, {
    method: 'POST',
    body: JSON.stringify({ memberId, note }),
  });
}

/** Sem `reabrir` (regra do user, 2026-09-02): reabertura é ATO DO SOLICITANTE.
 *  O analista não reabre por tela nem pelo chat da fila. */
export type QueueVerb = 'assumir' | 'retomar' | 'devolver' | 'resolver' | 'encerrar' | 'escalar';
export async function runQueueVerbByCode(codes: string[], verb: QueueVerb): Promise<{ done: string[]; failed: string[] }> {
  const fn: Record<QueueVerb, (code: string) => Promise<unknown>> = {
    assumir: assumirTicket, retomar: assumirTicket, devolver: devolverAoSolicitante,
    resolver: resolverTicket, encerrar: encerrarTicket, escalar: escalarTicket,
  };
  const done: string[] = [];
  const failed: string[] = [];
  for (const code of codes) {
    try {
      await fn[verb](code);
      done.push(code);
    } catch {
      failed.push(code); // estado incompatível ou sem permissão — reportado, nunca silencioso
    }
  }
  notifyQueue();
  return { done, failed };
}

/* Aviso local entre superfícies da MESMA persona (chat bela ⇄ tela). */
const approvalListeners = new Set<() => void>();
function notifyApprovals(): void {
  for (const l of approvalListeners) l();
}
const queueListeners = new Set<() => void>();
function notifyQueue(): void {
  for (const l of queueListeners) l();
}

/** Decisão vinda do CHAT contextual de Aprovações (payload `approvalAction` do
 *  motor, 2026-08-24): resolve código do chamado → aprovação pendente e executa
 *  pela MESMA rota RBAC dos botões da tela. Devolve o que decidiu de fato e o
 *  que não estava mais pendente — a bela confirma só o que aconteceu. */
export interface ApprovalActionOutcome {
  decided: string[];
  missing: string[];
}
export async function decideApprovalsByCode(
  codes: string[],
  decision: ApprovalDecision,
  justification?: string,
): Promise<ApprovalActionOutcome> {
  const pending = await api<ApprovalDTO[]>('/api/approvals?status=pending');
  const targets = pending.filter((a) => codes.includes(a.ticketCode));
  await Promise.all(targets.map((a) => decideApproval(a.id, { decision, ...(justification ? { justification } : {}) })));
  const decided = targets.map((a) => a.ticketCode);
  return { decided, missing: codes.filter((c) => !decided.includes(c)) };
}

/** Reidrata a visão pessoal (Meus Chamados) após uma mutação — o mesmo usuário
 *  pode ser solicitante de um ticket que acabou de ser tocado. Barato e mantém
 *  as duas visões coerentes. */
function refreshMine(): void {
  try {
    resetTickets();
  } catch {
    /* store pessoal indisponível — ignora */
  }
}

/* ── read hooks ───────────────────────────────────────────────────────────── */

export interface QueueState {
  items: QueueItemDTO[];
  total: number;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  reload: () => void;
}

/** Fila real (GET /api/tickets com filtros + paginação). Reidrata ao trocar de
 *  persona (o escopo de trabalho pode mudar) e quando os filtros mudam. */
export function useQueue(filters: QueueFilters = {}): QueueState {
  const key = queueQuery(filters);
  const persona = getActiveProfile().email;
  const [state, setState] = useState<{ items: QueueItemDTO[]; total: number; loading: boolean; error: string | null; loaded: boolean }>(
    { items: [], total: 0, loading: true, error: null, loaded: false },
  );
  const seq = useRef(0);

  /** `silent` recarrega SEM acender o estado de carregamento — é o modo dos
   *  updates ao vivo: a fila muda sozinha, sem piscar a tela de quem só assiste. */
  const load = useCallback((silent = false) => {
    const my = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    api<Paginated<QueueItemDTO>>(`/api/tickets${key}`)
      .then((data) => {
        if (my !== seq.current) return;
        setState({ items: data.items, total: data.total, loading: false, error: null, loaded: true });
      })
      .catch((e: unknown) => {
        if (my !== seq.current) return;
        setState((s) => ({ ...s, loading: false, loaded: true, error: 'Não foi possível carregar a fila. Tente novamente.' }));
        // eslint-disable-next-line no-console
        console.error('[queue] load falhou:', e);
      });
  }, [key, persona]);

  useEffect(() => { load(); }, [load]);
  // AO VIVO: qualquer mudança de ticket feita por OUTRA pessoa refaz a fila.
  // Recarrega a lista inteira em vez de remendar o item — a fila é pequena, o
  // banco é local, e um refetch tipado não corre risco de divergir do backend.
  useLiveEvents((e) => {
    if (e.type === 'approval.decided' || e.type.startsWith('ticket.') || e.type === 'presence.changed') {
      load(true);
    }
  });
  // Verbo executado pela MESMA persona em outra superfície (chat da bela) — o
  // SSE filtra o eco do próprio autor, então o aviso é local.
  useEffect(() => {
    const cb = () => load(true);
    queueListeners.add(cb);
    return () => { queueListeners.delete(cb); };
  }, [load]);
  // Poll opcional — rede de segurança para o que NÃO gera evento: a presença
  // expira por TTL (analista fechou o notebook) sem ninguém avisar.
  useEffect(() => {
    if (!filters.pollMs) return;
    const t = setInterval(() => load(true), filters.pollMs);
    return () => clearInterval(t);
  }, [load, filters.pollMs]);
  return { ...state, reload: () => load() };
}

/** Candidatos a receber uma DELEGAÇÃO de aprovação: personas ativas com alçada
 *  de aprovador (approver_manager / ops_manager / admin_deskone), excluindo o
 *  próprio usuário logado. Lê `GET /api/personas` (dado real do seed). */
export interface ApproverCandidate {
  id: string;
  name: string;
  profileLabel: string;
}
const APPROVER_PROFILES = new Set(['approver_manager', 'ops_manager', 'admin_deskone']);
export function useApproverCandidates(): { candidates: ApproverCandidate[]; loading: boolean } {
  const me = getActiveProfile().email;
  const [candidates, setCandidates] = useState<ApproverCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    api<{ id: string; name: string; email: string; profile: string; profileLabel: string }[]>('/api/personas')
      .then((rows) => {
        if (!live) return;
        setCandidates(
          rows
            .filter((p) => APPROVER_PROFILES.has(p.profile) && p.email !== me)
            .map((p) => ({ id: p.id, name: p.name, profileLabel: p.profileLabel })),
        );
        setLoading(false);
      })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [me]);
  return { candidates, loading };
}

/** Equipes (para o picker de realocação). */
export function useGroups(): { groups: GroupDTO[]; loading: boolean } {
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    api<GroupDTO[]>('/api/groups')
      .then((g) => { if (live) { setGroups(g); setLoading(false); } })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  return { groups, loading };
}

export interface TicketDetailState {
  ticket: TicketDetailDTO | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Detalhe real (GET /api/tickets/:id, aceita code "#0441"). Usado por 4.a e 4.b. */
export function useTicketDetail(code: string | null | undefined): TicketDetailState {
  const [ticket, setTicket] = useState<TicketDetailDTO | null>(null);
  const [loading, setLoading] = useState(!!code);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback((silent = false) => {
    if (!code) {
      setTicket(null);
      setLoading(false);
      setError(null);
      return;
    }
    const my = ++seq.current;
    if (!silent) setLoading(true);
    setError(null);
    api<TicketDetailDTO>(`/api/tickets/${encodeURIComponent(code)}`)
      .then((data) => {
        if (my !== seq.current) return;
        setTicket(data);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (my !== seq.current) return;
        setLoading(false);
        setError('Não foi possível carregar o chamado.');
        // eslint-disable-next-line no-console
        console.error('[ticket] load falhou:', e);
      });
  }, [code]);

  useEffect(() => { load(); }, [load]);
  // AO VIVO: só reage ao ticket ABERTO. Uma resposta do solicitante ou uma
  // decisão de aprovação aparecem no detalhe sem recarregar a página.
  useLiveEvents((e) => {
    if (eventTouchesTicket(e, code)) load(true);
  }, Boolean(code));
  return { ticket, loading, error, reload: () => load() };
}

export interface ApprovalsState {
  items: ApprovalDTO[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  reload: () => void;
}

/** Fila de aprovações real (GET /api/approvals?status). */
export function useApprovals(status?: string): ApprovalsState {
  const persona = getActiveProfile().email;
  const [state, setState] = useState<{ items: ApprovalDTO[]; loading: boolean; error: string | null; loaded: boolean }>(
    { items: [], loading: true, error: null, loaded: false },
  );
  const seq = useRef(0);

  const load = useCallback((silent = false) => {
    const my = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    api<ApprovalDTO[]>(`/api/approvals${qs}`)
      .then((items) => {
        if (my !== seq.current) return;
        setState({ items, loading: false, error: null, loaded: true });
      })
      .catch((e: unknown) => {
        if (my !== seq.current) return;
        setState((s) => ({ ...s, loading: false, loaded: true, error: 'Não foi possível carregar as aprovações. Tente novamente.' }));
        // eslint-disable-next-line no-console
        console.error('[approvals] load falhou:', e);
      });
  }, [status, persona]);

  useEffect(() => { load(); }, [load]);
  // AO VIVO: uma decisão de outro aprovador tira a linha da fila; um chamado novo
  // que exige aprovação faz uma linha entrar.
  useLiveEvents((e) => {
    if (e.type === 'approval.decided' || e.type === 'ticket.created' || e.type === 'ticket.updated') {
      load(true);
    }
  });
  // Decisão da MESMA persona vinda de outra superfície (chat da bela) — o SSE
  // filtra o eco do próprio autor, então o aviso é local (notifyApprovals).
  useEffect(() => {
    const cb = () => load(true);
    approvalListeners.add(cb);
    return () => { approvalListeners.delete(cb); };
  }, [load]);
  return { ...state, reload: () => load() };
}
