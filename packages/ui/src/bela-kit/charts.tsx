import * as React from 'react';
import { WEIGHT, useKitHover } from './index';
import { KitDataTip } from './infotip';

/**
 * GRÁFICOS DO DS (autorizados pelo user em 2026-09-03: "pode dar uma
 * incrementada no DS com vista em melhorar o dashboard no que diz respeito a
 * gráficos"). Até aqui cada card do Dashboard desenhava a própria barra à mão —
 * três versões de barra horizontal, duas de barra vertical, nenhuma escala.
 *
 * Cinco peças, todas só com tokens:
 *   • CHART_SERIES  — o vocabulário de cor das séries (dado ITSM é AZUL; o roxo
 *                     é significante da bela e não pinta dado de fila).
 *   • KitChartLegend — os pontinhos com rótulo.
 *   • KitChartFrame  — eixo Y com linhas-guia e as pontas do eixo X.
 *   • KitBarChart    — barras verticais (agrupadas e/ou empilhadas) com o
 *                     tooltip do DS em cada uma e, opcionalmente, a linha de
 *                     tendência com halo.
 *   • KitBarList     — barras horizontais com rótulo e valor, sem trilha.
 *   • KitRing        — anel de proporção com o valor no centro.
 *
 * Regra de leitura que todas seguem: número/motivo (CLAUDE §2) — a marca mostra
 * a medida, o hover explica o que ela vale.
 */

export const CHART_SERIES = {
  /** Série principal de dado ITSM (abertos, demanda). */
  primary: 'var(--blue-500)',
  positive: 'hsl(var(--status-on-track-fg))',
  warning: 'hsl(var(--status-at-risk-fg))',
  danger: 'var(--red-500)',
  /** Brand — SÓ para o que é da bela (tendência calculada, leitura do motor). */
  brand: 'var(--surface-brand)',
  muted: 'var(--ink-300)',
} as const;

/* ── Legenda ──────────────────────────────────────────────────────────────── */
export interface KitChartLegendItem {
  label: string;
  color: string;
  shape?: 'dot' | 'line';
}
/** REGRA DO DS (user, 2026-09-09): **a legenda sempre fica ABAIXO do gráfico,
 *  separada por um divider suave.** Não no cabeçalho do card: lá ela competia
 *  com o título e ficava longe das marcas que explica. `note` é o texto que
 *  acompanha a legenda no rodapé (ex.: a inclinação da tendência) e fica à
 *  esquerda; os itens vão para a direita. `placement="inline"` sobrou para
 *  quem precisa da legenda solta, sem a faixa. */
export function KitChartLegend({ items, note, placement = 'footer', style }: {
  items: KitChartLegendItem[];
  note?: React.ReactNode;
  placement?: 'footer' | 'inline';
  style?: React.CSSProperties;
}) {
  const lista = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--caption-size)', color: 'var(--text-muted)', ...(placement === 'inline' ? style : null) }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden="true"
            style={
              it.shape === 'line'
                ? { display: 'inline-block', width: 18, height: 3, borderRadius: 'var(--radius-pill)', background: it.color }
                : { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: it.color }
            }
          />
          {it.label}
        </span>
      ))}
    </div>
  );
  if (placement === 'inline') return lista;
  return (
    <div
      style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: note ? 'space-between' : 'flex-end',
        gap: 'var(--space-3)', marginTop: 'var(--space-5)', paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--border-subtle)',
        ...style,
      }}
    >
      {note && <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-secondary)' }}>{note}</span>}
      {lista}
    </div>
  );
}

