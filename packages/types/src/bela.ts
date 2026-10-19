/**
 * BELA transversal vocabulary — origin classification, modules, automations,
 * usage metering and audit. Anchored in CLAUDE.md §2 (ITSM-native vs BELA vs
 * hybrid), Caderno §4.2.2 (Consumo/metering) and §3.7.2 (Auditoria).
 */

import type { LabelMap } from './common';
import { TICKET_STATUS, TICKET_STATUS_LABELS, PRIORITY, PRIORITY_LABELS, CRITICALITY, CRITICALITY_LABELS, ASSET_LIFECYCLE, ASSET_LIFECYCLE_LABELS } from './itsm';

/**
 * Origin of a widget/field/data point — the transversal rule (CLAUDE.md §2).
 * NB: `@bela/tokens` declares its own ORIGIN for *styling* (which chrome color).
 * This is the *domain* copy: the two are intentionally separate layers (types =
 * domain contract with zero deps; tokens = design system). Keep them in sync.
 */
export const ORIGIN = ['itsm_native', 'bela_module', 'hybrid_layer'] as const;
export type Origin = (typeof ORIGIN)[number];
export const ORIGIN_LABELS: LabelMap<Origin> = {
  itsm_native: 'ITSM nativo',
  bela_module: 'Módulo bela',
  hybrid_layer: 'Camada híbrida',
};

/** BELA modules (CLAUDE.md §2). A non-contracted module never breaks the
 *  ITSM-native base; it just disappears (single-switch). */
export const BELA_MODULE = [
  'core',
  'service_desk',
  'knowledge_rag',
  'automations',
  'assets',
  'predict',
  'rh',
  'facilities',
  'usage',
  'audit',
] as const;
export type BelaModule = (typeof BELA_MODULE)[number];
export const BELA_MODULE_LABELS: LabelMap<BelaModule> = {
  core: 'Core',
  service_desk: 'Service Desk',
  knowledge_rag: 'Conhecimento / RAG',
  automations: 'Automações',
  assets: 'Assets',
  predict: 'Predict',
  rh: 'RH',
  facilities: 'Facilities',
  usage: 'Consumo',
  audit: 'Auditoria',
};

/** Environments an automation/alert can run in (Caderno §3.6; Predict §9.1). */
export const ENVIRONMENT = ['dev', 'homolog', 'prod'] as const;
export type Environment = (typeof ENVIRONMENT)[number];
export const ENVIRONMENT_LABELS: LabelMap<Environment> = {
  dev: 'Desenvolvimento',
  homolog: 'Homologação',
  prod: 'Produção',
};

/** AutomationRule trigger/action (Caderno §3.2 BE-F07; Predict RecommendedAction
 *  action types §9.1: notify, comment, escalate, open task). */
export const AUTOMATION_TRIGGER = [
  'ticket_created',
  'ticket_updated',
  'sla_at_risk',
  'approval_decided',
  'predict_alert',
  'schedule',
] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGER)[number];
/** Rótulos do gatilho. Nasceram com o editor de fluxo (2026-09-11): até então o
 *  gatilho só era LIDO, e a tela mostrava a chave crua. */
export const AUTOMATION_TRIGGER_LABELS: LabelMap<AutomationTrigger> = {
  ticket_created: 'Chamado aberto',
  ticket_updated: 'Chamado atualizado',
  sla_at_risk: 'SLA em risco',
  approval_decided: 'Aprovação decidida',
  predict_alert: 'Alerta do Predict',
  schedule: 'Agendamento',
};

export const ACTION_TYPE = [
  'notify',
  'comment',
  'escalate',
  'open_task',
  'assign_group',
  'run_automation',
  'grant_access',
] as const;
export type ActionType = (typeof ACTION_TYPE)[number];
export const ACTION_TYPE_LABELS: LabelMap<ActionType> = {
  notify: 'Notificar',
  comment: 'Comentar no ticket',
  escalate: 'Escalar',
  open_task: 'Abrir tarefa',
  assign_group: 'Atribuir a grupo',
  run_automation: 'Executar automação',
  grant_access: 'Liberar acesso',
};

