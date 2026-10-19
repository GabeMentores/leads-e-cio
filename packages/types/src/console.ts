/**
 * Console BELA — vocabulário de ADMINISTRAÇÃO E GOVERNANÇA (a config do próprio
 * motor). Ancorado no Caderno §3.1.1 (Plataforma Base: admin, feature flags,
 * segurança, conectores, guardrails), §3.6 (governança de IA) e Biblioteca §2.2,
 * via `docs/passo1/console-admin-governanca.md`.
 *
 * POR QUE NASCE AQUI: `docs/predict-decisoes.md` registra que o **registro de
 * conectores/integrações** "nasce junto da tela Administração e Governança do
 * Console BELA" — não era entidade da Fase 1. As unions abaixo são a contraparte
 * tipada das novas tabelas `Bela*` do schema.
 *
 * A tela é **100% BELA** (é a config do motor): não existe "BELA off" aqui, e por
 * isso nada neste arquivo classifica origem (ITSM nativo vs módulo BELA) — tudo é
 * módulo BELA por definição.
 */

import type { LabelMap } from './common';

/* ─────────────────────────────── canais ──────────────────────────────────────
 * ONDE a BELA está disponível para o usuário (Caderno §3.3; Biblioteca §2.2).
 * NÃO confundir com `PublishChannelType` do Predict, que é onde um ALERTA é
 * publicado — são eixos diferentes e propositalmente separados. */
export const BELA_CHANNEL = ['teams', 'whatsapp', 'widget_web', 'portal'] as const;
export type BelaChannel = (typeof BELA_CHANNEL)[number];
export const BELA_CHANNEL_LABELS: LabelMap<BelaChannel> = {
  teams: 'Microsoft Teams',
  whatsapp: 'WhatsApp',
  widget_web: 'Widget Web',
  portal: 'Portal',
};

/* ──────────────── auditoria e monitoramento (2026-08-10) ─────────────────── *
 * Trilha de INTERAÇÃO da bela (BelaInteractionLog). O canal aqui inclui
 * `bela_chat` (a página cheia do Console) além dos canais configuráveis —
 * eixo de ORIGEM da conversa, não de disponibilidade (BelaChannel). */
export const INTERACTION_CHANNEL = ['widget_web', 'bela_chat', 'teams', 'whatsapp', 'portal'] as const;
export type InteractionChannel = (typeof INTERACTION_CHANNEL)[number];
export const INTERACTION_CHANNEL_LABELS: LabelMap<InteractionChannel> = {
  widget_web: 'Widget Web',
  bela_chat: 'bela chat',
  teams: 'Microsoft Teams',
  whatsapp: 'WhatsApp',
  portal: 'Portal',
};

/** Desfecho de um TURNO de conversa (telemetria do core; ver bela-agent-core). */
export const INTERACTION_OUTCOME = [
  'answered', 'deflected', 'resolved_self', 'draft', 'ticket_opened',
  'in_progress', 'blocked', 'no_source', 'low_confidence', 'chat', 'error',
] as const;
export type InteractionOutcome = (typeof INTERACTION_OUTCOME)[number];
export const INTERACTION_OUTCOME_LABELS: LabelMap<InteractionOutcome> = {
  answered: 'Respondida com fonte',
  deflected: 'Autosserviço oferecido',
  resolved_self: 'Resolvida sem chamado',
  draft: 'Rascunho de chamado',
  ticket_opened: 'Chamado aberto',
  in_progress: 'Coleta em andamento',
  blocked: 'Bloqueada (guardrail)',
  no_source: 'Sem fonte aprovada',
  low_confidence: 'Confiança insuficiente',
  chat: 'Conversa',
  error: 'Erro',
};

/* ───────────────────────────── conectores ────────────────────────────────── */

/** Estado operacional de um conector corporativo. `available` = ofertado no
 *  catálogo de integrações, ainda não configurado (decisão 4 do Predict: o design
 *  mostra TODOS os conectores, GLPI conectado, os demais como disponíveis). */
export const CONNECTOR_STATUS = ['connected', 'available', 'error', 'disabled'] as const;
export type ConnectorStatus = (typeof CONNECTOR_STATUS)[number];
export const CONNECTOR_STATUS_LABELS: LabelMap<ConnectorStatus> = {
  connected: 'Conectado',
  available: 'Disponível',
  error: 'Com erro',
  disabled: 'Desativado',
};

/** Como o conector autentica. No protótipo nenhuma credencial real trafega — a
 *  conexão é simulada e determinística (ver `POST /api/console/connectors/:key/test`). */
export const CONNECTOR_AUTH_TYPE = ['oauth', 'api_key', 'service_account', 'basic', 'none'] as const;
export type ConnectorAuthType = (typeof CONNECTOR_AUTH_TYPE)[number];
export const CONNECTOR_AUTH_TYPE_LABELS: LabelMap<ConnectorAuthType> = {
  oauth: 'OAuth 2.0',
  api_key: 'Chave de API',
  service_account: 'Conta de serviço',
  basic: 'Usuário e senha',
  none: 'Sem autenticação',
};

/** Rótulos PT-BR dos conectores da union `Connector` (predict.ts). Ficam aqui
 *  porque é esta tela que os EXIBE — o Predict só os referencia por chave. */
export const CONNECTOR_LABELS = {
  glpi: 'GLPI',
  servicenow: 'ServiceNow',
  topdesk: 'TOPdesk',
  jira: 'Jira Service Management',
  freshservice: 'Freshservice',
  bmc: 'BMC Helix',
  sharepoint: 'SharePoint',
  entra: 'Microsoft Entra ID',
  // Nome do PRODUTO, não da função (cliente, lâmina 7, item 22): os outros
  // itens desta lista são produtos (GLPI, Jira, Entra) e só este era uma
  // categoria. O rótulo de FONTE do Predict continua "Monitoramento / NOC"
  // de propósito — lá é classe de dado, não fornecedor.
  monitoring: 'Zabbix',
} as const;

