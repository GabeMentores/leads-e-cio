import { WEIGHT } from '../bela-kit';
import * as React from 'react';
import { X, Check, ClipboardCheck, BookOpen } from 'lucide-react';
import {
  useKitDrawerMotion, KitComposer, KitChatBubble, KitIconButton, KitBelaText, BelaPortrait,
} from '../bela-kit';
import { Logo } from '../components/brand/Logo';
import { useBelaChat, mapDraftToTicket } from './context';
import type { BelaTicketDraft } from './client';
import { openTicket } from '../tickets/store';
import { useProfile, currentApprover } from '../profile/store';
import { useGlossary } from '../tickets/glossary';

// `mapDraftToTicket` mora no context (2026-08-24): o mesmo mapeador atende o
// botão do cartão E o payload `open` do motor (abertura confirmada por texto).

/**
 * Right-side conversation panel for BELA. Mounted once in the shell; opens
 * whenever any BELA input calls `openChat`. This is a 100%-BELA surface — it
 * only ever appears through a BELA affordance, so it never competes with the
 * ITSM-native baseline.
 */
export interface BelaChatDrawerProps {
  /** Atalhos do estado inicial (renderizados sob a saudação enquanto a conversa
   *  está vazia). Vem do HOST como elemento pronto — o drawer mora em @bela/ui
   *  e não pode importar stores de feature (ex.: catálogo) sem criar ciclo;
   *  o elemento só MONTA quando o chat abre, então nada hidrata no boot. */
  quickActions?: React.ReactNode;
  /** Abre o ARTIGO citado numa resposta (2026-08-20): o host decide o destino
   *  (bela desk → página do artigo da Base). Sem handler, a afordância não
   *  aparece (ex.: Console, que não tem a tela de artigo). O drawer fecha
   *  antes de navegar. */
  onOpenArticle?: (articleId: string) => void;
}

