/**
 * Thin client for the BELA chat agent. Talks to the local backend proxy
 * (`/api/bela/chat`, served by the Vite dev-server middleware) so the
 * ANTHROPIC_API_KEY is never exposed to the browser. The backend decides
 * whether a real Claude answers ('live') or the simulated fallback does
 * ('simulated'); the UI stays agnostic.
 */
import { getActiveProfile } from '../profile/store';
/** A ticket the agent has prepared but NOT yet opened — shown for review so the
 *  user confirms the data before a chamado is created (error prevention). */
export interface BelaTicketDraft {
  subject: string;
  description: string;
  category: string;
  service: string;
  /** Slug do serviço no catálogo (o motor classifica e envia). Abre o chamado
   *  amarrado ao serviço real — grupo/SLA/categoria vêm do backend por ele. */
  slug?: string;
  priority: string;
  team: string;
  sla: string;
  /** A bela RESOLVE ESTE SERVIÇO NA HORA (camada BELA). Quem decide o rótulo é a
   *  tela, que sabe se o interruptor está ligado; o motor só informa a
   *  capacidade. Sem isto o card anunciava o SLA nativo — "2h" — para um serviço
   *  que o catálogo mostra como "resolve na hora" (cliente, 2026-09-15). */
  aiResolvable?: boolean;
  approval: boolean;
  channel: string;
  requester: string;
  /* ── INFERIDOS pelo motor, nunca perguntados (2026-08-27) ── */
  /** Código do ativo citado na conversa (CORP-XXX-0000). */
  asset?: string;
  /** 'institutional' quando o pedido é da operação (lote aberto por quem opera
   *  o service desk) — o resumo mostra solicitante E beneficiário. */
  ownership?: 'personal' | 'institutional' | 'other_user';
  /** Quem se beneficia: a equipe do serviço, no caso institucional. */
  beneficiary?: string;
}

/** Artigo em que a resposta se apoiou (deflexão/resposta ancorada) — dá ao
 *  front como ABRIR o artigo, não só a citação em texto (2026-08-20). */
export interface BelaChatArticleRef {
  id: string;
  title: string;
  /** 1 frase — mostrada no cartão (e é o conteúdo visível quando o host não
   *  tem destino para abrir o artigo). */
  summary?: string;
}

export interface BelaChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** UI-only: present on assistant turns that ask the user to review a ticket. */
  draft?: BelaTicketDraft;
  /** UI-only: artigo citado neste turno — vira a afordância "abrir o artigo". */
  article?: BelaChatArticleRef;
  /** UI-only: hora em que a mensagem entrou na conversa ("12:34"), carimbada no
   *  front. Vive FORA da bolha (Figma Bela_By_Belago, 2026-08-26). Relógio real,
   *  não o congelado do seed: a conversa acontece agora, ao vivo. */
  at?: string;
}

export type BelaChatMode = 'live' | 'simulated';

/** Resposta pendente coletada pelo motor "meus chamados" (2026-08-21): o FRONT
 *  a registra de verdade no ticket (POST /messages) — mesmo padrão do draft,
 *  em que o efeito colateral é do front e o motor segue sem I/O. */
export interface BelaTicketReply {
  code: string;
  text: string;
}

/** Decisão de aprovação CONFIRMADA no chat contextual da tela de Aprovações
 *  (2026-08-24): o FRONT executa via POST /decision (RBAC validado no backend)
 *  e confirma com o resultado real — mesmo padrão do `open`. */
export interface BelaApprovalAction {
  decision: 'approve' | 'reject' | 'request_evidence';
  /** Códigos dos chamados (#4184…) — o front resolve código → aprovação. */
  codes: string[];
  /** Justificativa (obrigatória na reprovação — visível ao solicitante). */
  reason?: string;
}

/** Verbo de trabalho CONFIRMADO no chat contextual da Lista de Tickets
 *  (2026-08-25): o FRONT executa pelos mesmos verbos com RBAC da tela e
 *  confirma com o resultado real — irmao do `approvalAction`. */
export interface BelaQueueAction {
  verb: 'assumir' | 'retomar' | 'devolver' | 'resolver' | 'encerrar' | 'escalar';
  /** Codigos dos chamados (#4143...). */
  codes: string[];
}

/** Ação sobre um ATIVO confirmada no chat do Assets/CMDB (2026-08-25): abrir o
 *  chamado JÁ amarrado ao ativo — o front navega para a Nova Solicitação com o
 *  `assetCode`, o mesmo caminho do botão da tabela. */
export interface BelaAssetAction {
  action: 'open_ticket';
  code: string;
}

/** Abertura em LOTE (2026-08-26): um chamado por ativo, com o serviço do
 *  catálogo escolhido pela intenção do pedido (substituição → troca de
 *  equipamento). O FRONT executa os POSTs e confirma com os protocolos REAIS. */
export interface BelaAssetBulkAction {
  action: 'open_tickets';
  serviceId: string;
  serviceLabel: string;
  assets: { code: string; model: string | null; reason: string }[];
}

/** Verbo de saneamento confirmado no chat da Discovery (2026-08-26): o motor
 *  escolhe o conjunto, o FRONT executa pelas rotas com RBAC (o backend recusa
 *  o que o papel não pode) e a bela relata o que REALMENTE aconteceu. */
export interface BelaDiscoveryAction {
  verb: 'review' | 'import' | 'link' | 'ignore';
  label: string;
  devices: { id: string; hostname: string; assetId?: string; assetCode?: string }[];
}

export interface BelaChatResult {
  reply: string;
  mode: BelaChatMode;
  draft?: BelaTicketDraft;
  article?: BelaChatArticleRef;
  ticketReply?: BelaTicketReply;
  /** Abertura CONFIRMADA (por texto, ou com o guardrail de confirmação
   *  desligado): o FRONT cria o chamado real (POST) e confirma com o protocolo
   *  do banco — o motor nunca inventa protocolo (2026-08-24). */
  open?: BelaTicketDraft;
  approvalAction?: BelaApprovalAction;
  queueAction?: BelaQueueAction;
  assetAction?: BelaAssetAction | BelaAssetBulkAction;
  discoveryAction?: BelaDiscoveryAction;
  /** Pedido de PERÍODO DE AUSÊNCIA (2026-08-27): o motor reconhece a intenção,
   *  o HOST executa — só ele sabe o perfil logado, e a janela é de quem tem
   *  trabalho delegável. */
  ausencia?: { criar: { datas: { dia: number; mes: number; ano: number | null }[]; substituto: string } };
}

/**
 * `channel` identifica a superfície na trilha de auditoria (BelaChannel):
 * default `widget_web` (o widget do DeskOne); o Console BELA passa `bela_chat`.
 * O `X-Persona` vai junto para o host registrar QUEM interagiu (Caderno §3.7.2
 * "quem consultou") — o motor em si continua sem saber de persona.
 *
 * `environment` (opcional, só o Bela Chat do Console usa) pede que o turno seja
 * atendido com a config de OUTRO ambiente (homolog/dev) — o jeito de testar um
 * guardrail antes de publicá-lo em produção. Ausente → produção (o widget do
 * bela desk nunca passa).
 */
export async function sendBelaChat(messages: BelaChatMessage[], scope?: string, channel = 'widget_web', environment?: string): Promise<BelaChatResult> {
  const res = await fetch('/api/bela/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Persona': getActiveProfile().email },
    body: JSON.stringify({ messages, scope, channel, ...(environment ? { environment } : {}) }),
  });
  if (!res.ok) throw new Error(`BELA chat failed: ${res.status}`);
  return (await res.json()) as BelaChatResult;
}
