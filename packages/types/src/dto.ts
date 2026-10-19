/**
 * API contract — request/response shapes (DTOs) served by the backend and
 * consumed by both apps. Zero-dep: these reference ONLY the domain unions from
 * this package, never Prisma. The backend maps Prisma rows → these DTOs, so the
 * frontends stay free of any ORM type. (Entity SHAPES live in @bela/db; the
 * wire CONTRACT lives here.)
 *
 * Every DTO already carries the PT-BR `*Label` for a union field it exposes, so
 * a screen can render without re-deriving labels.
 */

import type {
  TicketOwnership,
  TicketStatus, SlaRisk, SlaTier, Priority, Impact, Urgency, TicketChannel,
  ApprovalStatus, AssetLifecycle, AssetStatus, Criticality, KbStatus,
  Profile, MessageKind,
} from './itsm';
import type {
  PredictStatus, Severity, ExecutionResult, SimulationStatus,
  RefreshMode, SyncStatus, SourceType, PublishChannelType,
  TemplateCategory, Connector,
} from './predict';
import type {
  BelaModule, Environment, ActionType, AutomationTrigger, AutomationExecutor,
  AutomationRisk, ApprovalPolicy, AutomationExecutionStatus, UsageUnit,
  AutomationFailurePolicy,
} from './bela';
import type {
  BelaChannel, ConnectorStatus, ConnectorAuthType, SsoProvider,
  GuardrailKey, GuardrailCategory, GuardrailAction, PlatformStatus, ConfigSection,
  RagSourceKind, RagSourceStatus, RagPermissionMode, RagReviewStatus, RagReviewReason, RagReviewDecision,
  RagSourceConfig, RagSyncSchedule,
  InteractionChannel, InteractionOutcome,
  AiProviderType, AiAuthType, AiPurpose, AiDataPolicy, AiConfigStatus, AiTestResult,
} from './console';

/* ─────────────────────────────── envelopes ──────────────────────────────── */

/** A page of results. `total` is the unfiltered-by-page count. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Uniform error body. */
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

/* ──────────────────────────────── personas ──────────────────────────────── */

export interface PersonaDTO {
  id: string;
  name: string;
  email: string;
  profile: Profile;
  profileLabel: string;
  jobTitle: string | null;
  area: string | null;
  vip: boolean;
  /** Endereço de ENTREGA formatado ("Rua X, 123 · ap 45 — Bairro, Cidade/UF ·
   *  CEP 01310-100") — alimenta o "Entrega em …" composto pela bela. */
  deliveryAddress: string | null;
  /** Cidade do cadastro — alimenta a "Localidade" da Nova Solicitação. */
  city: string | null;
  /** Quem aprova por esta pessoa (o gestor cadastrado). `null` quando não há —
   *  e o rascunho diz isso à vista, porque um chamado que exige aprovação sem
   *  aprovador nasce travado. */
  approverName?: string | null;
  /** Which app this persona signs into (two-logins model). */
  app: 'deskone' | 'console';
}

/* ──────────────────────────────── catalog ───────────────────────────────── */

export interface CategoryDTO {
  id: string;
  name: string;
  parentId: string | null;
}

/**
 * Serviço do catálogo — TUDO aqui é ITSM nativo (existe sem a BELA). A camada
 * BELA do card ("Resolve na hora" / prefill redigido) NÃO vem daqui: é
 * sintetizada no front por slug (HANDOFF §6.13).
 */
export interface ServiceDTO {
  id: string;
  /** Slug estável do catálogo ("vpn-access") — a chave que o front usa como
   *  serviceId. `null` para um serviço criado fora do catálogo do protótipo. */
  slug: string | null;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  /** Nome da POLÍTICA de SLA ("Crítico 24x7 (4h)") — governança. */
  slaLabel: string | null;
  /** Faixa de prazo que o card exibe ("4h"), derivada do alvo de resolução. */
  slaTier: SlaTier | null;
  needsApproval: boolean;
  needsAsset: boolean;
  responsibleGroup: string | null;
  popularity: number;
  icon: string | null;
  /** Disponibilidade operacional (ITSM nativo). `false` ⇒ card não-clicável. */
  available: boolean;
  unavailableReason: string | null;
}

/* ──────────────────────────────── tickets ───────────────────────────────── */

export interface TicketListItem {
  id: string;
  code: string;
  title: string;
  status: TicketStatus;
  statusLabel: string;
  priority: Priority;
  priorityLabel: string;
  slaRisk: SlaRisk;
  slaRiskLabel: string;
  slaConsumedPct: number;
  categoryName: string | null;
  serviceName: string | null;
  /** Catalog slug (ex.: "vpn-access") quando o ticket veio de um serviço do
   *  catálogo — deixa o front religar o chamado ao card sem conhecer o id do DB.
   *  null quando não há serviço vinculado (ITSM nativo). */
  serviceSlug: string | null;
  requesterName: string;
  /** PARA QUEM é o pedido (2026-08-27). `institutional` é da EQUIPE: aparece em
   *  "Tickets da equipe" e qualquer membro do grupo responde. */
  ownership: TicketOwnership;
  /** Quem APERTOU o botão. No institucional o `requesterName` é a ÁREA, e é
   *  esta pessoa que a linha do tempo cita na abertura ("Aberto · por Fulano"):
   *  o pedido é da equipe, o registro de quem abriu não se perde. */
  openedByName: string;
  /** Nome de quem se beneficia, quando o pedido é para outra pessoa. */
  beneficiaryName: string | null;
  groupName: string | null; // responsável (ITSM nativo)
  assigneeName: string | null; // técnico individual
  /** Aprovador CADASTRADO da aprovação em aberto — null quando não há nenhuma.
   *  Vive na LISTA (e não só no detalhe) porque a linha precisa nomear quem
   *  segura o chamado e rotular a ação de cobrança (user, 2026-09-11). */
  approverName: string | null;
  channel: TicketChannel;
  openedAt: string; // ISO
  updatedAt: string; // ISO
  /** Presença efêmera (in-memory, TTL) — nome de OUTRO analista que está com o
   *  ticket aberto agora. null quando ninguém (ou o próprio consultante) está. */
  viewingBy?: string | null;
  /** Só no scope=mine, status waiting_requester: a última mensagem PÚBLICA do
   *  time — a pendência real que o solicitante precisa responder (3.a). */
  pendingNote?: string | null;
  /* ── CONTEXTO para a leitura da BELA (2026-08-25) — o que NÃO está nas
     outras colunas da fila. Sem isto a recomendação só repetia status e prazo
     (crítica do user). Tudo ITSM nativo; quem interpreta é a camada bela. ── */
  /** Motivo da abertura nas palavras do solicitante (1ª frase da descrição). */
  openingReason: string | null;
  /** Quantas vezes o chamado já foi reaberto (reincidência do MESMO chamado). */
  reopenCount: number;
  /** Última fala PÚBLICA da conversa: de quem, e há quantas horas (âncora dos
   *  registros, nunca o relógio real). É o que diz se a bola está parada. */
  lastTalk: { by: 'requester' | 'analyst'; hoursAgo: number; excerpt: string } | null;
  /** Horas paradas no estado atual (mesma âncora) — "sem toque". */
  idleHours: number;
  /** Chamado ANTERIOR do mesmo solicitante e serviço, já encerrado — a
   *  reincidência que a fila não mostra. */
  previousTicket: { code: string; daysAgo: number } | null;
}

/** Equipe/grupo solucionador (para o picker de realocação e escopo de fila). */
export interface GroupDTO {
  id: string;
  name: string;
  specialty: string | null;
}

export interface TicketMessageDTO {
  id: string;
  kind: MessageKind;
  /** FK real para o User autor (null em mensagens de sistema) — liga a mensagem
   *  à pessoa mesmo que o display denormalizado (authorName) envelheça. */
  authorId: string | null;
  authorName: string;
  authorRole: string | null;
  body: string;
  attachment: string | null;
  internal: boolean;
  createdAt: string;
}

/** Evento da trilha operacional do ticket (AuditEvent, entityType Ticket) —
 *  alimenta o "Histórico de logs" do 4.a com o que a conversa não carrega:
 *  mudança de status com motivo, atribuições, escalonamentos. */
export interface TicketLogDTO {
  action: 'status_change' | 'assign' | 'reassign_group' | 'escalate';
  at: string; // ISO
  byName: string | null;
  /** Status de destino CRU (só em status_change) — o front escolhe o
   *  vocabulário da superfície (usuário 6 rótulos × operação 8). */
  toStatus: string | null;
  /** Rótulo do status de destino (só em status_change). */
  toStatusLabel: string | null;
  /** Motivo/nota do evento. Para o solicitante, só viaja quando o próprio
   *  solicitante gerou o evento — nota da operação não vaza (§4.3). */
  reason: string | null;
}

