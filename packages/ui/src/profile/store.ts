import { useSyncExternalStore } from 'react';

/**
 * Shared PROFILE store — the single source of truth for which of the 4 initial
 * access profiles is active in the prototype. Vanilla store + `useSyncExternalStore`
 * (no Provider needed), persisted to localStorage so the choice survives a reload
 * during a demo. Modeled on the ticket store ([[bela-deskone-ticket-store]]).
 *
 * Front-only by design: this is the DEMO switcher (the profile card in the sidebar
 * footer is the "changer"). Real login/auth/RBAC comes later — structured so it can
 * be swapped for it: replace `load`/`persist`/`setProfile` with the session read,
 * keep the component API (`useProfile`, `allows`). The backend still validates
 * permission — the front filter is UX, not the security boundary.
 */

/** Profiles/personas do switcher (demo). Além dos 4 arquétipos iniciais, um
 *  ROSTER de analistas por EQUIPE + NÍVEL — para demonstrar fila por equipe e
 *  presença ("sendo visto por outro") trocando de identidade. */
export type ProfileId =
  // — Console BELA (login próprio; ver `app` em ProfileDef) —
  | 'admin_bela' // Sônia Ribeiro — administra o motor
  | 'predict_curator' // Paula Andrade — configura/simula/homologa Predict (não ativa)
  | 'auditor' // Roberto Dias — leitura de governança e trilha
  // — DeskOne —
  | 'colaborador' // Claudia (reporta a Ricardo — organograma; aprovação é do Otávio)
  | 'analista' // André · Acessos e Permissões N2 (analista "padrão")
  | 'admin'
  | 'gestor2' // Otávio Prado (Gerente Administrativo) — o gestor aprovador
  | 'gestora_operacao' // Helena Costa (ops_manager) — usercore do Dashboard (Fase 6)
  | 'colab_igor' // reporta a Otávio (2º usuário final do seletor)
  | 'analista_felipe' // Equipamentos · N1
  | 'analista_marina' // Software e Sistemas · N1
  | 'analista_tania' // Acessos e Permissões · N1
  | 'analista_renato' // Acessos e Permissões · N3
  | 'analista_gustavo' // Equipamentos · N2
  | 'analista_diego' // Equipamentos · N3
  | 'analista_lorena' // Software e Sistemas · N2
  | 'analista_paulo'; // Software e Sistemas · N3

/** Maps to @bela/types `Profile` — defined LOCALLY here (the front does not
 *  depend on @bela/types; see [[bela-deskone-ticket-store]]). */
export type BackendProfile =
  | 'end_user'
  | 'approver_manager'
  | 'ops_manager'
  | 'analyst_n1'
  | 'analyst_n2'
  | 'analyst_n3'
  | 'admin_deskone'
  | 'admin_bela'
  | 'predict_curator'
  | 'auditor';

/** Em qual dos DOIS apps a persona faz login (CLAUDE.md §1: dois apps, dois
 *  logins). `GET /api/personas` já devolve o mesmo eixo por persona. */
export type AppId = 'deskone' | 'console';

/** Perfis (backend) que operam a fila como RESPONSÁVEL (worker) e que aprovam.
 *  Espelham WORK_QUEUE_PROFILES/APPROVER_PROFILES do backend (§4.3). */
export const WORKER_BACKENDS: readonly BackendProfile[] = ['analyst_n1', 'analyst_n2', 'analyst_n3', 'admin_deskone'];
export const APPROVER_BACKENDS: readonly BackendProfile[] = ['approver_manager', 'admin_deskone'];

export interface Persona {
  name: string;
  /** Cargo shown as the card's secondary line. */
  role: string;
  initials: string;
  /** Quem aprova por esta pessoa. `null` quando não há gestor cadastrado — e
   *  isso PRECISA aparecer: um chamado que exige aprovação sem aprovador nasce
   *  travado. Foi o card dizendo isso à vista que revelou 138 dos 150 usuários
   *  do seed sem gestor; o seed foi corrigido no mesmo dia (15/09), e o `null`
   *  continua aqui porque cliente nenhum tem cadastro completo. */
  approverName?: string | null;
}