/* ─────────────────────────────── segurança ───────────────────────────────── */

export const SSO_PROVIDER = ['entra', 'okta', 'google', 'none'] as const;
export type SsoProvider = (typeof SSO_PROVIDER)[number];
export const SSO_PROVIDER_LABELS: LabelMap<SsoProvider> = {
  entra: 'Microsoft Entra ID',
  okta: 'Okta',
  google: 'Google Workspace',
  none: 'Sem SSO (login local)',
};

/* ─────────────────────────────── guardrails ──────────────────────────────────
 * Governança de IA (Caderno §3.6). Todo guardrail é DETERMINÍSTICO: o Caderno
 * pede bloqueio determinístico, então a regra nunca depende do modelo se
 * comportar. Vale igual no simulado e no Ollama (o core é o mesmo). */

/** O que a regra observa. */
export const GUARDRAIL_CATEGORY = ['content', 'sources', 'confidence', 'scope', 'action'] as const;
export type GuardrailCategory = (typeof GUARDRAIL_CATEGORY)[number];
export const GUARDRAIL_CATEGORY_LABELS: LabelMap<GuardrailCategory> = {
  content: 'Conteúdo',
  sources: 'Fontes',
  confidence: 'Confiança',
  scope: 'Escopo',
  action: 'Ação',
};

/** O que a regra FAZ quando dispara. */
export const GUARDRAIL_ACTION = ['block', 'warn', 'mask', 'allow'] as const;
export type GuardrailAction = (typeof GUARDRAIL_ACTION)[number];
export const GUARDRAIL_ACTION_LABELS: LabelMap<GuardrailAction> = {
  block: 'Bloquear e alertar',
  warn: 'Avisar e continuar',
  mask: 'Mascarar e continuar',
  allow: 'Somente registrar',
};

/**
 * As 6 regras de governança da instância. As 3 primeiras estão ligadas ao motor
 * de ponta a ponta (`apps/deskone/bela-agent/guardrails.mjs`) — desligar o toggle
 * muda o comportamento do chat na hora. As 3 últimas são configuráveis e
 * publicáveis; o efeito no motor entra em fase posterior (sinalizado na tela, não
 * escondido do usuário).
 */
export const GUARDRAIL_KEY = [
  'sensitive_content', // ligado ao motor
  'approved_sources_only', // ligado ao motor
  'min_confidence', // ligado ao motor
  'corporate_scope',
  'no_action_without_confirmation',
  'citation_required',
] as const;
export type GuardrailKey = (typeof GUARDRAIL_KEY)[number];
/**
 * Rótulo canônico de cada guardrail — espelha o `label` do seed. Nasceu em
 * 2026-09-11 com o editor de fluxo da automação, que associa guardrails por
 * CHAVE e precisa nomeá-los sem depender da instância: o `BelaGuardrail.label`
 * do banco é da instância, e a automação é da empresa. Se algum dia o cliente
 * renomear um guardrail na instância dele, a tela de governança mostra o nome
 * dele; aqui fica o nome do conceito.
 */
export const GUARDRAIL_KEY_LABELS: LabelMap<GuardrailKey> = {
  sensitive_content: 'Conteúdo sensível',
  approved_sources_only: 'Somente fontes aprovadas',
  min_confidence: 'Confiança mínima',
  corporate_scope: 'Escopo corporativo',
  no_action_without_confirmation: 'Nenhuma ação sem confirmação',
  citation_required: 'Citação obrigatória',
};

/** Guardrails cujo efeito já roda no motor. A tela usa isto para dizer a verdade
 *  sobre o que o toggle faz — nunca prometer efeito que não existe. */
export const ENGINE_ENFORCED_GUARDRAILS: readonly GuardrailKey[] = [
  'sensitive_content',
  'approved_sources_only',
  'min_confidence',
  // 2026-08-19: os três restantes ganharam efeito real no motor
  // (bela-agent/guardrails.mjs §§4–6) — escopo corporativo, confirmação
  // obrigatória antes de abrir chamado e citação obrigatória.
  'corporate_scope',
  'no_action_without_confirmation',
  'citation_required',
];

/* ────────────────── Configurações de IA / LLM Gateway ────────────────────────
 * Doc-fonte `docs/Requisitos_BELA_Configuracoes_IA_LLM_Gateway_v01.docx` (§3
 * campos, §4 RF, §5 RS, §9 validações). Seção 100% DEMONSTRATIVA (decisão
 * 2026-08-20, molde dos Canais): a config vive no banco e é publicável, mas o
 * motor do protótipo segue simulado/Ollama — a tela diz isso, nunca esconde. */

/** Origem técnica usada para acessar IA (lista controlada — validação §9). */
export const AI_PROVIDER_TYPE = ['azure_openai', 'openai', 'google_gemini', 'anthropic', 'ollama', 'other'] as const;
export type AiProviderType = (typeof AI_PROVIDER_TYPE)[number];
export const AI_PROVIDER_TYPE_LABELS: LabelMap<AiProviderType> = {
  azure_openai: 'Azure OpenAI',
  openai: 'OpenAI',
  google_gemini: 'Google Gemini',
  anthropic: 'Anthropic',
  ollama: 'Ollama (runtime local)',
  other: 'Outro',
};

/** Método de autenticação do backend junto ao provedor/runtime (§3). */
export const AI_AUTH_TYPE = ['api_key', 'oauth', 'managed_identity', 'service_account', 'internal_token', 'internal_network', 'none'] as const;
export type AiAuthType = (typeof AI_AUTH_TYPE)[number];
export const AI_AUTH_TYPE_LABELS: LabelMap<AiAuthType> = {
  api_key: 'Chave de API',
  oauth: 'OAuth',
  managed_identity: 'Managed Identity',
  service_account: 'Conta de serviço',
  internal_token: 'Token interno',
  internal_network: 'Rede interna',
  none: 'Sem autenticação',
};