export interface TicketDetail extends TicketListItem {
  description: string;
  impact: Impact;
  urgency: Urgency;
  /** Rótulos pt-BR (2026-08-28) — o painel do ANALISTA mostra os dois como o
   *  MOTIVO da prioridade; o solicitante continua vendo só a prioridade. */
  impactLabel: string;
  urgencyLabel: string;
  localityName: string | null;
  slaLabel: string | null;
  reopenCount: number;
  solution: string | null;
  assetCode: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  /** CSAT (2026-08-28): 1–5 dada pelo SOLICITANTE ao avaliar — e avaliar encerra
   *  o chamado. Nulo = encerrado sem avaliar; nunca 0, que seria uma nota. */
  satisfaction: number | null;
  satisfactionComment: string | null;
  satisfactionAt: string | null;
  messages: TicketMessageDTO[];
  approvals: ApprovalDTO[];
  /** Preenchida só no GET de detalhe (as mutações devolvem o detalhe sem ela). */
  logs?: TicketLogDTO[];
}

export interface TicketFilter {
  status?: TicketStatus;
  group?: string; // group id
  assignee?: string; // user id
  slaRisk?: SlaRisk;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  categoryId?: string;
  /** Rótulo de categoria da Nova Solicitação ("Acesso / Permissões") — fallback
   *  quando não há serviço/categoryId (chat, abertura livre). O backend resolve
   *  para a Category do DB e usa o grupo responsável dela no roteamento. */
  category?: string;
  /** Id do serviço no DB OU o slug do catálogo (ex.: "vpn-access"); o backend
   *  resolve qualquer um dos dois. */
  serviceId?: string;
  /** Solicitante. Interino: quando ausente, o backend usa o ator do header
   *  `X-Persona` (troca-se por auth/RBAC depois). */
  requesterId?: string;
  priority?: Priority;
  impact?: Impact;
  urgency?: Urgency;
  channel?: TicketChannel;
  assetId?: string;
  /** Nomes dos anexos da abertura (o protótipo não armazena binário) — viram
   *  mensagem do solicitante com chip de anexo na conversa. */
  attachments?: string[];
  /** Sinaliza que o serviço exige aprovação → nasce `waiting_approval`. Quando
   *  ausente, o backend herda `needsApproval` do serviço. */
  needsApproval?: boolean;
  /* `aiResolved` SAIU do contrato de entrada (item 88, 28/09). Quem chamava
     declarava se o chamado nascia resolvido pela camada BELA — e quem chama
     inclui a própria bela, cujo draft carrega `aiResolvable`. O servidor agora
     DERIVA do serviço (`BELA_RESOLVE_NA_HORA` em @bela/types); manter o campo
     aqui seria oferecer um parâmetro que ninguém lê. */
  /** PARA QUEM é o pedido (2026-08-27). Ausente = `personal`. `institutional`
   *  manda o ticket para a tela da EQUIPE, onde qualquer membro do grupo
   *  responde — é o que as aberturas em LOTE usam. */
  ownership?: TicketOwnership;
  /** Beneficiário quando `ownership = other_user` (quem abriu segue solicitante). */
  beneficiaryId?: string;
}

/* ── Meus Chamados (3.a) — visão pessoal (scope=mine) ─────────────────────────
 * Contagens dos 4 buckets da tela (StatusCountCard). "Abertos" = todos os
 * não-encerrados (⊇ awaitingUser e approval, igual à UX da tela). */
export interface MyTicketCounts {
  open: number; // não-encerrados
  awaitingUser: number; // aguardando ação do solicitante
  approval: number; // aguardando aprovação
  /** Resolvidos aguardando a AVALIAÇÃO do solicitante (2026-08-28). Tile
   *  próprio: é a fila de ação dele, não um arquivo. */
  resolved: number;
  closed: number; // encerrados (só `closed` desde 28/08 — resolvido tem tile próprio)
}

export interface MyTicketsResponse {
  items: TicketListItem[];
  counts: MyTicketCounts;
}

export interface PostMessageInput {
  kind?: MessageKind; // default 'user'
  body: string;
  attachment?: string;
  internal?: boolean;
}

export interface PatchStatusInput {
  status: TicketStatus;
  note?: string;
}

/** Decisão do analista sobre a RECOMENDAÇÃO da bela (CLAUDE §7) — vira registro
 *  na trilha de auditoria (feedback de calibração, Caderno 3.7.1). `reason` é o
 *  motivo opcional do Ignorar. */
export interface RecommendationDecisionInput {
  verb: 'execute' | 'accept' | 'ignore';
  /** Texto da recomendação decidida (a trilha guarda O QUE foi ignorado/aceito). */
  recommendation?: string;
  reason?: string;
}

/** Atribuição/escalonamento (analista/gestor). `assigneeId` aceita id OU e-mail
 *  (resolvido no backend, igual ao ator). `escalate:true` reencaminha para o
 *  grupo de escalonamento do grupo atual (self-relation em Group). */
export interface AssignTicketInput {
  assigneeId?: string;
  groupId?: string;
  escalate?: boolean;
  note?: string;
}

/* ──────────────────────────────── approvals ─────────────────────────────── */

export interface ApprovalDTO {
  id: string;
  ticketId: string;
  ticketCode: string;
  ticketTitle: string;
  /** Categoria do chamado — alimenta o filtro real da tela Aprovações (2026-08-24). */
  ticketCategoryName: string | null;
  /** PRIORIDADE do chamado (número/status) + rótulo pronto — a fila de
   *  aprovações mostra a coluna desde 2026-09-02: quem decide precisa saber o
   *  peso do pedido, e o status era constante dentro de cada aba. */
  ticketPriority: Priority;
  ticketPriorityLabel: string;
  /** Quem PEDIU (solicitante do chamado) — é o que a coluna "Solicitante" da
   *  fila mostra. Distinto de `approverName`, que é quem DECIDE (correção
   *  2026-08-25: a coluna exibia o aprovador). */
  requesterName: string;
  approverName: string;
  /** Titular original quando a aprovação nasceu redirecionada por uma janela de
   *  ausência — sustenta o selo "no lugar de Fulano" (2026-08-24). */
  onBehalfOfName: string | null;
  status: ApprovalStatus;
  statusLabel: string;
  belaSummary: string | null;
  riskNote: string | null;
  justification: string | null;
  requestedAt: string;
  dueAt: string | null;
  decidedAt: string | null;
  /** Quem DECIDIU de fato (ops/admin podem decidir no lugar do aprovador
   *  designado) — null enquanto pendente. */
  decidedByName: string | null;
  /** Para quem foi delegada (quando status = delegated). */
  delegatedToName: string | null;
}

export type ApprovalDecision =
  | 'approve'
  | 'reject'
  | 'return' // devolver ao solicitante
  | 'request_evidence' // pedir evidência
  | 'delegate';

export interface ApprovalDecisionInput {
  decision: ApprovalDecision;
  justification?: string;
  delegateToId?: string;
}

/* ───────────────────────────────── assets ───────────────────────────────── */

export interface AssetListItem {
  id: string;
  code: string;
  model: string | null;
  category: string;
  ownerName: string | null;
  localityName: string | null;
  criticality: Criticality; // BIA — regra provisória (docs/regras-derivadas-provisorias.md)
  criticalityLabel: string;
  lifecycle: AssetLifecycle;
  lifecycleLabel: string;
  status: AssetStatus;
  statusLabel: string;
  health: number | null; // fórmula provisória; null = N/A (manutenção/baixa)
  /** ITSM nativo; permite à camada BELA da tabela casar com o KPI de 90 dias. */
  warrantyEnd: string | null;
}

/** Ticket que referencia o ativo (timeline do drawer de detalhe). */
export interface AssetTicketRef {
  code: string;
  title: string;
  status: TicketStatus;
  statusLabel: string;
  openedAt: string;
}

/** Evento de auditoria do ativo (timeline do drawer de detalhe). */
export interface AssetAuditRef {
  action: string;
  userName: string | null;
  reason: string | null;
  timestamp: string;
}

export interface AssetDetail extends AssetListItem {
  hostname: string | null;
  serial: string | null;
  warrantyEnd: string | null;
  contract: string | null;
  discoverySource: string | null;
  lastCheckInAt: string | null;
  purchasedAt: string | null;
  ticketCount: number;
  tickets: AssetTicketRef[];
  audit: AssetAuditRef[];
  /** Fatores que compuseram o score de saúde — derivados no BACKEND pela MESMA
   *  função de rules.ts que produz o número (2026-08-24; antes o front
   *  re-derivava e podia divergir). Vazio quando health = null. */
  healthFactors: string[];
}