export interface ProfileDef {
  id: ProfileId;
  /** Human label of the profile itself (switcher rows). */
  label: string;
  backend: BackendProfile;
  /** Qual app esta persona acessa. O switcher de cada app mostra SÓ as suas —
   *  é o que faz "dois logins" existir sem dois stores. */
  app: AppId;
  /**
   * Seed e-mail da persona no DB — ponte de identidade INTERINA (enviada no
   * header `X-Persona` até auth/RBAC real entrar; o backend resolve o usuário
   * por este e-mail). Ver tickets/store.ts. As 4 personas do switcher batem 1:1
   * com usuários do seed (Claudia/Otávio/André/Tiago).
   */
  email: string;
  persona: Persona;
  /** Base route hashes this profile may reach (menu items + contextual screens). */
  routes: string[];
  /** Where the profile lands on login / when the current screen becomes forbidden. */
  landing: string;
}

/* Routes every profile can reach (Caderno §4.3). The two contextual screens
   (¹ nova-solicitacao / detalhe-ticket) are not menu items but inherit access
   from their origin, so they live in the common set. */
const COMMON = ['#/', '#/nova-solicitacao', '#/meus-tickets', '#/base-conhecimento', '#/detalhe-ticket'];
/** Rotas que um analista (operador de fila) alcança. Dashboard: Caderno §4.4 —
 *  Sim p/ Gestor/Analista/Admin (o "opcional simplificado" do usuário final não
 *  é escopo do evento). */
/* SEM `#/dashboard` (user, 2026-09-03): o corte operacional do analista JÁ é a
   Lista de tickets — recortada pela equipe dele, clicável e acionável. O
   dashboard é global e de gestão; para ele seria relatório sobre o próprio
   trabalho, sem alavanca. Contraria o Caderno §4.4 ("Sim p/ Analista") por
   decisão explícita do user; o backend acompanha (DASHBOARD_READERS). */
const ANALYST_ROUTES = [...COMMON, '#/lista-tickets', '#/tickets-equipe', '#/assets', '#/discovery'];

/** Rotas do app Console BELA — as telas da Fase 4 + o hub do Predict (Fase 5).
 *  Nada de item de menu apontando para tela inexistente — foi assim que a Base
 *  de Conhecimento caiu no catálogo antigo em silêncio (diario 2026-08-08).
 *  `#/chat` SAIU (2026-08-20): o BELA Chat virou drawer do shell (botão da
 *  topbar), disponível a todo o Console — não é mais rota nem precisa de gate. */
const CONSOLE_ROUTES = ['#/admin', '#/rag', '#/automacoes', '#/consumo', '#/predict', '#/auditoria', '#/configuracoes'];

/** Cria a entrada de um analista do roster (equipe · nível). O `role`/`label`
 *  seguem o padrão "[Equipe] · Nível" (não mais "Service Desk"). */
function analyst(
  id: ProfileId,
  backend: BackendProfile,
  name: string,
  email: string,
  team: string,
  level: string,
): ProfileDef {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const role = `${team} · ${level}`;
  return {
    id, label: role, backend, app: 'deskone', email,
    persona: { name, role, initials },
    routes: [...ANALYST_ROUTES],
    // Primeiro item do menu DELE — sem o Dashboard, a Lista volta a abrir a
    // navegação do analista (user, 2026-09-03).
    landing: '#/lista-tickets',
  };
}

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

/** Colaborador (usuário final) do roster do switcher. `role` = cargo/área. */
function collaborator(id: ProfileId, name: string, email: string, role: string): ProfileDef {
  return {
    id, label: role, backend: 'end_user', app: 'deskone', email,
    persona: { name, role, initials: initialsOf(name) },
    routes: [...COMMON],
    landing: '#/',
  };
}