/* ────────────────────────── Usage metering (Caderno §4.2.2) ──────────────────
 * Unidades de uso por módulo, cada uma vinculada a um evento de origem, com
 * deduplicação por ciclo. */
export const USAGE_UNIT = [
  'ticket_assisted', // tickets assistidos pela BELA
  'ticket_resolved', // tickets resolvidos pela BELA
  'automation_executed', // automações executadas
  'asset_managed', // ativos geridos
  'asset_onboarded', // ativos saneados/importados
  'predict_item_evaluated', // itens avaliados pelo Predict
  'rh_facilities_request', // solicitações RH/Facilities
  'rag_query', // consultas RAG
  'deskone_user_item', // usuários/itens DeskOne
] as const;
export type UsageUnit = (typeof USAGE_UNIT)[number];
export const USAGE_UNIT_LABELS: LabelMap<UsageUnit> = {
  ticket_assisted: 'Ticket assistido',
  ticket_resolved: 'Ticket resolvido',
  automation_executed: 'Automação executada',
  asset_managed: 'Ativo gerido',
  asset_onboarded: 'Ativo saneado/importado',
  predict_item_evaluated: 'Item avaliado (Predict)',
  rh_facilities_request: 'Solicitação RH/Facilities',
  rag_query: 'Consulta RAG',
  deskone_user_item: 'Usuário/item bela desk',
};

/* ── DEDUPLICAÇÃO POR CICLO (Caderno §4.2.2) ─────────────────────────────────
 * "Evitar múltipla cobrança da mesma unidade no mesmo ciclo, SALVO automações
 * transacionais expressamente contratadas. Mesmo ticket assistido por várias
 * ações da BELA deve contabilizar uma única unidade de ticket assistido."
 *
 * A regra convive com a medição em TOKENS (decisão 2026-09-08) porque as duas
 * medem coisas diferentes, e é essa distinção que a tela precisa deixar clara:
 *
 *   • TOKEN é consumo real de chamada. Três ações da bela sobre o mesmo chamado
 *     gastam três chamadas de modelo — e as três entram na franquia. Nenhuma
 *     dedup se aplica aqui, e aplicar seria cobrar menos do que se gastou.
 *   • UNIDADE é a contagem de ITENS TRABALHADOS. Aí a regra vale: o mesmo
 *     chamado assistido três vezes é UM ticket assistido no ciclo.
 *
 * `per_origin` = a unidade conta uma vez por origem por período (a regra).
 * `per_event`  = cada ocorrência é uma unidade própria — é a ressalva do
 * Caderno para o que é transacional: cada execução de automação e cada consulta
 * ao RAG é um trabalho novo, não a repetição do mesmo item. */
export const USAGE_UNIT_DEDUP: Record<UsageUnit, 'per_origin' | 'per_event'> = {
  ticket_assisted: 'per_origin', // o exemplo literal do Caderno
  ticket_resolved: 'per_origin',
  asset_managed: 'per_origin',
  asset_onboarded: 'per_origin',
  predict_item_evaluated: 'per_origin', // reavaliar o mesmo item não é item novo
  rh_facilities_request: 'per_origin',
  deskone_user_item: 'per_origin', // usuário ativo no mês, não por acesso
  automation_executed: 'per_event', // ressalva: transacional e contratado assim
  rag_query: 'per_event', // cada pergunta é uma consulta nova
};

export const USAGE_UNIT_DEDUP_LABELS: Record<'per_origin' | 'per_event', string> = {
  per_origin: 'uma vez por item no ciclo',
  per_event: 'cada execução conta',
};

/* ─────────────────────────── Auditoria (Caderno §3.7.2, §6) ──────────────────
 * quem consultou, quem aceitou/rejeitou, ação executada, data/hora, motivo,
 * resultado e erro — obrigatório para governança e rastreabilidade. */
