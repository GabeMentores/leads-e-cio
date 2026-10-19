export { cn } from './lib/utils';
export { useRowSelection, type RowSelection } from './lib/useRowSelection';
export { formatDateTime, formatRelative, formatDuration, auditEntityLabel, auditActionLabel } from './lib/format';
export { KitLogTimeline, type LogEvent } from './bela-kit/timeline';
export { useRouteSwitching, isRouteSwitching, marcarTrocaDeRota } from './nav/route-transition';
export { useOutroApp, outroAppLabel, type AppAtual } from './nav/outro-app';
export { KitSkeletonTiles, KitSkeletonTable, KitSkeletonCards, KitPageSkeleton } from './bela-kit/skeletons';

// Shared ticket store — hidratado do backend REAL (GET/POST /api/tickets);
// a camada bela (resumo/ações) é sintetizada no front (ver tickets/store.ts).
export { useGlossary, glossaryFor, type Glossary } from './tickets/glossary';
export {
  useTickets,
  useTicketStore,
  useInstitutionalTickets,
  useTicketCounts,
  openTicket,
  openCountForService,
  confirmResolved,
  abrirChamadosDeAtivos,
  type AtivoDoLote,
  avaliarAtendimento,
  reopenTicket,
  MOTIVO_REABERTURA_ERRO,
  replyToTicket,
  resetTickets,
  type Ticket,
  type TicketStatus,
  type TicketSlaStatus,
  type TicketChannel,
  type OpenTicketInput,
  type TicketCounts,
  type TicketStoreState,
} from './tickets/store';

// Vocabulário + cor dos STATUS de chamado (2026-08-23): usuário final = 6
// rótulos simplificados; operação = 8 rótulos do servidor; cor por família.
export {
  userTicketStatusLabel,
  userTicketStatusTone,
  opsTicketStatusTone,
  priorityTone,
  PRIORITY_ORDER,
  USER_TICKET_STATUS_LABELS,
  type RawTicketStatus,
  type TicketStatusTone,
} from './tickets/status';

// Resposta PRONTA da bela para a pendência de um chamado (1 toque → mensagem
// real no ticket). Camada BELA simulada no front (2026-08-23).
export { useSmartReply, type SmartReply } from './tickets/smart-reply';

// Analyst/gestor side of the ticket store (queue/detail/approvals reads + verbs
// do RESPONSÁVEL — Lista de Tickets, drawer 4.b, Aprovações). Distinto de Meus
// Chamados (visão pessoal do SOLICITANTE, acima).
export {
  useQueue,
  useTicketDetail,
  useApprovals,
  postMessage,
  assignTicket,
  changeTicketStatus,
  assumirTicket,
  devolverAoSolicitante,
  resolverTicket,
  encerrarTicket,
  escalarTicket,
  realocarTicket,
  decideApproval,
  suggestedApprovalDecision,
  decideRecommendation,
  pedirAtuacao,
  pedirAtuacaoNaFila,
  cobrarAprovacao,
  useGroupMembers,
  startViewing,
  stopViewing,
  useGroups,
  useApproverCandidates,
  useTicketMembers,
  type ApproverCandidate,
  type GroupMemberDTO,
  type QueueItemDTO,
  type TicketDetailDTO,
  type TicketMessageDTO,
  type ApprovalDTO,
  type GroupDTO,
  type QueueFilters,
  type QueueState,
  type TicketDetailState,
  type ApprovalsState,
  type ApprovalDecision,
} from './tickets/analyst';

// Ativos do usuário logado (join real usuário↔ativo) — "Ativo relacionado"
// da Nova Solicitação e o fluxo "Abrir chamado para este ativo" (Assets).
export { useMyAssets, type MyAssetRef, type MyAssetsState } from './assets/mine';

// Canal de updates ao vivo (SSE). Os stores já se religam sozinhos; isto fica
// exposto para uma tela que precise reagir a algo além do que eles cobrem.
export {
  useLiveEvents,
  eventTouchesTicket,
  type LiveEvent,
  type LiveEventType, fetchRecentEvents
} from './live/client';