/** Métodos que EXIGEM referência de credencial (validação §9: "se exigir
 *  segredo, referência da credencial também deve ser obrigatória"). Managed
 *  Identity e rede interna não têm segredo próprio — por isso ficam de fora. */
export const AI_AUTH_NEEDS_SECRET: readonly AiAuthType[] = ['api_key', 'oauth', 'service_account', 'internal_token'];

/** Finalidade de uso — que módulos/tarefas podem usar a configuração (§3;
 *  valores do modelo lógico §12: USER_SERVICE, RAG, TECH_SUPPORT…). */
/* SEM `predict` (cliente, item 41): o Predict pontua por REGRAS, PESOS e
   LIMIARES — o Caderno §3.7.3 descreve o score exatamente assim, ajustável sem
   tocar em código. Oferecê-lo como tarefa de LLM sugeria uma dependência que
   não existe, e deixava um admin apontar o Predict para um provedor externo
   achando que mudava alguma coisa. (O item 42 prevê, para o futuro,
   "Explicação do resultado do Predict" — essa sim é tarefa de LLM. Ainda não
   pedida.) */
export const AI_PURPOSE = ['user_service', 'rag', 'tech_support', 'summary', 'classification'] as const;
export type AiPurpose = (typeof AI_PURPOSE)[number];
export const AI_PURPOSE_LABELS: LabelMap<AiPurpose> = {
  user_service: 'Atendimento',
  // "RAG" é a TÉCNICA, não a tarefa (cliente, item 40) — como rótulo de tarefa
  // permitida ele não dizia o que a bela faria com o modelo. A chave segue
  // `rag` porque é contrato de dado; só o texto na tela muda.
  rag: 'Geração com conhecimento corporativo',
  tech_support: 'Apoio técnico',
  summary: 'Resumo',
  classification: 'Classificação',
};

/**
 * Runtimes que executam o modelo NA INFRAESTRUTURA DO CLIENTE. É esta lista que
 * sustenta a regra do item 53: uma configuração cujo dado só é admissível
 * PORQUE roda local não pode cair para provedor externo — o fallback mandaria
 * para fora exatamente o dado que a política deixou entrar por ser interno.
 * Vive aqui porque a tela e o backend precisam da MESMA leitura; duas cópias
 * divergiriam no primeiro runtime novo.
 */
export const AI_LOCAL_PROVIDERS: readonly AiProviderType[] = ['ollama'];

export function isLocalProvider(providerType: string): boolean {
  return (AI_LOCAL_PROVIDERS as readonly string[]).includes(providerType);
}

/** Regra para dados sensíveis ANTES da chamada ao modelo (RF-07). */
export const AI_DATA_POLICY = ['mask_sensitive', 'allow_local', 'block_sensitive'] as const;
export type AiDataPolicy = (typeof AI_DATA_POLICY)[number];
export const AI_DATA_POLICY_LABELS: LabelMap<AiDataPolicy> = {
  mask_sensitive: 'Somente dados mascarados',
  allow_local: 'Permitido por execução local',
  block_sensitive: 'Bloqueado para dados sensíveis',
};

/** Estado operacional da configuração (§3). Ativo em produção exige teste
 *  aprovado (validação §9) — o backend recusa a promoção sem teste OK. */
export const AI_CONFIG_STATUS = ['active', 'testing', 'inactive'] as const;
export type AiConfigStatus = (typeof AI_CONFIG_STATUS)[number];
export const AI_CONFIG_STATUS_LABELS: LabelMap<AiConfigStatus> = {
  active: 'Ativo',
  testing: 'Em teste',
  inactive: 'Inativo',
};

/** Resultado de um teste de conexão (§3 "Testar conexão"). O teste ao vivo é
 *  determinístico e local (evento offline) e só produz `ok`, `invalid_endpoint`,
 *  `invalid_credential` e `model_unavailable`; `timeout` existe para retratar
 *  testes passados (seed) — o teste local nunca finge um timeout de rede. */
export const AI_TEST_RESULT = ['ok', 'timeout', 'invalid_endpoint', 'invalid_credential', 'model_unavailable'] as const;
export type AiTestResult = (typeof AI_TEST_RESULT)[number];
export const AI_TEST_RESULT_LABELS: LabelMap<AiTestResult> = {
  ok: 'Conexão OK',
  timeout: 'Timeout',
  invalid_endpoint: 'Endereço inválido',
  invalid_credential: 'Credencial inválida',
  model_unavailable: 'Modelo indisponível',
};

/* ────────────────────────── status da plataforma ─────────────────────────────
 * DERIVADO, nunca gravado: um "Operacional" persistido no banco é decoração. Sai
 * de sinal real (banco acessível, modo do motor, conectores em erro) e vem sempre
 * acompanhado de motivo + timestamp (padrão número/motivo, CLAUDE.md §2). */
export const PLATFORM_STATUS = ['operational', 'degraded', 'down'] as const;
export type PlatformStatus = (typeof PLATFORM_STATUS)[number];
export const PLATFORM_STATUS_LABELS: LabelMap<PlatformStatus> = {
  operational: 'Operacional',
  degraded: 'Degradado',
  down: 'Indisponível',
};

/** Seções publicáveis da config — o `:section` do `PATCH /api/console/config`
 *  e a granularidade da trilha de auditoria. */
export const CONFIG_SECTION = [
  'general',
  'security',
  'retention',
  'channels',
  'modules',
  'connectors',
  'ai_gateway',
  'flags',
  'guardrails',
] as const;
export type ConfigSection = (typeof CONFIG_SECTION)[number];
export const CONFIG_SECTION_LABELS: LabelMap<ConfigSection> = {
  general: 'Configurações gerais',
  security: 'Segurança e permissões',
  retention: 'Retenção de logs',
  channels: 'Canais',
  modules: 'Módulos',
  connectors: 'Conectores',
  ai_gateway: 'Configurações de IA / LLM Gateway',
  flags: 'Feature flags',
  guardrails: 'Guardrails de IA',
};