export const AUDIT_ACTION = [
  'create',
  'update',
  'delete',
  'status_change',
  'decision', // aceitou/rejeitou uma recomendação BELA (calibra o modelo, §3.7.1)
  'execute', // executou uma ação real (/action)
  'simulate',
  'publish',
  'login',
  'view',
] as const;
export type AuditAction = (typeof AUDIT_ACTION)[number];

/** The 4 decision verbs over a BELA recommendation (CLAUDE.md §7 / item 3.7.5).
 *  Executar → /decision + /action; Aceitar/Ignorar → /decision only; Escalar →
 *  may be the BELA recommendation itself or an independent manual action. */
export const DECISION_VERB = ['execute', 'accept', 'ignore', 'escalate'] as const;
export type DecisionVerb = (typeof DECISION_VERB)[number];
export const DECISION_VERB_LABELS: LabelMap<DecisionVerb> = {
  execute: 'Executar',
  accept: 'Aceitar',
  ignore: 'Ignorar',
  escalate: 'Escalar',
};

/* ─────────────── Automações — governança da ação (Caderno §3.2 BE-F07) ───────
 * A tela Automações do Console administra o "motor de ações controladas": cada
 * automação declara risco, política de aprovação e validações ANTES de poder
 * executar. Unions da tela `#/automacoes` (docs/passo1/console-automacoes.md). */

/** Risco declarado da automação (Biblioteca §2.4: Baixo/Médio/Alto). */
export const AUTOMATION_RISK = ['low', 'medium', 'high'] as const;
export type AutomationRisk = (typeof AUTOMATION_RISK)[number];
export const AUTOMATION_RISK_LABELS: LabelMap<AutomationRisk> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};

/**
 * QUEM executa a ação (Caderno §3.1.1 "motor de ações controladas"; pedido do
 * cliente no PPT de ajustes: *"garantir que a execução seja realizada pelo motor
 * de automações / executor configurado, e não diretamente pelo LLM"*).
 *
 * A bela decide SE chama e com quais parâmetros; quem executa é sempre um destes
 * — nunca o modelo. A união não tem, e não deve ganhar, um valor "LLM": o que
 * não está aqui não executa. `targetSystem` diz ONDE a ação atua; isto diz QUEM
 * a dispara.
 */
export const AUTOMATION_EXECUTOR = [
  'bela_engine',
  'itsm_workflow',
  'connector',
  'webhook',
] as const;
export type AutomationExecutor = (typeof AUTOMATION_EXECUTOR)[number];
export const AUTOMATION_EXECUTOR_LABELS: LabelMap<AutomationExecutor> = {
  bela_engine: 'Motor de automações da bela',
  itsm_workflow: 'Workflow do ITSM',
  connector: 'Conector do sistema alvo',
  webhook: 'Webhook externo',
};

/**
 * O QUE ACONTECE quando a execução falha (pedido do cliente no doc de
 * guardrails: *"exibir também confirmação, limites de execução, restrições e
 * política de falha"*).
 *
 * Distinto de `maxAttempts`: tentativas é quantas vezes insistir; isto é o que
 * fazer DEPOIS de insistir e continuar falhando. Os valores espelham o que o
 * produto sabe fazer — `handoff` é o mesmo estado de execução da Biblioteca
 * §12.13 (handoff para humano).
 */
export const AUTOMATION_FAILURE_POLICY = [
  'notify',
  'open_ticket',
  'handoff',
  'log_only',
] as const;
export type AutomationFailurePolicy = (typeof AUTOMATION_FAILURE_POLICY)[number];
export const AUTOMATION_FAILURE_POLICY_LABELS: LabelMap<AutomationFailurePolicy> = {
  notify: 'Avisar o solicitante e registrar',
  open_ticket: 'Abrir chamado para o time responsável',
  handoff: 'Encaminhar a um humano (handoff)',
  log_only: 'Somente registrar',
};

/** Política de aprovação humana (Biblioteca §2.4: Obrigatória/Opcional/Não requerida). */
export const APPROVAL_POLICY = ['required', 'optional', 'none'] as const;
export type ApprovalPolicy = (typeof APPROVAL_POLICY)[number];
export const APPROVAL_POLICY_LABELS: LabelMap<ApprovalPolicy> = {
  required: 'Obrigatória',
  optional: 'Opcional',
  none: 'Não requerida',
};

