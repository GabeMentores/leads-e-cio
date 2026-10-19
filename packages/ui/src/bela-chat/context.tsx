import * as React from 'react';
import { sendBelaChat, type BelaApprovalAction, type BelaQueueAction, type BelaChatMessage, type BelaChatMode, type BelaTicketDraft } from './client';
import { replyToTicket, openTicket, abrirChamadosDeAtivos, type OpenTicketInput } from '../tickets/store';
import { decideApprovalsByCode, runQueueVerbByCode, type ApprovalActionOutcome } from '../tickets/analyst';
import { getActiveProfile } from '../profile/store';
import { criarAusenciaPelaConversa } from '../ausencia/store';

/**
 * Shared conversational state for BELA. A single provider (mounted once in the
 * shell) backs the drawer and every "ask Bela" input across the app, so any
 * BELA widget can open a real conversation with the agent via `openChat`.
 *
 * `scope` describes where the user is (catalog, tickets, approvals, …) and is
 * forwarded to the backend as extra system context; `scopeLabel` is the human
 * label shown in the drawer header. Opening always starts a fresh conversation.
 */
/** {dia, mes, ano?} da conversa → 'yyyy-mm-dd' para o campo de data. Sem ano,
 *  assume o ano corrente; se a data já passou, assume o próximo (ver o uso). */
