import * as React from 'react';

/**
 * The bela spark — the product's single AI signifier (deck p.16–18). Marks
 * AI-generated content, AI actions and thinking states. Never a wand, robot,
 * brain, lightbulb or ✨. Never sits inside the pinwheel symbol.
 */
export interface SparkProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  size?: number;
  color?: string;
  /** Pulse while bela is thinking (the only looping animation in the system). */
  pulse?: boolean;
  rotate?: number;
}

/**
 * Geometria EXATA do "Star 10" do Figma `Bela_By_Belago` (nó 277:627, exportado
 * em 2026-08-26), reescalada de um viewBox de 8 para o de 100 desta componente
 * — o contrato `size` não muda.
 *
 * O que mudou: o glifo antigo era uma estrela de pontas FINAS, apontando para
 * cima/baixo/lados e inscrita em 54% da caixa (23→77) — ou seja, `size={12}`
 * desenhava 6,5px de estrela. O da marca aponta para os CANTOS, tem braços
 * grossos de curva côncava e preenche a caixa inteira (0→100). Por isso os
 * tamanhos dos pontos de uso encolheram junto: o mesmo peso visual agora cabe
 * num número menor, e o Figma pede 8 para o carimbo e os marcadores inline.
 */
const PATH =
  'M0 0L19.3246 11.6178C38.2006 22.9659 61.7994 22.9659 80.6754 11.6178L100 0'
  + 'L88.3823 19.3246C77.0341 38.2006 77.0341 61.7994 88.3823 80.6754L100 100'
  + 'L80.6754 88.3823C61.7994 77.0341 38.2006 77.0341 19.3246 88.3823L0 100'
  + 'L11.6178 80.6754C22.9659 61.7994 22.9659 38.2006 11.6178 19.3246L0 0Z';

export function Spark({ size = 20, color = 'currentColor', pulse = false, rotate = 0, style, ...rest }: SparkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{
        display: 'block',
        flexShrink: 0,
        color,
        animation: pulse ? 'bela-spark-pulse 1.8s var(--ease-in-out) infinite' : 'none',
        ...style,
      }}
      {...rest}
    >
      <path d={PATH} fill="currentColor" transform={rotate ? `rotate(${rotate} 50 50)` : undefined} />
    </svg>
  );
}