/** Estado de uma execução (Biblioteca §12.13: sucesso, falha, pendente,
 *  aguardando aprovação, handoff para humano). */
export const AUTOMATION_EXECUTION_STATUS = [
  'success',
  'failure',
  'pending',
  'awaiting_approval',
  'handoff',
] as const;
export type AutomationExecutionStatus = (typeof AUTOMATION_EXECUTION_STATUS)[number];
export const AUTOMATION_EXECUTION_STATUS_LABELS: LabelMap<AutomationExecutionStatus> = {
  success: 'Sucesso',
  failure: 'Falha',
  pending: 'Pendente',
  awaiting_approval: 'Aguardando aprovação',
  handoff: 'Transferido para humano',
};

/* ── Predict: catálogo de CAMPOS de condição e FATORES do score (2026-09-08) ──
 * Heurística do user: o que é cadastrado no sistema tem de ser IDENTIFICÁVEL,
 * não decorável. As chaves (`slaRemaining`, `idle`…) são as que o motor lê nas
 * regras (AlertRule.conditionsJson / weightsJson); a tela mostra o rótulo e a
 * pessoa escolhe num seletor com busca — nunca digita a chave. `sources`
 * recorta o que faz sentido para o tipo de fonte escolhido no passo 2. */
export interface PredictCatalogItem {
  key: string;
  label: string;
  hint: string;
  sources: readonly string[]; // chaves de SOURCE_LABELS do Predict
  /** TIPO DO VALOR (user, 2026-09-08: "tudo select; status é dos status;
   *  numérico é operador + número com unidade"). `capacity` compara com a
   *  capacidade da fila; `queue` lista as filas reais; `factor` = fator do
   *  score (sem valor). */
  kind: 'number' | 'enum' | 'boolean' | 'queue' | 'capacity' | 'factor';
  unit?: string;
  values?: readonly { value: string; label: string }[];
}
const T = ['tickets'] as const;
const Q = ['queues_groups'] as const;
const A = ['assets_cmdb', 'monitoring_noc'] as const;
const opcoes = <K extends string>(keys: readonly K[], labels: LabelMap<K>) => keys.map((k) => ({ value: k, label: labels[k] }));
export const PREDICT_CONDITION_FIELDS: readonly PredictCatalogItem[] = [
  { key: 'group', label: 'Fila (grupo)', hint: 'Uma fila de atendimento', sources: [...T, ...Q], kind: 'queue' },
  { key: 'status', label: 'Status do ticket', hint: 'Estado atual do ticket', sources: T, kind: 'enum', values: opcoes(TICKET_STATUS, TICKET_STATUS_LABELS) },
  { key: 'priority', label: 'Prioridade', hint: 'Prioridade declarada', sources: T, kind: 'enum', values: opcoes(PRIORITY, PRIORITY_LABELS) },
  { key: 'slaConsumedPct', label: 'SLA consumido', hint: 'Quanto do prazo já passou', sources: T, kind: 'number', unit: '%' },
  { key: 'idleHours', label: 'Tempo sem movimento', hint: 'Horas desde a última atualização', sources: T, kind: 'number', unit: 'h' },
  { key: 'reopened', label: 'Reaberto', hint: 'Ticket que voltou depois de resolvido', sources: T, kind: 'boolean' },
  { key: 'openTickets', label: 'Tickets abertos na fila', hint: 'Comparado com a capacidade da fila', sources: Q, kind: 'capacity' },
  { key: 'projectedBacklog', label: 'Backlog projetado', hint: 'Estimativa para a janela, comparada com a capacidade', sources: Q, kind: 'capacity' },
  { key: 'arrivalRate', label: 'Ritmo de chegada', hint: 'Tickets novos por hora', sources: Q, kind: 'number', unit: 'por hora' },
  { key: 'criticality', label: 'Criticidade do ativo', hint: 'Faixa de criticidade', sources: A, kind: 'enum', values: opcoes(CRITICALITY, CRITICALITY_LABELS) },
  { key: 'health', label: 'Saúde do ativo', hint: 'Score derivado de ciclo de vida, garantia e status', sources: A, kind: 'number', unit: '%' },
  { key: 'lifecycle', label: 'Ciclo de vida', hint: 'Fase do ativo', sources: A, kind: 'enum', values: opcoes(ASSET_LIFECYCLE, ASSET_LIFECYCLE_LABELS) },
  { key: 'warrantyDaysLeft', label: 'Garantia restante', hint: 'Dias até o fim da garantia (negativo = vencida)', sources: A, kind: 'number', unit: 'dias' },
];
export const PREDICT_SCORE_FACTORS: readonly PredictCatalogItem[] = ([
  { key: 'slaRemaining', label: 'SLA restante', hint: 'Quanto menos prazo sobra, mais pesa', sources: [...T, ...Q] },
  { key: 'idle', label: 'Tempo parado', hint: 'Horas sem movimento no ticket', sources: T },
  { key: 'priority', label: 'Prioridade', hint: 'Prioridade declarada no ticket', sources: T },
  { key: 'reopenings', label: 'Reaberturas', hint: 'Quantas vezes o ticket voltou', sources: T },
  { key: 'backlog', label: 'Backlog da fila', hint: 'Tickets abertos contra a capacidade', sources: Q },
  { key: 'arrivalRate', label: 'Ritmo de chegada', hint: 'Tendência de novos tickets', sources: Q },
  { key: 'staffing', label: 'Equipe disponível', hint: 'Analistas ativos na fila', sources: Q },
  { key: 'health', label: 'Saúde do ativo', hint: 'Score de saúde do ativo', sources: A },
  { key: 'warranty', label: 'Garantia', hint: 'Proximidade do fim da garantia', sources: A },
  { key: 'lifecycle', label: 'Ciclo de vida', hint: 'Idade e obsolescência', sources: A },
] as const).map((f) => ({ ...f, kind: 'factor' as const }));
/** Rótulo de produto para uma chave de campo/fator (fallback = a chave). */
export function predictKeyLabel(key: string): string {
  return [...PREDICT_CONDITION_FIELDS, ...PREDICT_SCORE_FACTORS].find((i) => i.key === key)?.label ?? key;
}