// Personal service-usage ledger (drives the Catálogo "Você costuma pedir" chips)
export {
  useServiceUsage,
  recordServiceUsage,
  rankPersonalServices,
  resetServiceUsage,
  type ServiceUsageEvent,
  type RankedService,
} from './usage/store';

// Profile store (front-only demo switcher; localStorage-persisted)
export {
  useProfile,
  setProfile,
  resetProfile,
  profileAllows,
  hasCoverage,
  // Dois apps, dois logins: cada app declara o seu no main.tsx (chave de
  // persistência + roster do switcher saem daqui).
  initProfileApp,
  getProfileApp,
  profilesForApp,
  // Leitura/assinatura NÃO-hook — para stores vanilla de pacotes de feature
  // (ex.: @bela/console-admin) lerem a persona logada e reagirem à troca sem
  // serem componentes. Dentro do @bela/ui os stores importam relativamente.
  getActiveProfile,
  subscribeProfile,
  PROFILES,
  PROFILE_ORDER,
  WORKER_BACKENDS,
  APPROVER_BACKENDS,
  type AppId,
  type ProfileId,
  type BackendProfile,
  type Persona,
  type ProfileDef,
  type UseProfile,
  equipeENivel,
} from './profile/store';

// Endereço de entrega da persona logada (dado real do banco) — "Entrega em …"
// composto pela bela na Nova Solicitação.
export { useDeliveryAddress } from './profile/delivery';

// Context
export { BelaProvider, useBela } from './context/bela';
export { ToastProvider, useToast } from './components/ui/toast';

// BELA agent chat (shared conversational surface + local backend proxy client)
export { BelaChatProvider, useBelaChat, type BelaChatOpenOptions } from './bela-chat/context';
export { BelaChatDrawer } from './bela-chat/BelaChatDrawer';
export { sendBelaChat, type BelaChatMessage, type BelaChatMode, type BelaChatResult } from './bela-chat/client';

// Primitives (shadcn-style, token-driven)
export { Button, buttonVariants, type ButtonProps } from './components/ui/button';
export { Badge, badgeVariants, type BadgeProps } from './components/ui/badge';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
} from './components/ui/card';
export { IconButton, iconButtonVariants, type IconButtonProps } from './components/ui/icon-button';
export { Tag, type TagProps } from './components/ui/tag';
export { Eyebrow } from './components/ui/eyebrow';
export { Input } from './components/ui/input';
export { Select } from './components/ui/select';
export { Textarea } from './components/ui/textarea';
export { Label } from './components/ui/label';
export { Separator, type SeparatorProps } from './components/ui/separator';
export { Skeleton } from './components/ui/skeleton';
// Tabela de dados do DS (preenchimento próprio + cabeçalho ordenável) — 2026-08-19.
export {
  DataTable, SortableTh, DataTd, useTableSort,
  type TableComparators, type TableSort,
} from './components/ui/data-table';