export interface AssetFilter {
  category?: string;
  status?: AssetStatus;
  criticality?: Criticality;
  q?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Agregação da tela Assets — um GET para o topo (abas de categoria + 4 KPIs
 * contextuais), padrão do `/api/predict/overview`. A `referenceDate` do cálculo
 * é DERIVADA DOS REGISTROS (maior `lastCheckInAt` do inventário), nunca do
 * relógio real — o seed roda com relógio congelado (mesmo princípio da janela
 * de registros das Automações).
 */
export interface AssetsSummary {
  /** Contagem por categoria (ordem: maior → menor; a tela impõe a ordem do design). */
  categories: { name: string; count: number }[];
  /** KPIs da categoria pedida (`?category=`; default = a de maior contagem). */
  kpis: {
    category: string;
    total: number;
    /** Média dos scores de saúde não-nulos (fórmula PROVISÓRIA — lacuna documental). */
    avgHealth: number | null;
    obsolete: number;
    /** `status ≠ operational` (manutenção + inativo). */
    inoperative: number;
    /** Inoperantes com chamado aberto referenciando o ativo. */
    inoperativeWithOpenTickets: number;
    /** Não-obsoletos com garantia vencendo até `windowDays` após a referência. */
    warrantyExpiring: number;
    windowDays: number;
  };
  referenceDate: string;
}

/* ─────────────────────────────── dashboard ──────────────────────────────── */

/**
 * Dashboard Operacional (`GET /api/dashboard/overview`) — um GET para a tela.
 * TODAS as janelas contam a partir da `referenceDate` DERIVADA DOS REGISTROS
 * (maior `openedAt` do banco), nunca do relógio real (seed congelado — mesmo
 * princípio de Assets/Automações). RBAC: gestores/analistas/admin; usuário
 * final 403 (Caderno §4.4).
 */
/* ── TENDÊNCIA dos indicadores (2026-09-09, decisão do user: "não com meta,
 * mas mudanças no padrão") ──
 * Nenhum KPI é julgado contra uma meta configurada: cada um é comparado com
 * o MESMO cálculo no período anterior de mesma duração (semana × semana
 * anterior, mês × mês anterior…), e a leitura é uma de quatro: piora
 * significativa · piora · estável · melhora. `betterWhen` diz o que é bom
 * (FCR sobe = melhora; reabertura sobe = piora). Os cortes ficam aqui, num
 * lugar só: p.p. para percentuais, % relativo para contagens. */
export type DashboardKpiKey = 'open' | 'slaRisk' | 'fcr' | 'reopen' | 'slaCompliance' | 'escalation';
export type KpiTrendState = 'worse_much' | 'worse' | 'stable' | 'better';
/** Rótulos de leitura (user, 2026-09-09: "crítico, atenção, estável,
 *  evolução" — nada de "piora significativa" literal). */
export const KPI_TREND_LABELS: Record<KpiTrendState, string> = {
  worse_much: 'crítico',
  worse: 'atenção',
  stable: 'estável',
  better: 'evolução',
};
export const DASHBOARD_KPI_LABELS: Record<DashboardKpiKey, string> = {
  open: 'Tickets abertos',
  slaRisk: 'SLA em risco',
  fcr: 'FCR',
  reopen: 'Reabertura',
  slaCompliance: 'Cumprimento de SLA',
  escalation: 'Escalonamentos',
};
/** O que é BOM para cada indicador. */
export const DASHBOARD_KPI_BETTER_WHEN: Record<DashboardKpiKey, 'up' | 'down'> = {
  open: 'down', slaRisk: 'down', fcr: 'up', reopen: 'down', slaCompliance: 'up', escalation: 'down',
};
/** Cortes da classificação. `pp` = pontos percentuais (KPIs em %); `pct` =
 *  variação relativa (contagens). Estável dentro de ±stable; piora
 *  significativa a partir de `much`. */
export const KPI_TREND_THRESHOLDS = {
  pp: { stable: 2, much: 8 },
  pct: { stable: 5, much: 25 },
} as const;
export function classifyTrend(
  delta: number | null,
  betterWhen: 'up' | 'down',
  unit: 'pp' | 'pct',
): KpiTrendState | null {
  if (delta === null || !Number.isFinite(delta)) return null;
  const t = KPI_TREND_THRESHOLDS[unit];
  // "good" = sinal do delta apontando para o lado bom.
  const good = betterWhen === 'up' ? delta : -delta;
  if (Math.abs(good) < t.stable) return 'stable';
  if (good > 0) return 'better';
  return Math.abs(good) >= t.much ? 'worse_much' : 'worse';
}

/** Janela de comparação escolhida no filtro (2026-09-09): o período E o
 *  "contra o quê" são a mesma coisa — semana compara com a semana anterior,
 *  mês com o mês anterior, e assim por diante. `custom` usa `periodDays`. */
export type DashboardCompare = 'week' | 'month' | 'quarter' | 'year' | 'custom';
export const DASHBOARD_COMPARE_DAYS: Record<Exclude<DashboardCompare, 'custom'>, number> = {
  week: 7, month: 30, quarter: 90, year: 365,
};
/** Nome do período ANTERIOR — prefixo do valor de comparação no tile
 *  ("mês anterior: 57,4%"). Sem "vs.": a seta já diz que é comparação. */
export const DASHBOARD_COMPARE_LABELS: Record<DashboardCompare, string> = {
  week: 'semana anterior',
  month: 'mês anterior',
  quarter: 'trimestre anterior',
  year: 'ano anterior',
  custom: 'período anterior',
};

/** Filtros do overview. `area` é o recorte da operação (2026-09-09, user:
 *  "cada categoria pode ser selecionado o time dentro dela"): `all` (empresa),
 *  `mine` (os grupos de quem lê — o item em aberto de 03/09), `cat:<nome>`
 *  (uma categoria inteira) ou `group:<id>` (um time). O filtro de TIPO saiu:
 *  o modelo só tem request e incident, e o dataset é 858 × 1 — um eixo que
 *  zerava a tela. */
export interface DashboardFilters {
  area: string;
  /** Contra o que comparar — também define a janela de cálculo. */
  compare: DashboardCompare;
  /** Dias da janela (derivado de `compare`; livre quando `custom`, 7–365). */
  periodDays: number;
  channel: string | null; // TicketChannel ou null = todos
  /** Unidade (Locality.id) — o eixo "unidade" que faltava. */
  locality: string | null;
  priority: string | null; // Priority ou null = todas
  /** Serviço pelo TÍTULO — vem do clique na barra de "mais demandados",
   *  não de um seletor (é drill-down, não eixo de leitura). */
  service: string | null;
}

/** Opções do seletor de área: uma categoria e os times dentro dela. Derivadas
 *  dos nomes reais dos grupos ("Categoria · Nível"), nunca de lista à mão. */
export interface DashboardAreaOption {
  category: string;
  groups: { id: string; name: string; level: string }[];
}

/** Taxa (%) com o comparativo do período anterior de mesma duração. */
export interface KpiRate {
  pct: number | null;
  /** Numerador e denominador da janela corrente (o "motivo" do número). */
  num: number;
  den: number;
  previousPct: number | null;
  /** Variação em pontos percentuais (null sem base num dos lados). */
  deltaPp: number | null;
  windowDays: number;
}

/** Um período fechado do histórico. Taxas em %, `open` em ABERTURAS (o saldo
 *  só existe no agora). `null` = período sem base para a conta. */
export interface DashboardHistoryPoint {
  /** Início do período (ISO, só a data). */
  start: string;
  /** Rótulo curto pronto para o eixo ("jul", "22/07"). */
  label: string;
  open: number;
  fcr: number | null;
  reopen: number | null;
  slaCompliance: number | null;
  escalation: number | null;
}

/** ATIVOS CRÍTICOS (refeito 2026-09-09). Era três contagens soltas que não
 *  diziam o que fazer; agora é uma LEITURA + a lista do que exige ação.
 *  `withoutTicket` é o achado do card: ativo parado que ninguém abriu chamado.
 *  Separa EQUIPAMENTO de LICENÇA porque a ação é outra (reparar/trocar ×
 *  renovar). Respeita o filtro de unidade — ativo tem localidade. */
export interface DashboardCriticalAssets {
  total: number;
  withOpenTickets: number;
  withoutTicket: number;
  /** Quebra por natureza: equipamento parado × licença/software vencido. */
  equipment: number;
  licenses: number;
  /** Os que exigem ação primeiro (sem chamado antes, pior saúde antes). */
  items: {
    code: string;
    name: string;
    /** Motivo em uma frase ("inoperante desde a manutenção", "obsoleto"). */
    reason: string;
    localityName: string | null;
    health: number | null;
    hasOpenTicket: boolean;
  }[];
}

export interface DashboardOverview {
  referenceDate: string;
  windowDays: number; // janela dos deltas (7)
  /** Filtros EFETIVAMENTE aplicados (o backend normaliza o que veio na query). */
  filters: DashboardFilters;
  /** Categorias × times para o seletor de área (todas, não só as do recorte). */
  areas: DashboardAreaOption[];
  /** Unidades para o seletor (todas as cadastradas). */
  localities: { id: string; name: string }[];
  /** COMPOSIÇÃO por categoria na janela (2026-09-09): o mix da demanda, que o
   *  ranking de serviços não conta. Só categorias COM chamado no período —
   *  categoria vazia não vira fatia invisível (user). */
  categoryMix: { name: string; count: number }[];
  /** HISTÓRICO dos indicadores: os últimos períodos do mesmo tamanho do
   *  filtro (mês × mês, semana × semana…). Alimenta a linha miúda do tile e o
   *  bloco de histórico da ficha. `slaRisk` não entra: é foto do agora. */
  history: DashboardHistoryPoint[];
  kpis: {
    /** Chamados em estados abertos AGORA. A tendência é das ABERTURAS: novas
     *  na janela × novas na janela anterior (variação relativa, %). */
    open: { value: number; newInWindow: number; previousNew: number; deltaPct: number | null };
    /** Abertos com `slaRisk` at_risk/critical/breached — ITSM nativo (decisão
     *  2026-09-03). É foto do AGORA: não tem período anterior comparável, e por
     *  isso o tile dele não tem linha de história. */
    slaRisk: { value: number };
    /** FCR por REGISTROS: encerrados sem reabertura resolvidos no 1º nível ÷
     *  encerrados da janela. `previousPct` = a mesma conta na janela anterior;
     *  `deltaPp` em pontos percentuais. */
    fcr: KpiRate;
    /** REABERTURA — a contra-métrica do FCR: encerrar rápido não vale nada se o
     *  chamado volta. Só o solicitante reabre (2026-09-03). */
    reopen: KpiRate;
    /** CUMPRIMENTO DE SLA (2026-09-09): encerrados com `slaConsumedPct ≤ 100`
     *  ÷ encerrados da janela. */
    slaCompliance: KpiRate;
    /** ESCALONAMENTOS (2026-09-09): abertos na janela com evento `escalate` na
     *  trilha ÷ abertos na janela. Fecha o trio FCR · reabertura · escalonamento. */
    escalation: KpiRate;
  };
  /** Série SEMANAL (8 semanas) da saúde do atendimento — a leitura de TENDÊNCIA
   *  que os KPIs instantâneos não dão. `avgSlaPct` = % médio do SLA consumido na
   *  resolução (abaixo de 100 é dentro do prazo); `reopenPct` fecha o par com o
   *  tempo: rápido demais às custas de retrabalho aparece aqui. */
  weekly: { weekStart: string; avgSlaPct: number | null; resolved: number; reopenPct: number | null }[]; // 26 semanas
  /** AVALIAÇÃO do atendimento (CSAT, janela de 30d por registros). `count` vem
   *  junto porque média sem N não se lê (padrão número/motivo). */
  csat: { avg: number | null; count: number; windowDays: number; distribution: { score: number; count: number }[] };
  /** Backlog aberto por fila × capacidade configurada do grupo. */
  queues: { groupId: string; name: string; open: number; capacity: number }[];
  /** Serviços mais demandados no período. `reopened` (2026-09-09) cruza a
   *  reincidência com o volume: aponta onde a KB precisa de artigo. */
  topServices: { title: string; count: number; reopened: number }[];
  /** DISTRIBUIÇÃO POR CANAL (2026-09-09): aberturas por `channel` no período.
   *  `bela` marca os canais da bela (chat, widget, Teams, WhatsApp) — a fatia da
   *  demanda que entra por ela. */
  channels: { channel: string; label: string; count: number; bela: boolean }[];
  /** ATIVOS CRÍTICOS (2026-09-09): card previsto no Caderno §3.7.5 e ausente.
   *  Reuso das contagens de Assets — nada é recalculado com régua nova. */
  criticalAssets: DashboardCriticalAssets;
  /** VOLUME do período (2026-09-09: era 14 dias fixos, agora acompanha o
   *  filtro): abertos × encerrados por ponto; `breached` é a fatia dos
   *  encerrados que passou de 100% do SLA (user, 2026-09-03) — vive DENTRO da
   *  barra de encerrados, não como terceira barra. A granularidade se ajusta
   *  para o gráfico caber: dia, semana ou mês. */
  daily: { date: string; label: string; opened: number; closed: number; breached: number; previous: boolean }[];
  dailyGranularity: 'day' | 'week' | 'month';
}

/* ─────────────────────── deskone · discovery ────────────────────────────── */

/** Sugestão de reconciliação com ativo existente — camada BELA, DERIVADA no
 *  read por heurística (serial idêntico > hostname próximo); nunca coluna. */
export interface DiscoveryReconciliationDTO {
  assetId: string;
  assetCode: string;
  assetModel: string | null;
  confidence: number;
  reason: string;
}

export interface DiscoveredDeviceDTO {
  id: string;
  hostname: string;
  ip: string;
  mac: string | null;
  serial: string | null;
  model: string | null;
  category: string | null;
  source: string;
  seenAt: string;
  status: 'new' | 'imported' | 'ignored' | 'review';
  statusLabel: string;
  anomalies: string[];
  anomalyLabels: string[];
  /** null com BELA off no front (o dado nem é exibido) ou sem par plausível. */
  reconciliation: DiscoveryReconciliationDTO | null;
  importedAssetCode: string | null;
}

/**
 * Discovery (`GET /api/assets/discovery`) — staging pré-CMDB. RBAC §4.4:
 * analistas leem e enviam para revisão ("Restrito"); Importar/Vincular/Ignorar
 * escrevem na CMDB e são do Admin. `canWrite` diz ao front o que oferecer.
 */
export interface DiscoveryOverview {
  kpis: {
    /** Ativos com check-in nas 24h anteriores ao registro mais recente. */
    activeAgents: number;
    newDevices: number;
    pending: number;
    lastScanAt: string | null;
  };
  devices: DiscoveredDeviceDTO[];
  anomalySummary: { key: string; label: string; count: number }[];
  canWrite: boolean;
}

/* ───────────────────── deskone · configurações ──────────────────────────── */

/** Conector do ITSM (eixo separado do BelaConnector, que é do motor).
 *  "Latência alta" é DERIVADA (`latencyMs` > 800), nunca coluna. */
export interface DeskOneConnectorDTO {
  key: string;
  name: string;
  status: ConnectorStatus;
  statusLabel: string;
  endpoint: string | null;
  lastSyncAt: string | null;
  latencyMs: number | null;
  highLatency: boolean;
  errorText: string | null;
}

export interface DeskOneFlagDTO {
  key: string;
  label: string;
  description: string | null;
  state: 'active' | 'homolog' | 'disabled';
  stateLabel: string;
  /** Honestidade do protótipo: nenhum flag tem efeito real ainda — a tela diz. */
  effectNote: string;
}

/** Acesso às filas de um perfil (redesenho do user, 2026-08-24): o toggle liga
 *  o acesso; o escopo é o cruzamento categorias × níveis das filas cadastradas
 *  (nomes de Group "Categoria · Nível"). Lista VAZIA = sem restrição no eixo. */
export interface DeskOneQueueAccess {
  enabled: boolean;
  categories: string[];
  levels: string[];
}

/** Perfil de acesso do bela desk (DeskOneProfile no banco) — TODOS editáveis
 *  (não existe perfil "nativo" intocável; decisão do user 2026-08-24). Os que
 *  acompanham o produto nascem do seed espelhando o RBAC; o Admin edita tudo e
 *  cria perfis novos. `permissions` = { [DeskOnePermissionKey]: boolean }
 *  (catálogo fixo em DESKONE_PERMISSIONS). `users` = contagem real por key. */
export interface DeskOneProfileDTO {
  id: string;
  key: string;
  name: string;
  description: string | null;
  active: boolean;
  users: number;
  permissions: Record<string, boolean>;
  queueAccess: DeskOneQueueAccess;
  updatedAt: string;
}

/** Perfil de acesso do bela core (`GET /api/console/settings`). Sem filas. */
export interface BelaProfileDTO {
  id: string;
  key: string;
  name: string;
  description: string | null;
  active: boolean;
  users: number;
  /** { [BelaPermissionKey]: boolean } — catálogo fixo em BELA_PERMISSIONS. */
  permissions: Record<string, boolean>;
  updatedAt: string;
}

export interface ConsoleSettingsAuditDTO {
  id: string;
  auditCode: string;
  entityType: string;
  action: string;
  userName: string | null;
  reason: string | null;
  timestamp: string;
}

/** Configurações do bela core (2026-09-08): identidade + acesso da instância
 *  (aplicam na hora, fora do Publicar), perfis do core e a trilha recente. */
export interface ConsoleSettingsDTO {
  instance: {
    /** idioma e fuso da INTERFACE do bela core (preferências de quem
     *  administra) — os da bela contratada ficam na Administração. */
    language: string;
    timezone: string;
    ssoEnabled: boolean;
    ssoProvider: string;
    ssoProviderLabel: string;
    mfaRequired: boolean;
    sessionMinutes: number;
  };
  profiles: BelaProfileDTO[];
  audit: ConsoleSettingsAuditDTO[];
  /** Administrador bela escreve; Auditor lê. */
  canWrite: boolean;
}

/**
 * Configurações do DeskOne (`GET /api/deskone/config`, só Admin DeskOne).
 * `belaIntegrationEnabled` é o nível TENANT do interruptor (Caderno §4.1);
 * o nível DISPOSITIVO segue no front — efetivo = tenant && dispositivo.
 * O bit sozinho é público em `GET /api/deskone/bela` (governança, não segredo).
 */
/** Janela de AUSÊNCIA de um aprovador (férias): durante a vigência, as
 *  aprovações do titular nascem para o substituto. Status DERIVADO no backend
 *  pelo relógio REAL (feature viva): scheduled | active | ended. */
export type DelegationKind = 'approvals' | 'queue_management' | 'queue_operation' | 'administration';

/** Sub-funções da ADMINISTRAÇÃO (user, 2026-08-24): marcar "Administração do
 *  bela desk" abre um segundo seletor com QUAIS responsabilidades do admin vão
 *  na delegação — cada uma mapeia num guard/aba real das Configurações. */
export type DeskOneAdminScope = 'general' | 'profiles' | 'audit' | 'usage_close';

export interface ApprovalDelegationDTO {
  id: string;
  /** FUNÇÕES delegadas na janela (o titular escolhe quais): approvals redireciona
   *  de verdade; administration faz o backend aceitar o substituto (nos escopos
   *  de `adminScopes`) durante a vigência; os de fila registram a cobertura. */
  kinds: DelegationKind[];
  /** Só quando `kinds` inclui administration: as sub-funções do admin passadas. */
  adminScopes: DeskOneAdminScope[];
  /** Rótulos das funções, prontos para exibição ("Aprovações · Administração…"). */
  kindsLabel: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  status: 'scheduled' | 'active' | 'ended';
  statusLabel: string;
  endedEarlyAt: string | null;
  createdByName: string | null;
}

export interface DeskOneConfigOverview {
  belaIntegrationEnabled: boolean;
  connectors: DeskOneConnectorDTO[];
  flags: DeskOneFlagDTO[];
  /** Perfis do bela desk — todos editáveis (banco). Os perfis do Bela Core
   *  NÃO aparecem aqui: são geridos no próprio Console (user, 2026-08-24). */
  profiles: DeskOneProfileDTO[];
  /** Quadro de janelas de ausência (gestão do admin; 2026-08-24). */
  delegations: ApprovalDelegationDTO[];
  audit: AuditoriaGovernanceDTO[];
  /** Resumo da Integração GLPI para a linha do conector ("N de M escopos de
   *  escrita liberados" + link "Abrir integração"; 2026-08-31). */
  glpiScopes: { enabled: number; total: number };
}

/* ───────────────────── deskone · integração GLPI ────────────────────────── */

/** Um dos 7 domínios que o GLPI masteriza (Caderno §4.1 "fonte de verdade").
 *  `count` é DERIVADO dos registros na leitura — nunca coluna. `lastSyncAt` é
 *  o carimbo da última consulta à engine: o GET re-carimba quando o TTL vence
 *  (dentro do TTL a leitura sai do cache e o carimbo fica). */
export interface GlpiSyncDomainDTO {
  key: string;
  label: string;
  count: number;
  ttlSeconds: number;
  ttlLabel: string;
  lastSyncAt: string | null;
}

/** Verbo de ESCRITA da ponte bela desk → GLPI (§4.1 "leitura primeiro;
 *  escrita controlada e aprovada por escopo"). Demonstrativo (molde da seção
 *  de IA do Console): real no banco/trilha, zero guard nas rotas. */
export interface GlpiWriteScopeDTO {
  key: string;
  label: string;
  description: string | null;
  glpiEndpoint: string;
  enabled: boolean;
  updatedAt: string;
  updatedByName: string | null;
}

/** Mapeamento de campos GLPI ↔ bela desk de um domínio (leitura — o mapa é
 *  mantido pela fábrica; curado do que os mappers do backend REALMENTE fazem). */
export interface GlpiFieldMapDTO {
  domainKey: string;
  domainLabel: string;
  pairs: { glpi: string; desk: string }[];
}

/** `GET /api/deskone/glpi` (só Admin bela desk) — a tela Integração GLPI
 *  (docs/passo1/deskone-integracao-glpi.md). A CONEXÃO em si não vem aqui além
 *  do resumo do conector: endpoint/teste moram em Configurações. */
export interface GlpiIntegrationOverview {
  connector: DeskOneConnectorDTO | null;
  domains: GlpiSyncDomainDTO[];
  scopes: GlpiWriteScopeDTO[];
  fieldMap: GlpiFieldMapDTO[];
}

/* ───────────────── console · auditoria e monitoramento ──────────────────── */

/** Uma linha da trilha de interação (pergunta JÁ mascarada — §3.6). O
 *  `auditCode` (AUD-AAAAMMDD-XXXXXX) é DERIVADO de createdAt+id no mapper. */
export interface AuditoriaInteractionDTO {
  id: string;
  auditCode: string;
  createdAt: string;
  channel: InteractionChannel;
  channelLabel: string;
  userName: string | null;
  intent: string | null;
  question: string;
  outcome: InteractionOutcome;
  outcomeLabel: string;
  confidence: number | null;
  sourceSlug: string | null;
  mode: 'simulated' | 'live';
  durationMs: number | null;
}

/** Evento de GOVERNANÇA (AuditEvent — publicações, ativações, fechamentos). */
export interface AuditoriaGovernanceDTO {
  id: string;
  auditCode: string;
  entityType: string;
  action: string;
  userName: string | null;
  reason: string | null;
  timestamp: string;
}

/**
 * Auditoria e Monitoramento (`GET /api/console/auditoria`) — um GET para a
 * tela. Janelas por REGISTROS (relativas ao registro mais recente, nunca ao
 * relógio real). Retenção vem da CONFIG PUBLICADA de prod (Administração é a
 * fonte viva; a divergência 180d×365d dos docs-fonte segue sinalizada lá).
 */
export interface AuditoriaOverview {
  kpis: {
    interactionsLastDay: number;
    /** (respondida + autosserviço + resolvida sem chamado) ÷ turnos concluídos. */
    resolutionRatePct: number | null;
    /** chamados abertos ÷ turnos concluídos. */
    handoffRatePct: number | null;
    avgConfidence: number | null;
    automationErrorRatePct: number | null;
    windowEnd: string | null;
  };
  channels: { channel: InteractionChannel; channelLabel: string; count: number; pct: number }[];
  intents: { intent: string; count: number }[];
  interactions: AuditoriaInteractionDTO[];
  governance: AuditoriaGovernanceDTO[];
  connectors: { key: Connector; status: ConnectorStatus; statusLabel: string; lastSyncAt: string | null; errorText: string | null }[];
  criticalAlerts: { title: string; detail: string; severity: 'warning' | 'danger' }[];
  retention: { logsDays: number; auditDays: number; predictMonths: number; source: string };
}

/* ─────────────────────────────── knowledge base ─────────────────────────── */

export interface KbListItem {
  id: string;
  title: string;
  slug: string;
  status: KbStatus;
  statusLabel: string;
  categoryName: string | null;
  /** 1 frase — lista do Orienta + busca (corpus @bela/kb, agora no DB). */
  summary: string | null;
  /** 'usuario' | 'analista'. */
  audience: string | null;
  /** Termos de busca (RAG/Orienta). */
  tags: string[];
  /** Slugs do catálogo que o artigo apoia — chave do "Bela · Orienta". */
  serviceIds: string[];
  rating: number | null;
  usageInTickets: number;
  resolutionRate: number | null;
  updatedAt: string;
}

export interface KbArticleDTO extends KbListItem {
  body: string;
  ownerName: string | null;
  feedbackUp: number;
  feedbackDown: number;
}

/* ──────────────────────────────── predict ───────────────────────────────── */

export interface PredictSourceDTO {
  connectorId: string;
  sourceType: SourceType;
  entityType: string;
  fields: string[];
  refreshMode: RefreshMode;
  lastSyncStatus: SyncStatus;
  lastSyncAt: string | null;
}

export interface PredictChannelDTO {
  channelType: PublishChannelType;
  target: string;
  audience: string;
  enabled: boolean;
  fallbackChannel: string | null;
}

export interface PredictActionDTO {
  actionType: ActionType;
  label: string;
  requiresApproval: boolean;
  targetSystem: string | null;
  /** `human` recomenda (pessoa aceita/executa); `auto` executa no disparo e informa. */
  mode: 'human' | 'auto';
  target: string | null;
  /** o que notifica / o que comenta, com {campos}. */
  text: string | null;
  automationId: string | null;
  showCount: boolean;
  allowList: boolean;
}

export interface PredictRuleDTO {
  version: number;
  scoreThreshold: number;
  criticalThreshold: number;
  windowMinutes: number;
  frequency: string;
  conditions: unknown; // parsed from conditionsJson
  weights: unknown; // parsed from weightsJson
  /** Política antispam (VAL-09), parseada — o hub exibe na aba Configuração. */
  antispam: Record<string, unknown>;
}

/** Resumo de uma simulação do alerta (aba Simulação do hub). */
export interface PredictAlertSimulationDTO {
  id: string;
  ruleVersion: number;
  evaluatedItems: number;
  triggeredItems: number;
  precisionEstimate: number | null;
  status: SimulationStatus;
  executedByName: string | null;
  executedAt: string;
}

export interface PredictAlertDTO {
  id: string;
  name: string;
  description: string | null;
  module: BelaModule;
  severityBase: Severity;
  severityLabel: string;
  status: PredictStatus;
  statusLabel: string;
  environment: Environment;
  version: number;
  ownerName: string | null;
  templateName: string | null;
  updatedAt: string;
  rule: PredictRuleDTO | null;
  sources: PredictSourceDTO[];
  channels: PredictChannelDTO[];
  actions: PredictActionDTO[];
  simulations: PredictAlertSimulationDTO[];
}

export interface EvidenceDTO {
  source: string;
  field: string;
  value: string;
  explanation: string;
  visibleToUser: boolean;
}

export interface PredictExecutionDTO {
  id: string;
  alertId: string;
  evaluatedItemId: string;
  score: number;
  severity: Severity;
  generatedMessage: string;
  publishedChannels: string[];
  resultStatus: ExecutionResult;
  simulationId: string | null;
  ticketCode: string | null;
  createdAt: string;
  evidence: EvidenceDTO[];
}

export interface SimulationDTO {
  id: string;
  alertId: string;
  ruleVersion: number;
  evaluatedItems: number;
  triggeredItems: number;
  precisionEstimate: number | null;
  status: SimulationStatus;
  executedByName: string | null;
  executedAt: string;
  executions: PredictExecutionDTO[];
}

export interface AlertTemplateDTO {
  id: string;
  name: string;
  category: TemplateCategory;
  categoryLabel: string;
  description: string;
  requiredSources: string[];
  suggestedChannels: string[];
  suggestedSeverity: Severity;
  expectedResult: string | null;
}

export interface PredictAlertFilter {
  status?: PredictStatus;
  environment?: Environment;
}

export interface PredictExecutionFilter {
  alertId?: string;
  resultStatus?: ExecutionResult;
  page?: number;
  pageSize?: number;
}

/* ═══════════════════════ Console BELA — Admin e Governança ═══════════════════
 * Agregado de configuração do MOTOR (a tela `#/admin` do Console). Um GET traz
 * a config inteira do AMBIENTE ativo — a tela é um formulário grande, não uma
 * lista paginada, então quebrar em N chamadas só multiplicaria estados de
 * carregamento sem ganho. As escritas são por SEÇÃO (`PATCH .../:section`), que
 * é a granularidade da trilha de auditoria.
 */

export interface BelaChannelDTO {
  id: string;
  channel: BelaChannel;
  channelLabel: string;
  /** Nome de exibição (ex.: "WhatsApp Suporte") — null usa `channelLabel`.
   *  Vários canais do MESMO tipo podem coexistir desde 2026-08-20. */
  name: string | null;
  enabled: boolean;
  target: string | null;
  updatedAt: string;
}

export interface BelaModuleStateDTO {
  module: BelaModule;
  moduleLabel: string;
  /** Contratado pelo cliente. Um módulo NÃO contratado não pode ser habilitado —
   *  o toggle fica desabilitado com o motivo à vista (nunca some sem explicar). */
  contracted: boolean;
  enabled: boolean;
  note: string | null;
  updatedAt: string;
}

export interface BelaConnectorDTO {
  connector: Connector;
  connectorLabel: string;
  status: ConnectorStatus;
  statusLabel: string;
  authType: ConnectorAuthType;
  authTypeLabel: string;
  endpoint: string | null;
  scopes: string[];
  lastSyncAt: string | null;
  lastSyncStatus: SyncStatus;
  /** Motivo do estado `error` — o "motivo" do padrão número/motivo. */
  errorText: string | null;
  connectedByName: string | null;
  connectedAt: string | null;
  updatedAt: string;
}

export interface BelaFeatureFlagDTO {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  updatedAt: string;
}

export interface BelaGuardrailDTO {
  key: GuardrailKey;
  label: string;
  description: string | null;
  category: GuardrailCategory;
  categoryLabel: string;
  action: GuardrailAction;
  actionLabel: string;
  enabled: boolean;
  /** Parâmetro da regra (ex.: limiar de confiança). Serializado no banco. */
  params: Record<string, unknown>;
  /** A regra já é aplicada pelo motor? A tela DIZ isso — prometer efeito que não
   *  existe seria a interface mentindo (mesma classe do fallback silencioso da KB). */
  engineEnforced: boolean;
  updatedAt: string;
}

/** Status da plataforma — DERIVADO de sinal real, nunca lido de uma coluna.
 *  Traz motivo + fonte + timestamp (CLAUDE.md §2, padrão número/motivo). */
export interface PlatformStatusDTO {
  status: PlatformStatus;
  statusLabel: string;
  reason: string;
  /** Modo do cérebro no momento da leitura (`simulated` é o padrão do projeto). */
  engineMode: 'live' | 'simulated';
  checkedAt: string;
}

export interface BelaConfigDTO {
  id: string;
  name: string;
  language: string;
  timezone: string;
  environment: Environment;
  environmentLabel: string;
  /** Os ambientes que existem — o seletor do topo da tela. */
  environments: Environment[];
  // — segurança —
  ssoEnabled: boolean;
  ssoProvider: SsoProvider;
  ssoProviderLabel: string;
  mfaRequired: boolean;
  sessionMinutes: number;
  // — retenção —
  logsRetentionDays: number;
  auditRetentionDays: number;
  predictRetentionMonths: number;
  // — publicação —
  version: number;
  publishedAt: string | null;
  publishedByName: string | null;
  /** Quantas seções têm alteração posterior à última publicação. Deriva de
   *  comparar o `updatedAt` dos filhos com `publishedAt` — é o que torna o botão
   *  Publicar honesto em vez de enfeite. */
  pendingSections: ConfigSection[];
  /** Há uma versão publicada para restaurar (foto da última publicação).
   *  False = nunca publicada — "Descartar alterações" não tem para onde voltar. */
  canDiscard: boolean;
  updatedAt: string;
  // — seções —
  channels: BelaChannelDTO[];
  modules: BelaModuleStateDTO[];
  connectors: BelaConnectorDTO[];
  aiConfigs: BelaAiConfigDTO[];
  flags: BelaFeatureFlagDTO[];
  guardrails: BelaGuardrailDTO[];
  platform: PlatformStatusDTO;
}

/* ── Configurações de IA / LLM Gateway ────────────────────────────────────────
 * Seção 100% DEMONSTRATIVA (decisão 2026-08-20, molde dos Canais): config real
 * no banco, publicável e auditada, mas o MOTOR do protótipo segue simulado/
 * Ollama — nada aqui é lido pelo core, e a tela diz isso.
 */

/** Último teste de conexão de uma config de IA — número/motivo da linha. */
export interface AiTestDTO {
  result: AiTestResult;
  resultLabel: string;
  latencyMs: number | null;
  /** O que o teste concluiu, por extenso (sempre exibido). */
  message: string | null;
  testedAt: string;
}

export interface BelaAiConfigDTO {
  id: string;
  name: string;
  providerType: AiProviderType;
  providerTypeLabel: string;
  endpoint: string;
  authType: AiAuthType;
  authTypeLabel: string;
  /** SÓ a referência de cofre (`keyvault://…`) — nunca a chave (RS-01..02).
   *  É por isso que o campo pode existir no DTO. */
  credentialRef: string | null;
  llmModel: string;
  deploymentId: string;
  purposes: AiPurpose[];
  purposeLabels: string[];
  dataPolicy: AiDataPolicy;
  dataPolicyLabel: string;
  fallbackConfigId: string | null;
  /** Nome resolvido da config de fallback (ou null = "Nenhum fallback"). */
  fallbackName: string | null;
  status: AiConfigStatus;
  statusLabel: string;
  /** Null = nunca testada. */
  lastTest: AiTestDTO | null;
  createdByName: string | null;
  updatedAt: string;
}

/** Criar/editar uma configuração de IA (drawer da seção). */
export interface SaveAiConfigInput {
  name?: string;
  providerType?: AiProviderType;
  endpoint?: string;
  authType?: AiAuthType;
  credentialRef?: string | null;
  llmModel?: string;
  deploymentId?: string;
  purposes?: AiPurpose[];
  dataPolicy?: AiDataPolicy;
  fallbackConfigId?: string | null;
  status?: AiConfigStatus;
}

/** Resultado do teste de conexão avulso (sem gravar) — determinístico e local. */
export interface AiConfigTestResultDTO {
  ok: boolean;
  result: AiTestResult;
  resultLabel: string;
  latencyMs: number | null;
  message: string;
  checkedAt: string;
}

/** Uma entrada da trilha de publicação (lida do `AuditEvent` existente — sem
 *  tabela nova; o Predict já grava publicação assim). */
export interface BelaPublicationDTO {
  id: string;
  version: number;
  environment: Environment;
  publishedByName: string | null;
  sections: ConfigSection[];
  reason: string | null;
  publishedAt: string;
}

/* ── inputs (escrita) ─────────────────────────────────────────────────────── */

export interface UpdateGeneralInput {
  name?: string;
  language?: string;
  timezone?: string;
}
export interface UpdateSecurityInput {
  ssoEnabled?: boolean;
  ssoProvider?: SsoProvider;
  mfaRequired?: boolean;
  sessionMinutes?: number;
}
export interface UpdateRetentionInput {
  logsRetentionDays?: number;
  auditRetentionDays?: number;
  predictRetentionMonths?: number;
}
/** Edição de um canal EXISTENTE — resolvido por `id` (não mais por tipo:
 *  vários canais do mesmo tipo coexistem). */
export interface UpdateChannelInput {
  id: string;
  enabled?: boolean;
  name?: string | null;
  target?: string | null;
}
/** Cadastro de um canal novo (ex.: um segundo WhatsApp). */
export interface CreateChannelInput {
  channel: BelaChannel;
  name?: string | null;
  target?: string | null;
  enabled?: boolean;
}
export interface ToggleModuleInput {
  module: BelaModule;
  enabled: boolean;
}
export interface ToggleFlagInput {
  key: string;
  enabled: boolean;
}
export interface UpdateGuardrailInput {
  key: GuardrailKey;
  enabled?: boolean;
  action?: GuardrailAction;
  params?: Record<string, unknown>;
}
/** Conectar/editar um conector. Nenhuma credencial real trafega no protótipo:
 *  `secret` é fictício e NUNCA volta em nenhum GET. */
export interface ConnectConnectorInput {
  connector: Connector;
  authType: ConnectorAuthType;
  endpoint: string;
  secret?: string;
  scopes?: string[];
}
export interface PublishConfigInput {
  reason?: string;
}

/** Resultado do teste de conexão (determinístico — sem rede). */
export interface ConnectorTestResultDTO {
  connector: Connector;
  ok: boolean;
  status: ConnectorStatus;
  statusLabel: string;
  /** O que o teste concluiu, em PT-BR — sempre exibido, ok ou não. */
  message: string;
  checkedAt: string;
}

/* ══════════════════════ Console BELA — Automações ════════════════════════════
 * Tela `#/automacoes` (docs/passo1/console-automacoes.md): catálogo de ações
 * transacionais + governança + execuções. Um GET traz a visão inteira (mesmo
 * racional do config: a tela é um painel, não uma lista paginada). */

export interface AutomationRuleDTO {
  id: string;
  name: string;
  description: string | null;
  module: BelaModule;
  moduleLabel: string;
  category: string;
  targetSystem: string | null;
  trigger: string;
  actionType: ActionType;
  actionTypeLabel: string;
  risk: AutomationRisk;
  riskLabel: string;
  approvalPolicy: ApprovalPolicy;
  approvalPolicyLabel: string;
  prerequisites: string[];
  parameters: string[];
  validationSteps: string[];
  enabled: boolean;
  environment: Environment;
  environmentLabel: string;
  lastRunAt: string | null;
  updatedAt: string;
  /* ── configuração do fluxo ("Editar fluxo", Biblioteca §2.4) ─────────────── */
  triggerLabel: string;
  executor: AutomationExecutor;
  executorLabel: string;
  expectedResult: string | null;
  timeoutSec: number;
  maxAttempts: number;
  /** Perfis que podem solicitar; vazio = todos os que já alcançam a automação. */
  requesterProfiles: Profile[];
  /** Perfis que podem aprovar (só vale com `approvalPolicy` != none). */
  approverProfiles: Profile[];
  guardrailKeys: GuardrailKey[];
  maxPerDay: number | null;
  maxPerUserPerDay: number | null;
  restrictions: string | null;
  failurePolicy: AutomationFailurePolicy;
  failurePolicyLabel: string;
}

/**
 * Corpo do PATCH da automação. TODOS os campos são opcionais: o mesmo endpoint
 * atende o toggle da lista (só `enabled`) e o editor de fluxo (o resto). O que
 * não vier no corpo não é tocado.
 */
export interface UpdateAutomationInput {
  enabled?: boolean;
  name?: string;
  description?: string | null;
  category?: string;
  targetSystem?: string | null;
  environment?: Environment;
  trigger?: AutomationTrigger;
  actionType?: ActionType;
  executor?: AutomationExecutor;
  parameters?: string[];
  prerequisites?: string[];
  validationSteps?: string[];
  expectedResult?: string | null;
  timeoutSec?: number;
  maxAttempts?: number;
  risk?: AutomationRisk;
  approvalPolicy?: ApprovalPolicy;
  requesterProfiles?: Profile[];
  approverProfiles?: Profile[];
  guardrailKeys?: GuardrailKey[];
  maxPerDay?: number | null;
  maxPerUserPerDay?: number | null;
  restrictions?: string | null;
  failurePolicy?: AutomationFailurePolicy;
}

export interface AutomationExecutionDTO {
  id: string;
  ruleId: string;
  ruleName: string;
  status: AutomationExecutionStatus;
  statusLabel: string;
  /** Duração formatável no front; null enquanto pendente/aguardando. */
  durationMs: number | null;
  channel: string | null;
  requestedByName: string | null;
  /** Quem aprovou, quando a automação exige aprovação. */
  approvedByName: string | null;
  /** Valores usados na execução, por parâmetro. */
  parameters: Record<string, string>;
  /** Resumo do resultado OU motivo da falha — o "motivo" do padrão número/motivo. */
  resultText: string | null;
  isTest: boolean;
  executedAt: string;
}

/** KPIs do topo. Janela relativa ao REGISTRO mais recente (o seed congela o
 *  relógio em NOW fictício — "hoje" do relógio real estaria sempre vazio). O
 *  DTO carrega a janela para a tela dizer de onde o número veio. */
export interface AutomationKpisDTO {
  activeRules: number;
  totalRules: number;
  /** Execuções na janela de 24h que termina em `windowEnd`. */
  executionsLastDay: number;
  /** % de sucesso sobre execuções CONCLUÍDAS (sucesso+falha) da janela de 7 dias. */
  successRatePct: number | null;
  failures: number;
  windowEnd: string | null;
}

export interface AutomationsOverviewDTO {
  kpis: AutomationKpisDTO;
  rules: AutomationRuleDTO[];
  /** Últimas execuções, mais recente primeiro (limitada no backend). */
  executions: AutomationExecutionDTO[];
}

/** @deprecated Use `UpdateAutomationInput`. O PATCH passou a atender também o
 *  editor de fluxo (2026-09-11); o toggle é só o caso de um campo só. */
export interface ToggleAutomationInput {
  enabled: boolean;
}

/* ══════════════════════ Console BELA — Conhecimento e RAG ════════════════════
 * Curadoria da base vetorial. O conteúdo dos artigos vem de @bela/kb (JSON);
 * `articleSlug` referencia por slug — o front resolve o título localmente. */

export interface RagSourceDTO {
  id: string;
  name: string;
  kind: RagSourceKind;
  kindLabel: string;
  connector: Connector | null;
  connectorLabel: string | null;
  status: RagSourceStatus;
  statusLabel: string;
  permissionMode: RagPermissionMode;
  permissionModeLabel: string;
  /** Domínio/assunto da fonte (Caderno §3.6). Null = não declarado. */
  domain: string | null;
  ownerName: string | null;
  tags: string[];
  documentsIndexed: number;
  indexErrors: number;
  lastIndexedAt: string | null;
  errorText: string | null;
  /** ESCOPO do que a fonte lê (itens 75 e 76). Os campos que valem dependem do
   *  `kind` — ver RAG_SOURCE_SCOPE_FIELDS. */
  config: RagSourceConfig;
  syncSchedule: RagSyncSchedule;
  syncScheduleLabel: string;
  /** A CONEXÃO usada, como a Administração a configurou (item 75). Nulo quando
   *  a fonte é interna ou quando o conector não está configurado naquela
   *  instância — e aí a tela diz isso, em vez de fingir uma conexão. */
  connectionEndpoint: string | null;
  connectionStatus: ConnectorStatus | null;
  updatedAt: string;
}

export interface RagAnswerReviewDTO {
  id: string;
  question: string;
  confidencePct: number;
  /** POR QUE entrou na fila (item 66). Substitui a dedução que a tela fazia a
   *  partir de `articleSlug === null` — ver RAG_REVIEW_REASON. */
  reason: RagReviewReason;
  reasonLabel: string;
  /** Slug do artigo PRINCIPAL citado (@bela/kb). `null` = NENHUMA FONTE CITADA
   *  — e só isso. Não afirme lacuna de conhecimento a partir daqui (item 65):
   *  a causa pode ser fora de escopo, pergunta mal formulada ou recuperação que
   *  falhou. Quem diz o motivo é `reason`. */
  articleSlug: string | null;
  /** TODAS as fontes usadas na resposta, por slug. Contém a principal quando
   *  há uma. Vazio = a resposta não se apoiou em fonte nenhuma. */
  sources: string[];
  channel: string | null;
  askedByName: string | null;
  status: RagReviewStatus;
  statusLabel: string;
  /** A DECISÃO tomada (item 68). O status diz o desfecho; isto diz a conclusão
   *  — e duas conclusões opostas podem ter o mesmo desfecho. Nulo nas linhas em
   *  aberto e nas decididas antes do item 68. */
  decision: RagReviewDecision | null;
  decisionLabel: string | null;
  /** Quem decidiu — a trilha precisa do autor, não só do horário. */
  decidedByName: string | null;
  /** Artigos que a DECISÃO apontou como certos (slugs). Diferente de
   *  `sources`, que é o que a resposta usou. */
  decisionSources: string[];
  /** Quem recebeu a solicitação, quando a decisão delega trabalho. */
  assigneeName: string | null;
  resolutionNote: string | null;
  occurredAt: string;
  decidedAt: string | null;
}

export interface RagKpisDTO {
  activeSources: number;
  totalSources: number;
  documentsIndexed: number;
  indexErrors: number;
  /** Respostas aguardando curadoria (contagem de estado, imune a relógio). */
  openReviews: number;
  /** Limiar vigente do guardrail `min_confidence` da instância de PROD — a tela
   *  diz de onde as respostas de baixa confiança vêm (número/motivo). */
  confidenceThreshold: number | null;
}

/** Guardrail da instância que alcança as fontes (item 78). Só leitura aqui —
 *  quem liga e desliga é a Administração. */
export interface RagPolicyDTO {
  key: string;
  label: string;
  enabled: boolean;
}

export interface RagOverviewDTO {
  kpis: RagKpisDTO;
  sources: RagSourceDTO[];
  reviews: RagAnswerReviewDTO[];
  /** Políticas da instância que alcançam as fontes (item 78). */
  policies: RagPolicyDTO[];
}

export interface UpdateRagSourceInput {
  /** Pausar/retomar a fonte. */
  status?: 'active' | 'paused';
  /* CONFIGURAÇÃO (itens 74 a 76). Tudo opcional: o PATCH de pausar manda só o
     status, e o de configurar manda só o que mudou. */
  name?: string;
  domain?: string | null;
  permissionMode?: RagPermissionMode;
  syncSchedule?: RagSyncSchedule;
  tags?: string[];
  config?: RagSourceConfig;
}
export interface DecideRagReviewInput {
  /** `review` assume a linha; `approve`/`dismiss` continuam válidos e são o
   *  caminho curto da lista. Uma DECISÃO explícita (item 68) vem em `decision`
   *  e determina o status — quando ela vem, `action` é ignorada. */
  action?: 'review' | 'approve' | 'dismiss';
  decision?: RagReviewDecision;
  note?: string;
  /** Artigos da base associados à decisão, por slug (@bela/kb). */
  sources?: string[];
  /** Quem recebe a solicitação quando a decisão delega trabalho a uma pessoa
   *  — hoje só "criar artigo", porque a base de conhecimento é externa. */
  assignee?: string;
}

/* ══════════════════════ Consumo BELA e DeskOne (compartilhada) ═══════════════
 * Tela `#/consumo` — monta nos DOIS apps (decisão 2026-08-09: um componente,
 * dois mounts). Caderno §4.2.2: franquia vs consumo, excedente, unidades por
 * módulo, evidência auditável, fechamento mensal. O CONTRATO (plano/franquia/
 * preço) é dado comercial fictício definido no backend — não há tela que o
 * edite, então não virou entidade. */

export interface UsagePeriodDTO {
  period: string; // YYYY-MM
  label: string; // "Julho de 2026"
  closed: boolean;
}

export interface UsageUnitBreakdownDTO {
  unit: UsageUnit;
  unitLabel: string;
  /** O que a unidade mede (2026-09-08): módulos da bela em TOKENS; a parcela
   *  bela desk em usuários. Só `tokens` entra nos KPIs de franquia. */
  measure: 'tokens' | 'users';
  /** contratado na medida da unidade. `null` para tokens: a franquia é um
   *  BOLSÃO ÚNICO (2026-09-08), sem cota por unidade — só usuários têm o seu. */
  contracted: number | null;
  consumed: number;
  /** max(0, consumed - contracted) quando há contratado próprio; senão 0. */
  exceeded: number;
  /** fatia da unidade no total de tokens do período (0–100; 0 para usuários). */
  sharePct: number;
  /** itens (eventos auditáveis) por trás do consumo — tickets, consultas… */
  items: number;
  /** Chamadas da bela registradas nesta unidade no ciclo. TODAS consomem
   *  tokens da franquia — a dedup não se aplica ao token (Caderno §4.2.2 vs.
   *  medição em tokens, 2026-09-08). */
  calls: number;
  /** Como a unidade é contada: `per_origin` = uma vez por item no ciclo (a
   *  regra do §4.2.2); `per_event` = cada execução conta (a ressalva para
   *  automação e consulta RAG, que são transacionais). */
  dedupMode: 'per_origin' | 'per_event';
  /** A contagem JÁ DEDUPLICADA de itens trabalhados. Para `per_origin` é o
   *  número de origens distintas; para `per_event`, igual a `calls`. É este o
   *  número que responde "quantos tickets a bela assistiu neste ciclo". */
  dedupedUnits: number;
}

export interface UsageEvidenceDTO {
  id: string;
  unit: UsageUnit;
  unitLabel: string;
  originType: string;
  originId: string;
  channel: string | null;
  occurredAt: string;
  /** tokens da chamada (entrada + saída) — o que foi cobrado deste evento. */
  tokensIn: number;
  tokensOut: number;
  tokens: number;
  /** Chave de deduplicação do ciclo — é ela que o banco usa para recusar a
   *  segunda cobrança da mesma unidade (Caderno §4.2.2). Exibida na evidência
   *  para que a regra seja auditável linha a linha, não só declarada. */
  dedupKey: string;
}

export interface UsageKpisDTO {
  /** tokens medidos no período (só módulos da bela). */
  consumed: number;
  /** franquia de tokens contratada (soma das cotas por unidade). */
  franchise: number;
  /** % da franquia utilizada (0–100+; pode passar de 100). */
  franchisePct: number;
  exceeded: number;
  /** Valor estimado do excedente (tokens excedentes ÷ 1.000 × preço por mil). */
  exceededValueBRL: number;
}

export interface UsageContractDTO {
  plan: string; // "bela Enterprise" (fictício)
  /** franquia mensal de tokens. */
  franchiseTotal: number;
  /** preço do excedente, por MIL tokens (R$). */
  overagePer1kTokensBRL: number;
}

export interface UsageDailyPointDTO {
  day: number; // 1..31
  total: number;
}

export interface UsageOverviewDTO {
  period: string;
  periodLabel: string;
  closed: boolean;
  /** Por quem/quando o período foi fechado (trilha), quando fechado. */
  closedByName: string | null;
  closedAt: string | null;
  periods: UsagePeriodDTO[];
  kpis: UsageKpisDTO;
  contract: UsageContractDTO;
  units: UsageUnitBreakdownDTO[];
  daily: UsageDailyPointDTO[];
  /** Últimos eventos individuais do período (evidência auditável, drill). */
  evidence: UsageEvidenceDTO[];
}

export interface ClosePeriodInput {
  period: string;
}

/* ══════════════════════ Predict Center — hub (Fase 5) ════════════════════════
 * Visão consolidada (PC-F02) + governança de status (§9.2, VAL-02..07). A
 * escrita de criação/simulação chega com o wizard e os drawers. */

export interface PredictKpisDTO {
  activeAlerts: number;
  totalAlerts: number;
  /** Disparos REAIS (publicados) na janela de registros carregada. */
  publishedTriggers: number;
  suppressedTriggers: number;
  failedTriggers: number;
  /** Precisão média estimada das simulações concluídas (0–100). */
  avgPrecisionPct: number | null;
  /** Unidades `predict_item_evaluated` do período de consumo mais recente —
   *  decisão #7: execução real cobra, simulação não. */
  consumedUnits: number;
  consumptionPeriod: string | null;
}

export interface PredictOverviewDTO {
  kpis: PredictKpisDTO;
  alerts: PredictAlertDTO[];
}

/** Auditoria contextual do alerta (PC-F06) — lida do AuditEvent. */
export interface PredictAuditEntryDTO {
  id: string;
  action: string;
  userName: string | null;
  reason: string | null;
  after: Record<string, unknown>;
  timestamp: string;
}

/** Verbos de governança do hub (transições §9.2). A criação/edição de conteúdo
 *  do alerta é do wizard; aqui muda-se só o ESTADO, com as VAL validadas. */
export interface ChangeAlertStatusInput {
  action: 'submit_homolog' | 'activate' | 'pause' | 'resume' | 'archive';
}


/** Input do wizard + Novo alerta (spec §8 NOV-F01..F10). O alerta nasce SEMPRE
 *  Rascunho — ativar é outro verbo (com as VAL). VAL-01 validada no backend. */
export interface CreateAlertInput {
  name: string;
  description?: string;
  severityBase?: Severity;
  environment?: Environment;
  rule?: {
    conditions?: Record<string, unknown>;
    weights?: Record<string, number>;
    scoreThreshold?: number;
    criticalThreshold?: number;
    windowMinutes?: number;
    frequency?: string;
    antispam?: { windowMinutes?: number; maxPerItem?: number };
  };
  sources?: {
    connectorId: string;
    sourceType: string;
    entityType: string;
    fields?: string[];
    refreshMode?: string;
  }[];
  channels?: {
    channelType: string;
    target?: string;
    audience?: string;
    enabled?: boolean;
    fallbackChannel?: string | null;
  }[];
  /** Mensagem do alerta (NOV-F05) — vira o template dos canais. */
  messageTemplate?: string;
  action?: {
    actionType?: string;
    label?: string;
    requiresApproval?: boolean;
    mode?: 'human' | 'auto';
    target?: string | null;
    text?: string | null;
    automationId?: string | null;
    showCount?: boolean;
    allowList?: boolean;
    targetSystem?: string | null;
  };
}

/* ─────────────────── Visões salvas de tabela (Caderno §4.2/§4.5) ─────────────
 * "Salvar visão" é requisito do PADRÃO VISUAL de tabela, não de uma tela — por
 * isso o contrato é genérico por `screen` e o conteúdo do filtro fica opaco
 * (`filters`): cada tela conhece o seu conjunto e valida o que aplica. */

/** Uma visão salva, como a tela a recebe. */
export interface SavedViewDTO {
  id: string;
  /** Tela dona da visão: "lista-tickets" | "assets". */
  screen: string;
  name: string;
  /** Filtros da tela. Formato definido pela tela que salvou. */
  filters: Record<string, unknown>;
  updatedAt: string;
}

/** Corpo de `POST /api/views`. O dono sai da persona, nunca do corpo. */
export interface SaveViewInput {
  screen: string;
  name: string;
  filters: Record<string, unknown>;
}
