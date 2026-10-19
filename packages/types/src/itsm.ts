/**
 * ITSM domain vocabulary — the string unions stored (as `String`) on the
 * ITSM-native entities of the Prisma schema (@bela/db).
 *
 * Anchored in the source docs:
 *  - Perfis/permissionamento: Caderno §4.3 (+ Predict profiles, CLAUDE.md §8).
 *  - Campos mínimos de Ticket/Asset/etc.: Caderno §3.7.2.
 *  - Canonical ITSM abstraction (ITSM-agnostic layer): Caderno §9.
 */

import type { LabelMap } from './common';

/* ─────────────────────────── Perfis (Caderno §4.3 + CLAUDE.md §8) ─────────────
 * The 10 personas the seed must cover. Kept ITSM-agnostic: these are DeskOne +
 * BELA/Console profiles, not GLPI roles. RBAC is validated in the backend
 * (Caderno §4.3: "backend deve validar as permissões novamente"). */
export const PROFILE = [
  'end_user', // Usuário final — Catálogo, Nova Solicitação, Meus Tickets, KB.
  'approver_manager', // Gestor aprovador — + Aprovações e visão da equipe.
  'analyst_n1', // Analista N1 — fila, detalhe, KB, dashboard limitado.
  'analyst_n2', // Analista N2 — + assets, histórico técnico, solução.
  'analyst_n3', // Analista N3 — atuação avançada, escalonamento.
  'ops_manager', // Gestor de operação — dashboards, filas, SLA, relatórios.
  'admin_deskone', // Administrador DeskOne — todas as telas, config, logs.
  'admin_bela', // Administrador BELA — Console: motor, conectores, guardrails.
  'predict_curator', // Curador/Analista Predict — configura regras/score (não aprova).
  'auditor', // Auditor/Compliance — histórico, versões, evidências, logs.
] as const;
export type Profile = (typeof PROFILE)[number];
export const PROFILE_LABELS: LabelMap<Profile> = {
  end_user: 'Usuário final',
  approver_manager: 'Gestor aprovador',
  analyst_n1: 'Analista N1',
  analyst_n2: 'Analista N2',
  analyst_n3: 'Analista N3',
  ops_manager: 'Gestor de operação',
  admin_deskone: 'Administrador bela desk',
  // "core" explícito (user, 2026-09-11): o par tinha "desk" de um lado e nada
  // do outro, então os dois administradores liam quase igual. Este mapa é a
  // taxonomia de PERFIL (aparece como cargo do autor nas mensagens do chamado);
  // o cargo da persona no switcher usa a forma curta "Admin. bela core".
  admin_bela: 'Administrador bela core',
  predict_curator: 'Curador Predict',
  auditor: 'Auditor / Compliance',
};

/** Which app each profile signs into (CLAUDE.md §1 / standalone-arch memory:
 *  two apps, two logins). Predict/BELA-admin/auditor live in the Console. */
export const CONSOLE_PROFILES: readonly Profile[] = [
  'admin_bela',
  'predict_curator',
  'auditor',
];

/**
 * RBAC — quem pode ATUAR como RESPONSÁVEL sobre um ticket da fila (assumir,
 * atribuir, escalar, mudar estado, resolver, ENCERRAR, responder como analista).
 * Validado no BACKEND (Caderno §4.3: "backend deve validar as permissões
 * novamente" — o filtro do front é UX, não a fronteira de segurança). O Gestor
 * aprovador NÃO é operador de fila (CLAUDE.md §6): ele decide aprovações. */
export const WORK_QUEUE_PROFILES: readonly Profile[] = [
  'analyst_n1',
  'analyst_n2',
  'analyst_n3',
  // ops_manager SAIU (decisão 2026-08-19): o gestor de operação ACOMPANHA a
  // fila da sua equipe, não atua — o verbo dele é "pedir atuação" de um membro
  // (POST /api/tickets/:id/notify). admin segue operador (governança).
  'admin_deskone',
];