/* ────────────────────── Conhecimento e RAG (curadoria) ───────────────────────
 * Tela `#/rag` (docs/passo1/console-conhecimento-rag.md; Caderno §3.6). O
 * CONTEÚDO dos artigos tem fonte única em @bela/kb (JSON); estas unions cobrem a
 * CURADORIA — fontes conectadas, indexação e respostas de baixa confiança. */

/** Tipo da fonte da base vetorial. */
export const RAG_SOURCE_KIND = ['kb_articles', 'sharepoint', 'itsm_kb', 'website', 'files'] as const;
export type RagSourceKind = (typeof RAG_SOURCE_KIND)[number];
export const RAG_SOURCE_KIND_LABELS: LabelMap<RagSourceKind> = {
  kb_articles: 'Artigos da base (bela)',
  sharepoint: 'SharePoint',
  itsm_kb: 'Base do ITSM',
  website: 'Site interno',
  files: 'Arquivos',
};

export const RAG_SOURCE_STATUS = ['active', 'paused', 'indexing', 'error'] as const;
export type RagSourceStatus = (typeof RAG_SOURCE_STATUS)[number];
export const RAG_SOURCE_STATUS_LABELS: LabelMap<RagSourceStatus> = {
  active: 'Ativa',
  paused: 'Pausada',
  indexing: 'Indexando',
  error: 'Com erro',
};

/**
 * DE QUEM a fonte herda a permissão (Biblioteca §2.3 "Permissões").
 *
 * Responde a uma pergunta só: ao recuperar um trecho desta fonte, a permissão
 * de quem a bela consulta para decidir se a pessoa pode ver aquilo. É o que
 * sustenta a regra de que a bela nunca entrega o que a pessoa não poderia
 * abrir na origem (Caderno §3.6: "RAG com base vetorial e filtros por
 * permissão do usuário").
 *
 * `inherit_sharepoint` entrou em 28/09 (item 76, que pede "ACL: herdar do
 * SharePoint / EntraID"). NÃO é sinônimo de `inherit_ad`, e a diferença é
 * justamente o que o item nomeia como duas coisas: o AD/Entra responde por
 * GRUPO, e só alcança o que foi concedido a grupo; o SharePoint responde pelo
 * ITEM — biblioteca, pasta ou arquivo — e alcança também o que foi
 * compartilhado com uma pessoa direto, que não existe como grupo em lugar
 * nenhum. Numa biblioteca com pasta de acesso restrito por link, herdar do AD
 * entregaria o arquivo a quem o SharePoint recusaria.
 */
export const RAG_PERMISSION_MODE = ['inherit_sharepoint', 'inherit_ad', 'itsm_roles', 'internal_public'] as const;
export type RagPermissionMode = (typeof RAG_PERMISSION_MODE)[number];
export const RAG_PERMISSION_MODE_LABELS: LabelMap<RagPermissionMode> = {
  inherit_sharepoint: 'Herda do SharePoint',
  inherit_ad: 'Herda do AD / Entra ID',
  itsm_roles: 'Funções do ITSM',
  internal_public: 'Público interno',
};
/**
 * O que cada modo significa na prática.
 *
 * Existe porque os rótulos, sozinhos, não distinguem os dois primeiros — e a
 * diferença entre eles é exatamente o que decide se um arquivo restrito vaza.
 * Mesmo padrão da agenda de sincronização, no mesmo drawer.
 */
export const RAG_PERMISSION_MODE_HINTS: LabelMap<RagPermissionMode> = {
  inherit_sharepoint: 'Vale a permissão do item no SharePoint — biblioteca, pasta ou arquivo, inclusive o que foi compartilhado com uma pessoa só.',
  inherit_ad: 'Vale o grupo a que a pessoa pertence no AD / Entra ID. Não alcança permissão dada a alguém individualmente na origem.',
  itsm_roles: 'Vale o perfil da pessoa no ITSM — quem atende vê o que atende.',
  internal_public: 'Sem filtro: qualquer pessoa autenticada vê o que esta fonte indexou.',
};
/**
 * Herdar do SharePoint só existe onde HÁ SharePoint — não é política, é fato:
 * um site interno varrido por HTTP não tem lista de acesso para consultar.
 * Os demais modos valem para qualquer fonte.
 */
export function ragPermissionModesFor(connector: string | null): readonly RagPermissionMode[] {
  return connector === 'sharepoint'
    ? RAG_PERMISSION_MODE
    : RAG_PERMISSION_MODE.filter((m) => m !== 'inherit_sharepoint');
}

/* ───────────────── configuração de uma fonte (itens 74 a 76) ─────────────────
 * O cliente descreveu os campos de UM tipo — SharePoint: site, biblioteca,
 * pastas incluídas e excluídas, subpastas, extensões (item 75). Mas a tela tem
 * cinco tipos de fonte, e "biblioteca" não existe num site interno, nem "pastas
 * excluídas" nos artigos da própria bela.
 *
 * Então o escopo é POR TIPO e está DECLARADO aqui, não espalhado em condicionais
 * da tela: cada tipo diz quais campos aceita, e o formulário monta a partir
 * disso. Campo que não vale para o tipo não aparece — mostrar "Biblioteca"
 * desabilitado num site interno é oferecer uma configuração que não existe.
 *
 * ⚠️ LACUNA DOCUMENTAL: os campos dos outros quatro tipos NÃO estão em nenhum
 * dos documentos-fonte. Os abaixo são a leitura mínima do que cada conector
 * precisaria para saber o que ler — sinalizados como provisórios até o cliente
 * especificar. */
