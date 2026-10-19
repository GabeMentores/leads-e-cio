import { useSyncExternalStore } from 'react';
import { getActiveProfile, subscribeProfile } from '../profile/store';

/**
 * Personal service-usage ledger — a lightweight index of "chamados que VOCÊ
 * abriu, por serviço". Drives the Catálogo personal shortcuts ("Você costuma
 * pedir"), the individual counterpart of "Mais utilizados na empresa".
 *
 * NOT a second source of truth: `openTicket()` appends one usage event here
 * whenever a chamado is opened with a known catalog `serviceId` — inclusive os
 * abertos PELO CHAT (o draft carrega o slug do serviço desde 2026-08-18), so
 * this mirrors real opens. It's kept separate from the ticket store only so the
 * event demo can pre-seed usage history WITHOUT inventing visible chamados in
 * Meus Chamados. Front-only, persisted to localStorage.
 *
 * POR PERSONA (2026-08-24): a chave do localStorage carrega o e-mail da persona
 * logada e o store re-hidrata na troca de perfil — antes a chave era única e
 * TODOS os perfis viam os mesmos "seus" favoritos (mesma correção que o
 * profile/store já tinha feito com chave por app). O seed do evento vale só
 * para a Claudia (a solicitante do roteiro); as demais personas começam vazias.
 *
 * Ranking (rankPersonalServices): count opens per service in the last 6 months;
 * if fewer than N distinct services qualify, expand the window to all-time; break
 * ties by the most recently accumulated open.
 */

export interface ServiceUsageEvent {
  serviceId: string;
  at: string; // ISO
}

export interface RankedService {
  serviceId: string;
  count: number;
  lastAt: number; // epoch ms of the most recent open
}

const DAY_MS = 1000 * 60 * 60 * 24;
const SIX_MONTHS_MS = DAY_MS * 182; // ~6 meses

/** Chave POR PERSONA — "Você costuma pedir" é um sinal individual. */
function storageKey(): string {
  return `bela.serviceUsage.v1:${getActiveProfile().email}`;
}

/** Persona do roteiro do evento — a única que nasce com histórico pré-semeado. */
const SEEDED_PERSONA = 'claudia.nunes@aurora.com.br';

/**
 * Event seed — the widget "não aparece até ser dados", so for the event we
 * pre-populate three services with 2 opens each. Ties are broken by recency, so
 * the most-recent open of each is staggered to fix the display order:
 * Resetar senha (mais recente) → Acesso à VPN → Licença de software (menos recente).
 * `daysAgo` offsets keep every seeded open inside the 6-month window.
 */
const SEED_SPEC: { serviceId: string; daysAgo: [number, number] }[] = [
  { serviceId: 'reset-password', daysAgo: [22, 5] }, // most recent open: 5d ago → 1º
  { serviceId: 'vpn-access', daysAgo: [30, 18] }, // 18d ago → 2º
  { serviceId: 'software-license', daysAgo: [48, 33] }, // 33d ago → 3º
];

function seed(): ServiceUsageEvent[] {
  const now = Date.now();
  const out: ServiceUsageEvent[] = [];
  for (const { serviceId, daysAgo } of SEED_SPEC) {
    for (const d of daysAgo) out.push({ serviceId, at: new Date(now - d * DAY_MS).toISOString() });
  }
  return out;
}

/* ── persistence ──────────────────────────────────────────────────────────── */
function load(): ServiceUsageEvent[] {
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ServiceUsageEvent[];
    }
  } catch {
    /* localStorage unavailable / corrupt → fall back to seed */
  }
  return getActiveProfile().email === SEEDED_PERSONA ? seed() : [];
}

function persist() {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state));
  } catch {
    /* ignore quota / unavailable */
  }
}

/* ── vanilla store ────────────────────────────────────────────────────────── */
const listeners = new Set<() => void>();
let state: ServiceUsageEvent[] = load();

// Troca de persona → re-hidrata o ledger DAQUELA persona (chave própria).
subscribeProfile(() => {
  state = load();
  emit();
});

function emit() {
  for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getSnapshot() {
  return state;
}

/** Reactive read — components re-render when a new open is recorded. */
export function useServiceUsage(): ServiceUsageEvent[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Record one open for a catalog service. Called by `openTicket` (serviceId set). */
export function recordServiceUsage(serviceId: string): void {
  if (!serviceId) return;
  state = [...state, { serviceId, at: new Date().toISOString() }];
  persist();
  emit();
}

/** Rank a service list by count desc, ties broken by most recent open desc. */
function rank(events: ServiceUsageEvent[]): RankedService[] {
  const byId = new Map<string, { count: number; lastAt: number }>();
  for (const e of events) {
    const t = new Date(e.at).getTime();
    const cur = byId.get(e.serviceId);
    if (cur) {
      cur.count += 1;
      if (t > cur.lastAt) cur.lastAt = t;
    } else {
      byId.set(e.serviceId, { count: 1, lastAt: t });
    }
  }
  return [...byId.entries()]
    .map(([serviceId, v]) => ({ serviceId, count: v.count, lastAt: v.lastAt }))
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
}

/**
 * Personal favorites for the current user: the top `limit` services by opens in
 * the last 6 months; if fewer than `limit` distinct services qualify in-window,
 * fall back to the all-time ranking so we still surface up to `limit`. Returns an
 * empty list when there is no usage at all (widget hides).
 */
export function rankPersonalServices(events: ServiceUsageEvent[], limit = 3): RankedService[] {
  const now = Date.now();
  const inWindow = events.filter((e) => now - new Date(e.at).getTime() <= SIX_MONTHS_MS);
  const ranked = rank(inWindow);
  const filled = ranked.length >= limit ? ranked : rank(events); // expande p/ all-time
  return filled.slice(0, limit);
}

/** Dev helper — clears persisted usage and reloads the seed (between demos). */
export function resetServiceUsage(): void {
  try {
    localStorage.removeItem(storageKey());
  } catch {
    /* ignore */
  }
  state = getActiveProfile().email === SEEDED_PERSONA ? seed() : [];
  emit();
}

if (typeof window !== 'undefined') {
  (window as unknown as { __belaResetServiceUsage?: () => void }).__belaResetServiceUsage = resetServiceUsage;
}