/** RBAC — quem pode DECIDIR uma aprovação (aprovar/reprovar/devolver/pedir
 *  evidência/delegar). Gestor aprovador + operação + admin. */
export const APPROVER_PROFILES: readonly Profile[] = [
  'approver_manager',
  'ops_manager',
  'admin_deskone',
];

/** True se o perfil pode operar a fila (responsável). */
export function canWorkQueue(profile: Profile): boolean {
  return WORK_QUEUE_PROFILES.includes(profile);
}
/** True se o perfil pode decidir aprovações. */
export function canApprove(profile: Profile): boolean {
  return APPROVER_PROFILES.includes(profile);
}

/* ───────────────── Perfis do bela desk · matriz de permissões ────────────────
 * Catálogo FIXO de permissões editáveis nas Configurações (Caderno §4.3/§4.4).
 * As chaves nomeiam alçadas que o produto REALMENTE tem (telas/verbos deste
 * protótipo) — nada de permissão decorativa sem superfície correspondente.
 * A matriz por perfil vive no banco (DeskOneProfile.permissionsJson); os
 * DEFAULTS abaixo espelham o RBAC que o backend aplica (WORK_QUEUE_PROFILES,
 * APPROVER_PROFILES e os guards por rota) — fonte única para o seed. */

export const DESKONE_PERMISSIONS = [
  // — Suporte (lado solicitante) —
  { key: 'open_tickets', label: 'Abrir chamados', area: 'Suporte' },
  { key: 'track_own_tickets', label: 'Acompanhar os próprios chamados', area: 'Suporte' },
  { key: 'kb_read', label: 'Consultar a Base de conhecimento', area: 'Suporte' },
  // Terceiros (2026-08-27): abrir EM NOME de outra pessoa ou DA EQUIPE
  // (institucional). Colaborador abre so para si — quem opera o service desk e
  // que pede pelos outros, e e essa permissao que separa os dois casos.
  { key: 'open_for_others', label: 'Abrir ticket para terceiros (outra pessoa ou a equipe)', area: 'Suporte' },
  // — Operação —
  { key: 'work_queue', label: 'Trabalhar a fila da equipe (assumir, responder, resolver, escalar)', area: 'Operação' },
  { key: 'view_queues', label: 'Acompanhar as filas (visão de gestão)', area: 'Operação' },
  { key: 'decide_approvals', label: 'Decidir aprovações', area: 'Operação' },
  { key: 'view_dashboard', label: 'Dashboard operacional', area: 'Operação' },
  // — Ativos —
  { key: 'manage_assets', label: 'Assets/CMDB (inventário e detalhe)', area: 'Ativos' },
  { key: 'discovery_review', label: 'Discovery — revisar e enviar para revisão', area: 'Ativos' },
  { key: 'discovery_import', label: 'Discovery — importar e vincular à CMDB', area: 'Ativos' },
  // — Governança —
  { key: 'view_usage', label: 'Consumo (medição bela e bela desk)', area: 'Governança' },
  { key: 'close_usage', label: 'Fechar período de consumo', area: 'Governança' },
  { key: 'admin_settings', label: 'Configurações do bela desk (tenant, conectores, perfis)', area: 'Governança' },
] as const;
export type DeskOnePermissionKey = (typeof DESKONE_PERMISSIONS)[number]['key'];
export const DESKONE_PERMISSION_AREAS = ['Suporte', 'Operação', 'Ativos', 'Governança'] as const;

/** Perfis que fazem login no bela desk (os do Console não entram na matriz). */
export const DESKONE_PROFILES: readonly Profile[] = [
  'end_user', 'approver_manager', 'analyst_n1', 'analyst_n2', 'analyst_n3', 'ops_manager', 'admin_deskone',
];

const SUPORTE: DeskOnePermissionKey[] = ['open_tickets', 'track_own_tickets', 'kb_read'];
const ANALISTA: DeskOnePermissionKey[] = [...SUPORTE, 'open_for_others', 'work_queue', 'view_dashboard', 'manage_assets', 'discovery_review'];