export interface RagSourceConfig {
  /** SharePoint: URL do site e bibliotecas de documentos que a fonte lê.
   *
   *  VÁRIAS, e não uma (dono, 25/09): a fonte não se cadastra pela tela — ela
   *  nasce na implantação com o conector. Com uma biblioteca só, o RH cujo
   *  material está em "Documentos" E em "Políticas publicadas" ficaria com
   *  metade do acervo fora da bela, e sem "nova fonte" para consertar. */
  site?: string;
  libraries?: string[];
  /** Site interno: onde começa a varredura e até que profundidade. */
  rootUrl?: string;
  crawlDepth?: number;
  /** Base do ITSM: categorias da base que entram. */
  categories?: string[];
  /** SharePoint e Arquivos: recorte de pastas. */
  includedPaths?: string[];
  excludedPaths?: string[];
  includeSubfolders?: boolean;
  /** SharePoint, Arquivos e Site interno: extensões que a indexação lê. */
  extensions?: string[];
}

export type RagScopeField = keyof RagSourceConfig;

/** Quais campos de escopo cada tipo de fonte aceita. Vazio = o tipo não tem
 *  escopo configurável (os artigos da bela são a base interna: entra tudo).
 *
 *  A ORDEM AQUI É A ORDEM DE LEITURA na tela, e por isso `includeSubfolders`
 *  vem colado em `includedPaths`: ele não é um campo a mais, é a regra que
 *  muda o significado das pastas incluídas ("só o primeiro nível, ou tudo
 *  abaixo"). Entre os dois havia a lista de pastas excluídas, e a pessoa
 *  precisava atravessá-la para descobrir o alcance do que acabara de escrever. */
export const RAG_SOURCE_SCOPE_FIELDS: Record<RagSourceKind, readonly RagScopeField[]> = {
  kb_articles: [],
  sharepoint: ['site', 'libraries', 'includedPaths', 'includeSubfolders', 'excludedPaths', 'extensions'],
  itsm_kb: ['categories'],
  website: ['rootUrl', 'crawlDepth', 'extensions'],
  files: ['includedPaths', 'includeSubfolders', 'excludedPaths', 'extensions'],
};

/** Em que grupo cada campo de escopo cai, na aba Escopo.
 *
 *  São duas perguntas diferentes, e estavam empilhadas como uma lista só de
 *  campos de mesmo peso: ONDE a fonte aponta (endereço, que quase nunca muda e
 *  é o mesmo dado que o conector usa para conectar) e O QUE ENTRA de dentro
 *  dela (o recorte, que é o trabalho desta aba). */
export type RagScopeGroup = 'endereco' | 'recorte';
export const RAG_SCOPE_FIELD_GROUP: Record<RagScopeField, RagScopeGroup> = {
  site: 'endereco',
  libraries: 'endereco',
  rootUrl: 'endereco',
  crawlDepth: 'recorte',
  categories: 'recorte',
  includedPaths: 'recorte',
  excludedPaths: 'recorte',
  includeSubfolders: 'recorte',
  extensions: 'recorte',
};
export const RAG_SCOPE_GROUP_LABELS: Record<RagScopeGroup, string> = {
  endereco: 'Onde a fonte aponta',
  recorte: 'O que entra na indexação',
};

/**
 * Uma pasta existente dentro da fonte, como o conector a enxerga.
 *
 * Serve a DUAS coisas com uma leitura só: o campo de caminho sugere enquanto
 * se digita (barra de endereço do navegador) e o botão Navegar monta a árvore
 * a partir do prefixo do `path`. Por isso vem achatada, e não aninhada — a
 * hierarquia já está escrita no caminho.
 */
export interface RagFolderDTO {
  path: string;
  name: string;
  hasChildren: boolean;
}
export interface RagFoldersDTO {
  /** Vazio = o conector não sabe listar (ou o tipo de fonte não tem pasta). */
  folders: RagFolderDTO[];
  /**
   * As bibliotecas do site, quando o tipo de fonte tem biblioteca.
   *
   * Vêm JUNTO das pastas porque uma manda na outra: as pastas são as da
   * biblioteca escolhida, e trocar de biblioteca troca a árvore inteira. Duas
   * leituras separadas deixariam a tela um instante com a biblioteca nova e as
   * pastas da antiga.
   */
  libraries: string[];
}

/**
 * FORMATOS que cada tipo de fonte sabe ler (dono, 25/09).
 *
 * Extensão não é texto livre: é um conjunto FECHADO, e o hint do campo já dizia
 * isso ("vazio = todas as que o conector suporta") sem que a tela soubesse
 * quais são. Escrever à mão abria três buracos — "PDF" e ".pdf" viram valores
 * diferentes, um erro de digitação passa e só falha na próxima indexação, e
 * quem configura não tem como descobrir o que dá para pedir.
 *
 * Sem lastro no Caderno (os documentos não descem a formato de arquivo): é
 * capacidade plausível de conector, do mesmo tipo das réguas provisórias de
 * `docs/regras-derivadas-provisorias.md`. Trocar pela lista real do conector
 * é substituir este mapa, sem tocar na tela.
 */
export const RAG_EXTENSION_LABELS: Record<string, string> = {
  pdf: 'PDF',
  docx: 'Word',
  doc: 'Word 97-2003',
  xlsx: 'Excel',
  pptx: 'PowerPoint',
  txt: 'Texto simples',
  md: 'Markdown',
  csv: 'CSV',
  rtf: 'Rich Text',
  odt: 'OpenDocument Texto',
  html: 'Página web',
};
const OFFICE_E_TEXTO = ['pdf', 'docx', 'doc', 'xlsx', 'pptx', 'txt', 'md', 'csv', 'rtf', 'odt'] as const;
export const RAG_SOURCE_EXTENSIONS: Record<RagSourceKind, readonly string[]> = {
  kb_articles: [],
  sharepoint: OFFICE_E_TEXTO,
  itsm_kb: [],
  // Varredura de site lê a página e o que ela anexa — não há .xlsx para abrir.
  website: ['html', 'pdf'],
  files: OFFICE_E_TEXTO,
};

