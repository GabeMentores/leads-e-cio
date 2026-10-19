/**
 * BELA Predict Center vocabulary. Anchored directly in the Predict spec docx:
 *  - §9.1 Entidades principais (minimal fields) → schema fields in @bela/db.
 *  - §9.2 Status padronizados → `PREDICT_STATUS`.
 *  - §11 Regras de validação (VAL-01..10) → referenced where relevant.
 *
 * OPEN QUESTIONS the source doc leaves for the user (CLAUDE.md §8, item 15) —
 * flagged, not invented: initial score weights/thresholds, which ITSM
 * connectors and publish channels enter the MVP, double-approval to activate in
 * prod, which events consume Usage units, retention window. The unions below
 * enumerate the *full* option space; which subset ships is the user's call.
 */

import type { LabelMap } from './common';
import { PROFILE_LABELS, type Profile } from './itsm';

/** §9.2 Status padronizados: Rascunho → Homologação → Ativo/Pausado/Com erro/
 *  Arquivado. May become the standard for other screens too (CLAUDE.md §8). */
export const PREDICT_STATUS = [
  'draft', // Rascunho — cadastro não finalizado; não gera alertas reais.
  'homologation', // Homologação — pode simular/executar em ambiente controlado.
  'active', // Ativo — regra publicada e habilitada para execução.
  'paused', // Pausado — regra preservada, sem execução automática.
  'error', // Com erro — falha de fonte, credencial, mapeamento ou validação.
  'archived', // Arquivado — descontinuada, mantida para histórico.
] as const;
export type PredictStatus = (typeof PREDICT_STATUS)[number];
export const PREDICT_STATUS_LABELS: LabelMap<PredictStatus> = {
  draft: 'Rascunho',
  homologation: 'Homologação',
  active: 'Ativo',
  paused: 'Pausado',
  error: 'Com erro',
  archived: 'Arquivado',
};

/** Score band 0–100 → baixo/médio/alto/crítico (Caderno §3.7.3). severity_base
 *  of a PredictAlert and the severity of a PredictExecution. */
export const SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITY)[number];
export const SEVERITY_LABELS: LabelMap<Severity> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  critical: 'Crítico',
};

/** Publish channels (Predict §NOV-F06 / §1.2): widget, comentário no ticket,
 *  campo customizado, Teams, e-mail, dashboard, webhook/API, Console BELA.
 *  GAP (CLAUDE.md §8): which subset enters the MVP is an open question. */
export const PUBLISH_CHANNEL_TYPE = [
  'widget',
  'ticket_comment',
  'custom_field',
  'teams',
  'email',
  'dashboard',
  'webhook',
  'console_bela',
] as const;
export type PublishChannelType = (typeof PUBLISH_CHANNEL_TYPE)[number];
export const PUBLISH_CHANNEL_TYPE_LABELS: LabelMap<PublishChannelType> = {
  widget: 'Widget',
  ticket_comment: 'Comentário no ticket',
  custom_field: 'Campo customizado',
  teams: 'Teams',
  email: 'E-mail',
  dashboard: 'Dashboard',
  webhook: 'Webhook / API',
  console_bela: 'bela core',
};

/** Connectors / ITSMs (Caderno §9 + standalone-arch: GLPI, ServiceNow,
 *  SharePoint, Entra; Predict adds monitoring/NOC as a source). GAP (CLAUDE.md
 *  §8): which connectors enter the MVP is open. */
export const CONNECTOR = [
  'glpi',
  'servicenow',
  'topdesk',
  'jira',
  'freshservice',
  'bmc',
  'sharepoint',
  'entra',
  'monitoring',
] as const;
export type Connector = (typeof CONNECTOR)[number];

/** DataSourceBinding.source_type / entity analysed (Predict §9.1). */
export const SOURCE_TYPE = [
  'tickets',
  'queues_groups',
  'catalog_sla',
  'kb',
  'assets_cmdb',
  'monitoring_noc',
  'users_context',
  'audit',
] as const;
export type SourceType = (typeof SOURCE_TYPE)[number];

/** DataSourceBinding.refresh_mode. */
export const REFRESH_MODE = ['realtime', 'scheduled', 'on_demand'] as const;
export type RefreshMode = (typeof REFRESH_MODE)[number];

/** DataSourceBinding.last_sync_status. */
export const SYNC_STATUS = ['ok', 'pending', 'error', 'never'] as const;
export type SyncStatus = (typeof SYNC_STATUS)[number];

/** AlertRule.frequency + antispam window semantics (Predict §NOV-F07, VAL-09). */
export const FREQUENCY = ['realtime', 'hourly', 'daily', 'weekly'] as const;
export type Frequency = (typeof FREQUENCY)[number];

