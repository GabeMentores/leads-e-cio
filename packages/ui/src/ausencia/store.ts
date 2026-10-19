import { useEffect, useState } from 'react';
import { getActiveProfile, refreshCoverage } from '../profile/store';

/**
 * Janelas de AUSÊNCIA de aprovador (férias — decisão de produto do user,
 * 2026-08-24): durante a vigência, as aprovações do titular nascem para o
 * substituto (selo "no lugar de"). Duas portas, uma função: o aprovador
 * configura as PRÓPRIAS janelas pelo menu ⚙ (AusenciaDrawer); o admin gerencia
 * o quadro de todos nas Configurações — ambos sobre estas mesmas chamadas.
 * Wire shape local (padrão do pacote: o front não depende de @bela/types).
 */

export type DelegationKind = 'approvals' | 'queue_management' | 'queue_operation' | 'administration';
/** Sub-funções da administração — marcar "Administração do bela desk" abre a
 *  escolha de QUAIS responsabilidades do admin passam (user, 2026-08-24). */
export type AdminScope = 'general' | 'profiles' | 'audit' | 'usage_close';

export interface AusenciaDTO {
  id: string;
  /** FUNÇÕES delegadas na janela (o titular escolhe quais). */
  kinds: DelegationKind[];
  /** Só com administração no conjunto: as sub-funções do admin passadas. */
  adminScopes: AdminScope[];
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

function headers(json = false): Record<string, string> {
  return { ...(json ? { 'Content-Type': 'application/json' } : {}), 'X-Persona': getActiveProfile().email };
}

/** As janelas do PRÓPRIO aprovador logado. */
export async function fetchMinhasAusencias(): Promise<AusenciaDTO[]> {
  const res = await fetch('/api/deskone/ausencias', { headers: headers() });
  if (!res.ok) throw new Error(`GET /api/deskone/ausencias → ${res.status}`);
  return (await res.json()) as AusenciaDTO[];
}

export interface CriarAusenciaInput {
  kinds: DelegationKind[];
  /** Obrigatório quando `kinds` inclui administração: quais sub-funções vão. */
  adminScopes?: AdminScope[];
  toUserId: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  reason?: string;
  /** Transfere as pendências atuais do titular (só com a janela já vigente). */
  transferPending?: boolean;
  /** Só o admin (Configurações): criar em nome de outro aprovador. */
  fromUserId?: string;
}

export async function criarAusencia(input: CriarAusenciaInput): Promise<{ transferred: number }> {
  const res = await fetch('/api/deskone/ausencias', {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message ?? 'Não foi possível criar a janela de ausência.');
  }
  const body = (await res.json()) as { transferred: number };
  // A janela pode dar cobertura a alguém logado agora (ex.: Administração) —
  // re-consulta para o front liberar/retirar o que a cobertura dá.
  refreshCoverage();
  return { transferred: body.transferred ?? 0 };
}

/** Editar uma janela AGENDADA (user, 2026-08-27). Vigente o backend recusa com
 *  409: já transferiu pendências, e mexer nas datas deixaria trabalho em quem
 *  saiu da janela. */
export async function editarAusencia(
  id: string,
  patch: { toUserId?: string; startsAt?: string; endsAt?: string; reason?: string },
): Promise<void> {
  const res = await fetch(`/api/deskone/ausencias/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(true),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message ?? 'Não foi possível editar a janela.');
  }
  refreshCoverage();
}

export async function encerrarAusencia(id: string): Promise<void> {
  const res = await fetch(`/api/deskone/ausencias/${encodeURIComponent(id)}/encerrar`, {
    method: 'PATCH',
    headers: headers(),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message ?? 'Não foi possível encerrar a janela.');
  }
  refreshCoverage();
}

/** "10/09 a 25/09/2026" — período compacto para as linhas do quadro. */
export function formatPeriodo(startsAt: string, endsAt: string): string {
  const d = (iso: string, withYear: boolean) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', ...(withYear ? { year: 'numeric' } : {}) });
  return `${d(startsAt, false)} a ${d(endsAt, true)}`;
}

/* ── funções de delegação por papel (user, 2026-08-24) ──────────────────────
 * Cada janela delega um CONJUNTO de funções escolhido pelo titular. HOLDERS =
 * quem pode DELEGAR a função; RECEIVERS = quem pode RECEBÊ-LA (funções de ADM
 * podem ir para a gestão sênior — férias do administrador). Espelham a alçada
 * validada no backend (delegations.ts). Efeitos: Aprovações redireciona de
 * verdade; Administração/Consumo fazem o backend aceitar o substituto; as de
 * fila registram a cobertura. */

const KIND_HOLDERS: Record<DelegationKind, readonly string[]> = {
  approvals: ['approver_manager', 'ops_manager', 'admin_deskone'],
  queue_management: ['ops_manager', 'admin_deskone'],
  queue_operation: ['analyst_n1', 'analyst_n2', 'analyst_n3', 'admin_deskone'],
  administration: ['admin_deskone'],
};

const KIND_RECEIVERS: Record<DelegationKind, readonly string[]> = {
  approvals: ['approver_manager', 'ops_manager', 'admin_deskone'],
  queue_management: ['ops_manager', 'admin_deskone'],
  queue_operation: ['analyst_n1', 'analyst_n2', 'analyst_n3', 'admin_deskone'],
  administration: ['approver_manager', 'ops_manager', 'admin_deskone'],
};

export const DELEGATION_KIND_LABELS: Record<DelegationKind, string> = {
  approvals: 'Aprovações',
  queue_management: 'Filas · visão de gestão',
  queue_operation: 'Filas · operação',
  administration: 'Administração do bela desk',
};

/** Sub-funções da administração, na ordem das abas + o fechamento de consumo. */
export const ADMIN_SCOPES: AdminScope[] = ['general', 'profiles', 'audit', 'usage_close'];
export const ADMIN_SCOPE_LABELS: Record<AdminScope, string> = {
  general: 'Configurações gerais',
  profiles: 'Perfis e permissões',
  audit: 'Logs e auditoria',
  usage_close: 'Fechamento de consumo',
};

/** As funções que ESTE papel pode delegar (na ordem de exibição). */
export function delegationKindsFor(backendProfile: string): DelegationKind[] {
  return (Object.keys(KIND_HOLDERS) as DelegationKind[]).filter((k) => KIND_HOLDERS[k].includes(backendProfile));
}

export interface DelegationCandidate {
  id: string;
  name: string;
  email: string;
  profileLabel: string;
  profile: string;
}

/** TODAS as personas (incluindo o logado — o próprio ADM é titular da própria
 *  férias no quadro): matéria-prima dos seletores. Excluir alguém é regra do
 *  consumidor (substituto ≠ titular). */
export function useDelegationPeople(): { people: DelegationCandidate[] } {
  const [all, setAll] = useState<DelegationCandidate[]>([]);
  useEffect(() => {
    let live = true;
    fetch('/api/personas')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { id: string; name: string; email: string; profile: string; profileLabel: string }[]) => {
        if (live) setAll(rows.map((p) => ({ id: p.id, name: p.name, email: p.email, profileLabel: p.profileLabel, profile: p.profile })));
      })
      .catch(() => { if (live) setAll([]); });
    return () => { live = false; };
  }, []);
  return { people: all };
}

/** Quem pode RECEBER todas as funções do conjunto. */
export function receiversFor(people: DelegationCandidate[], kinds: DelegationKind[]): DelegationCandidate[] {
  if (kinds.length === 0) return [];
  return people.filter((p) => kinds.every((k) => KIND_RECEIVERS[k].includes(p.profile)));
}

/** Quem pode DELEGAR ao menos uma função (titulares no quadro do admin). */
export function holdersAmong(people: DelegationCandidate[]): DelegationCandidate[] {
  return people.filter((p) => delegationKindsFor(p.profile).length > 0);
}

/** Substitutos elegíveis para o AUTOSSERVIÇO (titular = o logado, excluído). */
export function useDelegationCandidates(kinds: DelegationKind[]): { candidates: DelegationCandidate[] } {
  const { people } = useDelegationPeople();
  const me = getActiveProfile().email;
  return { candidates: receiversFor(people, kinds).filter((p) => p.email !== me) };
}

/** Ordem do quadro (user, 2026-08-24): vigentes primeiro, depois agendadas e
 *  encerradas — dentro de cada grupo, as mais recentes primeiro. */
export function sortAusencias(list: AusenciaDTO[]): AusenciaDTO[] {
  const rank: Record<AusenciaDTO['status'], number> = { active: 0, scheduled: 1, ended: 2 };
  return [...list].sort((a, b) => rank[a.status] - rank[b.status] || +new Date(b.startsAt) - +new Date(a.startsAt));
}


/* ── criar a janela PELA CONVERSA (user, 2026-08-27) ──────────────────────────
 * A bela resolve no chat: nada de mandar a pessoa para outra aba. Aqui mora o
 * que o formulário fazia — funções do papel, substituto elegível, POST — sem
 * React, porque quem chama é o provider do chat.
 * Devolve um RESULTADO descritivo em vez de lançar: a bela precisa contar o que
 * houve com as palavras dela, inclusive quando não deu. */
export type ResultadoAusenciaPelaConversa =
  | { ok: true; substituto: string; transferidas: number }
  | { ok: false; motivo: 'sem_delegacao' | 'substituto_nao_encontrado' | 'falhou'; detalhe?: string; elegiveis?: string[] };

async function buscarPessoas(): Promise<DelegationCandidate[]> {
  const r = await fetch('/api/personas');
  if (!r.ok) return [];
  const rows = (await r.json()) as { id: string; name: string; email: string; profile: string; profileLabel: string }[];
  return rows.map((p) => ({ id: p.id, name: p.name, email: p.email, profileLabel: p.profileLabel, profile: p.profile }));
}

export async function criarAusenciaPelaConversa(entrada: {
  inicio: string;
  fim: string;
  substituto: string;
}): Promise<ResultadoAusenciaPelaConversa> {
  const eu = getActiveProfile();
  const kinds = delegationKindsFor(eu.backend);
  if (kinds.length === 0) return { ok: false, motivo: 'sem_delegacao' };

  const pessoas = await buscarPessoas();
  const elegiveis = receiversFor(pessoas, kinds).filter((p) => p.email !== eu.email);
  const dito = entrada.substituto.trim().toLowerCase();
  // Casa por parte do nome ("Helena" → Helena Costa); depois por prefixo. Sem
  // correspondência a bela NÃO escolhe por conta — delegar trabalho para quem a
  // pessoa não pediu é pior do que perguntar de novo.
  const alvo =
    elegiveis.find((p) => p.name.toLowerCase().split(' ').some((parte) => parte === dito)) ??
    elegiveis.find((p) => p.name.toLowerCase().startsWith(dito));
  if (!alvo) {
    return { ok: false, motivo: 'substituto_nao_encontrado', elegiveis: elegiveis.map((p) => p.name) };
  }

  try {
    const { transferred } = await criarAusencia({
      kinds,
      toUserId: alvo.id,
      startsAt: new Date(`${entrada.inicio}T00:00:00`).toISOString(),
      endsAt: new Date(`${entrada.fim}T23:59:59`).toISOString(),
      transferPending: false,
    });
    return { ok: true, substituto: alvo.name, transferidas: transferred };
  } catch (e) {
    return { ok: false, motivo: 'falhou', detalhe: e instanceof Error ? e.message : undefined };
  }
}