export const RAG_SCOPE_FIELD_LABELS: Record<RagScopeField, string> = {
  site: 'Site',
  libraries: 'Bibliotecas',
  rootUrl: 'Endereço inicial',
  crawlDepth: 'Profundidade da varredura',
  categories: 'Categorias incluídas',
  includedPaths: 'Pastas incluídas',
  excludedPaths: 'Pastas excluídas',
  includeSubfolders: 'Incluir subpastas',
  extensions: 'Extensões lidas',
};

/** O que cada campo quer dizer, para o formulário não depender de adivinhação. */
export const RAG_SCOPE_FIELD_HINTS: Record<RagScopeField, string> = {
  site: 'URL do site que contém as bibliotecas.',
  libraries: 'Quais bibliotecas do site a fonte lê. As pastas abaixo são as delas.',
  rootUrl: 'Página por onde a varredura começa.',
  crawlDepth: 'Quantos níveis de link a partir do endereço inicial.',
  categories: 'Só estas categorias da base do ITSM entram na indexação.',
  includedPaths: 'Vazio = a fonte inteira. Preenchido, só estas pastas entram.',
  excludedPaths: 'Sempre vence o incluído: pasta listada aqui fica de fora.',
  includeSubfolders: 'Desligado, só o primeiro nível de cada pasta incluída.',
  extensions: 'Vazio = todas as que o conector suporta.',
};

/* ───────────────────────── agenda de sincronização (item 76) ──────────────── */

export const RAG_SYNC_SCHEDULE = ['manual', 'hourly', 'daily', 'weekly'] as const;
export type RagSyncSchedule = (typeof RAG_SYNC_SCHEDULE)[number];
export const RAG_SYNC_SCHEDULE_LABELS: LabelMap<RagSyncSchedule> = {
  manual: 'Apenas manual',
  hourly: 'A cada hora',
  daily: 'Diária',
  weekly: 'Semanal',
};
export const RAG_SYNC_SCHEDULE_HINTS: LabelMap<RagSyncSchedule> = {
  manual: 'A fonte só reindexa quando alguém clicar em Reindexar.',
  hourly: 'Reindexa de hora em hora. Para fonte que muda o dia todo.',
  daily: 'Reindexa uma vez por dia, fora do horário comercial.',
  weekly: 'Reindexa uma vez por semana. Para base que muda pouco.',
};

/**
 * POLÍTICAS QUE ALCANÇAM UMA FONTE (item 78).
 *
 * Não são configuração DA fonte — são guardrails da instância que mudam o que a
 * bela pode fazer com o que lê. Aparecem aqui em LEITURA, porque quem configura
 * uma fonte precisa saber sob que regra ela vai ser usada; quem as liga e
 * desliga é a Administração, e ter dois lugares que editam a mesma chave é como
 * se criam duas verdades.
 */
export const RAG_SOURCE_POLICY_KEYS: readonly GuardrailKey[] = [
  'approved_sources_only',
  'citation_required',
  'corporate_scope',
];

/**
 * POR QUE a resposta entrou na fila de curadoria (cliente, item 66).
 *
 * Existe para consertar uma DEDUÇÃO: sem este campo, a tela afirmava "lacuna de
 * conhecimento" toda vez que a resposta não citava artigo — e não citar artigo
 * tem várias causas. A pergunta pode estar fora de escopo, mal formulada, ou
 * coberta por um artigo que a recuperação não achou, que é diferente de não
 * existir. Afirmar lacuna aí gera trabalho falso: alguém escreve um artigo que
 * já existia (item 65).
 *
 * `possible_gap` é o único que fala em lacuna — e diz POSSÍVEL, porque quem
 * decide é o curador, não a ausência de um campo.
 */
/**
 * MOTIVOS DA BAIXA CONFIANÇA (dono, 2026-09-24).
 *
 * O critério é estreito e vale para entrar aqui: **o que a BELA identifica como
 * razão da PRÓPRIA incerteza**. Por isso a lista mudou em três pontos:
 *
 *  • `no_source` SAIU — "possível lacuna" já cobre não ter fonte. Os dois
 *    descreviam o mesmo buraco por ângulos diferentes, e o curador tinha de
 *    adivinhar qual usar.
 *  • `low_evidence` virou `partial_coverage` — o nome antigo repetia o critério
 *    da seção inteira (tudo ali é baixa confiança) em vez de dizer o que
 *    distingue o caso: achou o artigo, ele cobre só parte da pergunta.
 *  • `negative_feedback` SAIU da lista — não é razão da incerteza DELA. Vem de
 *    fora e vem depois; a bela pode ter respondido com confiança ALTA e a
 *    pessoa reprovar. Mora agora em `RagAnswerReview.kind = 'negative_feedback'`,
 *    em seção própria.
 *
 * Entraram dois casos de inferência que a bela reconhece sozinha:
 * pergunta ambígua e resposta fragmentada.
 */
export const RAG_REVIEW_REASON = [
  'possible_gap', 'source_conflict', 'partial_coverage', 'ambiguous_question', 'fragmented_answer',
] as const;
export type RagReviewReason = (typeof RAG_REVIEW_REASON)[number];
export const RAG_REVIEW_REASON_LABELS: LabelMap<RagReviewReason> = {
  possible_gap: 'Possível lacuna',
  source_conflict: 'Conflito de fontes',
  partial_coverage: 'Cobertura parcial',
  ambiguous_question: 'Pergunta ambígua',
  fragmented_answer: 'Resposta fragmentada',
};
/** O que cada motivo quer dizer — o curador precisa saber o que trouxe o item
 *  até ali, porque a ação é diferente em cada caso: lacuna vira artigo novo,
 *  conflito pede desempate, ambiguidade não se resolve escrevendo nada. */