/** Matriz DEFAULT por perfil nativo — espelha o RBAC aplicado pelo backend
 *  (é o que o seed grava; a partir daí a edição do Admin vive no banco). */
export const DESKONE_DEFAULT_PERMISSIONS: Record<string, DeskOnePermissionKey[]> = {
  end_user: SUPORTE,
  approver_manager: [...SUPORTE, 'open_for_others', 'decide_approvals', 'view_dashboard', 'view_usage'],
  analyst_n1: ANALISTA,
  analyst_n2: ANALISTA,
  analyst_n3: ANALISTA,
  ops_manager: [...SUPORTE, 'open_for_others', 'view_queues', 'decide_approvals', 'view_dashboard', 'manage_assets', 'discovery_review', 'view_usage'],
  admin_deskone: DESKONE_PERMISSIONS.map((p) => p.key),
};

/* ───────────────────────── Ticket status (espinha do ticket) ─────────────────
 * The lifecycle the demo must show (task brief): aberto → triado → em
 * atendimento → aguardando aprovação → resolvido → reaberto. "SLA em risco" is
 * NOT a status — it is a computed risk (see `SLA_RISK`), kept separate per the
 * number/motivo pattern (CLAUDE.md §2). */
export const TICKET_STATUS = [
  'open', // Aberto — recém-criado, ainda não triado.
  'triaged', // Triado — categorizado/priorizado (pela BELA ou analista).
  'in_progress', // Em atendimento — com um grupo/analista.
  'waiting_requester', // Aguardando solicitante — devolvido para informação.
  'waiting_approval', // Aguardando aprovação — travado num Approval.
  'resolved', // Resolvido — solução aplicada, aguarda confirmação/fechamento.
  'closed', // Encerrado — finalizado.
  'reopened', // Reaberto — reincidência após resolução.
] as const;
export type TicketStatus = (typeof TICKET_STATUS)[number];
export const TICKET_STATUS_LABELS: LabelMap<TicketStatus> = {
  open: 'Aberto',
  triaged: 'Triado',
  in_progress: 'Em atendimento',
  waiting_requester: 'Aguardando solicitante',
  waiting_approval: 'Aguardando aprovação',
  resolved: 'Resolvido',
  closed: 'Encerrado',
  reopened: 'Reaberto',
};

/** Vocabulário do USUÁRIO FINAL (decisão 2026-08-23): 6 rótulos, na perspectiva
 *  do solicitante — triado+em atendimento = "Aguardando atendimento",
 *  resolvido+encerrado = "Encerrado". Usado nas telas .a e no chat da bela
 *  (contexto "meus chamados"); a OPERAÇÃO segue com os 8 acima.
 *  Espelhado em @bela/ui `tickets/status.ts` (o front evita a dependência). */
export const USER_TICKET_STATUS_LABELS: LabelMap<TicketStatus> = {
  open: 'aberto',
  triaged: 'aguardando atendimento',
  in_progress: 'aguardando atendimento',
  waiting_requester: 'necessita sua resposta',
  waiting_approval: 'aguardando aprovação',
  // Ver o gêmeo em packages/ui/src/tickets/status.ts: resolvido PEDE AÇÃO do
  // solicitante desde 28/08 (avaliar ou reabrir), encerrado não pede nada.
  resolved: 'resolvido',
  closed: 'encerrado',
  reopened: 'reaberto',
};

/** Computed SLA/risk band — the "number/status" half (CLAUDE.md §2). Maps to
 *  the design-system Status tokens in the UI; kept as domain values here. */
export const SLA_RISK = ['on_track', 'at_risk', 'critical', 'breached'] as const;
export type SlaRisk = (typeof SLA_RISK)[number];
export const SLA_RISK_LABELS: LabelMap<SlaRisk> = {
  on_track: 'no prazo',
  at_risk: 'em risco',
  critical: 'crítico',
  breached: 'atrasado',
};