/** Gestor aprovador do roster do switcher. SEM Lista de Tickets (decisão
 *  2026-08-19): aprovador não é operador de fila — a fila é da OPERAÇÃO
 *  (ops_manager, por membership nos grupos da equipe); o backend devolve 403.
 *
 *  SEM Dashboard operacional e SEM Consumo também (user, 2026-08-27): pela mesma
 *  razão levada até o fim. O aprovador é um gestor DE ÁREA — ele decide sobre os
 *  pedidos da equipe dele e é o que ele vê. Dashboard operacional é a casa da
 *  Gestora de Operação (carga da fila, SLA, backlog) e Consumo é a medição da
 *  plataforma, do Admin: nenhum dos dois é assunto de quem aprova um pedido de
 *  acesso. Sobram as telas de colaborador + Aprovações, que é a casa dele. */
function manager(id: ProfileId, name: string, email: string, role: string): ProfileDef {
  return {
    id, label: role, backend: 'approver_manager', app: 'deskone', email,
    persona: { name, role, initials: initialsOf(name) },
    routes: [...COMMON, '#/aprovacoes'],
    landing: '#/aprovacoes',
  };
}

export const PROFILES: Record<ProfileId, ProfileDef> = {
  // ── Console BELA (app próprio, login próprio) ──────────────────────────────
  // Batem 1:1 com o seed e com o `app: 'console'` de `GET /api/personas`.
  // Paula (Curadora Predict) entrou junto com o hub do Predict (2026-08-09) —
  // antes disso ela não tinha destino e cairia num "tela indisponível" no login.
  admin_bela: {
    id: 'admin_bela',
    // "core" explícito, par do "desk" do Tiago (user, 2026-09-11): ela
    // administra o bela core (Console), ele o bela desk. Sem o sufixo os dois
    // cargos liam igual. A forma abreviada "Admin." também resolve o gênero.
    label: 'Admin. bela core',
    backend: 'admin_bela',
    app: 'console',
    email: 'sonia.ribeiro@aurora.com.br',
    persona: { name: 'Sônia Ribeiro', role: 'Admin. bela core', initials: 'SR' },
    routes: [...CONSOLE_ROUTES],
    landing: '#/admin',
  },
  predict_curator: {
    id: 'predict_curator',
    label: 'Curadora Predict',
    backend: 'predict_curator',
    app: 'console',
    email: 'paula.andrade@aurora.com.br',
    persona: { name: 'Paula Andrade', role: 'Curadora Predict', initials: 'PA' },
    // Curadora opera o Predict (configura/simula/homologa — não ativa); o canal
    // (BELA Chat) é drawer do shell, disponível sem rota. As áreas de
    // administração do motor são do Admin BELA.
    routes: ['#/predict'],
    landing: '#/predict',
  },
  auditor: {
    id: 'auditor',
    label: 'Auditor de Compliance',
    backend: 'auditor',
    app: 'console',
    email: 'roberto.dias@aurora.com.br',
    persona: { name: 'Roberto Dias', role: 'Auditor de Compliance', initials: 'RD' },
    // Leitura da governança (Passo 1: "Auditor pode ter leitura"). O backend
    // recusa a escrita — o front só evita oferecer o que seria negado.
    // Landing = Auditoria (2026-08-10): a tela é a CASA do auditor.
    routes: [...CONSOLE_ROUTES],
    landing: '#/auditoria',
  },
  // ── DeskOne ────────────────────────────────────────────────────────────────
  // EQUIPE ADMINISTRATIVA (user, 2026-08-27): os colaboradores do switcher e o
  // aprovador são da MESMA área — Claudia e Igor pedem, Otávio aprova. Antes
  // Claudia era "Financeiro", Igor "Comercial" e Otávio "Gerente Comercial":
  // três áreas diferentes para três pessoas que, na demo, formam um fluxo só —
  // e todo pedido caindo num gestor de outra área não se sustenta numa tela de
  // service desk, onde a aprovação é do gestor DA ÁREA de quem pediu.
  colaborador: {
    id: 'colaborador',
    // `label` = o CARGO, como em todos os outros do roster (o switcher mostra o
    // label). Era o literal "Colaborador", que é o TIPO de conta, não o cargo —
    // ela aparecia como "Colaborador" ao lado de "Assistente Administrativo" do
    // Igor, que é da mesma equipe.
    label: 'Analista Administrativa',
    backend: 'end_user',
    app: 'deskone',
    email: 'claudia.nunes@aurora.com.br',
    persona: { name: 'Claudia Nunes', role: 'Analista Administrativa', initials: 'CN' },
    routes: [...COMMON],
    landing: '#/',
  },
  analista: {
    id: 'analista',
    label: 'Acessos e Permissões · N2',
    backend: 'analyst_n2',
    app: 'deskone',
    email: 'andre.rocha@aurora.com.br',
    persona: { name: 'André Rocha', role: 'Acessos e Permissões · N2', initials: 'AR' },
    routes: [...ANALYST_ROUTES],
    landing: '#/lista-tickets',
  },
  admin: {
    id: 'admin',
    // `label` e `persona.role` são O MESMO cargo e precisam bater LITERALMENTE:
    // o switcher mostra um no item do menu e o outro no botão fechado, lado a
    // lado. Até 2026-09-11 este perfil saía como "Admin" no menu e
    // "Administrador bela desk" no botão — a mesma pessoa com dois cargos na
    // mesma tela (reportado pelo cliente no PPT de ajustes, lâmina 1).
    // O "desk" é obrigatório (user, 2026-09-11): bela desk e bela core são
    // produtos distintos e o cargo precisa dizer qual dos dois a pessoa
    // administra. Par: Sônia = "Admin. bela core".
    label: 'Admin. bela desk',
    backend: 'admin_deskone',
    app: 'deskone',
    email: 'tiago.moreira@aurora.com.br',
    persona: { name: 'Tiago Moreira', role: 'Admin. bela desk', initials: 'TM' },
    routes: [...COMMON, '#/lista-tickets', '#/aprovacoes', '#/assets', '#/consumo', '#/dashboard', '#/discovery', '#/configuracoes', '#/integracao-glpi'],
    // Admin também opera: o menu dele abre em Operação, não no Catálogo.
    landing: '#/dashboard',
  },
  // — Gestora de OPERAÇÃO (não confundir com gestor APROVADOR — CLAUDE.md §6):
  //   usercore do Dashboard Operacional. Não aprova; lê fila, assets e consumo. —
  gestora_operacao: {
    id: 'gestora_operacao',
    // Mesmo defeito do `admin` (2026-09-11): saía "Gestora de Operação" no menu
    // e "Coordenadora de Operações" no botão. Fica o termo do CLAUDE.md §6.
    label: 'Gestora de Operação',
    backend: 'ops_manager',
    app: 'deskone',
    email: 'helena.costa@aurora.com.br',
    persona: { name: 'Helena Costa', role: 'Gestora de Operação', initials: 'HC' },
    routes: [...COMMON, '#/lista-tickets', '#/assets', '#/consumo', '#/dashboard'],
    landing: '#/dashboard',
  },
  // — o ÚNICO gestor aprovador (decisão 2026-08-18: uma conta de aprovador —
  //   tudo que exige aprovação cai no Otávio; Ricardo saiu do switcher e virou
  //   colaborador no seed). O id segue 'gestor2' por histórico — identificador
  //   não muda (§6.11), só o papel. —
  gestor2: manager('gestor2', 'Otávio Prado', 'otavio.prado@aurora.com.br', 'Gerente Administrativo'),
  colab_igor: collaborator('colab_igor', 'Igor Batista', 'igor.batista@aurora.com.br', 'Assistente Administrativo'),
  // — roster de analistas ([Categoria] · Nível) — 1 por combo equipe+nível.
  //   Batem 1:1 com usuários do seed. —
  analista_tania: analyst('analista_tania', 'analyst_n1', 'Tânia Rocha', 'tania.rocha@aurora.com.br', 'Acessos e Permissões', 'N1'),
  // N3 de Acessos entrou em 2026-08-28 junto com o grupo (a família só tinha
  // dois níveis e o N2 não conseguia escalar).
  analista_renato: analyst('analista_renato', 'analyst_n3', 'Renato Salles', 'renato.salles@aurora.com.br', 'Acessos e Permissões', 'N3'),
  analista_felipe: analyst('analista_felipe', 'analyst_n1', 'Felipe Aguiar', 'felipe.aguiar@aurora.com.br', 'Equipamentos', 'N1'),
  analista_gustavo: analyst('analista_gustavo', 'analyst_n2', 'Gustavo Pereira', 'gustavo.pereira@aurora.com.br', 'Equipamentos', 'N2'),
  analista_diego: analyst('analista_diego', 'analyst_n3', 'Diego Santos', 'diego.santos@aurora.com.br', 'Equipamentos', 'N3'),
  analista_marina: analyst('analista_marina', 'analyst_n1', 'Marina Lopes', 'marina.lopes@aurora.com.br', 'Software e Sistemas', 'N1'),
  analista_lorena: analyst('analista_lorena', 'analyst_n2', 'Lorena Freitas', 'lorena.freitas@aurora.com.br', 'Software e Sistemas', 'N2'),
  analista_paulo: analyst('analista_paulo', 'analyst_n3', 'Paulo Mendes', 'paulo.mendes@aurora.com.br', 'Software e Sistemas', 'N3'),
};