/* ── Moldura: eixo Y + linhas-guia + pontas do eixo X ─────────────────────── */
const AXIS_W = 36;
export function KitChartFrame({
  max, fmt, height, xLabels, children,
}: {
  /** Topo da escala. */
  max: number;
  /** Formata o valor do eixo (ex.: `v => \`${Math.round(v)}%\``). */
  fmt: (v: number) => string;
  height: number;
  /** Rótulos das pontas do eixo X (início · fim do período). */
  xLabels?: [React.ReactNode, React.ReactNode];
  children: React.ReactNode;
}) {
  const linhas = [1, 0.75, 0.5, 0.25];
  const rotulo: React.CSSProperties = {
    position: 'absolute', right: 0, transform: 'translateY(-50%)', whiteSpace: 'nowrap',
    fontSize: 'var(--caption-size)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <div style={{ position: 'relative', width: AXIS_W, flexShrink: 0, height }}>
          {linhas.map((f) => (
            <span key={f} style={{ ...rotulo, top: `${(1 - f) * 100}%` }}>{fmt(max * f)}</span>
          ))}
          <span style={{ ...rotulo, top: '100%' }}>{fmt(0)}</span>
        </div>
        <div style={{ position: 'relative', flex: 1, height }}>
          {linhas.map((f) => (
            <div
              key={f}
              aria-hidden="true"
              style={{ pointerEvents: 'none', position: 'absolute', left: 0, right: 0, top: `${(1 - f) * 100}%`, borderTop: '1px solid var(--border-subtle)' }}
            />
          ))}
          <div aria-hidden="true" style={{ pointerEvents: 'none', position: 'absolute', left: 0, right: 0, bottom: 0, borderTop: '1px solid var(--border-default)' }} />
          {children}
        </div>
      </div>
      {xLabels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: AXIS_W + 8, fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>
          <span>{xLabels[0]}</span>
          <span>{xLabels[1]}</span>
        </div>
      )}
    </div>
  );
}

/** A coluna de uma barra: <button> quando filtra, <div> quando é só leitura.
 *  O rótulo, quando existe, fica sob a coluna (categorias, meses). */