/**
 * Faixa de prazo do SLA que o CARD do catálogo exibe ("SLA 4h"), derivada de
 * `Sla.targetResolutionMinutes` — NÃO é o nome da política de SLA (`Sla.name`,
 * ex.: "Crítico 24x7 (4h)"), que é a governança por trás. Duas políticas podem
 * cair na mesma faixa; o card mostra o prazo, o ticket mostra a política.
 */
export const SLA_TIER = ['2h', '4h', '1d', '2d', '3d'] as const;
export type SlaTier = (typeof SLA_TIER)[number];
export const SLA_TIER_LABELS: LabelMap<SlaTier> = {
  '2h': '2h',
  '4h': '4h',
  '1d': '1 dia',
  '2d': '2 dias',
  '3d': '3 dias',
};
/** Minutos de resolução → faixa exibida. `null` quando o serviço não tem SLA
 *  (ou o alvo não casa nenhuma faixa canônica) — o card então omite o prazo. */
export function slaTierFromMinutes(minutes: number | null | undefined): SlaTier | null {
  switch (minutes) {
    case 120: return '2h';
    case 240: return '4h';
    case 480: return '1d';
    case 960: return '2d';
    case 1440: return '3d';
    default: return null;
  }
}

/** Priority / impact / urgency (Caderno §3.7.2, §3.7.3). Nova Solicitação
 *  derives priority from a fixed impact×urgency matrix (never inferred → no
 *  confidence badge, per the project badge rule). */
export const PRIORITY = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof PRIORITY)[number];
export const PRIORITY_LABELS: LabelMap<Priority> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const IMPACT = ['low', 'medium', 'high'] as const;
export type Impact = (typeof IMPACT)[number];
export const IMPACT_LABELS: LabelMap<Impact> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};

export const URGENCY = ['low', 'medium', 'high'] as const;
export type Urgency = (typeof URGENCY)[number];
export const URGENCY_LABELS: LabelMap<Urgency> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

/** Canal de origem do ticket. São DOIS mundos (user, 2026-09-09): o catálogo
 *  de serviços, que é a porta nativa do ITSM, e o **bela chat**, que é UM só e
 *  aparece em quatro superfícies — portal, widget web, Teams e WhatsApp. Por
 *  isso os rótulos nomeiam a família ("bela chat · Teams"): quem lê precisa
 *  ver que é a mesma bela em lugares diferentes, não quatro produtos.
 *
 *  PORTAL não é canal irmão do catálogo: o portal é ONDE a bela roda dentro do
 *  desk (era o valor `portal` solto, removido em 2026-09-09 — a UI grava
 *  `catalog` quando o pedido vem de um card, e todo pedido vem de um card).
 *
 *  E-MAIL SAIU (user, 2026-09-09). O Caderno não tem e-mail como entrada em
 *  lugar nenhum: ele aparece como o que a bela REDUZ ("reduz e-mails e
 *  perguntas repetidas") e como canal de SAÍDA de alerta do Predict ("envio
 *  de alertas para Teams, WhatsApp ou e-mail"). O valor tinha nascido aqui com
 *  o comentário "e-mail inbound", sem lastro documental, e o seed dava a ele
 *  ~20% da demanda. O `email` de PublishChannelType (predict.ts) continua — lá
 *  é saída, e é o que o documento sustenta. */
export const TICKET_CHANNEL = [
  'catalog', // Catálogo de serviços — a porta NATIVA do ITSM, sem bela.
  // As quatro SUPERFÍCIES do bela chat. Espelham `BELA_CHANNEL` do Console
  // (onde a bela está disponível): portal, widget web, Teams e WhatsApp.
  'bela_chat', // bela chat no PORTAL do bela desk (a chave é histórica).
  'widget_web', // bela chat no widget web (site/página hospedeira).
  'teams', // bela chat no Microsoft Teams (§3.3, obrigatório).
  'whatsapp', // bela chat no WhatsApp Business (§3.3, obrigatório).
] as const;
export type TicketChannel = (typeof TICKET_CHANNEL)[number];

