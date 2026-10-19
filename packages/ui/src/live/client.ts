import { useEffect, useRef } from 'react';
import { getActiveProfile } from '../profile/store';

/**
 * Canal de updates ao vivo (SSE) — o lado cliente do `GET /api/events`.
 *
 * É o que faz o multiusuário aparecer no evento: Claudia abre um chamado e a
 * fila do André muda sozinha, sem F5.
 *
 * DESENHO. Uma ÚNICA conexão por aba, compartilhada por todas as telas: um
 * `EventSource` por hook abriria N conexões e o navegador limita ~6 por origem.
 * O evento traz só identificadores; quem recebe decide se aquilo o afeta e
 * **refaz o próprio fetch** (que já é tipado e já aplica RBAC). Por isso este
 * arquivo não conhece DTO nenhum — não é um segundo contrato de dados.
 *
 * ECO DO PRÓPRIO AUTOR. Quem causou a mudança já atualizou a tela pela resposta
 * da própria chamada; recarregar de novo só piscaria a interface. Por isso o
 * evento carrega `actorId` e o hook descarta o que a própria persona causou.
 *
 * O `EventSource` reconecta sozinho ao cair (é do padrão) — não há retry manual
 * aqui de propósito.
 */

export type LiveEventType =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.message'
  | 'approval.decided'
  | 'presence.changed'
  | 'config.changed';

export interface LiveEvent {
  type: LiveEventType;
  ticketId?: string;
  code?: string;
  groupId?: string | null;
  requesterId?: string | null;
  actorId?: string | null;
  /** e-mail do autor — é por ele que reconhecemos o próprio eco, já que a
   *  identidade interina do front é o `X-Persona` (e-mail), não o id do banco. */
  actorEmail?: string | null;
  /** 'attention' = pedido de atuação da gestão; `targetEmail` = para quem
   *  (null = a equipe inteira). O sino usa os dois; o resto ignora. */
  kind?: 'attention';
  targetEmail?: string | null;
  at: number;
}

const TYPES: LiveEventType[] = [
  'ticket.created', 'ticket.updated', 'ticket.message', 'approval.decided', 'presence.changed',
  'config.changed',
];

type Handler = (event: LiveEvent) => void;

const handlers = new Set<Handler>();
let source: EventSource | null = null;

function dispatch(event: LiveEvent) {
  for (const h of handlers) {
    try {
      h(event);
    } catch {
      /* um assinante quebrado não derruba os outros */
    }
  }
}

/** Abre a conexão na primeira assinatura; fecha quando o último sai. */
function ensureConnected() {
  if (source || typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  source = new EventSource('/api/events');
  for (const type of TYPES) {
    source.addEventListener(type, (e) => {
      try {
        dispatch(JSON.parse((e as MessageEvent).data) as LiveEvent);
      } catch {
        /* frame malformado — ignora */
      }
    });
  }
  // Não fechamos no 'error': o EventSource já tenta reconectar sozinho, e fechar
  // aqui mataria a reconexão automática.
}

function releaseIfIdle() {
  // Fechamento ADIADO: o StrictMode monta→desmonta→remonta efeitos, e fechar na
  // hora mata a conexão no vão entre o unmount e o remount — a tela montada
  // direto na URL (ex.: #/dashboard) ficava SEM canal ao vivo (subscribers: 0)
  // e nem sabia. Um tick de carência deixa o remonte reaproveitar a conexão;
  // se ninguém voltar, aí sim fecha.
  setTimeout(() => {
    if (handlers.size === 0 && source) {
      source.close();
      source = null;
    }
  }, 1_000);
}

/**
 * Assina o canal ao vivo. `onEvent` roda a cada evento que NÃO foi causado pela
 * persona ativa. A referência de `onEvent` pode mudar a cada render — guardamos
 * numa ref, então a conexão não é reaberta por isso.
 */
export function useLiveEvents(onEvent: Handler, enabled = true): void {
  const ref = useRef(onEvent);
  ref.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    const handler: Handler = (event) => {
      // ignora o eco do próprio autor
      if (event.actorEmail && event.actorEmail === getActiveProfile().email) return;
      ref.current(event);
    };
    handlers.add(handler);
    ensureConnected();
    return () => {
      handlers.delete(handler);
      releaseIfIdle();
    };
  }, [enabled]);
}

/** Diz se um evento diz respeito a um ticket específico (por id ou protocolo). */
export function eventTouchesTicket(event: LiveEvent, code: string | null | undefined): boolean {
  if (!code) return false;
  return event.code === code || event.ticketId === code;
}

/**
 * O que o servidor ainda lembra (últimos eventos do processo, mais antigo
 * primeiro). Serve para PRIMAR o sino ao abrir o app ou trocar de persona: o
 * canal ao vivo não repete o passado e o eco do autor é descartado na chegada
 * — na mesma aba, a gestora pedia atuação, virava o André e o sino dele nascia
 * vazio (user, 2026-09-03: "não está enviando as notificações").
 */
export async function fetchRecentEvents(): Promise<LiveEvent[]> {
  try {
    const r = await fetch('/api/events/recent');
    if (!r.ok) return [];
    return (await r.json()) as LiveEvent[];
  } catch {
    return [];
  }
}