export const RAG_REVIEW_REASON_MEANING: LabelMap<RagReviewReason> = {
  possible_gap: 'Nenhum artigo aprovado cobre o assunto. Confirmar antes de escrever artigo novo.',
  source_conflict: 'Mais de uma fonte aprovada responde de formas diferentes.',
  partial_coverage: 'A fonte citada cobre só parte da pergunta.',
  ambiguous_question: 'A pergunta admitia mais de uma leitura e a bela seguiu por uma. O esperado é que ela apresente as duas e pergunte qual seguir — registra-se aqui quando isso falha.',
  fragmented_answer: 'Nenhum artigo respondia sozinho; a resposta foi montada de trechos de vários.',
};


/**
 * DECISÕES EXPLÍCITAS da curadoria (cliente, item 68).
 *
 * "Aprovar" sozinho não dizia o que o curador concluiu: a mesma tecla servia
 * para "a resposta estava certa", "a resposta estava errada mas eu conserto" e
 * "isso nem é assunto nosso". Três conclusões diferentes viravam o mesmo
 * registro, e a trilha (item 70) não tinha o que contar.
 *
 * Cada decisão carrega o STATUS em que a linha termina — é o que impede duas
 * decisões de significarem a mesma coisa por descuido — e uma descrição do que
 * ela implica, porque várias só se distinguem pela consequência.
 *
 * `pendente: true` marca a decisão cujo EFEITO ainda não existe no produto:
 * registrar a conclusão funciona e entra na auditoria, mas o artigo/golden
 * answer não é criado por aqui. A tela diz isso — prometer a criação e não
 * criar seria pior que não oferecer.
 */
export const RAG_REVIEW_DECISION = [
  'approve_answer', 'fix_answer', 'link_source', 'create_golden_answer',
  'create_article', 'out_of_scope', 'discard',
] as const;
export type RagReviewDecision = (typeof RAG_REVIEW_DECISION)[number];

export interface RagReviewDecisionSpec {
  /** Rótulo de AÇÃO, no infinitivo — o que se vai fazer. Usado onde ainda se
   *  escolhe: o select do rodapé. */
  label: string;
  /**
   * Rótulo de REGISTRO, no particípio — o que já aconteceu. Usado no histórico
   * e no bloco de decisão registrada (dono, 24/09: *"não é aprovar a resposta
   * é Resposta aprovada, esse status já aconteceu e não é um botão de ação"*).
   *
   * Nos casos cujo efeito não existe no produto, o particípio diz o que de
   * fato ocorreu — "Artigo solicitado", não "Artigo criado". O rótulo carrega
   * a mesma honestidade que `pendente` declara.
   */
  labelDone: string;
  /** O que a decisão quer dizer e o que decorre dela, no tempo de QUEM AINDA
   *  VAI DECIDIR — lida no select, antes de confirmar. */
  description: string;
  /**
   * A mesma explicação no tempo de QUEM JÁ DECIDIU, para o bloco de decisão
   * registrada. "A solicitação vai para quem mantém a fonte" descreve um
   * futuro que, naquele bloco, já é passado (dono, 24/09).
   */
  descriptionDone: string;
  /** Status em que a linha termina. */
  status: 'approved' | 'dismissed';
  /* SEM nota padrão (dono, 24/09). Existia para "a trilha nunca ficar muda",
     e a DESCRIÇÃO da decisão passou a cumprir isso — ela elucida o que foi
     feito, em texto do sistema, no lugar certo. A nota padrão só duplicava:
     "A resposta estava correta apesar da confiança baixa" (descrição) e
     "Resposta correta apesar da confiança" (nota) apareciam uma sob a outra,
     e a segunda se apresentava como racional de alguém — que ninguém escreveu.
     `resolutionNote` passa a guardar SÓ o que uma pessoa digitou. */
  /**
   * A decisão EXIGE o racional do curador (dono, 2026-09-24).
   *
   * "Corrigir a resposta" e "Associar fonte existente" são decisões que só
   * fazem sentido com o conteúdo junto: corrigir PARA QUÊ, associar QUAL
   * artigo. O texto padrão nessas lia como completo — "correção registrada
   * para a manutenção da base" — e não registrava correção nenhuma. Quem
   * fosse agir depois recebia uma tarefa sem enunciado.
   *
   * Regra prática: exige racional toda decisão que delega trabalho a outra
   * pessoa. As que apenas encerram a linha (aprovar, fora de escopo,
   * descartar) se bastam.
   */
  requerRacional?: boolean;
  /** O que perguntar no campo de racional — específico da decisão, porque o
   *  que falta é diferente em cada uma. */
  prompt: string;
  /**
   * FONTES da base associadas à decisão (dono, 2026-09-24).
   *  • `'obrigatoria'` — a decisão É associar fonte; sem ela não há decisão.
   *  • `'opcional'`    — "toda correção pode apontar uma fonte extra".
   *  • ausente         — a decisão não fala de fonte.
   */
  fontes?: 'obrigatoria' | 'opcional';
  /**
   * A decisão precisa de um RESPONSÁVEL (dono, 2026-09-24): a base de
   * conhecimento é EXTERNA, então "criar artigo" não é um efeito do sistema —
   * é uma solicitação a uma pessoa, que sai por e-mail/Teams. Sem destinatário,
   * a decisão fica registrada e ninguém escreve nada.
   */
  requerResponsavel?: boolean;
  /**
   * A decisão só existe quando a resposta USOU alguma fonte.
   *
   * Definição do dono (24/09): *"corrigir é o uso errôneo da fonte e associar é
   * fonte não utilizada"*. Onde a bela não citou fonte nenhuma — o caso de
   * `possible_gap` — não há uso a corrigir; o que cabe é associar a fonte que
   * existia e não foi recuperada. Oferecer "corrigir" ali é oferecer uma
   * conclusão impossível.
   */
  exigeFonteUsada?: boolean;
  /** O efeito existe no produto? `false` = registra a decisão e só. */
  pendente?: boolean;
}