export function BelaChatDrawer({ quickActions, onOpenArticle }: BelaChatDrawerProps = {}) {
  const { open, messages, loading, scopeLabel, closeChat, send, pushAssistant } = useBelaChat();
  // Solicitante = usuário logado (perfil selecionado no switcher), não o placeholder
  // do agente. Identidade é front/sessão, então a compomos aqui.
  const { persona } = useProfile();
  // Glossário por persona (2026-08-27): o texto do drawer acompanha a fala da
  // bela — colaborador lê "chamado", quem opera lê "ticket".
  const g = useGlossary();
  const [value, setValue] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Mesmo slide in/out dos drawers do KitDrawer (o markup daqui segue
  // Tailwind, mas o MOTION é o do DS — decisão 2026-08-13). `present`
  // mantém o painel montado durante a saída; o estado da conversa vive no
  // contexto, então o conteúdo não precisa de congelamento.
  const { present, shown, dur } = useKitDrawerMotion(open);

  // Pin to the latest message as the conversation grows.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeChat]);

  if (!present) return null;

  const submit = () => {
    if (!value.trim()) return;
    send(value);
    setValue('');
  };

  return (
    <div className="bela-kit fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Conversa com a bela">
      {/* Backdrop — o MESMO scrim tokenizado do KitDrawer (varredura DS 08-25;
          antes um hsl literal fora do DS). A classe bela-kit dá o escopo. */}
      <button
        aria-label="Fechar conversa"
        onClick={closeChat}
        className="absolute inset-0"
        style={{ background: 'var(--surface-overlay)', opacity: shown ? 1 : 0, transition: `opacity ${dur} var(--ease-out)` }}
      />

      {/* Panel */}
      <div
        className="relative flex h-full w-[min(470px,100vw)] flex-col border-l border-accent-bela-border bg-surface-0 shadow-[var(--elevation-3)]"
        style={{ transform: shown ? 'translateX(0)' : 'translateX(100%)', transition: `transform ${dur} var(--ease-out)` }}
      >
        {/* Header — quadrado Roxo com o símbolo + nome, sobre branco (Figma
            Bela_By_Belago, 2026-08-26). Era um círculo lavanda com sparkle sobre
            fundo lavanda: a marca aparecia diluída justamente no lugar onde ela
            se apresenta. O chip de estado ("Disponível") SAIU — a bela estar
            disponível é o pressuposto de o painel estar aberto; o chip só
            ocupava a linha do nome. */}
        <div
          className="flex items-center gap-[var(--space-sm)] border-b border-border-subtle"
          style={{ background: 'var(--surface-card)', padding: 'var(--space-6)' }}
        >
          {/* O LOGO, não o sparkle (user, 2026-08-27). Quem se apresenta no
              cabeçalho é a MARCA; o Spark é marcador de widget da bela dentro
              de uma tela — misturar os dois faz o sparkle valer como logotipo
              em um lugar e como etiqueta de funcionalidade em outro. O quadrado
              roxo sai junto: o símbolo já é a marca, e encaixá-lo num selo o
              transformava em ícone de app. */}
          <Logo variant="symbol" size={36} style={{ flexShrink: 0 }} />
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: 'var(--body-lg-size)', fontWeight: WEIGHT.semibold, color: 'var(--text-primary)' }}>bela</div>
            <div className="truncate" style={{ fontSize: 'var(--body-sm-size)', color: 'var(--text-secondary)' }}>
              {scopeLabel ?? 'Assistente de Service Desk'}
            </div>
          </div>
          <KitIconButton icon={<X size={18} />} label="Fechar" shape="square" onClick={closeChat} />
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex flex-1 flex-col gap-[var(--space-sm)] overflow-y-auto px-[var(--space-lg)] py-[var(--space-lg)]">
          {messages.length === 0 && !loading && (
            /* Estado inicial (Figma 26/08): a bela SE APRESENTA — retrato de 88px
               no terço superior, saudação nominal e só então os atalhos. Antes
               era um sparkle de 20px com o texto centrado na vertical, que lia
               como "vazio" em vez de "abertura". Fica no topo de propósito: o
               olho começa onde a conversa vai começar. */
            <div className="flex flex-col items-center gap-[var(--space-md)] pt-[var(--space-xl)] text-center">
              <BelaPortrait size={88} />
              <div className="flex flex-col gap-[var(--space-2xs)]">
                <p style={{ margin: 0, fontSize: 'var(--body-md-size)', fontWeight: WEIGHT.semibold, color: 'var(--text-primary)' }}>
                  Olá, {persona.name}
                </p>
                <p style={{ margin: 0, fontSize: 'var(--body-sm-size)', color: 'var(--text-secondary)' }}>
                  Posso ajudar a abrir {g.plural}, acompanhar solicitações ou encontrar o serviço certo. Como prefere iniciar?
                </p>
              </div>
              {quickActions}
            </div>
          )}

          {messages.map((m, i) => {
            // Mensagem com ARTIGO parte em duas bolhas no marcador da pergunta:
            // convite → [cartão do artigo] → "Isso resolveu?" — o cartão fica
            // no MEIO, onde o link é orgânico (decisão 2026-08-20).
            const askIdx = m.role === 'assistant' && m.article ? m.content.indexOf('Isso resolveu o seu caso?') : -1;
            const partes = askIdx > 0 ? [m.content.slice(0, askIdx).trim(), m.content.slice(askIdx).trim()] : [m.content];
            // No drawer a conversa É a superfície inteira, então a bolha própria
            // assume o Roxo pleno (tone brand); na conversa do chamado, que
            // divide a tela, ela usa o tom quieto. Horário só na ÚLTIMA parte
            // quando a fala se divide em duas bolhas — o turno é um só.
            const bubble = (texto: string, comHora: boolean) => (
              <KitChatBubble
                from={m.role === 'user' ? 'self' : 'bela'}
                tone="brand"
                time={comHora ? m.at : undefined}
              >
                {/* Opção sublinhada (`__assim__`) vira RESPOSTA: o clique manda
                    o texto como se a pessoa tivesse digitado — resposta rápida
                    dentro da própria fala (sugestão do Fernando, 2026-09-02).
                    Só na fala DA BELA; na bolha própria não há o que responder. */}
                <KitBelaText text={texto} onOptionClick={m.role === 'assistant' ? send : undefined} />
              </KitChatBubble>
            );
            return (
            <React.Fragment key={i}>
              {bubble(partes[0], !partes[1])}
              {/* Cartão do artigo — abre em DRAWER SOBREPOSTO (o chat fica
                  vivo atrás; fechar o artigo volta para a conversa). Sem
                  destino no host, vira bloco informativo com o resumo. */}
              {m.role === 'assistant' && m.article && (
                onOpenArticle ? (
                  <button
                    type="button"
                    onClick={() => onOpenArticle(m.article!.id)}
                    className="flex max-w-[90%] items-center gap-[var(--space-2xs)] self-start rounded-[var(--radius-lg)] border border-accent-bela-border bg-surface-1 px-[var(--space-md)] py-[var(--space-xs)] text-left text-[length:var(--body-sm-size)] text-text-primary transition-colors hover:bg-accent-bela-bg"
                  >
                    <BookOpen size={15} className="shrink-0 text-accent-bela-fg" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="font-[var(--weight-medium)]">{m.article.title}</span>
                      {m.article.summary && <span className="block text-[length:var(--caption-size)] text-text-secondary">{m.article.summary}</span>}
                      <span className="block text-[length:var(--caption-size)] font-[var(--weight-medium)] text-accent-bela-fg">Abrir o artigo</span>
                    </span>
                  </button>
                ) : (
                  <div className="flex max-w-[90%] items-center gap-[var(--space-2xs)] self-start rounded-[var(--radius-lg)] border border-accent-bela-border bg-surface-1 px-[var(--space-md)] py-[var(--space-xs)] text-[length:var(--body-sm-size)] text-text-primary">
                    <BookOpen size={15} className="shrink-0 text-accent-bela-fg" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="font-[var(--weight-medium)]">{m.article.title}</span>
                      {m.article.summary && <span className="block text-[length:var(--caption-size)] text-text-secondary">{m.article.summary}</span>}
                    </span>
                  </div>
                )
              )}
              {partes[1] && bubble(partes[1], true)}
              {m.role === 'assistant' && m.draft && (
                <DraftCard
                  draft={m.draft}
                  requester={persona.name}
                  approver={currentApprover()}
                  active={i === messages.length - 1 && !loading}
                  onConfirm={() => {
                    // Front is authoritative on creation → open the chamado via the
                    // shared store (POSTa ao backend) e confirma com o protocolo do DB.
                    openTicket(mapDraftToTicket(m.draft!, persona.name))
                      .then((ticket) =>
                        pushAssistant(
                          `Pronto! Abri o ${g.term} ${ticket.id}. Você pode acompanhá-lo em "Meus ${g.plural}".`,
                        ),
                      )
                      .catch(() =>
                        pushAssistant(`Não consegui abrir o ${g.term} agora. Pode tentar novamente?`),
                      );
                  }}
                  onCancel={() => send('Cancelar a abertura')}
                />
              )}
            </React.Fragment>
            );
          })}

          {loading && (
            <div className="flex max-w-[90%] items-center gap-[var(--space-2xs)] self-start rounded-[var(--radius-lg)] rounded-bl-[var(--radius-xs)] bg-surface-2 px-[var(--space-md)] py-[var(--space-sm)]">
              <Dot delay="0ms" />
              <Dot delay="150ms" />
              <Dot delay="300ms" />
            </div>
          )}
        </div>

        {/* Composer — o MESMO do 4.a (KitComposer): painel lavanda com o campo
            branco dentro. Era um input solto de borda roxa aqui e uma textarea
            com botão "Enviar" rotulado lá, para a mesma ação. */}
        <div style={{ padding: 'var(--space-6)', paddingTop: 0 }}>
          <KitComposer
            value={value}
            onChange={setValue}
            onSubmit={submit}
            disabled={loading}
            autoFocus
            aria-label="Escreva sua mensagem para a bela"
            submitLabel="Enviar para a bela"
          />
        </div>
      </div>
    </div>
  );
}