/** Order for the switcher menu — colaboradores, gestores, analistas, admin.
 *  Inclui os dois apps; cada app filtra o que é seu (ver `PROFILE_ORDER_FOR`). */
export const PROFILE_ORDER: ProfileId[] = [
  'colaborador', 'colab_igor',
  'gestor2', 'gestora_operacao',
  'analista', 'analista_tania', 'analista_renato', 'analista_felipe', 'analista_gustavo', 'analista_diego', 'analista_marina', 'analista_lorena', 'analista_paulo',
  'admin',
  // — Console BELA —
  'admin_bela', 'predict_curator', 'auditor',
];

/** Personas de um app, na ordem do switcher. */
export function profilesForApp(app: AppId): ProfileDef[] {
  return PROFILE_ORDER.map((p) => PROFILES[p]).filter((p) => p.app === app);
}

/* Every route the guard actively manages. A hash NOT in this set (dev routes like
   #/tokens, #/catalogo-anterior, #/nova-solicitacao-anterior) is never blocked —
   the guard only gates the app's real screens. */
const MANAGED_ROUTES = Array.from(
  // Rota nova entra AQUI também (2026-08-27): fora desta lista o gate deixa
  // passar — foi assim que "Tickets da equipe" apareceu no menu da colaboradora.
  new Set([...COMMON, '#/lista-tickets', '#/tickets-equipe', '#/aprovacoes', '#/assets', '#/consumo', '#/dashboard', '#/discovery', '#/configuracoes', '#/integracao-glpi', ...CONSOLE_ROUTES]),
);