/**
 * OS SERVIÇOS QUE A CAMADA BELA RESOLVE NA HORA — por slug do catálogo.
 *
 * Item 88 ("a execução é do executor configurado, não do LLM"), 28/09. A lista
 * existia só no front (`packages/features/catalog/src/data.ts`) e o backend
 * aceitava `aiResolved` do corpo da requisição — ou seja, quem chamava dizia se
 * o chamado nascia resolvido. E QUEM CHAMA INCLUI A BELA: o draft do motor
 * carrega `aiResolvable`, então a saída do modelo governava a execução. É
 * exatamente o que o item proíbe.
 *
 * Mora em `@bela/types` e não numa coluna de `Service` porque "resolve na hora"
 * é CAMADA BELA, não ITSM nativo (CLAUDE.md §2): com a bela desligada o serviço
 * continua existindo, só deixa de resolver sozinho. Pôr na tabela do ITSM seria
 * dizer que o DeskOne sabe disso sem ela.
 *
 * Front e backend leem A MESMA lista: o front para exibir "Resolve na hora", o
 * backend para decidir o status inicial. Duas cópias divergiriam — foi assim
 * que o item 40 achou a lista de tarefas do LLM duplicada.
 */
export const BELA_RESOLVE_NA_HORA: readonly string[] = [
  'reset-password',
  'unlock-account',
  'reset-vpn-password',
  'erp-access',
  'software-license',
  'distribution-list',
];
/** O serviço (por slug) é resolvido na hora pela camada BELA? */
export function resolveNaHora(slug: string | null | undefined): boolean {
  return !!slug && BELA_RESOLVE_NA_HORA.includes(slug);
}