/** Review-before-open card: the agent lays out the ticket data and the user
 *  confirms explicitly, preventing accidental openings. */
function DraftCard({
  draft,
  requester,
  approver,
  active,
  onConfirm,
  onCancel,
}: {
  draft: BelaTicketDraft;
  requester: string;
  /** Quem aprova por quem está pedindo. `null` quando não há gestor cadastrado. */
  approver?: string | null;
  active: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const rows: [string, string][] = [
    ['Categoria', draft.category],
    ['Serviço', draft.service],
    // ATIVO quando a conversa citou um (o motor INFERE do texto, não pergunta —
    // regra do dono, 2026-08-27). Some quando não há: linha vazia não informa.
    ...(draft.asset ? ([['Ativo relacionado', draft.asset]] as [string, string][]) : []),
    ['Equipe responsável', draft.team],
    /* PRAZO: com a bela ligada, serviço da camada dela resolve NA HORA — o SLA
       nativo não é o prazo que a pessoa vai viver. O catálogo já mostrava assim
       e o card do chat não, então a mesma solicitação anunciava dois prazos
       (cliente, 2026-09-15). Rótulo diferente, mesma regra do catálogo. */
    [draft.aiResolvable ? 'Prazo' : 'SLA', draft.aiResolvable ? 'Resolve na hora' : draft.sla],
    /* APROVAÇÃO com NOME. "Necessária (gestor)" não diz qual gestor, e a pessoa
       só descobre depois de abrir. Pior: quem não tem gestor cadastrado abriria
       um chamado que nasce travado sem ninguém saber — então a ausência também
       aparece, aqui, antes de confirmar. */
    ['Aprovação', draft.approval
      ? (approver ? `Necessária — ${approver}` : 'Necessária — sem aprovador cadastrado')
      : 'Não necessária'],
    // Solicitante vem do usuário logado (perfil), não do placeholder do agente.
    ['Solicitante', requester],
    // BENEFICIÁRIO aparece quando o pedido NÃO é para quem está falando — hoje
    // o caso inferido é o institucional (lote aberto por quem opera a fila): a
    // inferência fica à vista ANTES de confirmar, e não depois.
    ...(draft.beneficiary ? ([['Beneficiário', draft.beneficiary]] as [string, string][]) : []),
  ];
  const g = useGlossary();
  return (
    <div className="w-[95%] self-start rounded-[var(--radius-lg)] border border-accent-bela-border bg-surface-1 p-[var(--space-md)]">
      <div className="mb-[var(--space-sm)] flex items-center gap-[var(--space-2xs)] text-accent-bela-fg">
        <ClipboardCheck size={15} aria-hidden="true" />
        <span className="text-[length:var(--caption-size)] font-[var(--weight-semibold)] uppercase tracking-wide">Revisão do {g.term}</span>
      </div>

      {/* Assunto + Descrição (base fields, como na Nova Solicitação) */}
      <div className="mb-[var(--space-sm)] flex flex-col gap-[var(--space-2xs)]">
        <div>
          <div className="text-[length:var(--caption-size)] text-text-muted">Assunto</div>
          <div className="text-[length:var(--body-sm-size)] font-[var(--weight-medium)] text-text-primary">{draft.subject}</div>
        </div>
        <div>
          <div className="text-[length:var(--caption-size)] text-text-muted">Descrição</div>
          <div className="whitespace-pre-wrap text-[length:var(--body-sm-size)] text-text-primary">{draft.description}</div>
        </div>
      </div>

      <div className="mb-[var(--space-sm)] h-px bg-border-subtle" />

      <dl className="flex flex-col gap-[var(--space-2xs)]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-[var(--space-sm)]">
            <dt className="shrink-0 text-[length:var(--caption-size)] text-text-muted">{k}</dt>
            <dd className="text-right text-[length:var(--body-sm-size)] font-[var(--weight-medium)] text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>
      {active ? (
        <div className="mt-[var(--space-md)] flex gap-[var(--space-xs)]">
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-[var(--space-2xs)] rounded-[var(--radius-md)] bg-accent-bela px-[var(--space-md)] py-[var(--space-xs)] text-[length:var(--body-sm-size)] font-[var(--weight-medium)] text-[hsl(var(--text-on-accent))] transition-opacity hover:opacity-90"
          >
            <Check size={15} aria-hidden="true" />
            Confirmar abertura
          </button>
          <button
            onClick={onCancel}
            className="rounded-[var(--radius-md)] border border-border-default px-[var(--space-md)] py-[var(--space-xs)] text-[length:var(--body-sm-size)] text-text-secondary transition-colors hover:bg-surface-2"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="mt-[var(--space-sm)] text-[length:var(--caption-size)] text-text-muted">Revisão respondida.</div>
      )}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="bela-typing-dot inline-block h-1.5 w-1.5 rounded-[var(--radius-full)] bg-text-muted"
      style={{ animationDelay: delay }}
      aria-hidden="true"
    />
  );
}