/** Does `path` fall under route base `r` (exact, or a sub-path like the KB artigo)? */
function matches(path: string, r: string): boolean {
  return path === r || path.startsWith(`${r}/`);
}

/**
 * Whether a given profile may reach a hash. Unmanaged/dev hashes always pass;
 * managed screens are allowed only when they are in the profile's route set.
 */
export function profileAllows(id: ProfileId, hash: string): boolean {
  const path = hash.split('?')[0];
  const isManaged = MANAGED_ROUTES.some((r) => matches(path, r));
  if (!isManaged) return true;
  if (PROFILES[id].routes.some((r) => matches(path, r))) return true;
  // COBERTURA por janela de ausência (2026-08-24): substituto com a função
  // "Administração" vigente alcança as Configurações durante a cobertura —
  // o menu e a rota aparecem sozinhos (o backend valida de novo; isto é UX).
  return coverageKinds.some((k) => (COVERAGE_ROUTES[k] ?? []).some((r) => matches(path, r)));
}

/* ── cobertura por janela de ausência (delegação de funções; 2026-08-24) ────
 * As funções que a persona logada está COBRINDO agora (substituta em janelas
 * vigentes) — lidas de `GET /api/deskone/ausencias/cobertura`. Fora do Bela
 * Desk (Console) o endpoint não existe no proxy e a lista fica vazia. */