export const RAG_REVIEW_DECISION_SPECS: Record<RagReviewDecision, RagReviewDecisionSpec> = {
  approve_answer: {
    label: 'Aprovar a resposta',
    labelDone: 'Resposta aprovada',
    description: 'A resposta estava correta apesar da confiança baixa. Nada na base precisa mudar.',
    descriptionDone: 'A resposta estava correta apesar da confiança baixa. Nada na base precisou mudar.',
    status: 'approved',
    prompt: 'Algo que ajude quem revisar isso depois (opcional).',
  },
  fix_answer: {
    label: 'Corrigir a resposta',
    labelDone: 'Correção registrada',
    description: 'A bela usou mal a fonte que tinha. Escreva a correção — é ela que vai para quem mantém a base.',
    descriptionDone: 'A bela usou mal a fonte que tinha. A correção foi registrada para quem mantém a base.',
    status: 'approved',
    requerRacional: true,
    prompt: 'O que a bela deveria ter respondido? Escreva a resposta correta.',
    // Toda correção PODE apontar uma fonte extra (dono, 24/09): às vezes o
    // erro é ter parado numa fonte só quando outra completava o quadro.
    fontes: 'opcional',
    exigeFonteUsada: true,
    pendente: true,
  },
  link_source: {
    label: 'Associar fonte existente',
    labelDone: 'Fonte associada',
    description: 'Já há artigo que cubra, porém não foi identificado. Associe-o para referências futuras.',
    descriptionDone: 'Já há artigo que cubra, porém não foi identificado. O artigo foi associado para referências futuras.',
    status: 'approved',
    // O racional vira OPCIONAL aqui: o conteúdo da decisão é a fonte, e ela
    // tem campo próprio. Exigir texto além dela seria pedir duas vezes.
    prompt: 'Que termo faltou casar para a bela achar esse artigo? (opcional)',
    fontes: 'obrigatoria',
    pendente: true,
  },
  create_golden_answer: {
    label: 'Criar Golden Answer',
    labelDone: 'Golden Answer solicitada',
    description: 'Pergunta recorrente que merece resposta fixa e curada, acima da recuperação automática.',
    descriptionDone: 'Pergunta recorrente. Foi marcada para receber resposta fixa e curada, acima da recuperação automática.',
    status: 'approved',
    requerRacional: true,
    prompt: 'Qual resposta fixa deve ser dada a partir de agora, e para quais variações da pergunta?',
    pendente: true,
  },
  create_article: {
    label: 'Criar artigo de conhecimento',
    labelDone: 'Artigo solicitado',
    description: 'A base não cobre o assunto. A solicitação vai para quem mantém a fonte — a base é externa, o artigo não nasce daqui.',
    descriptionDone: 'A base não cobre o assunto. Foi solicitada ao responsável a elaboração de um artigo para cobri-lo.',
    status: 'approved',
    requerRacional: true,
    prompt: 'Que assunto o artigo precisa cobrir? Isso vira o enunciado de quem for escrever.',
    requerResponsavel: true,
    pendente: true,
  },
  out_of_scope: {
    label: 'Marcar como fora de escopo',
    labelDone: 'Marcada como fora de escopo',
    // "não versa sobre as temáticas que a bela aborda", e NÃO "não é de TI"
    // (dono, 24/09). A bela é agnóstica ao domínio — atende RH, Facilities e
    // o que mais a instância conectar. Dizer "de TI" presume o escopo de um
    // cliente e transforma em regra do produto o recorte de uma instalação.
    // Mesma família do "ITSM nativo" vs "DeskOne nativo" (CLAUDE §7).
    description: 'O assunto não versa sobre as temáticas que a bela atende nesta instância. Não vira artigo e não conta como lacuna da base.',
    descriptionDone: 'O assunto não versa sobre as temáticas que a bela atende nesta instância. Não virou artigo e não conta como lacuna da base.',
    status: 'dismissed',
    prompt: 'Para que área encaminhar, se for o caso (opcional).',
  },
  discard: {
    label: 'Descartar',
    labelDone: 'Descartada',
    description: 'Pergunta duplicada, sem sentido ou sem valor para a curadoria.',
    descriptionDone: 'Pergunta duplicada, sem sentido ou sem valor para a curadoria. Nada foi alterado na base.',
    status: 'dismissed',
    prompt: 'Por que descartar (opcional).',
  },
};

/** Ciclo da curadoria de uma resposta de baixa confiança. `approved` = a
 *  resposta era boa apesar da confiança baixa; `dismissed` = descartada
 *  (pergunta fora de escopo / duplicada). */
export const RAG_REVIEW_STATUS = ['open', 'reviewing', 'approved', 'dismissed'] as const;
export type RagReviewStatus = (typeof RAG_REVIEW_STATUS)[number];
/**
 * Os dois estados da fila dizem O QUE JÁ ACONTECEU com a linha (dono,
 * 2026-09-24), e não quanto ela espera:
 *  • `open`      — **Nova**: ninguém abriu ainda.
 *  • `reviewing` — **Aguardando revisão**: alguém abriu e não decidiu nada.
 *
 * Os rótulos antigos ("Aguardando curadoria" / "Em revisão") descreviam os dois
 * como espera e não distinguiam o que muda entre eles: em ambos a linha aguarda
 * curadoria, e "em revisão" sugeria trabalho em andamento onde não há nenhum —
 * a resposta foi só aberta.
 */
export const RAG_REVIEW_STATUS_LABELS: LabelMap<RagReviewStatus> = {
  open: 'Nova',
  reviewing: 'Aguardando revisão',
  approved: 'Aprovada',
  dismissed: 'Descartada',
};