/* PARA QUEM é o pedido (decisão do dono, 2026-08-27). Não é o mesmo eixo de
 * "quem abriu": um analista pode abrir para si (pessoal), para a operação
 * (institucional — compra em lote, renovação de licença) ou para outra pessoa.
 * Só `institutional` vai para a tela "Tickets da equipe", onde QUALQUER membro
 * do grupo responde — o pedido coletivo não fica preso na caixa de quem abriu. */
export const TICKET_OWNERSHIP = ['personal', 'institutional', 'other_user'] as const;
export type TicketOwnership = (typeof TICKET_OWNERSHIP)[number];
export const TICKET_OWNERSHIP_LABELS: LabelMap<TicketOwnership> = {
  personal: 'Para mim',
  institutional: 'Institucional',
  other_user: 'Para outra pessoa',
};
/** Rótulo curto para a TAG do cartão/lista (o campo vira etiqueta depois de
 *  escolhido — pedido do dono: "estilo pesquisa, que depois fica a tag"). */
export const TICKET_OWNERSHIP_TAGS: LabelMap<TicketOwnership> = {
  personal: 'pessoal',
  institutional: 'institucional',
  other_user: 'para outra pessoa',
};
export const TICKET_CHANNEL_LABELS: LabelMap<TicketChannel> = {
  catalog: 'Catálogo de serviços',
  bela_chat: 'bela chat · portal',
  widget_web: 'bela chat · widget web',
  teams: 'bela chat · Teams',
  whatsapp: 'bela chat · WhatsApp',
};

/** Followup/message kind (Detalhe do Ticket: conversa chat). Distinguishes the
 *  responsible group (ITSM-native) from the individual message sender. */
export const MESSAGE_KIND = ['user', 'analyst', 'system', 'bela'] as const;
export type MessageKind = (typeof MESSAGE_KIND)[number];

/** Approval decision states — Aprovações tabs "Aguardando minha decisão /
 *  Devolvidas ao solicitante / Decididas" + row actions Aprovar / Pedir
 *  evidência / Reprovar (Caderno §4.2, §4.3; CLAUDE.md §6). */
export const APPROVAL_STATUS = [
  'pending', // Aguardando minha decisão.
  'info_requested', // Devolvida ao solicitante (Pedir evidência).
  'approved', // Aprovada.
  'rejected', // Reprovada.
  'delegated', // Delegada a outro aprovador (Caderno §4.2: delegação).
  'expired', // Prazo vencido sem decisão.
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUS)[number];
export const APPROVAL_STATUS_LABELS: LabelMap<ApprovalStatus> = {
  pending: 'Aguardando decisão',
  info_requested: 'Devolvida ao solicitante',
  approved: 'Aprovada',
  rejected: 'Reprovada',
  delegated: 'Delegada',
  expired: 'Vencida',
};

/* ───────────────────────────── Assets / CMDB (Caderno §3.7.2) ────────────────
 * asset id, hostname, serial, owner, localidade, criticidade, lifecycle,
 * garantia, contrato, agente/discovery, último check-in, vínculos com tickets. */
export const ASSET_LIFECYCLE = [
  'in_use', // Em uso.
  'in_stock', // Em estoque.
  'maintenance', // Em manutenção.
  'obsolete', // Obsoleto (fora do ciclo, ainda em uso).
  'retired', // Descartado / baixado.
] as const;
export type AssetLifecycle = (typeof ASSET_LIFECYCLE)[number];
export const ASSET_LIFECYCLE_LABELS: LabelMap<AssetLifecycle> = {
  in_use: 'Em uso',
  in_stock: 'Em estoque',
  maintenance: 'Em manutenção',
  obsolete: 'Obsoleto',
  retired: 'Descartado',
};

/** ITSM-native operational status (CMDB rawStatus Ativo/Inativo, assets/data.ts). */
export const ASSET_STATUS = ['operational', 'inactive', 'maintenance'] as const;
export type AssetStatus = (typeof ASSET_STATUS)[number];
export const ASSET_STATUS_LABELS: LabelMap<AssetStatus> = {
  operational: 'Ativo',
  inactive: 'Inativo',
  maintenance: 'Em manutenção',
};