let coverageKinds: string[] = [];
const COVERAGE_ROUTES: Record<string, string[]> = { administration: ['#/configuracoes', '#/integracao-glpi'] };

/** A persona logada está cobrindo esta capacidade agora? (`approvals`,
 *  `administration`, `admin:<escopo>`…) — reativa via useProfile (a versão do
 *  store muda quando a cobertura muda). O backend valida de novo; isto é UX. */
export function hasCoverage(capability: string): boolean {
  return coverageKinds.includes(capability);
}

/* ── aprovador da persona logada ──────────────────────────────────────────────
 * Mesmo padrão da cobertura: o front monta a persona localmente e não tem como
 * saber quem aprova por ela, então busca e guarda. Alimenta o card do rascunho
 * da bela, que nomeia o aprovador ANTES de a pessoa confirmar a abertura. */
let approverName: string | null = null;

export function currentApprover(): string | null {
  return approverName;
}

export function refreshApprover(): void {
  if (typeof window === 'undefined') return;
  fetch('/api/personas/me', { headers: { 'X-Persona': PROFILES[current].email } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { approverName?: string | null } | null) => {
      const next = d?.approverName ?? null;
      if (next !== approverName) {
        approverName = next;
        emit();
      }
    })
    .catch(() => {
      if (approverName !== null) {
        approverName = null;
        emit();
      }
    });
}

export function refreshCoverage(): void {
  if (typeof window === 'undefined') return;
  fetch('/api/deskone/ausencias/cobertura', { headers: { 'X-Persona': PROFILES[current].email } })
    .then((r) => (r.ok ? r.json() : { kinds: [] }))
    .then((d: { kinds?: string[] }) => {
      const next = Array.isArray(d.kinds) ? d.kinds : [];
      if (next.join('|') !== coverageKinds.join('|')) {
        coverageKinds = next;
        emit();
      }
    })
    .catch(() => {
      if (coverageKinds.length) {
        coverageKinds = [];
        emit();
      }
    });
}

/* ── persistence ──────────────────────────────────────────────────────────────
 * CHAVE POR APP. Os dois apps rodam em portas/páginas diferentes mas na mesma
 * origem-família de dev, e compartilham este módulo: uma chave só faria o
 * Console "logar" a Claudia e o DeskOne "logar" a Sônia. Chave e default saem do
 * app declarado em `initProfileApp`. */
const STORAGE_KEY_BY_APP: Record<AppId, string> = {
  deskone: 'bela.profile.v1', // preservada — sessões existentes continuam válidas
  console: 'bela.profile.console.v1',
};
const DEFAULT_BY_APP: Record<AppId, ProfileId> = {
  deskone: 'colaborador',
  console: 'admin_bela',
};

/** App ativo. `deskone` por padrão para o app existente não mudar de
 *  comportamento sem tocar em nada. */
let APP: AppId = 'deskone';

function storageKey(): string {
  return STORAGE_KEY_BY_APP[APP];
}