function BarCol({ datum, children, algumAtivo }: { datum: KitBarDatum; children: React.ReactNode; algumAtivo?: boolean }) {
  const corpo = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div
        style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, flex: 1, minHeight: 0,
          opacity: !algumAtivo ? 1 : datum.active ? 1 : 0.4,
          transition: 'opacity var(--dur-fast, 120ms) ease',
        }}
      >
        {children}
      </div>
      {datum.label && (
        <span
          style={{
            marginTop: 6, textAlign: 'center', fontSize: 'var(--caption-size)',
            color: datum.active ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: datum.active ? WEIGHT.semibold : undefined,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {datum.label}
        </span>
      )}
    </div>
  );
  if (!datum.onClick) return corpo;
  return (
    <button
      type="button"
      onClick={datum.onClick}
      aria-pressed={datum.active ?? false}
      aria-label={datum.clickLabel}
      style={{ display: 'block', height: '100%', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
    >
      {corpo}
    </button>
  );
}

/* ── Barras verticais ─────────────────────────────────────────────────────── */
export interface KitBarSegment {
  value: number;
  color: string;
}
export interface KitBarDatum {
  key: string;
  /** Uma entrada por barra; várias = barras AGRUPADAS lado a lado. Cada barra
   *  é EMPILHADA pelos seus segmentos (de baixo para cima). */
  bars: { segments: KitBarSegment[] }[];
  /** O detalhe do hover — o "motivo" do número. */
  tooltip: string;
  /** Rótulo sob a barra (categorias, meses) — quando o eixo X não é só as
   *  pontas. */
  label?: string;
  /** Barra CLICÁVEL como filtro (2026-09-09), no mesmo contrato da lista. */
  onClick?: () => void;
  active?: boolean;
  clickLabel?: string;
}
export function KitBarChart({
  data, max, trend, reference, splitAt, barWidth = 26, gap = 3,
}: {
  data: KitBarDatum[];
  /** Topo da escala (o mesmo do KitChartFrame que o envolve). */
  max: number;
  /** Reta de tendência em unidades do eixo: do primeiro ao último datum. */
  trend?: { from: number; to: number; color?: string };
  /** LINHA DE REFERÊNCIA horizontal em unidades do eixo (ex.: a franquia do
   *  Consumo, 2026-09-08) — tracejada, com rótulo colado à direita. */
  reference?: { value: number; label?: string; color?: string };
  /** DIVISÓRIA vertical antes deste índice (2026-09-09): separa o período
   *  anterior do atual, quando o gráfico mostra os dois. */
  splitAt?: number;
  barWidth?: number;
  gap?: number;
}) {
  const y = (v: number) => 100 - Math.min(100, Math.max(0, (v / max) * 100));
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap, padding: '0 2px' }}>
        {data.map((d) => (
          <KitDataTip key={d.key} block place="top" text={d.tooltip}>
            <BarCol datum={d} algumAtivo={data.some((x) => x.active)}>
              {d.bars.map((b, i) => {
                const total = b.segments.reduce((a, s) => a + s.value, 0);
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                      width: '100%', maxWidth: barWidth, height: `${total === 0 ? 0 : Math.max(2, (total / max) * 100)}%`,
                    }}
                  >
                    {[...b.segments].reverse().map((sgm, j) => (
                      <div
                        key={j}
                        style={{
                          width: '100%',
                          height: `${total ? (sgm.value / total) * 100 : 0}%`,
                          background: sgm.color,
                          borderRadius: j === 0 ? '2px 2px 0 0' : 0,
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </BarCol>
          </KitDataTip>
        ))}
      </div>
      {splitAt !== undefined && splitAt > 0 && splitAt < data.length && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, bottom: 0, pointerEvents: 'none',
            left: `${(splitAt / data.length) * 100}%`,
            borderLeft: '1px dashed var(--border-strong)',
          }}
        />
      )}
      {reference && (
        <div
          aria-hidden="true"
          style={{ position: 'absolute', left: 0, right: 0, top: `${y(reference.value)}%`, pointerEvents: 'none', borderTop: `2px dashed ${reference.color ?? 'var(--ink-400)'}` }}
        >
          {reference.label && (
            <span style={{ position: 'absolute', right: 0, bottom: 3, fontSize: 'var(--caption-size)', color: 'var(--text-muted)', background: 'var(--surface-card)', padding: '0 4px', fontFamily: 'var(--font-body)' }}>
              {reference.label}
            </span>
          )}
        </div>
      )}
      {trend && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          {/* HALO + LINHA: sobre barras cheias, 1px some. */}
          <line x1="0" y1={y(trend.from)} x2="100" y2={y(trend.to)} stroke="var(--surface-card)" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.9" />
          <line x1="0" y1={y(trend.from)} x2="100" y2={y(trend.to)} stroke={trend.color ?? CHART_SERIES.brand} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}

/* ── Barras horizontais (lista) ───────────────────────────────────────────── */
export interface KitBarListRow {
  key: string;
  label: React.ReactNode;
  value: number;
  /** Texto do valor à direita (padrão: o número). */
  display?: React.ReactNode;
  color: string;
  tooltip: string;
  /** Ação ou selo no fim da linha (ex.: o sino de "pedir atuação"). */
  trailing?: React.ReactNode;
  /** TOTAL da linha (ex.: capacidade da fila). Com ele, a barra vira PARTE DE
   *  UM TODO: trilha cinza = o total, cor = o consumido — cada linha na sua
   *  escala. Sem ele, a barra é RANKING: preenche relativa à maior, sem trilha
   *  (user, 2026-09-03: as duas leituras existem no mesmo dashboard). */
  total?: number;
  /** LINHA CLICÁVEL (user, 2026-09-09: "deixar as barras clicáveis como filtro
   *  onde fizer sentido, tal qual um programa de dashboard faz"). Com `onClick`
   *  a linha vira <button> de verdade — foco, Enter/Espaço e cursor vêm do
   *  elemento. `active` marca a linha que está filtrando; clicar nela de novo
   *  é o gesto de limpar, e quem chama decide isso. */
  onClick?: () => void;
  active?: boolean;
  /** Rótulo acessível do clique ("Filtrar por Acessos e Permissões · N1"). */
  clickLabel?: string;
}
export function KitBarList({
  rows, max, labelWidth = 170, marker,
}: {
  rows: KitBarListRow[];
  max?: number;
  labelWidth?: number;
  /** Fração (0–1) do TOTAL onde cai uma linha pontilhada — o corte (ex.: 40% da
   *  capacidade). Só faz sentido em linhas com `total`. */
  marker?: number;
}) {
  const topo = Math.max(max ?? 0, ...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {rows.map((r) => (
        <BarRow key={r.key} row={r}>
          <span
            style={{
              width: labelWidth, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 'var(--caption-size)', textAlign: 'left',
              color: r.active ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: r.active ? WEIGHT.semibold : undefined,
            }}
          >
            {r.label}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <KitDataTip block text={r.tooltip}>
              {r.total !== undefined ? (
                // PARTE DE UM TODO: trilha cinza é o total, a cor é o consumido,
                // o pontilhado é o corte.
                <div style={{ position: 'relative', height: 12, borderRadius: 'var(--radius-sm)', background: 'var(--surface-subtle)', overflow: 'visible' }}>
                  <div
                    style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 'var(--radius-sm)',
                      width: `${r.total > 0 ? Math.min(100, (r.value / r.total) * 100) : 0}%`, background: r.color, opacity: 0.85,
                    }}
                  />
                  {marker !== undefined && (
                    <div
                      aria-hidden="true"
                      style={{ position: 'absolute', top: -3, bottom: -3, left: `${marker * 100}%`, borderLeft: '1px dotted var(--text-muted)' }}
                    />
                  )}
                </div>
              ) : (
                // RANKING sem trilha: a barra é a própria medida — a maior
                // preenche a linha e as outras se comparam a ela.
                <div style={{ height: 12, borderRadius: 'var(--radius-sm)', width: `${(r.value / topo) * 100}%`, background: r.color, opacity: 0.85 }} />
              )}
            </KitDataTip>
          </div>
          <span style={{ width: 56, flexShrink: 0, textAlign: 'right', fontSize: 'var(--caption-size)', color: r.active ? 'var(--text-primary)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {r.display ?? r.value}
          </span>
          {!r.onClick && r.trailing}
        </BarRow>
      ))}
    </div>
  );
}

/** A linha da lista: <button> quando filtra, <div> quando é só leitura. O
 *  `trailing` (ex.: o sino de "pedir atuação") fica FORA do botão — são duas
 *  ações diferentes na mesma linha, e botão dentro de botão não é HTML. */
function BarRow({ row, children }: { row: KitBarListRow; children: React.ReactNode }) {
  const { hover, hoverProps } = useKitHover();
  const linha: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%',
    // O realce sangra para fora do padding do card, para a faixa da linha
    // selecionada ler como uma faixa e não como um retângulo solto.
    margin: '0 calc(var(--space-2) * -1)', padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    background: row.active ? 'var(--surface-brand-subtle)' : hover && row.onClick ? 'var(--surface-subtle)' : 'transparent',
    transition: 'background var(--dur-fast, 120ms) ease',
  };
  if (!row.onClick) return <div style={linha}>{children}</div>;
  const { trailing, ...semTrailing } = row;
  void semTrailing;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <button
        type="button"
        onClick={row.onClick}
        aria-pressed={row.active ?? false}
        aria-label={row.clickLabel}
        {...hoverProps}
        style={{
          ...linha, flex: 1, minWidth: 0, border: 'none', font: 'inherit', color: 'inherit',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {children}
      </button>
      {trailing}
    </div>
  );
}

/* ── Anel de proporção ────────────────────────────────────────────────────── */
export function KitRing({
  value, max = 100, label, sublabel, color = CHART_SERIES.primary, size = 96, tooltip,
}: {
  value: number;
  max?: number;
  /** O que aparece no centro (padrão: o valor). */
  label?: React.ReactNode;
  /** Legenda abaixo do anel. */
  sublabel?: React.ReactNode;
  color?: string;
  size?: number;
  tooltip?: string;
}) {
  const stroke = Math.max(6, Math.round(size / 11));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const anel = (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-subtle)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${c * frac} ${c * (1 - frac)}`}
          />
        </svg>
        <span
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: WEIGHT.bold, fontSize: size >= 96 ? 'var(--heading-sm-size)' : 'var(--body-md-size)',
            color: 'var(--text-primary)', letterSpacing: 'var(--heading-sm-tracking)',
          }}
        >
          {label ?? value}
        </span>
      </span>
      {sublabel && <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)', textAlign: 'center' }}>{sublabel}</span>}
    </span>
  );
  return tooltip ? <KitDataTip text={tooltip}>{anel}</KitDataTip> : anel;
}

/* ── Linha miúda: a história do indicador DENTRO do tile ──────────────────── *
 * (user, 2026-09-09) Cada KPI ganha a própria série sem um card por indicador.
 * É leitura de FORMA, não de valor: sem eixo, sem rótulo, sem grade — o número
 * exato mora no tile e na ficha. `null` no meio da série vira lacuna (período
 * sem base), nunca zero: zero é um valor, ausência não.
 */
export function KitSparkline({
  points, color, height = 28, onClick, label,
}: {
  points: (number | null)[];
  color: string;
  height?: number;
  /** Clicável: abre a ficha com o histórico em detalhe. */
  onClick?: () => void;
  label?: string;
}) {
  const W = 100;
  const validos = points.filter((v): v is number => v !== null);
  if (validos.length < 2) return null;
  const min = Math.min(...validos);
  const max = Math.max(...validos);
  const span = max - min || 1;
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  // Segmentos: quebram no `null` para a lacuna não virar linha reta inventada.
  const segmentos: string[] = [];
  let atual: string[] = [];
  points.forEach((v, i) => {
    if (v === null) { if (atual.length > 1) segmentos.push(atual.join(' ')); atual = []; return; }
    atual.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  });
  if (atual.length > 1) segmentos.push(atual.join(' '));
  const desenho = (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {segmentos.map((pts) => (
        <polyline key={pts.slice(0, 24)} points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
  if (!onClick) return desenho;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { e.stopPropagation(); }}
      aria-label={label}
      style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
    >
      {desenho}
    </button>
  );
}

/* ── Barra única acumulada: a COMPOSIÇÃO num traço só ─────────────────────── *
 * (user, 2026-09-09) Uma barra horizontal 100%: cada segmento é uma parte do
 * todo, com a legenda embaixo pela regra do DS. Segmento clicável vira filtro.
 * Parte sem valor NÃO entra — fatia invisível não é informação.
 */
export interface KitStackedSegment {
  key: string;
  label: string;
  /** Rótulo curto SÓ para a legenda (o tooltip e o aria seguem com o inteiro):
   *  a legenda tem de caber numa linha (user, 2026-09-09). */
  shortLabel?: string;
  value: number;
  color: string;
  onClick?: () => void;
  active?: boolean;
  clickLabel?: string;
}
export function KitStackedBar({ segments, height = 14, legend = true }: {
  segments: KitStackedSegment[];
  height?: number;
  /** `false` no tile de KPI: lá o espaço é do dado, e o tooltip explica. */
  legend?: boolean;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  // O recuo só existe quando ALGUM segmento está filtrando: com `active:false`
  // em todos (nada selecionado) a barra inteira saía lavada.
  const algumAtivo = segments.some((sg) => sg.active);
  if (total <= 0) return null;
  const pct = (v: number) => (v / total) * 100;
  return (
    /* Sem `gap`: a legenda é RODAPÉ e já traz o próprio respiro + o filete
       (regra do DS — a legenda sempre fica abaixo do gráfico, separada por um
       divider suave). Com gap aqui o espaçamento vinha dobrado. */
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', width: '100%', height, borderRadius: 'var(--radius-sm)', overflow: 'hidden', gap: 2 }}>
        {segments.map((seg) => {
          const conteudo = (
            <KitDataTip block text={`${seg.label} — ${seg.value} (${Math.round(pct(seg.value))}%)${seg.onClick ? ` · ${seg.active ? 'clique para limpar o filtro' : 'clique para filtrar o dashboard'}` : ''}`}>
              <div
                style={{
                  height: '100%', background: seg.color,
                  // O segmento filtrando fica cheio; os outros recuam — é o
                  // mesmo gesto de foco da lista de barras.
                  opacity: !algumAtivo ? 1 : seg.active ? 1 : 0.35,
                  borderRadius: 'var(--radius-xs)',
                }}
              />
            </KitDataTip>
          );
          return seg.onClick ? (
            <button
              key={seg.key}
              type="button"
              onClick={seg.onClick}
              aria-pressed={seg.active ?? false}
              aria-label={seg.clickLabel}
              style={{ width: `${pct(seg.value)}%`, minWidth: 4, padding: 0, border: 'none', background: 'none', cursor: 'pointer', height: '100%' }}
            >
              {conteudo}
            </button>
          ) : (
            <div key={seg.key} style={{ width: `${pct(seg.value)}%`, minWidth: 4, height: '100%' }}>{conteudo}</div>
          );
        })}
      </div>
      {legend && (
        <KitChartLegend
          items={segments.map((seg) => ({ label: `${seg.shortLabel ?? seg.label} · ${Math.round(pct(seg.value))}%`, color: seg.color }))}
        />
      )}
    </div>
  );
}