// bela-kit — the REAL bela components (inline-style), for the total-substitution
// pilot. Must render inside a `.bela-kit` scope (full-value color tokens).
export {
  WEIGHT,
  KitPage, KitPageHeader, KitComposer, KitSendButton, KitTileGrid, KitIconTile, KitChip, KitHighlightCard, KitStatusPill, KitSplit, KitSplitMain, KitSplitAside, KitSkeleton, useSkeletonGate, KitChatBubble, KitBelaText, BelaPortrait,
  KitCard, KitBadge, KitInput, KitTextarea, KitSelect, KitMultiSelect, KitListInput, KitSearchPicker, KitTagPicker, KitPathPicker, KitField, KitConfidenceBadge, evidenciaBadge, KitEyebrow,
  KitButton, KitIconButton, KitAvatar, KitLogo, KitSwitch, KitCheckbox, KitNavLabel, KitNavItem, KitMenuItem,
  KitMenuPanel, KitBackButton, KitBelaWidget, KitBelaStamp, KitBelaZone, KitBelaHeading, KitBelaBody, KitBelaActions, KitBelaAssistant, KitBelaItem, KitDrawer, KitTabs, KitCardRow, KitCollapsibleCard, KitOrienta, useKitHover, useHashTab,
  type KitCardProps, type KitBadgeProps, type KitInputProps, type KitTextareaProps, type KitSelectProps,
  type KitMultiSelectProps, type KitMultiSelectOption, type KitListInputProps,
  type KitSearchPickerProps, type KitTagPickerProps, type KitSearchOption,
  type KitPathPickerProps, type KitPathNode,
  type KitFieldProps, type KitConfidenceBadgeProps, type KitButtonProps, type KitIconButtonProps,
  type KitAvatarProps, type KitSwitchProps, type KitNavItemProps, type KitMenuItemProps, type KitMenuPanelProps,
  type KitBelaWidgetProps, type KitDrawerProps, type KitTab, type KitTabsProps,
  type KitCardRowProps, type KitCollapsibleCardProps, type KitOrientaProps, type KitOrientaItem, type KitPageProps, type KitPageHeaderProps, type KitComposerProps, type KitSendButtonProps, type KitTileGridProps,
  type KitIconTileProps, type KitChipProps, type KitHighlightCardProps, type KitStatusPillProps, type KitChatBubbleProps,
} from './bela-kit';
// Padrões de composição das telas de administração do Console (seção + linha
// de configuração). Promovidos de @bela/console-admin na 2ª tela do Console.
export { KitSection, KitSettingRow, KitKpi, KitStateCard, KitFactList } from './bela-kit/section';
// O "(i)" com tooltip (hover/foco/toque) — nasceu para as seções da Administração.
export { KitInfoTip, KitDataTip } from './bela-kit/infotip';
export { KitTemplateEditor, renderTemplatePreview, type KitTemplateField } from './bela-kit/template-editor';
// Gráficos do DS (2026-09-03): moldura com eixo, barras verticais/horizontais,
// anel e o vocabulário de cor das séries.
export {
  CHART_SERIES, KitChartLegend, KitChartFrame, KitBarChart, KitBarList, KitRing,
  type KitChartLegendItem, type KitBarDatum, type KitBarSegment, type KitBarListRow,
  KitSparkline,
  KitStackedBar,
  type KitStackedSegment,
} from './bela-kit/charts';

// Períodos de AUSÊNCIA de aprovador (delegação de aprovações, 2026-08-24):
// drawer de autosserviço (menu ⚙) + store compartilhado com o quadro do admin.
export { AusenciaDrawer } from './ausencia/AusenciaDrawer';
export {
  fetchMinhasAusencias, criarAusencia, encerrarAusencia, formatPeriodo, sortAusencias,
  delegationKindsFor, useDelegationCandidates, useDelegationPeople, receiversFor, holdersAmong,
  DELEGATION_KIND_LABELS, ADMIN_SCOPES, ADMIN_SCOPE_LABELS,
  type AusenciaDTO, type CriarAusenciaInput, type DelegationKind, type AdminScope, type DelegationCandidate,
} from './ausencia/store';

// Brand (bela) — the mark, the AI signifier, and the "bela Orienta" pattern.
export { Logo, type LogoProps } from './components/brand/Logo';
export { Spark, type SparkProps } from './components/brand/Spark';
export { AISuggestion, type AISuggestionProps, type AISuggestionItem } from './components/brand/AISuggestion';

// BELA-specific (encode the transversal ITSM-native vs BELA rules)
export { StatusBadge, type StatusBadgeProps } from './components/bela/status-badge';
export { OriginTag, type OriginTagProps } from './components/bela/origin-tag';
export { ConfidenceBadge, type ConfidenceBadgeProps } from './components/bela/confidence-badge';

// Exportação CSV — helper único de tabela (Caderno §4.2/§4.5). Ver lib/csv.ts.
export { downloadCsv, toCsv, csvDateSuffix, type CsvCell } from './lib/csv';

// Visões salvas de tabela (Caderno §4.2/§4.5) — genérico por tela.
export { useSavedViews, type SavedView, type UseSavedViews } from './views/store';
export { SavedViewsMenu, type SavedViewsMenuProps } from './views/SavedViewsMenu';