function isProfileId(v: unknown): v is ProfileId {
  return typeof v === 'string' && v in PROFILES;
}

/* DEV-ONLY: `?persona=<ProfileId>` na query fixa a persona desta carga, para
 * varreduras automatizadas (o impeccable detect abre a URL num navegador virgem,
 * sem localStorage — sem isto só a persona default seria escaneável). Nunca
 * persiste; no build de produção `import.meta.env.DEV` vira `false` e o bloco
 * é eliminado — o modo do evento não contém este código. */
function devPersonaOverride(): ProfileId | null {
  if (!import.meta.env.DEV) return null;
  try {
    const raw = new URLSearchParams(window.location.search).get('persona');
    if (isProfileId(raw) && PROFILES[raw].app === APP) return raw;
  } catch {
    /* fora do navegador → sem override */
  }
  return null;
}

function load(): ProfileId {
  const override = devPersonaOverride();
  if (override) return override;
  const fallback = DEFAULT_BY_APP[APP];
  try {
    const raw = localStorage.getItem(storageKey());
    // Persona de OUTRO app numa chave antiga não pode "logar" aqui.
    if (isProfileId(raw) && PROFILES[raw].app === APP) return raw;
  } catch {
    /* localStorage unavailable → default */
  }
  return fallback;
}

function persist() {
  try {
    localStorage.setItem(storageKey(), current);
  } catch {
    /* ignore quota / unavailable */
  }
}

/**
 * Declara em qual app este bundle está rodando. Chamar no `main.tsx` ANTES do
 * primeiro render: troca a chave de persistência, o default e o roster do
 * switcher. É o que materializa os DOIS LOGINS sem duplicar o store.
 */
export function initProfileApp(app: AppId): void {
  if (app === APP) return;
  APP = app;
  current = load();
  emit();
}

/** App ativo (para o switcher montar só o roster do próprio app). */
export function getProfileApp(): AppId {
  return APP;
}

/* ── vanilla store ────────────────────────────────────────────────────────── */
const listeners = new Set<() => void>();
let current: ProfileId = load();

// Versão do store: muda a cada emit (persona OU cobertura). É o snapshot do
// useProfile — sem ela, uma mudança de COBERTURA (mesma persona) não mudava o
// snapshot e o useSyncExternalStore não re-renderizava ninguém.
let storeVersion = 0;
function getVersion() {
  return storeVersion;
}