function paraISO(d: { dia: number; mes: number; ano: number | null }): string {
  const hoje = new Date();
  let ano = d.ano ?? hoje.getFullYear();
  if (!d.ano) {
    const tentativa = new Date(ano, d.mes - 1, d.dia);
    if (tentativa < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) ano += 1;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ano}-${pad(d.mes)}-${pad(d.dia)}`;
}

/** 'yyyy-mm-dd' → 'dd/mm/yyyy' para a bela falar a data como a pessoa escreveu. */
function fmtBR(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export interface BelaChatOpenOptions {
  /** Optional first user message — sent immediately on open. */
  text?: string;
  /** Fala de ABERTURA da bela, mostrada sem chamar o agente (2026-09-02): a
   *  conversa começa com ELA falando, com o contexto de onde a pessoa veio. O
   *  motor lê essa bolha no turno seguinte (marcadores), então ela não é
   *  decoração — é o primeiro passo do fluxo. */
  assistantFirst?: string;
  /** Context passed to the agent (server-side system prompt). */
  scope?: string;
  /** Human-readable area label shown in the drawer header. */
  scopeLabel?: string;
}

interface BelaChatContextValue {
  open: boolean;
  messages: BelaChatMessage[];
  loading: boolean;
  mode: BelaChatMode | null;
  scopeLabel?: string;
  openChat: (opts?: BelaChatOpenOptions) => void;
  closeChat: () => void;
  send: (text: string) => void;
  /** Append a local assistant message WITHOUT calling the agent — used to show
   *  an authoritative confirmation (e.g. the store protocolo after a chamado is
   *  created on the front). Keeps the simulated flow intact. */
  pushAssistant: (text: string) => void;
}

const BelaChatContext = React.createContext<BelaChatContextValue | null>(null);

/** Draft do motor → input do store compartilhado. O chat é autoritativo na
 *  CRIAÇÃO: confirmar abre um chamado REAL (POST) que aparece em Meus Chamados.
 *  `serviceId` = o slug classificado pelo motor (o backend resolve slug →
 *  grupo/SLA/categoria); `requester` = usuário logado, não o placeholder. */
export function mapDraftToTicket(draft: BelaTicketDraft, requester: string): OpenTicketInput {
  return {
    title: draft.subject?.trim() || draft.service || 'Solicitação via bela',
    description: draft.description?.trim() || undefined,
    serviceId: draft.slug,
    category: draft.category,
    channel: 'bela chat',
    needsApproval: draft.approval,
    requester,
    responsavel: draft.team,
    // O que o motor INFERIU viaja para a abertura (2026-08-27): ativo citado na
    // conversa e dono do pedido. Sem isto o resumo prometia "institucional" e o
    // ticket nascia pessoal — promessa quebrada entre a revisao e o banco.
    assetId: draft.asset,
    ownership: draft.ownership,
  };
}

/** Confirmação com o protocolo REAL do banco — o texto que antes o motor
 *  inventava (`openReply` com protocolo aleatório) agora nasce aqui, DEPOIS do
 *  POST, com os dados do draft revisado. */
function openedMessage(code: string, draft: BelaTicketDraft): string {
  if (!draft.service) {
    return `Pronto! Abri o chamado ${code}. A triagem direciona para a equipe certa e você acompanha tudo em "Meus chamados".`;
  }
  const tail = draft.approval
    ? `Como envolve aprovação, ele segue primeiro para o seu gestor — aprovado, a equipe ${draft.team} assume (prazo de ${draft.sla}).`
    : `A equipe ${draft.team} já recebeu — o prazo de atendimento é de ${draft.sla}.`;
  return `Pronto! Abri o chamado ${code} — "${draft.service}". ${tail} Você acompanha tudo em "Meus chamados".`;
}

/** Confirmação da DECISÃO de aprovação com o resultado real (pós-POST) — a bela
 *  só afirma o que aconteceu; o que não estava mais pendente é dito como tal. */
function approvalActionMessage(action: BelaApprovalAction, outcome: ApprovalActionOutcome): string {
  const { decided, missing } = outcome;
  const lista = decided.join(', ');
  let head: string;
  if (decided.length === 0) {
    head = 'Nenhuma dessas solicitações está mais pendente — a fila já foi atualizada.';
  } else if (action.decision === 'approve') {
    head =
      decided.length === 1
        ? `Pronto — aprovei a ${lista}. O chamado segue para a equipe responsável.`
        : `Pronto — aprovei as ${decided.length} solicitações: ${lista}. Elas saíram da sua fila e os chamados seguem para as equipes.`;
  } else if (action.decision === 'reject') {
    head = `Registrei a reprovação da ${lista} com a sua justificativa — o solicitante vê o motivo no chamado.`;
  } else {
    head = `Pedi evidência na ${lista} — a solicitação voltou ao solicitante e sai da sua fila de decisão até ele responder.`;
  }
  const tail = missing.length && decided.length ? ` Não encontrei ${missing.join(', ')} entre as pendentes — pode já ter sido decidida.` : '';
  return `${head}${tail}`;
}

/** Confirmação do verbo de fila com o resultado REAL (pós-execução). */
const QUEUE_VERB_LABEL: Record<BelaQueueAction['verb'], string> = {
  assumir: 'assumi', retomar: 'retomei o atendimento de', devolver: 'devolvi ao solicitante',
  resolver: 'marquei como resolvido', encerrar: 'encerrei', escalar: 'escalei',
};
function queueActionMessage(action: BelaQueueAction, out: { done: string[]; failed: string[] }): string {
  if (out.done.length === 0) {
    return 'Não consegui concluir — os chamados podem ter mudado de estado ou faltou permissão. Recarregue a fila e me diga como seguir.';
  }
  const lista = out.done.join(', ');
  const head = out.done.length === 1
    ? `Pronto — ${QUEUE_VERB_LABEL[action.verb]} o ${lista}.`
    : `Pronto — ${QUEUE_VERB_LABEL[action.verb]} ${out.done.length} chamados: ${lista}.`;
  return out.failed.length ? `${head} Não consegui em ${out.failed.join(', ')} — confira o estado deles na fila.` : head;
}

/** Tempo MÍNIMO que os três pontinhos de "escrevendo" ficam na tela, em ms
 *  (regra de DS do user, 2026-08-27: "sempre mostre os ... de escrevendo, mesmo
 *  que a interação seja rápida, perca 1 ou 2 segundos"). Piso, não atraso: só
 *  age quando a resposta volta antes disso. */
const MIN_ESCREVENDO_MS = 1200;

export function BelaChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<BelaChatMessage[]>([]);
  // Toda mensagem entra carimbada com a hora (o Figma põe "12:34" abaixo da
  // bolha). Um lugar só: os ~14 pontos que empurram mensagem passam por aqui,
  // então nenhum turno novo pode esquecer o carimbo.
  const commit = React.useCallback((list: BelaChatMessage[]) => {
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setMessages(list.map((m) => (m.at ? m : { ...m, at: agora })));
  }, []);
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState<BelaChatMode | null>(null);
  const [scopeLabel, setScopeLabel] = React.useState<string | undefined>(undefined);

  // Refs mirror state so `send` never reads a stale closure when fired back to
  // back (e.g. open-with-text immediately triggering the first request).
  const messagesRef = React.useRef<BelaChatMessage[]>([]);
  const loadingRef = React.useRef(false);
  const scopeRef = React.useRef<string | undefined>(undefined);

  const send = React.useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loadingRef.current) return;

    const next = [...messagesRef.current, { role: 'user' as const, content: trimmed }];
    messagesRef.current = next;
    commit(next);
    loadingRef.current = true;
    setLoading(true);

    // PISO DE TEMPO do indicador "escrevendo" (regra de DS do user, 2026-08-27):
    // a bela SEMPRE mostra os três pontinhos, mesmo quando a resposta volta na
    // hora. No simulado ela volta em dezenas de ms e o indicador só piscava —
    // a conversa parecia um formulário respondendo, não alguém escrevendo.
    // É PISO, não atraso fixo: quando a resposta demora mais que isso (Ollama
    // leva 12–30s), nada é somado. E segura a BOLHA junto, não só o `loading` —
    // liberar a mensagem antes dos pontinhos mostraria a resposta pronta com a
    // bela "ainda escrevendo".
    const inicio = Date.now();
    const pisoDoIndicador = () =>
      new Promise<void>((resolve) => {
        const falta = MIN_ESCREVENDO_MS - (Date.now() - inicio);
        if (falta <= 0) resolve();
        else window.setTimeout(resolve, falta);
      });

    sendBelaChat(next, scopeRef.current)
      .then(
        (r) => pisoDoIndicador().then(() => r),
        (e) => pisoDoIndicador().then(() => { throw e; }),
      )
      .then((r) => {
        // Resposta vazia com `open` = abertura confirmada: nenhuma bolha do
        // motor; a confirmação (com o protocolo REAL) entra após o POST abaixo.
        if (r.reply || r.draft || r.article) {
          const after = [...messagesRef.current, { role: 'assistant' as const, content: r.reply, draft: r.draft, article: r.article }];
          messagesRef.current = after;
          commit(after);
        }
        setMode(r.mode);
        // Abertura confirmada (por texto, ou guardrail de confirmação
        // desligado): o motor NÃO inventa protocolo — o front cria o chamado
        // real e confirma com o código do banco (mesmo padrão do DraftCard).
        if (r.open) {
          const open = r.open;
          openTicket(mapDraftToTicket(open, getActiveProfile().persona.name))
            .then((ticket) => {
              const opened = [...messagesRef.current, { role: 'assistant' as const, content: openedMessage(ticket.id, open) }];
              messagesRef.current = opened;
              commit(opened);
            })
            .catch(() => {
              const failed = [
                ...messagesRef.current,
                { role: 'assistant' as const, content: 'Não consegui abrir o chamado agora. Pode tentar novamente?' },
              ];
              messagesRef.current = failed;
              commit(failed);
            });
        }
        // PERÍODO DE AUSÊNCIA (2026-08-27): o motor reconhece a intenção, o
        // HOST decide se pode — a janela é de quem tem trabalho delegável
        // (aprova ou opera fila), e só o front sabe o perfil logado. Sem esta
        // porta a bela ofereceria a todo mundo e a metade não veria nada
        // acontecer, que é pior do que não entender.
        // PERÍODO DE AUSÊNCIA (2026-08-27): a conversa RESOLVE — a bela cria a
        // janela aqui e conta o resultado REAL. Chegou a abrir o drawer e o
        // user cortou: mandar para outra aba é o oposto de resolver. O host
        // executa (não o motor) porque só ele tem a sessão, a lista de quem
        // pode cobrir e a rota — a bela nunca afirma um registro que não houve.
        if (r.ausencia && 'criar' in r.ausencia) {
          const { datas, substituto } = r.ausencia.criar;
          criarAusenciaPelaConversa({ inicio: paraISO(datas[0]), fim: paraISO(datas[1]), substituto })
            .then((res) => {
              const texto = res.ok
                ? `Pronto — registrei a sua ausência de ${fmtBR(paraISO(datas[0]))} a ${fmtBR(paraISO(datas[1]))}, com ${res.substituto} assumindo.${res.transferidas > 0 ? ` Passei ${res.transferidas} pendência(s) para ${res.substituto.split(' ')[0]}.` : ''}`
                : res.motivo === 'substituto_nao_encontrado'
                  ? `Não encontrei "${substituto}" entre quem pode assumir por você.${res.elegiveis && res.elegiveis.length ? ` Pode ser: ${res.elegiveis.join(', ')}.` : ''} Me diga o nome e eu registro.`
                  : res.motivo === 'sem_delegacao'
                    ? 'No seu acesso não há trabalho a delegar, então não há janela a registrar.'
                    : `Não consegui registrar agora${res.detalhe ? ` — ${res.detalhe}` : ''}. Quer tentar de novo?`;
              const after = [...messagesRef.current, { role: 'assistant' as const, content: texto }];
              messagesRef.current = after;
              commit(after);
            });
        }
        // Decisão de aprovação confirmada no chat contextual (payload
        // `approvalAction`, 2026-08-24): o front executa pela MESMA rota RBAC
        // dos botões da tela (código → aprovação pendente) e confirma com o
        // resultado real — o motor nunca afirma uma decisão que não aconteceu.
        if (r.approvalAction) {
          const action = r.approvalAction;
          decideApprovalsByCode(action.codes, action.decision, action.reason)
            .then((outcome) => {
              const decidedMsg = [...messagesRef.current, { role: 'assistant' as const, content: approvalActionMessage(action, outcome) }];
              messagesRef.current = decidedMsg;
              commit(decidedMsg);
            })
            .catch(() => {
              const failed = [
                ...messagesRef.current,
                { role: 'assistant' as const, content: 'Não consegui registrar a decisão agora. Verifique suas permissões e tente novamente.' },
              ];
              messagesRef.current = failed;
              commit(failed);
            });
        }
        // Verbo de trabalho confirmado no chat da Lista (2026-08-25): o front
        // executa pelos mesmos verbos com RBAC e confirma com o resultado real.
        if (r.queueAction) {
          const action = r.queueAction;
          runQueueVerbByCode(action.codes, action.verb)
            .then((out) => {
              const after = [...messagesRef.current, { role: 'assistant' as const, content: queueActionMessage(action, out) }];
              messagesRef.current = after;
              commit(after);
            })
            .catch(() => {
              const failed = [
                ...messagesRef.current,
                { role: 'assistant' as const, content: 'Não consegui executar a ação agora. Verifique suas permissões e tente novamente.' },
              ];
              messagesRef.current = failed;
              commit(failed);
            });
        }
        // Ação sobre ATIVO (Assets/CMDB, 2026-08-25): abrir o chamado do ativo
        // é o mesmo caminho do botão da tabela — a Nova Solicitação abre com o
        // ativo preenchido, e a bela confirma o que fez.
        // SANEAMENTO da descoberta (2026-08-26): o chat da Discovery age como
        // o card — executa o verbo pelas rotas com RBAC (o backend recusa o
        // que o papel não pode) e relata o resultado REAL, item a item quando
        // algum falha. A tela recarrega sozinha pelo evento.
        if (r.discoveryAction) {
          const act = r.discoveryAction;
          const say = (content: string) => {
            const after = [...messagesRef.current, { role: 'assistant' as const, content }];
            messagesRef.current = after;
            commit(after);
          };
          say(`Aplicando "${act.label}" em ${act.devices.length} ${act.devices.length === 1 ? 'dispositivo' : 'dispositivos'}…`);
          (async () => {
            const ok: string[] = [];
            const negados: string[] = [];
            const falhos: string[] = [];
            for (const dev of act.devices) {
              try {
                const res = await fetch(`/api/assets/discovery/${dev.id}/${act.verb}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Persona': getActiveProfile().email },
                  body: JSON.stringify(act.verb === 'link' && dev.assetId ? { assetId: dev.assetId } : {}),
                });
                if (res.ok) ok.push(dev.hostname);
                else if (res.status === 403) negados.push(dev.hostname);
                else falhos.push(dev.hostname);
              } catch {
                falhos.push(dev.hostname);
              }
            }
            window.dispatchEvent(new CustomEvent('bela:discovery-changed'));
            const linhas = [
              ok.length ? `Pronto: ${act.label} em ${ok.length} ${ok.length === 1 ? 'dispositivo' : 'dispositivos'} (${ok.slice(0, 4).join(', ')}${ok.length > 4 ? ` e mais ${ok.length - 4}` : ''}).` : null,
              negados.length ? `${negados.length} ${negados.length === 1 ? 'ficou' : 'ficaram'} de fora: seu perfil não decide esse passo — quem importa, vincula e ignora é a administração.` : null,
              falhos.length ? `Não consegui em: ${falhos.slice(0, 4).join(', ')}${falhos.length > 4 ? ` e mais ${falhos.length - 4}` : ''}.` : null,
              !ok.length && !negados.length && !falhos.length ? 'Nada a fazer.' : null,
            ].filter(Boolean);
            say(linhas.join(' '));
          })();
        }
        // LOTE de ativos (2026-08-26): a bela abre um chamado POR ativo, de
        // verdade (POST com o código do ativo — o backend resolve o vínculo) e
        // só então lista os protocolos que o banco devolveu. Falha em um não
        // derruba os outros, e o que não abriu é dito por nome.
        if (r.assetAction && r.assetAction.action === 'open_tickets') {
          const bulk = r.assetAction;
          const say = (content: string) => {
            const after = [...messagesRef.current, { role: 'assistant' as const, content }];
            messagesRef.current = after;
            commit(after);
          };
          say(`Abrindo ${bulk.assets.length} ${bulk.assets.length === 1 ? 'chamado' : 'chamados'} de ${bulk.serviceLabel}…`);
          (async () => {
            // A abertura em si mora em `abrirChamadosDeAtivos` (tickets/store) —
            // a tela de Assets usa a MESMA função desde 2026-08-28, para as duas
            // portas gerarem registros idênticos.
            const { abertos, falhas } = await abrirChamadosDeAtivos(
              bulk.assets,
              { serviceId: bulk.serviceId, serviceLabel: bulk.serviceLabel },
            );
            const linhas = [
              abertos.length
                ? `Abri ${abertos.length} ${abertos.length === 1 ? 'chamado' : 'chamados'} de ${bulk.serviceLabel}: ${abertos.join(', ')}.`
                : 'Não consegui abrir nenhum chamado agora.',
              falhas.length ? `Ficaram de fora: ${falhas.join(', ')} — verifique suas permissões e tente de novo.` : null,
              abertos.length ? 'Você acompanha todos em "Tickets da equipe" — a fila inteira responde por eles.' : null,
            ].filter(Boolean);
            say(linhas.join(' '));
          })();
        }
        if (r.assetAction && r.assetAction.action === 'open_ticket') {
          const { code } = r.assetAction;
          const after = [
            ...messagesRef.current,
            { role: 'assistant' as const, content: `Abrindo o chamado do ativo ${code} — a solicitação já vai com ele preenchido; é só revisar e enviar.` },
          ];
          messagesRef.current = after;
          commit(after);
          window.location.hash = `#/nova-solicitacao?assetCode=${encodeURIComponent(code)}`;
          setOpen(false);
        }
        // Efeito colateral do motor "meus chamados": a resposta pendente vira
        // mensagem REAL no ticket (o backend retoma o fluxo). O front é o
        // autoritativo — mesmo padrão do draft. Sucesso fica implícito na
        // réplica do motor; só a FALHA ganha uma bolha corretiva.
        if (r.ticketReply) {
          const { code, text: replyText } = r.ticketReply;
          replyToTicket(code, replyText).catch(() => {
            const warned = [
              ...messagesRef.current,
              {
                role: 'assistant' as const,
                content: `Não consegui registrar sua resposta no chamado ${code} agora — tente novamente em instantes.`,
              },
            ];
            messagesRef.current = warned;
            commit(warned);
          });
        }
      })
      .catch(() => {
        const after = [
          ...messagesRef.current,
          { role: 'assistant' as const, content: 'Desculpe, não consegui responder agora. Tente novamente em instantes.' },
        ];
        messagesRef.current = after;
        commit(after);
        setMode('simulated');
      })
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });
  }, []);

  const openChat = React.useCallback(
    (opts?: BelaChatOpenOptions) => {
      scopeRef.current = opts?.scope;
      setScopeLabel(opts?.scopeLabel);
      const abertura = opts?.assistantFirst?.trim()
        ? [{ role: 'assistant' as const, content: opts.assistantFirst.trim() }]
        : [];
      messagesRef.current = abertura;
      commit(abertura);
      setMode(null);
      setOpen(true);
      if (opts?.text && opts.text.trim()) send(opts.text);
    },
    [send],
  );

  const closeChat = React.useCallback(() => setOpen(false), []);

  const pushAssistant = React.useCallback((text: string) => {
    const after = [...messagesRef.current, { role: 'assistant' as const, content: text }];
    messagesRef.current = after;
    commit(after);
  }, []);

  const value = React.useMemo(
    () => ({ open, messages, loading, mode, scopeLabel, openChat, closeChat, send, pushAssistant }),
    [open, messages, loading, mode, scopeLabel, openChat, closeChat, send, pushAssistant],
  );

  return <BelaChatContext.Provider value={value}>{children}</BelaChatContext.Provider>;
}

export function useBelaChat(): BelaChatContextValue {
  const ctx = React.useContext(BelaChatContext);
  if (!ctx) throw new Error('useBelaChat must be used within a BelaChatProvider');
  return ctx;
}