/**
 * Criticality band (BIA). Caderno cites "Criticidade BIA" as a concept but does
 * NOT define the rule/formula (CLAUDE.md §9 — DOCUMENTED GAP). We store the
 * band as a field; the derivation rule stays undefined until the user provides
 * it. Same for asset "health" score % (formula undefined — a numeric field, no
 * enum). Reused for user/area criticality and Predict severity_base.
 */
export const CRITICALITY = ['low', 'medium', 'high', 'critical'] as const;
export type Criticality = (typeof CRITICALITY)[number];
export const CRITICALITY_LABELS: LabelMap<Criticality> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

/** KB article status (Caderno §3.7.2: artigo, categoria, owner, avaliação, uso). */
export const KB_STATUS = ['draft', 'published', 'review', 'archived'] as const;
export type KbStatus = (typeof KB_STATUS)[number];
export const KB_STATUS_LABELS: LabelMap<KbStatus> = {
  draft: 'Rascunho',
  published: 'Publicado',
  review: 'Em revisão',
  archived: 'Arquivado',
};

/* ── Perfis e permissões do bela core (2026-09-08) ────────────────────────────
 * Catálogo FIXO da matriz editável em Configurações do bela core. A matriz por
 * perfil vive no banco (BelaProfile.permissionsJson); os DEFAULTS abaixo
 * espelham o RBAC que o backend aplica (CONSOLE_ADMIN/CONSOLE_READERS e os
 * guards do Predict) — fonte única para o seed. */
export const BELA_PERMISSIONS = [
  // — Governança —
  { key: 'admin_config', label: 'Administração da bela (canais, módulos, conectores, LLM, guardrails)', area: 'Governança' },
  { key: 'publish_config', label: 'Publicar e descartar alterações', area: 'Governança' },
  { key: 'manage_settings', label: 'Configurações do bela core (instância, acesso, perfis)', area: 'Governança' },
  // — Conhecimento e automações —
  { key: 'manage_knowledge', label: 'Conhecimento (fontes, curadoria, reindexação)', area: 'Conhecimento e automações' },
  { key: 'manage_automations', label: 'Automações (criar, editar, testar)', area: 'Conhecimento e automações' },
  { key: 'approve_automations', label: 'Aprovar e ativar automações', area: 'Conhecimento e automações' },
  // — Consumo —
  { key: 'view_usage', label: 'Consumo (medição de tokens)', area: 'Consumo' },
  { key: 'close_usage', label: 'Fechar período de consumo', area: 'Consumo' },
  // — Auditoria —
  { key: 'view_audit', label: 'Auditoria e monitoramento (leitura)', area: 'Auditoria' },
  { key: 'export_audit', label: 'Exportar evidências', area: 'Auditoria' },
  // — Predict —
  { key: 'predict_view', label: 'Predict — ver alertas publicados', area: 'Predict' },
  { key: 'predict_configure', label: 'Predict — configurar regras e score, simular', area: 'Predict' },
  { key: 'predict_activate', label: 'Predict — ativar em produção', area: 'Predict' },
] as const;
export type BelaPermissionKey = (typeof BELA_PERMISSIONS)[number]['key'];
export const BELA_PERMISSION_AREAS = ['Governança', 'Conhecimento e automações', 'Consumo', 'Auditoria', 'Predict'] as const;

/** Perfis que fazem login no bela core. */
export const BELA_PROFILES: readonly Profile[] = ['admin_bela', 'predict_curator', 'auditor'];

/** Matriz DEFAULT por perfil nativo — o que o seed grava. */
export const BELA_DEFAULT_PERMISSIONS: Record<string, BelaPermissionKey[]> = {
  admin_bela: BELA_PERMISSIONS.map((p) => p.key),
  predict_curator: ['predict_view', 'predict_configure', 'view_audit'],
  auditor: ['view_usage', 'view_audit', 'export_audit', 'predict_view'],
};