function emit() {
  storeVersion += 1;
  for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getSnapshot() {
  return current;
}

/** Janela em que a troca de perfil segura o ESQUELETO das telas. 500ms: tempo de
 *  a mudança ser vista sem virar espera. */
const TROCA_MS = 500;
let trocandoAte = 0;

/** Está trocando de perfil AGORA? O `useSkeletonGate` lê isto para pintar o
 *  esqueleto na troca, mesmo quando o refetch volta em 20ms. */
export function isProfileSwitching(): boolean {
  return Date.now() < trocandoAte;
}
export function useProfileSwitching(): boolean {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return isProfileSwitching();
}

/**
 * Equipe ABREVIADA + nível, para o switcher (user, 2026-09-04: *"deixe Ac.
 * Permissões / Sof. Sistemas mas não esconda o N"*).
 *
 * O rótulo do analista é "Equipe · Nível" e vinha inteiro numa linha só com
 * reticências — o corte comia justamente o **nível**, que é o que distingue um
 * analista do outro na lista. Duas defesas, porque abreviar sozinho não basta
 * (numa sidebar estreita o "· N2" ainda cairia): aqui o nome da equipe encolhe,
 * e na tela o nível é renderizado à parte, com `flexShrink: 0`.
 */
const EQUIPE_CURTA: Record<string, string> = {
  'Acessos e Permissões': 'Ac. Permissões',
  'Software e Sistemas': 'Sof. Sistemas',
  // Cargo de colaborador, a pedido (user, 2026-09-11): "Assistente
  // Administrativo" era cortado em "Assistente Administrat…" e o que sumia era
  // justamente ADMINISTRATIVO — a área, que é o que diferencia o Igor.
  // É a ÚNICA abreviação de cargo: o espaço para os demais veio do layout do
  // switcher (o cargo ganhou a faixa inteira do botão), não de encurtar texto.
  'Assistente Administrativo': 'Assist. Administrativo',
};

export function equipeENivel(label: string): { equipe: string; nivel: string | null } {
  const m = /^(.*?)\s·\s(N\d)$/.exec(label);
  const equipe = m ? m[1] : label;
  return { equipe: EQUIPE_CURTA[equipe] ?? equipe, nivel: m ? m[2] : null };
}

/** Non-hook read of the active profile (para stores vanilla — ex.: ticket store
 *  lê o e-mail da persona logada para o header X-Persona sem ser um componente). */
export function getActiveProfile(): ProfileDef {
  return PROFILES[current];
}

/** Non-hook subscription (para stores vanilla reagirem à troca de persona). */
export function subscribeProfile(cb: () => void): () => void {
  return subscribe(cb);
}

/** Switch the active profile. Persists and notifies subscribers. Trocar para
 *  uma persona do OUTRO app é ignorado: o switcher de cada app só oferece as
 *  suas, e login cruzado não existe no modelo de dois logins. */
export function setProfile(id: ProfileId): void {
  if (!isProfileId(id) || id === current || PROFILES[id].app !== APP) return;
  current = id;
  persist();
  // TROCA DE PERFIL RECOMEÇA A NAVEGAÇÃO (user, 2026-09-03): quem entra como
  // outra pessoa cai na PÁGINA INICIAL dela (`landing`), não na tela onde a
  // anterior estava — ficar no mesmo lugar era metade do motivo de a troca não
  // parecer ter acontecido.
  if (typeof window !== 'undefined') window.location.hash = PROFILES[id].landing;
  // E a tela RECARREGA com esqueleto (sugestão do Fernando, 2026-09-03): a
  // troca é instantânea demais e, sem estado de carga, lê como se nada tivesse
  // mudado. Piso de tempo, o mesmo raciocínio dos "..." da bela — quando o
  // refetch demora mais que isso, nada é somado.
  trocandoAte = Date.now() + TROCA_MS;
  if (typeof window !== 'undefined') window.setTimeout(emit, TROCA_MS);
  emit();
  // A cobertura é por PESSOA — re-consulta ao trocar de login. O aprovador
  // também: ele muda com quem está logado.
  coverageKinds = [];
  refreshCoverage();
  approverName = null;
  refreshApprover();
}

export interface UseProfile extends ProfileDef {
  /** True if the active profile may reach this hash. */
  allows: (hash: string) => boolean;
  setProfile: (id: ProfileId) => void;
  /** As personas DESTE app, na ordem do switcher — para montar o changer. */
  all: ProfileDef[];
}

/** Reactive hook — components re-render when the active profile OR the
 *  coverage (janela de ausência) changes (por isso o snapshot é a VERSÃO). */
export function useProfile(): UseProfile {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  const id = getSnapshot();
  const def = PROFILES[id];
  return {
    ...def,
    allows: (hash: string) => profileAllows(id, hash),
    setProfile,
    all: profilesForApp(APP),
  };
}

/** Dev helper — reset to the default profile (between demos). */
export function resetProfile(): void {
  try {
    localStorage.removeItem(storageKey());
  } catch {
    /* ignore */
  }
  current = DEFAULT_BY_APP[APP];
  emit();
}

if (typeof window !== 'undefined') {
  (window as unknown as { __belaResetProfile?: () => void }).__belaResetProfile = resetProfile;
  // Cobertura e aprovador da persona persistida — consulta única no boot (e a
  // cada troca de login).
  refreshCoverage();
  refreshApprover();
}