/** SimulationRun.status (Predict §7). */
export const SIMULATION_STATUS = ['running', 'completed', 'failed'] as const;
export type SimulationStatus = (typeof SIMULATION_STATUS)[number];

/** PredictExecution.result_status — VAL-10: a simulated run never publishes,
 *  so `simulated` is a distinct terminal result from a real `published`. */
export const EXECUTION_RESULT = [
  'published', // publicado em canais reais
  'suppressed_antispam', // suprimido pela janela antispam (VAL-09)
  'simulated', // gerado em simulação — nunca publicado (VAL-10)
  'failed', // falhou (fonte/credencial/mapeamento)
] as const;
export type ExecutionResult = (typeof EXECUTION_RESULT)[number];

/** The seeded template categories (Predict §IMP-F01): risco de SLA, fila
 *  sobrecarregada, ticket parado, ativo crítico, base de conhecimento fraca,
 *  automação com falha e reabertura.
 *
 *  `ticket_reopen` entrou em 2026-09-10 para fechar o Caderno §3.7.6, que exige
 *  QUATRO tipos de predição demonstráveis no MVP: risco de SLA, previsão de
 *  backlog, **probabilidade de reabertura** e risco de ativo. A reabertura já
 *  pesava no score de outros alertas (`reopenCount`), mas sem alerta próprio o
 *  quarto tipo não era demonstrável — um fator dentro de outra predição não é
 *  uma predição. */
export const TEMPLATE_CATEGORY = [
  'sla_risk',
  'queue_overload',
  'stalled_ticket',
  'critical_asset',
  'weak_kb',
  'failing_automation',
  'ticket_reopen',
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORY)[number];
export const TEMPLATE_CATEGORY_LABELS: LabelMap<TemplateCategory> = {
  sla_risk: 'Risco de SLA',
  queue_overload: 'Fila sobrecarregada',
  stalled_ticket: 'Ticket parado',
  critical_asset: 'Ativo crítico',
  weak_kb: 'Base de conhecimento fraca',
  failing_automation: 'Automação com falha',
  ticket_reopen: 'Probabilidade de reabertura',
};

/**
 * DESTINO E PÚBLICO-ALVO DE UM CANAL (user, 28/09).
 *
 * Eram dois `<input>` de texto livre, com o mesmo `placeholder="destino"` nos
 * oito canais — dava para escrever uma URL no e-mail e um e-mail no webhook, e
 * nada dizia o que cabia ali. Mesma falha de classe do escopo das fontes
 * (itens 75 e 76): conjunto fechado aceito como texto solto. O seed provava o
 * estrago: "Gestor de operação" num alerta e "Gestão de operação" noutro, o
 * mesmo público escrito de dois jeitos.
 *
 * O RÓTULO CONTINUA "DESTINO" nos oito (user): a natureza vai na OPÇÃO — "Tela
 * de Lista de Tickets", não um campo chamado "Tela". Assim a coluna tem um
 * nome só, e o que muda é o que ela oferece.
 *
 * `none` é uma resposta, não uma omissão: comentário no ticket sai NO ITEM que
 * disparou, e o painel do Predict é o próprio bela core — nos dois não há
 * destino a escolher, e um campo vazio pedindo preenchimento era mentira.
 */
export type PublishTargetKind = 'none' | 'choice' | 'text' | 'email' | 'url';
export interface PublishTargetSpec {
  kind: PublishTargetKind;
  hint?: string;
  placeholder?: string;
  /** Só em `choice`: o conjunto fechado, e dá para escolher MAIS DE UM. */
  options?: readonly string[];
  /** O que o campo mostra quando não há o que preencher (`none`). */
  fixed?: string;
}

/** Separador de valores múltiplos. Escolhido por NÃO aparecer em nome de
 *  perfil ("Auditor / Compliance") nem de grupo ("Equipamentos · N2"), senão
 *  a volta do texto para lista quebraria no primeiro nome composto. */
export const PUBLISH_SEP = ', ';
export const separarValores = (v: string): string[] =>
  v.split(PUBLISH_SEP).map((s) => s.trim()).filter(Boolean);

/* As telas que hospedam widget do Predict são as do CLAUDE.md §8 — Lista de
   Tickets, Assets e Dashboard. Não é lista aberta: o widget tem de existir
   naquela tela para o alerta aparecer nela. */
const TELAS_COM_WIDGET = [
  'Tela de Lista de Tickets',
  'Tela de Assets / CMDB',
  'Tela do Dashboard Operacional',
] as const;

