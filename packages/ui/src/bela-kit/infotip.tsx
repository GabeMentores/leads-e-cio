import { WEIGHT } from './index';
import * as React from 'react';
import { Info } from 'lucide-react';

/**
 * KitInfoTip — o "(i)" com tooltip do design system (nasceu 2026-08-20, pedido
 * do user: a frase explicativa das seções da Administração vira tooltip).
 *
 * Padrão de acessibilidade: o gatilho é um BOTÃO focável; o painel abre em
 * hover E foco (teclado alcança), fecha em Escape, e fica ligado ao gatilho
 * por `aria-describedby`. Clique alterna (útil em touch, onde hover não
 * existe). Sem portal: posiciona absoluto sob o gatilho — dentro de KitCard
 * não há overflow escondido para cortá-lo.
 */
let seq = 0;

/** Folga mínima entre o painel e a borda da janela. */
const MARGEM_JANELA = 8;

/**
 * ENCAIXE NA JANELA (user, 2026-09-24: *"tem que cuidar o limite da tela quando
 * o assunto é tooltip"*).
 *
 * O painel é posicionado por CSS relativo ao gatilho, e o gatilho não sabe onde
 * está na tela: um `(i)` no canto direito de uma seção jogava o painel para
 * fora da janela e o texto ficava cortado pela borda. Não dá para resolver só
 * com CSS — depende de medir onde o painel caiu.
 *
 * Então: abriu, mede; se passou de uma borda, desloca o necessário para caber
 * (nunca mais do que o preciso, para o painel continuar apontando para o
 * gatilho); se não cabe embaixo mas cabe em cima, vira para cima.
 *
 * `useLayoutEffect` e não `useEffect`: a correção entra ANTES da pintura, senão
 * o painel aparece estourado por um quadro e salta para o lugar.
 */
function useEncaixeNaJanela(open: boolean, preferido: 'top' | 'bottom') {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const [deslocX, setDeslocX] = React.useState(0);
  const [lado, setLado] = React.useState(preferido);

  React.useLayoutEffect(() => {
    if (!open) { setDeslocX(0); setLado(preferido); return; }
    const el = ref.current;
    if (!el) return;
    /* Mede SEM deslocamento: o estado volta a zero ao fechar, então o retângulo
       lido aqui é sempre o da posição natural. */
    const r = el.getBoundingClientRect();
    const larguraJanela = document.documentElement.clientWidth;
    let dx = 0;
    if (r.right > larguraJanela - MARGEM_JANELA) dx = larguraJanela - MARGEM_JANELA - r.right;
    else if (r.left < MARGEM_JANELA) dx = MARGEM_JANELA - r.left;
    setDeslocX(dx);

    const alturaJanela = document.documentElement.clientHeight;
    const estouraEmbaixo = r.bottom > alturaJanela - MARGEM_JANELA;
    const cabeEmCima = r.top - r.height - 12 > MARGEM_JANELA;
    setLado(preferido === 'bottom' && estouraEmbaixo && cabeEmCima ? 'top' : preferido);
  }, [open, preferido]);

  return { ref, deslocX, lado };
}

export function KitInfoTip({ text, size = 15 }: { text: string; size?: number }) {
  const [open, setOpen] = React.useState(false);
  const [id] = React.useState(() => `kit-infotip-${++seq}`);
  const { ref, deslocX, lado } = useEncaixeNaJanela(open, 'bottom');

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Mais informações"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          margin: 0, padding: 2, border: 'none', background: 'transparent',
          color: 'var(--text-muted)', cursor: 'help', borderRadius: 'var(--radius-sm)',
        }}
      >
        <Info size={size} aria-hidden="true" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          ref={ref}
          style={{
            position: 'absolute', zIndex: 40,
            ...(lado === 'top' ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
            left: 0,
            transform: deslocX ? `translateX(${deslocX}px)` : undefined,
            width: 'max-content',
            /* O teto é o MENOR entre 320 e a janela menos as margens: numa tela
               estreita, 320 fixos estouram antes de qualquer deslocamento ter
               o que fazer. */
            maxWidth: `min(320px, calc(100vw - ${MARGEM_JANELA * 2}px))`,
            background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--body-sm-size)', lineHeight: 1.5, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontWeight: WEIGHT.regular, letterSpacing: 'normal',
            textAlign: 'left', whiteSpace: 'normal',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

/**
 * KitDataTip — o MESMO tooltip do `KitInfoTip`, mas embrulhando um dado em vez
 * do "(i)". Nasceu da regra do user (2026-09-03): *"todos os dados devem ter
 * hover, ao passar o mouse dá detalhes do dado"* — barra de gráfico, linha de
 * fila, nota do CSAT. O `title` nativo não serve: demora ~1s, some sozinho e não
 * segue a tipografia do produto.
 *
 * `place='top'` para marcas que crescem de baixo (barras); 'bottom' no resto.
 * O gatilho é `tabIndex=0` para o teclado alcançar o mesmo detalhe.
 */
export function KitDataTip({
  text, children, place = 'bottom', block = false,
}: {
  text: string;
  children: React.ReactNode;
  place?: 'top' | 'bottom';
  block?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [id] = React.useState(() => `kit-datatip-${++seq}`);
  /* Mesmo encaixe do KitInfoTip. Aqui o estouro é PIOR: o painel é centrado no
     gatilho, então vaza nos DOIS lados — e este tooltip mora em barra de
     gráfico e célula de tabela, que vivem justamente nas pontas. */
  const { ref, deslocX, lado } = useEncaixeNaJanela(open, place);
  return (
    <span
      style={{ position: 'relative', display: block ? 'block' : 'inline-flex', width: block ? '100%' : undefined, height: block ? '100%' : undefined }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      tabIndex={0}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          ref={ref}
          style={{
            position: 'absolute', zIndex: 40,
            ...(lado === 'top' ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
            left: '50%', transform: `translateX(calc(-50% + ${deslocX}px))`,
            width: 'max-content',
            maxWidth: `min(280px, calc(100vw - ${MARGEM_JANELA * 2}px))`,
            background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--caption-size)', lineHeight: 1.5, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontWeight: WEIGHT.regular, letterSpacing: 'normal',
            textAlign: 'left', whiteSpace: 'normal', pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
