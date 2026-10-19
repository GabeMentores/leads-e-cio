// Tela 1 — o chat público (QR do evento). Conversa em tela cheia, mobile-first:
// a conversa É a superfície (por isso as bolhas em tom `brand`, a regra do
// drawer). Composição 100% bela-kit — nenhum primitivo local.
import * as React from 'react';
import {
  KitPage, KitChatBubble, KitBelaText, KitComposer, KitCard, KitButton, KitChip, WEIGHT,
} from '@bela/ui';
// Marca do CANAL é a Belago (user, 09-15) — logo oficial no cabeçalho, no
// lugar do lockup da bela.
import belagoLogo from './assets/belago-luxor-logo.svg';
import { useRoteiro, placeholderDaEtapa } from './motor';

function Escrevendo() {
  return (
    <KitChatBubble from="bela" tone="brand" portrait={false}>
      <span aria-label="escrevendo" style={{ display: 'inline-flex', gap: 4, alignItems: 'center', height: '1em' }}>
        {['0s', '0.15s', '0.3s'].map((delay) => (
          <span
            key={delay}
            className="bela-typing-dot"
            aria-hidden="true"
            style={{
              display: 'inline-block', width: 6, height: 6,
              borderRadius: 'var(--radius-full)', background: 'var(--text-muted)',
              animationDelay: delay,
            }}
          />
        ))}
      </span>
    </KitChatBubble>
  );
}

function CartaoDoCodigo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = React.useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* clipboard bloqueado (http, permissão) — o código segue visível */ }
  };
  return (
    <KitCard tone="brandSoft" padding="lg" elevation="none">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontWeight: WEIGHT.bold,
            fontSize: 'var(--heading-lg-size)', letterSpacing: '0.18em',
            color: 'var(--text-brand)', paddingLeft: '0.18em', /* compensa o tracking do último glifo */
          }}
        >
          {codigo}
        </span>
        <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-secondary)' }}>
          seu código da roleta — mostre no estande da Belago
        </span>
        <KitButton variant="soft" size="xs" onClick={copiar}>
          {copiado ? 'Copiado!' : 'Copiar código'}
        </KitButton>
      </div>
    </KitCard>
  );
}

export function ChatScreen() {
  const { mensagens, digitando, ocupada, etapa, codigo, codigoUsado, botoes, enviar } = useRoteiro();
  const [texto, setTexto] = React.useState('');
  const fimRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens, digitando, codigo, botoes]);

  // Regra do CLIENTE (09-15): toda confirmação vem em BOTÃO e o teclado trava
  // até ela ser respondida (`botoes.bloqueiaEntrada`, decidido no cérebro).
  // Texto livre fica só para o que precisa ser digitado.
  // No FIM o teclado permanece inativo (cliente, 09-15): a conversa termina
  // no código — dúvidas são com o pessoal do estande.
  const bloqueada = etapa === 'gravando' || etapa === 'verificando_email'
    || etapa === 'fim' || Boolean(botoes?.bloqueiaEntrada);

  // Botões aparecem quando a bela terminou de falar (a fila esvaziou — só
  // `digitando` piscaria entre bolhas) e há mensagem dela para ancorá-los.
  const botoesVisiveis = Boolean(botoes) && !ocupada
    && mensagens.length > 0 && mensagens[mensagens.length - 1].from === 'bela';

  return (
    <div className="bela-kit" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'hsl(var(--surface-0))' }}>
      {/* Cabeçalho no molde do drawer da bela (referência do user, 09-01):
          faixa BRANCA de ponta a ponta com o logo, separada da conversa por um
          divider fino — a conversa fica no fundo suave da página. */}
      <header style={{ flexShrink: 0, background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center' }}>
          <img src={belagoLogo} alt="Belago | Luxor" style={{ height: 30, display: 'block' }} />
        </div>
      </header>

      <KitPage
        style={{
          flex: 1, minHeight: 0, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column',
          gap: 'var(--space-4)', padding: 'var(--space-5)',
          paddingBottom: 'calc(var(--space-5) + env(safe-area-inset-bottom))',
        }}
      >
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversa com a Belago"
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column',
          gap: 'var(--space-4)', scrollbarGutter: 'stable', paddingRight: 2,
        }}
      >
        {/* Hora AGRUPADA, como chat de verdade: só a última bolha de uma
            sequência do mesmo autor carrega o horário — e a fala que ancora
            as pills cede a hora a elas (user, 09-01: nada de 12:08 entre a
            fala e as respostas rápidas). */}
        {mensagens.map((m, i) => {
          const proxima = mensagens[i + 1];
          const fimDeGrupo = !proxima || proxima.from !== m.from;
          const cedeParaPills = botoesVisiveis && i === mensagens.length - 1;
          return (
            // Sem o retrato da bela na bolha (user, 09-15) — o canal fala em
            // nome da Belago.
            <KitChatBubble key={m.id} from={m.from} tone="brand" portrait={false} time={fimDeGrupo && !cedeParaPills ? m.hora : undefined}>
              {m.from === 'bela' ? <KitBelaText text={m.texto} /> : m.texto}
            </KitChatBubble>
          );
        })}
        {digitando && <Escrevendo />}
        {/* Botões da etapa, DIRIGIDOS pelo cérebro (botoesDe) — cada clique
            vira mensagem REAL ao motor, nunca prefill (padrão do desk,
            ChatQuickActions). Confirmações travam o composer até a resposta
            (regra do cliente, 09-15). Mobile-first: colados na fala da bela,
            branco com contorno lavanda, lado a lado quebrando só sem espaço. */}
        {botoesVisiveis && botoes && (
          <div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              gap: 'var(--space-2)',
              marginTop: 'calc(-1 * var(--space-2))',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {botoes.botoes.map((rotulo) => (
                <KitChip key={rotulo} tone="outline" onClick={() => enviar(rotulo)}>{rotulo}</KitChip>
              ))}
            </div>
            {/* A hora que a fala cedeu aos botões fecha o grupo aqui embaixo
                (user, 09-01) — mesmo desenho do horário das bolhas. */}
            <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>
              {mensagens[mensagens.length - 1]?.hora}
            </span>
          </div>
        )}
        {/* O cartão grande só existe enquanto o giro VALE — código usado não
            ganha destaque (user, 09-01), a fala já disse dia/hora do giro. */}
        {etapa === 'fim' && codigo && !codigoUsado && !digitando && <CartaoDoCodigo codigo={codigo} />}
        <div ref={fimRef} />
      </div>

      <div style={{ flexShrink: 0 }}>
        <KitComposer
          value={texto}
          onChange={setTexto}
          onSubmit={() => { enviar(texto); setTexto(''); }}
          placeholder={botoes?.bloqueiaEntrada ? 'Selecione uma resposta acima' : placeholderDaEtapa(etapa)}
          aria-label="Escreva sua mensagem"
          submitLabel="Enviar"
          disabled={bloqueada}
          autoFocus
        />
      </div>
      </KitPage>
    </div>
  );
}