export const PUBLISH_TARGET: Record<PublishChannelType, PublishTargetSpec> = {
  widget: {
    kind: 'choice', options: TELAS_COM_WIDGET,
    hint: 'Onde o card do alerta aparece. Mais de uma tela é permitido.',
  },
  ticket_comment: { kind: 'none', fixed: 'O próprio item que disparou' },
  custom_field: {
    kind: 'text', placeholder: 'Risco Predict',
    hint: 'Nome do campo do ticket que recebe o valor.',
  },
  teams: { kind: 'text', placeholder: 'Canal Operações TI' },
  email: { kind: 'email', placeholder: 'infra@empresa.com.br' },
  dashboard: { kind: 'choice', options: ['Dashboard Operacional'] },
  webhook: { kind: 'url', placeholder: 'https://empresa.com.br/hooks/predict' },
  console_bela: { kind: 'none', fixed: 'Predict Center · painel de execuções' },
};

/** O destino informado serve ao canal? Mesma leitura na tela e no servidor —
 *  a tela evita o erro, o backend é quem recusa. */
export function publishTargetInvalido(channelType: PublishChannelType, target: string): string | null {
  const spec = PUBLISH_TARGET[channelType];
  const canal = PUBLISH_CHANNEL_TYPE_LABELS[channelType];
  if (spec.kind === 'none') return null; // o que vier é ignorado
  const v = target.trim();
  if (!v) return `O canal "${canal}" precisa de destino.`;
  if (spec.kind === 'choice') {
    const fora = separarValores(v).find((x) => !spec.options?.includes(x));
    return fora ? `"${fora}" não é destino válido em "${canal}" — escolha da lista.` : null;
  }
  if (spec.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    return `"${v}" não é um endereço de e-mail.`;
  }
  if (spec.kind === 'url' && !/^https?:\/\/\S+$/.test(v)) {
    return `"${v}" não é uma URL — use http:// ou https://.`;
  }
  return null;
}

/**
 * PÚBLICO-ALVO SAI DE LISTAS (user: perfil e grupo), e aceita MAIS DE UM.
 *
 * Três naturezas, porque os dados do seed mostraram que duas não bastavam:
 *  · PERFIL — vocabulário do produto (`PROFILE_LABELS`);
 *  · GRUPO  — as filas desta instância, que vêm do banco: a lista é do
 *    cliente, não nossa, e por isso entra como parâmetro;
 *  · RELATIVO AO ITEM — "responsável", "solicitante", "gestor da fila". O seed
 *    tinha "Analista responsável", que não é perfil nem grupo: é quem está com
 *    AQUELE item. O produto já fala assim na ação recomendada (quem notificar),
 *    então não é conceito novo — é o mesmo, reusado.
 */
export const PREDICT_AUDIENCE_RELATIVE = [
  'Responsável pelo item',
  'Solicitante do item',
  'Gestor da fila',
] as const;

/* Nem todo perfil é público de alerta: o usuário final não recebe alerta
   operacional (ele abre chamado) e o auditor lê o histórico, não a fila. */
export const PREDICT_AUDIENCE_PROFILES: readonly Profile[] = [
  'analyst_n1', 'analyst_n2', 'analyst_n3',
  'ops_manager', 'approver_manager',
  'predict_curator', 'admin_bela', 'admin_deskone',
];

export function publicosDisponiveis(grupos: readonly string[]): {
  perfis: readonly string[];
  grupos: readonly string[];
  relativos: readonly string[];
} {
  return {
    perfis: PREDICT_AUDIENCE_PROFILES.map((p) => PROFILE_LABELS[p]),
    grupos,
    relativos: PREDICT_AUDIENCE_RELATIVE,
  };
}

/** WEBHOOK NÃO TEM PÚBLICO HUMANO — é integração. Cobrar público dele era o
 *  mesmo erro de cobrar destino do comentário no ticket. */
export function canalTemPublico(channelType: PublishChannelType): boolean {
  return channelType !== 'webhook';
}

/** Os públicos informados existem? */
export function publicoInvalido(
  channelType: PublishChannelType,
  audience: string,
  grupos: readonly string[],
): string | null {
  if (!canalTemPublico(channelType)) return null;
  const valores = separarValores(audience);
  if (valores.length === 0) return 'O canal precisa de público-alvo.';
  const { perfis, relativos } = publicosDisponiveis(grupos);
  const fora = valores.find((v) => !perfis.includes(v) && !grupos.includes(v) && !relativos.includes(v as never));
  return fora ? `"${fora}" não é um perfil, grupo nem alvo do item.` : null;
}
