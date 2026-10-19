import * as React from 'react';
import { evidenceBand, EVIDENCE_BAND_LABELS, type EvidenceBand } from '@bela/types';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, X, ChevronRight, ChevronDown, ChevronUp, Folder, Search, Plus } from 'lucide-react';
import { Spark } from '../components/brand/Spark';
import { useProfileSwitching } from '../profile/store';
import { useRouteSwitching } from '../nav/route-transition';
import { PETAL_LIGHT_A, PETAL_LIGHT_B, PETAL_SOLID_A, PETAL_SOLID_B, WORDMARK } from '../components/brand/Logo';
// Retrato da bela, exportado do Figma Bela_By_Belago (nó 317:490) em 2026-08-26.
import belaMascote from '../assets/img/bela-mascote.png';

/**
 * bela-kit — the REAL bela components (inline-style, ported verbatim from
 * .claude/skills/bela-design/components/*), for the total-substitution pilot.
 * They reference `var(--x)` FULL-VALUE color tokens, so they must render inside
 * a `.bela-kit` scope (see packages/tokens/src/bela-kit.css). Exported from
 * @bela/ui as `KitCard`, `KitBadge`, `KitInput`, `KitEyebrow`.
 */

// ---- Peso tipográfico -----------------------------------------------------
// O DS tem os tokens (--weight-*) desde sempre, mas as telas escreviam o NÚMERO
// (`fontWeight: WEIGHT.semibold`) — 105 ocorrências, e o próprio kit dava o mau exemplo em
// 12. Número solto não acompanha rebrand e não diz a INTENÇÃO.
//
// O padrão vem do Figma Bela_By_Belago (`font/weight-*` + a fonte semântica
// "Semantic/Button"):
//   bold (700)     → display, heading, número de KPI. A voz da marca.
//   semibold (600) → título de card, rótulo de campo, badge, chip, botão.
//   regular (400)  → texto corrido, rótulo de apoio, valor de lista.
//
// Tipado como `React.CSSProperties['fontWeight']` para o `var()` passar no TS
// sem cada tela repetir um cast.
export const WEIGHT: Record<'regular' | 'medium' | 'semibold' | 'bold', React.CSSProperties['fontWeight']> = {
  regular: 'var(--weight-regular)' as unknown as number,
  medium: 'var(--weight-medium)' as unknown as number,
  semibold: 'var(--weight-semibold)' as unknown as number,
  bold: 'var(--weight-bold)' as unknown as number,
};

// ---- Page (o container de TODA tela) --------------------------------------
// Até 2026-08-26 cada tela repetia `{ maxWidth: 1280, margin: '0 auto',
// padding: var(--space-8) }` — 22 cópias da MESMA decisão de layout. O Figma
// Bela_By_Belago tirou o container centralizado (conteúdo fluido, gutter 40px),
// e mudar isso em 22 lugares é justamente o retrabalho que o DS existe para
// evitar. Agora a decisão mora nos tokens (--container-max / --gutter-page) e a
// tela só declara que É uma página.
export interface KitPageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Empilha os filhos no ritmo de seção do Figma (24px). Telas que já
   *  gerenciam o próprio empilhamento deixam em `false` (padrão). */
  stack?: boolean;
}
export function KitPage({ stack = false, className, children, style, ...rest }: KitPageProps) {
  return (
    <div
      // `bela-kit` SOMA com a classe da tela, nunca é substituída por ela. Sem
      // isto, uma tela que passa className própria perde o ESCOPO de tokens
      // inteiro e todo `var(--surface-card)` / `var(--border-default)` dos
      // componentes Kit* resolve para nada — inputs sem borda, widget sem
      // lavanda, botão primário sem fundo.
      className={className ? `bela-kit ${className}` : 'bela-kit'}
      style={{
        boxSizing: 'border-box',
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
        padding: 'var(--gutter-page)',
        // Sem isto, um filho mais largo que a viewport (tabela, faixa de chips)
        // estica a página inteira e cria scroll horizontal no <main>.
        overflowX: 'clip',
        ...(stack ? { display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ---- PageHeader (título da tela) ------------------------------------------
// O subtítulo fica NA MESMA LINHA do título, preso pela baseline (Figma
// Bela_By_Belago, 2026-08-26) — antes vinha empilhado embaixo. A frase de apoio
// de uma tela de lista é curta ("Acompanhe seus chamados."): empilhada, ela
// comia uma linha inteira de altura para dizer pouco e empurrava o conteúdo
// para baixo. Ao lado, ela lê como legenda do título e a tela começa antes.
// Quebra para a linha de baixo sozinha quando não couber.
export interface KitPageHeaderProps {
  title: string;
  /** Frase de apoio, ao lado do título. */
  subtitle?: React.ReactNode;
  /** Nó colado ao título — ex.: a pílula "15/16 serviços operacionais". */
  trailing?: React.ReactNode;
  /** Ações no extremo direito da linha (botão primário da tela). */
  actions?: React.ReactNode;
  id?: string;
}
export function KitPageHeader({ title, subtitle, trailing, actions, id }: KitPageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
      {/* MESMO FLUXO DE TEXTO, não blocos irmãos (correção 2026-08-27). Título e
          subtítulo eram dois itens de um flex com `wrap`: como o wrap age sobre
          o ITEM INTEIRO, bastava o par não caber na largura para o subtítulo
          descer sozinho — e aí ele lia como linha de baixo, não como legenda ao
          lado. Medido no 4.a com título longo: coluna de 510px, título de 557px
          e subtítulo de 244px; lado a lado precisaria de 813px, então o
          subtítulo SEMPRE caía.
          Com `display: inline` os dois compartilham o mesmo contexto de linha: o
          subtítulo continua logo após a ÚLTIMA PALAVRA do título e só passa de
          linha junto com o texto, nunca como bloco. Em título curto o resultado
          é idêntico ao de antes. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          id={id}
          style={{
            margin: 0, display: 'inline', fontFamily: 'var(--font-display)', fontWeight: WEIGHT.bold,
            fontSize: 'var(--heading-lg-size)', lineHeight: 'var(--heading-lg-line)',
            letterSpacing: 'var(--heading-lg-tracking)', color: 'var(--text-primary)',
          }}
        >
          {title}
        </h1>
        {trailing && <span style={{ marginLeft: 'var(--space-3)' }}>{trailing}</span>}
        {/* `inline-block`, não `inline` (user, 2026-08-27): inline deixava o
            subtítulo QUEBRAR NO MEIO — "#4193 · Acessos" ficava na última linha
            do título e "e Permissões · N2" descia sozinho. Como inline-block ele
            é uma unidade: fica ao lado do título quando cabe e desce INTEIRO
            quando não cabe. A largura é calculada contra o container, não contra
            a sobra da linha, então ele só quebra por dentro se o subtítulo
            sozinho for mais largo que a coluna — aí já está em linha própria. */}
        {subtitle && (
          <span
            style={{
              display: 'inline-block', marginLeft: 'var(--space-3)',
              fontSize: 'var(--body-md-size)', color: 'var(--text-secondary)',
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {actions}
    </div>
  );
}

// ---- Retrato da bela ------------------------------------------------------
// Exportado do Figma Bela_By_Belago em 2026-08-26 (nó 317:490, 3×). É a bela em
// pessoa — entra onde ela FALA (bolha da conversa) e onde ela se apresenta
// (estado inicial do drawer). Não é ícone de funcionalidade: não usar como
// marcador de widget, que é papel do Spark.
export function BelaPortrait({ size = 32, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <img
      src={belaMascote}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size, flexShrink: 0, borderRadius: 'var(--radius-full)', ...style }}
    />
  );
}

// ---- Split (conteúdo + aside) ---------------------------------------------
// O layout de duas colunas do Figma: conteúdo fluido + aside de 400, 48 entre
// eles, empilhando abaixo de 1024. Existe como primitivo porque TRÊS telas
// injetavam esse mesmo CSS com <style> na própria página, cada uma com a sua
// medida. Regras em bela-kit.css (media query não cabe em style inline).
export function KitSplit({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="bela-kit-split" style={style}>{children}</div>;
}
export function KitSplitMain({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="bela-kit-split-main" style={style}>{children}</div>;
}
export function KitSplitAside({ children, style, 'aria-label': ariaLabel }: { children: React.ReactNode; style?: React.CSSProperties; 'aria-label'?: string }) {
  return <aside className="bela-kit-split-aside" style={style} aria-label={ariaLabel}>{children}</aside>;
}

// ---- Esqueleto de carga ---------------------------------------------------
// O retângulo que pulsa enquanto o conteúdo real não chegou. Respeita
// prefers-reduced-motion (regra em bela-kit.css).
export function KitSkeleton({ height, style }: { height: number | string; style?: React.CSSProperties }) {
  return <div className="bela-kit-skeleton" aria-hidden="true" style={{ height, ...style }} />;
}

/** Limiar da PERCEPÇÃO DE INSTANTÂNEO, em ms. Abaixo disto a pessoa lê a
 *  transição como imediata e um esqueleto só produz um flash — que custa mais
 *  atenção do que a espera que ele anuncia. */
const INSTANTANEO_MS = 100;

/**
 * Regra de DS do user (2026-08-27): *"no carregamento das páginas, se elas
 * demorarem mais do que a percepção de instantâneo, aplique skeleton"*.
 *
 * Devolve `true` só quando o carregamento PASSA do limiar — a tela pede o
 * esqueleto a este hook em vez de olhar `loading` direto. Sem o gate, uma
 * resposta de 30ms (cache, API local) pinta e apaga o esqueleto num quadro, e o
 * flash lê como defeito.
 *
 * ```tsx
 * const mostrarEsqueleto = useSkeletonGate(loading);
 * if (mostrarEsqueleto) return <MinhaTelaSkeleton />;
 * if (loading) return null;            // ainda dentro do instantâneo
 * ```
 */
export function useSkeletonGate(loading: boolean, limiarMs: number = INSTANTANEO_MS): boolean {
  // TROCA DE PERFIL (user, 2026-09-03): o esqueleto tambem cobre a troca de
  // persona pelo switcher — a tela nova nasce em esqueleto por TROCA_MS mesmo
  // que o dado chegue na hora.
  const trocandoPerfil = useProfileSwitching();
  // TROCA DE PÁGINA (user, 2026-09-04): idem para a navegação — toda troca de
  // rota abre uma janela artificial curta, para a transição ter corpo mesmo com
  // o dado em cache. Ver packages/ui/src/nav/route-transition.ts.
  const trocandoRota = useRouteSwitching();
  const [passou, setPassou] = React.useState(false);
  React.useEffect(() => {
    if (!loading) {
      setPassou(false);
      return;
    }
    const id = window.setTimeout(() => setPassou(true), limiarMs);
    return () => window.clearTimeout(id);
  }, [loading, limiarMs]);
  return trocandoPerfil || trocandoRota || (loading && passou);
}

// ---- Card de DESTAQUE (variação de card) ----------------------------------
// O tile do "Mais utilizados na empresa": mesma família do KitCard, forma
// diferente de propósito — é um ATALHO rankeado, não um card de navegação.
// Por isso larga a descrição e mostra só o sinal de decisão, com o rank à
// esquerda e a informativa na ponta direita, onde os três da fileira se
// comparam na vertical (Figma nó 277:1745 / fileira 277:1696).
// Autorizado pelo user em 2026-08-27 ("card top 3 é uma variação de card de
// destaque, pode adicionar ao DS").
export interface KitHighlightCardProps {
  /** Posição no ranking — o "1", "2", "3". */
  rank?: number;
  icon: React.ReactNode;
  title: string;
  /** Linha de apoio sob o título (ex.: "· 1 em aberto"). */
  meta?: React.ReactNode;
  /** Informativa da ponta direita (KitBadge). */
  trailing?: React.ReactNode;
  onClick?: () => void;
  'aria-label'?: string;
}
export function KitHighlightCard({ rank, icon, title, meta, trailing, onClick, 'aria-label': ariaLabel }: KitHighlightCardProps) {
  const { hover, hoverProps } = useKitHover();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      {...hoverProps}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: '100%', minWidth: 0,
        textAlign: 'left', boxSizing: 'border-box',
        padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-card)',
        background: 'var(--surface-card)',
        border: `1px solid ${hover ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        transition: 'var(--transition-control)',
      }}
    >
      {rank !== undefined && (
        <span
          aria-hidden="true"
          style={{
            /* Regular, não semibold (Figma, 27/08): o número é ORDEM, não
               conteúdo — pesado demais ele competia com o título do serviço. */
            fontFamily: 'var(--font-mono)', fontSize: 'var(--mono-size)',
            fontWeight: WEIGHT.regular,
            color: 'var(--text-muted)', flexShrink: 0,
          }}
        >
          {rank}
        </span>
      )}
      <KitIconTile icon={icon} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: 'var(--body-md-size)', fontWeight: WEIGHT.semibold,
            letterSpacing: 'var(--control-tracking)', color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
        {meta}
      </span>
      {trailing && <span style={{ flexShrink: 0 }}>{trailing}</span>}
    </button>
  );
}

// ---- Pílula de STATUS (variação de informativa, clicável) ------------------
// A informativa que ABRE detalhe — hoje o "15/16 serviços operacionais" do
// Catálogo. É a exceção deliberada à regra "informativa não é clicável": o
// número resume um estado e o toque explica o porquê. Fica no DS como variação
// para não renascer como <button> cru em volta de um KitBadge, que é como
// estava (autorizado pelo user em 2026-08-27).
export interface KitStatusPillProps {
  label: string;
  tone?: 'success' | 'warning' | 'danger';
  onClick: () => void;
  /** O que o toque revela — vira aria-label e title. */
  detailLabel: string;
}
export function KitStatusPill({ label, tone = 'success', onClick, detailLabel }: KitStatusPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={detailLabel}
      title={detailLabel}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: 'var(--radius-pill)', display: 'inline-flex' }}
    >
      <KitBadge tone={tone} dot>{label}</KitBadge>
    </button>
  );
}

// ---- Quadradinho de ícone -------------------------------------------------
// Havia SEIS desenhos disto no produto — 3 tamanhos (32/40/48), 3 raios
// (sm/md/pílula) e 3 cores de glifo — um por tela que precisou dele. Agora é
// um só, na medida do Figma (nó 277:1747): 48px, raio md, lavanda clara e o
// glifo no cinza da marca. Ele IDENTIFICA (categoria, tipo, contagem); não
// chama para ação, por isso o glifo não é Roxo.
export interface KitIconTileProps {
  icon: React.ReactNode;
  /** `md` (48, padrão) é a medida do Figma. `sm` (40) existe só para linha de
   *  lista apertada — não invente um terceiro tamanho. */
  size?: 'sm' | 'md';
  /** Tom de STATUS para estado vazio/erro, onde o quadradinho carrega a cor do
   *  recado em vez da identificação neutra. */
  tone?: 'brand' | 'danger' | 'neutral';
  style?: React.CSSProperties;
}
const TILE_TONES = {
  brand: { background: 'var(--surface-brand-subtle)', color: 'var(--text-muted)' },
  danger: { background: 'var(--red-100)', color: 'var(--red-700)' },
  neutral: { background: 'var(--surface-subtle)', color: 'var(--text-muted)' },
} as const;
export function KitIconTile({ icon, size = 'md', tone = 'brand', style }: KitIconTileProps) {
  const px = size === 'sm' ? 40 : 48;
  // O TILE decide tamanho e espessura do glifo — não o call site. Era daí que
  // vinha o peso desigual entre telas (uns passavam 14, outros 18, outros 20, e
  // todos herdavam o stroke 2 do lucide, mais pesado que a marca).
  const glifo = React.isValidElement(icon)
    ? React.cloneElement(icon as React.ReactElement<{ size?: number; strokeWidth?: number; absoluteStrokeWidth?: boolean }>, {
        size: size === 'sm' ? 18 : 22,
        strokeWidth: 1.5,
      })
    : icon;
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'grid', placeItems: 'center', width: px, height: px, flexShrink: 0,
        borderRadius: 'var(--radius-md)', ...TILE_TONES[tone], ...style,
      }}
    >
      {glifo}
    </span>
  );
}

// ---- Chip (AÇÃO) ----------------------------------------------------------
// O atalho clicável — "Você costuma pedir" no Catálogo e em Meus chamados.
// Medida corrigida pelo user em 2026-08-27: altura 32, largura HUG (só o
// conteúdo), preenchimento lavanda claro (#F2EFFE) e canto de 8. Eu tinha
// lido "branco + pílula" de um recorte ampliado — errado nas duas.
// O canto de 8 é o que o separa da INFORMATIVA (KitBadge, pílula de 24): a
// forma diz se pode tocar, antes de qualquer cor. `trailing` é o complemento
// que vive DENTRO do mesmo chip (ex.: "resolve na hora" em Roxo com spark, ou
// o SLA em cinza) — não é um segundo elemento.
export interface KitChipProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  /** `subtle` (padrão) = lavanda dos atalhos em página. `outline` = branco com
   *  contorno, para quando o chip vive NUMA CONVERSA (quick action junto de
   *  bolha da bela): lá o lavanda o confundia com a própria fala (user,
   *  09-01, canal de leads) — é o desenho dos botões rápidos do drawer. */
  tone?: 'subtle' | 'outline';
  'aria-label'?: string;
}
export function KitChip({ icon, children, trailing, onClick, tone = 'subtle', 'aria-label': ariaLabel }: KitChipProps) {
  const { hover, hoverProps } = useKitHover();
  const cores = tone === 'outline'
    ? {
        // Branco + contorno lavanda: a estética dos cartões/botões rápidos da
        // conversa (drawer, `accent-bela-border` = purple-200).
        background: hover ? 'var(--surface-brand-subtle)' : 'var(--surface-card)',
        border: '1px solid var(--purple-200)',
      }
    : {
        background: hover ? 'var(--surface-brand-subtle-hover)' : 'var(--surface-brand-subtle)',
        border: 'none' as const,
      };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      {...hoverProps}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-4)',
        width: 'fit-content', flexShrink: 0, boxSizing: 'border-box',
        height: 'var(--control-height-sm)', padding: '0 12px',
        borderRadius: 'var(--radius-chip)', cursor: 'pointer',
        ...cores,
        fontFamily: 'var(--font-body)', fontSize: 'var(--caption-size)',
        fontWeight: WEIGHT.semibold,
        color: 'var(--text-primary)', whiteSpace: 'nowrap',
        transition: 'var(--transition-control)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {icon}
        {children}
      </span>
      {trailing}
    </button>
  );
}

// ---- Grade de tiles (KPIs e cards) ---------------------------------------
// Uma grade só para a fileira de KPIs e para a grade de cards da mesma tela:
// mesmas colunas, mesma escada, cards caindo alinhados sob os tiles. Ver a
// regra `.bela-kit-tiles` em bela-kit.css — N → 2 → 1, nunca 3+1.
export interface KitTileGridProps {
  /** Colunas na largura cheia. Declarado, não inferido de `minmax`. */
  cols?: number;
  /** `content` = tile de conteúdo (card de chamado/serviço), que precisa de
   *  ~340px por coluna e cai para 2 mais cedo; `compact` (padrão) = tile curto
   *  (KPI), que segura 4 colunas até ~260px cada. Ver bela-kit.css. */
  tile?: 'compact' | 'content';
  gap?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export function KitTileGrid({ cols = 4, tile = 'compact', gap, children, style }: KitTileGridProps) {
  return (
    // O host existe porque uma grade não pode fazer container-query de si
    // mesma — quem declara `container-type` precisa ser o pai.
    <div className="bela-kit-tiles-host">
      <div
        className={tile === 'content' ? 'bela-kit-tiles bela-kit-tiles-wide' : 'bela-kit-tiles'}
        style={{ ['--tile-cols' as string]: cols, ...(gap ? { ['--tile-gap' as string]: gap } : null), ...style } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}

// ---- Botão de enviar (o "→" dentro do campo) ------------------------------
// Existiam SETE desenhos desta mesma ação no produto: cinco cópias soltas
// (Catálogo, Meus chamados, Aprovações, Discovery, Lista de tickets) com
// círculo Roxo cheio e seta para CIMA, o composer com quadrado lavanda, e o
// Console com um KitButton rotulado. `KitInput` já tinha o slot `action`, mas
// como nada definia a APARÊNCIA, cada tela desenhou o botão do seu jeito.
//
// A medida é a do Figma Bela_By_Belago (nó 277:2170, 2026-08-26): 32×32, raio
// `sm`, fundo lavanda claro e seta para a DIREITA em `#340AD1`. Direita e não
// para cima porque a conversa corre na horizontal do campo — a seta aponta para
// onde o texto vai, não para o histórico.
export interface KitSendButtonProps {
  'aria-label'?: string;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
}
export function KitSendButton({
  'aria-label': ariaLabel = 'Enviar para a bela', disabled = false, type = 'submit', onClick,
}: KitSendButtonProps) {
  const { hover, hoverProps } = useKitHover();
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      {...hoverProps}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, flexShrink: 0, border: 'none',
        borderRadius: 'var(--radius-sm)',
        background: hover && !disabled ? 'var(--surface-brand-soft)' : 'var(--surface-brand-subtle)',
        color: 'var(--purple-600)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'var(--transition-control)',
      }}
    >
      <ArrowRight size={16} aria-hidden="true" />
    </button>
  );
}

// ---- Composer (a caixa de escrever da conversa) ---------------------------
// UM composer para os DOIS lugares onde se conversa com a bela: o drawer e a
// conversa do chamado (4.a). Eram dois desenhos — textarea com botão "Enviar"
// rotulado na página, input de borda roxa no drawer — para a mesma ação.
// Figma Bela_By_Belago (26/08): painel lavanda de 24px de padding, campo branco
// de 48px e o envio como quadrado de 32px dentro do campo. O painel lavanda é o
// que diz "aqui você fala com a bela", sem precisar escrever isso.
export interface KitComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  'aria-label': string;
  /** Rótulo do botão de envio para leitor de tela. */
  submitLabel?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Bloco que aparece ACIMA do campo, dentro do painel — ex.: a resposta
   *  pronta da bela para a pendência do chamado. */
  above?: React.ReactNode;
}
export function KitComposer({
  value, onChange, onSubmit, placeholder = 'Escreva aqui',
  'aria-label': ariaLabel, submitLabel = 'Enviar para a bela',
  disabled = false, autoFocus = false, above,
}: KitComposerProps) {
  const [focus, setFocus] = React.useState(false);
  const empty = value.trim().length === 0;
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!empty && !disabled) onSubmit(); }}
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
        /* DESABILITADO tem de PARECER desabilitado (user, 09-15: travado com
           cara de ativo lia como erro no canal de leads): o painel perde a cor
           de marca e o campo entra na receita do KitInput disabled. */
        background: disabled ? 'var(--surface-subtle)' : 'var(--surface-brand-soft)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-6)', boxSizing: 'border-box',
        transition: 'var(--transition-control)',
      }}
    >
      {above}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          style={{
            width: '100%', height: 'var(--control-height-lg)', boxSizing: 'border-box',
            padding: '0 56px 0 var(--space-4)',
            /* Canto de 12 (medida do user, 27/08): é o campo GRANDE — o de
               conversar com a bela —, um degrau mais aberto que a busca e o
               select (8). Eu tinha lido pílula do recorte ampliado. */
            borderRadius: 'var(--radius-field)', border: '1px solid transparent',
            background: disabled ? 'var(--surface-subtle)' : 'var(--surface-card)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)', fontSize: 'var(--body-sm-size)',
            outline: 'none', boxShadow: focus ? 'var(--focus-ring)' : 'none',
            opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text',
            transition: 'var(--transition-control)',
          }}
        />
        <span style={{ position: 'absolute', right: 8, display: 'flex' }}>
          <KitSendButton aria-label={submitLabel} disabled={empty || disabled} />
        </span>
      </div>
    </form>
  );
}

// ---- Fala da bela: negrito ------------------------------------------------
// O motor grifa o que importa com `**...**`. Até 2026-08-26 esses asteriscos
// vazavam literais na tela ("você precisa **redefinir** a senha") — dava para
// ver no print do app colado no Figma. O Figma renderiza o trecho em NEGRITO
// ROXO: dentro de uma fala longa, é o que deixa a escolha do usuário achável
// sem ele reler a frase. Só negrito: a bela não escreve markdown, ela grifa.
// DOIS GRIFOS, e a diferença é a AÇÃO (regra do user, 2026-09-02):
//   `**assim**` — só negrito roxo: ênfase, nada acontece ao clicar.
//   `__assim__` — negrito roxo SUBLINHADO: é uma RESPOSTA. Clicar manda aquele
//     texto para a conversa, como se a pessoa tivesse digitado.
// O sublinhado é o que separa os dois: sem ele, todo grifo viraria promessa de
// clique e o primeiro negrito de ênfase seria um botão falso. Sem
// `onOptionClick` (a conversa do chamado, por exemplo) a opção cai para negrito
// simples — afordância morta não entra.
const GRIFO = /(\*\*|__)([^*_]+)\1/g;
export function KitBelaText({ text, onOptionClick }: { text: string; onOptionClick?: (opcao: string) => void }) {
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  for (const m of text.matchAll(GRIFO)) {
    if (m.index > ultimo) partes.push(text.slice(ultimo, m.index));
    const conteudo = m[2];
    const opcao = m[1] === '__' && !!onOptionClick;
    partes.push(
      opcao ? (
        <button
          key={m.index}
          type="button"
          onClick={() => onOptionClick(conteudo)}
          style={{
            padding: 0, border: 'none', background: 'none', cursor: 'pointer', font: 'inherit',
            fontWeight: WEIGHT.bold, color: 'var(--text-brand)', textDecoration: 'underline',
            textUnderlineOffset: 3, transition: 'var(--transition-control)',
          }}
        >
          {conteudo}
        </button>
      ) : (
        <strong key={m.index} style={{ fontWeight: WEIGHT.bold, color: 'var(--text-brand)' }}>{conteudo}</strong>
      ),
    );
    ultimo = m.index + m[0].length;
  }
  if (ultimo < text.length) partes.push(text.slice(ultimo));
  return <>{partes}</>;
}

// ---- Bolha de conversa ----------------------------------------------------
// O horário sai de DENTRO da bolha e vira uma linha abaixo dela (Figma
// Bela_By_Belago, 26/08). Dentro, ele disputava a leitura com a fala; fora, a
// bolha fica só com o que foi dito e o horário some da varredura de quem só
// quer ler a conversa. O nome do autor sai junto: numa conversa de duas partes,
// o lado da bolha já diz quem falou.
export interface KitChatBubbleProps {
  /** `self` = quem está lendo; `bela` = a assistente. */
  from: 'self' | 'bela';
  /** `quiet` (padrão) usa o roxo acinzentado da conversa que vive DENTRO de uma
   *  página; `brand` usa o Roxo pleno do drawer, onde a conversa é a superfície
   *  inteira. Só afeta a bolha `self`. */
  tone?: 'quiet' | 'brand';
  /** Horário já formatado (ex.: "12:34"). */
  time?: string;
  /** Retrato da bela dentro da bolha. É a regra do DRAWER (Figma 277:2173);
   *  a conversa do chamado (4.a, frame 277:517) NÃO leva retrato. */
  portrait?: boolean;
  children: React.ReactNode;
}
export function KitChatBubble({ from, tone = 'quiet', time, portrait = true, children }: KitChatBubbleProps) {
  const self = from === 'self';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: self ? 'flex-end' : 'flex-start', gap: 4, maxWidth: '100%' }}>
      <div
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', maxWidth: self ? '85%' : '90%',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          [self ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: 'var(--radius-xs)',
          background: self
            ? (tone === 'brand' ? 'var(--surface-bubble-self-focus)' : 'var(--surface-bubble-self)')
            : 'var(--surface-brand-subtle)',
          color: self ? 'var(--surface-bubble-self-fg)' : 'var(--text-primary)',
          fontFamily: 'var(--font-body)', fontSize: 'var(--body-sm-size)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        } as React.CSSProperties}
      >
        {!self && portrait && <BelaPortrait size={32} style={{ marginTop: -2 }} />}
        <span style={{ minWidth: 0 }}>{children}</span>
      </div>
      {time && (
        <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>{time}</span>
      )}
    </div>
  );
}

// ---- Card ----------------------------------------------------------------
type CardTone = 'default' | 'subtle' | 'brand' | 'brandSoft' | 'inverse' | 'plain';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardElevation = 'none' | 'xs' | 'sm' | 'md' | 'lg';

const CARD_TONES: Record<CardTone, React.CSSProperties> = {
  default: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' },
  subtle: { background: 'var(--surface-subtle)', border: '1px solid transparent', color: 'var(--text-primary)' },
  brand: { background: 'var(--surface-brand)', border: '1px solid transparent', color: 'var(--text-on-brand)' },
  // brandSoft repontua --text-secondary DENTRO do card: filhos que usam o token
  // herdam a variante para superfície roxa (lavanda no escuro — gray-on-color
  // era achado da varredura em todas as telas com widget BELA).
  brandSoft: { background: 'var(--surface-brand-subtle)', border: '1px solid transparent', color: 'var(--text-primary)', '--text-secondary': 'var(--text-secondary-on-brand)', '--text-muted': 'var(--text-muted-on-brand)' } as React.CSSProperties,
  inverse: { background: 'var(--surface-inverse)', border: '1px solid transparent', color: 'var(--text-inverse)' },
  /* PLAIN = o cartão que É o fundo (user, 2026-08-27: "mesma cor do fundo").
     Transparente em vez de um token de superfície: o estado vazio/erro aparece
     sobre fundos diferentes (página, card, drawer) e qualquer cor fixa vira um
     bloco cinza destacado em pelo menos um deles — foi o que se via no erro do
     catálogo, `--surface-subtle` (#F5F5F5) sobre a página (#F7F9FF). */
  plain: { background: 'transparent', border: '1px solid transparent', color: 'var(--text-primary)' },
};
const CARD_PADS: Record<CardPadding, number | string> = { none: 0, sm: 'var(--space-4)', md: 'var(--space-6)', lg: 'var(--space-8)' };
const CARD_ELEV: Record<CardElevation, string> = { none: 'none', xs: 'var(--shadow-xs)', sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)' };

export interface KitCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  tone?: CardTone;
  padding?: CardPadding;
  elevation?: CardElevation;
  /** `card` (padrão) segue o token --radius-card — hoje 14 (Figma 26/08).
   *  O default era `lg` (20) apontando direto para a escala: quando o token
   *  de card desceu para 14, NENHUM KitCard acompanhou — só quem lia
   *  --radius-card (a era Tailwind) mudou. Semântico no default, escala
   *  só para exceção deliberada. */
  radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'card';
  interactive?: boolean;
  /** Inactive/unavailable state: recessed fill + defined border, flat, not
   *  clickable. Reads as a distinct-but-muted tile (never blends into the page). */
  disabled?: boolean;
}

const CARD_DISABLED: React.CSSProperties = {
  background: 'var(--surface-disabled)', border: '1px solid var(--border-disabled)', color: 'var(--text-secondary)',
};

/** Hover por estado JS com correção de SCROLL: rolar sob o cursor parado não
 *  dispara mouseleave (o navegador só re-avalia em movimento do mouse) — o
 *  realce ficava "preso" no item que saiu de baixo do ponteiro (achado
 *  2026-08-13, Catálogo). Qualquer scroll zera o hover; o próximo movimento
 *  do mouse re-liga no item certo. */
export function useKitHover(): { hover: boolean; hoverProps: { onMouseEnter: () => void; onMouseLeave: () => void } } {
  const [hover, setHover] = React.useState(false);
  React.useEffect(() => {
    if (!hover) return;
    const clear = () => setHover(false);
    document.addEventListener('scroll', clear, true);
    return () => document.removeEventListener('scroll', clear, true);
  }, [hover]);
  return {
    hover,
    hoverProps: {
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
    },
  };
}

export function KitCard({
  children, tone = 'default', padding = 'md', elevation = 'xs', radius = 'card', interactive = false, disabled = false, onClick, style, ...rest
}: KitCardProps) {
  const { hover, hoverProps } = useKitHover();
  const clickable = interactive && !disabled;
  return (
    <div
      onClick={disabled ? undefined : onClick}
      {...hoverProps}
      aria-disabled={disabled || undefined}
      style={{
        boxSizing: 'border-box', fontFamily: 'var(--font-body)',
        borderRadius: `var(--radius-${radius})`,
        padding: CARD_PADS[padding],
        boxShadow: disabled ? 'none' : clickable && hover ? 'var(--shadow-md)' : CARD_ELEV[elevation],
        cursor: disabled ? 'not-allowed' : clickable ? 'pointer' : 'default',
        transition: 'box-shadow var(--duration-base) var(--ease-out), border-color var(--duration-base) var(--ease-out)',
        ...(disabled ? CARD_DISABLED : CARD_TONES[tone]),
        // border COMPLETO, não borderColor: misturar shorthand e longhand no
        // mesmo style faz o React descartar a cor no re-render (aviso no console).
        ...(clickable && hover && tone === 'default' ? { border: '1px solid var(--border-default)' } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ---- Pílulas: AÇÃO vs INFORMATIVA ---------------------------------------
// As duas são pílulas e é fácil confundi-las; a diferença é registrada aqui
// porque ela carrega SIGNIFICADO (Figma Bela_By_Belago, medido em 2026-08-27).
//
//   INFORMATIVA (KitBadge) — 24px, padding-x 11, caption 13, traço de 1px.
//   Não é clicável. Diz um FATO sobre o item.
//     · com status  → pastel PREENCHIDO (nó 277:1757 "chamado em aberto":
//                     #FEF3C7 / #F59E0B / #B45309). A cor é o recado.
//     · de marca    → lavanda preenchida (nó 277:1754 "resolve na hora").
//     · neutra      → BRANCA com traço lavanda e texto #3D3D3D (nó 277:1803
//                     "SLA 4h", "requer aprovação"): atributo sem status.
//
//   AÇÃO (KitChip) — 32px, padding-x 12, ícone 13, texto semibold em Asfalto,
//   fundo BRANCO e SEM traço (nó 277:1660). É clicável, e é o tamanho maior +
//   o alvo de clique que a distingue da informativa.
//
// Regra prática: se o usuário PODE TOCAR, é KitChip. Se só LÊ, é KitBadge.
// (E botão de comando continua sendo KitButton — retângulo arredondado.)

// ---- Badge (informativa) --------------------------------------------------
export type BadgeTone =
  | 'neutral' | 'brand' | 'solid' | 'success' | 'warning' | 'danger'
  | 'info' | 'infoOutline' | 'warningOutline' | 'neutralOutline' | 'brandOutline' | 'successOutline' | 'onBrand';
// All tones share one shape: light fill · mid-tone border · dark text — same
// recipe as the confidence badge, so every badge reads as one family.
// Tons *Outline (status de chamado, 2026-08-23): a versão QUIETA da mesma
// família — fundo transparente, só borda + texto. O texto dos coloridos usa os
// semânticos --status-*-fg (que VIRAM no escuro; o -700 fixo sumiria no card
// escuro, já que fundo transparente não protege o contraste como o pastel).
const BADGE_TONES: Record<BadgeTone, React.CSSProperties> = {
  /* NEUTRA (nó 277:1803 — "SLA 4h", "requer aprovação"): branco, traço lavanda,
     texto #3D3D3D. É a informativa SEM status: diz um atributo do item. */
  neutral: { background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-badge-neutral)' },
  /* MARCA (nó 277:1754 — "resolve na hora"): lavanda PREENCHIDA. */
  brand: { background: 'var(--surface-brand-subtle)', border: '1px solid var(--purple-400)', color: 'var(--text-brand-strong)' },
  solid: { background: 'var(--surface-brand)', border: '1px solid transparent', color: 'var(--text-on-brand)' },
  success: { background: 'var(--green-100)', border: '1px solid var(--green-500)', color: 'var(--green-700)' },
  /* STATUS (nó 277:1757 — "chamado em aberto"): pastel PREENCHIDO. */
  warning: { background: 'var(--amber-100)', border: '1px solid var(--amber-500)', color: 'var(--amber-700)' },
  danger: { background: 'var(--red-100)', border: '1px solid var(--red-500)', color: 'var(--red-700)' },
  info: { background: 'var(--blue-100)', border: '1px solid var(--blue-500)', color: 'var(--blue-700)' },
  infoOutline: { background: 'var(--surface-card)', border: '1px solid var(--blue-500)', color: 'hsl(var(--status-regular-fg))' },
  warningOutline: { background: 'var(--surface-card)', border: '1px solid var(--amber-500)', color: 'hsl(var(--status-at-risk-fg))' },
  neutralOutline: { background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' },
  /* Contorno da MARCA (Figma Bela_By_Belago, 2026-08-26): no card de serviço o
     "resolve na hora" é branco com traço e texto Roxo, não o pastel lavanda
     preenchido que o tom `brand` desenha. Sobre um card branco, dois badges
     pastel lado a lado viram duas manchas de cor concorrendo; em contorno,
     quem carrega o significado é o traço. */
  brandOutline: { background: 'var(--surface-card)', border: '1px solid var(--border-brand)', color: 'var(--text-brand)' },
  successOutline: { background: 'var(--surface-card)', border: '1px solid var(--green-500)', color: 'var(--green-700)' },
  /* Chip BRANCO para viver SOBRE o lavanda do widget da bela (Figma 26/08):
     ali o tom `neutral` (cinza sobre lavanda) suja, e um traço não é preciso —
     o branco já separa o chip do fundo. */
  onBrand: { background: 'var(--surface-card)', border: '1px solid transparent', color: 'var(--text-primary)' },
};

export interface KitBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: React.ReactNode;
  /** Badge que FILTRA (user, 2026-09-02): com `onClick` ele nasce <button> —
   *  foco, Enter/Espaço e cursor vêm do elemento, não de um `span` com handler.
   *  O estado "ligado" continua sendo escolha de TOM de quem chama (o padrão do
   *  produto é `neutral` → `brand`), então nenhuma cor nova entra aqui. */
  pressed?: boolean;
}

export function KitBadge({ children, tone = 'neutral', dot = false, icon, style, pressed, onClick, ...rest }: KitBadgeProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', boxSizing: 'border-box',
    borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-body)', fontSize: 'var(--caption-size)',
    fontWeight: WEIGHT.semibold, letterSpacing: 'var(--control-tracking)', whiteSpace: 'nowrap', ...BADGE_TONES[tone], ...style,
  };
  const conteudo = (
    <>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {icon}
      {children}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
        aria-pressed={pressed}
        style={{ ...base, cursor: 'pointer', transition: 'var(--transition-control)' }}
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {conteudo}
      </button>
    );
  }
  return (
    <span style={base} {...rest}>
      {conteudo}
    </span>
  );
}

// ---- Input ---------------------------------------------------------------
const INPUT_H = { sm: 'var(--control-height-sm)', md: 'var(--control-height-md)', lg: 'var(--control-height-lg)' } as const;
/* Raio POR TAMANHO (medidas do user, 2026-08-27): o campo GRANDE — o de
   conversar com a bela, 48px — usa 12; busca e select (32/40) usam 8. Campo
   maior pede canto mais aberto para a proporção não endurecer. */
const INPUT_R = { sm: 'var(--radius-control)', md: 'var(--radius-control)', lg: 'var(--radius-field)' } as const;

// Inset horizontal quando há `action` (controle de 32px embutido): espelha o
// respiro vertical ((altura − 32) / 2) — CTA "colado na borda" era o defeito.
const ACTION_INSET = { sm: 2, md: 4, lg: 8 } as const;

export interface KitInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'pill';
  iconLeft?: React.ReactNode;
  /** Ícone DECORATIVO (16px, text-muted). Para um CTA clicável use `action`. */
  iconRight?: React.ReactNode;
  /** Controle embutido no fim do campo (ex.: enviar à bela, 32px). Ganha inset
      simétrico com o eixo vertical — dispensa hacks de wrapperStyle. */
  action?: React.ReactNode;
  invalid?: boolean;
  wrapperStyle?: React.CSSProperties;
}

export function KitInput({
  size = 'md', shape = 'rounded', iconLeft, iconRight, action, invalid = false, disabled = false, style, wrapperStyle, ...rest
}: KitInputProps) {
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'var(--red-500)' : focus ? 'var(--border-brand)' : 'var(--border-default)';
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)', height: INPUT_H[size],
        padding: action ? `0 ${ACTION_INSET[size]}px 0 14px` : '0 14px',
        background: disabled ? 'var(--surface-subtle)' : 'var(--surface-card)',
        border: `1px solid ${border}`,
        borderRadius: shape === 'pill' ? 'var(--radius-pill)' : INPUT_R[size],
        boxShadow: focus ? 'var(--focus-ring)' : 'none', transition: 'var(--transition-control)',
        opacity: disabled ? 0.6 : 1, boxSizing: 'border-box', ...wrapperStyle,
      }}
    >
      {iconLeft && <span style={{ display: 'flex', color: 'var(--text-muted)' }}>{iconLeft}</span>}
      <input
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
          fontFamily: 'var(--font-body)', fontSize: 'var(--body-md-size)', color: 'var(--text-primary)',
          letterSpacing: 'var(--control-tracking)', ...style,
        }}
        {...rest}
      />
      {iconRight && <span style={{ display: 'flex', color: 'var(--text-muted)' }}>{iconRight}</span>}
      {action && <span style={{ display: 'flex', flexShrink: 0 }}>{action}</span>}
    </div>
  );
}

// ---- Textarea ------------------------------------------------------------
export interface KitTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export function KitTextarea({ rows = 4, invalid = false, disabled = false, style, ...rest }: KitTextareaProps) {
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'var(--red-500)' : focus ? 'var(--border-brand)' : 'var(--border-default)';
  return (
    <textarea
      rows={rows}
      disabled={disabled}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '12px 14px',
        background: disabled ? 'var(--surface-subtle)' : 'var(--surface-card)',
        border: `1px solid ${border}`, borderRadius: 'var(--radius-sm)',
        boxShadow: focus ? 'var(--focus-ring)' : 'none', outline: 'none', transition: 'var(--transition-control)',
        fontFamily: 'var(--font-body)', fontSize: 'var(--body-md-size)', lineHeight: 1.5,
        color: 'var(--text-primary)', letterSpacing: 'var(--control-tracking)', opacity: disabled ? 0.6 : 1, ...style,
      }}
      {...rest}
    />
  );
}

// ---- ListInput -----------------------------------------------------------
/**
 * LISTA DE TEXTO EDITÁVEL — uma linha por item, com remover e "+ adicionar".
 *
 * Nasceu em 2026-09-11 para o editor de fluxo da automação (pré-requisitos,
 * parâmetros de entrada, etapas de validação), COM autorização expressa do user
 * — regra §10.1: primitivo novo só nasce autorizado, e nasce no DS.
 *
 * Por que não um textarea com um item por linha: a lista tem SEMÂNTICA de itens
 * (o backend guarda array, a tela de leitura desenha `<ul>`), e um textarea a
 * devolveria como texto, empurrando para a tela o trabalho de separar, limpar
 * vazio e lidar com o último "\n". Aqui o item é a unidade desde a digitação.
 *
 * Composto SÓ de primitivos existentes: `KitInput` por linha, `KitIconButton`
 * para remover e `KitButton` para adicionar. O botão de adicionar é `xs` porque
 * vive dentro de um campo — container, pela regra de tamanho do KitButton.
 */
export interface KitListInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Placeholder de CADA linha. Diga o item, não a lista ("Usuário", não "Itens"). */
  placeholder?: string;
  /** Rótulo do botão de adicionar. Padrão: "Adicionar item". */
  addLabel?: string;
  /** Substantivo SINGULAR do item — entra nos rótulos de acessibilidade
   *  ("Remover parâmetro 2"). Padrão: "item". */
  noun?: string;
  disabled?: boolean;
  /** Teto de itens; alcançado, o botão de adicionar some. */
  max?: number;
  /** `id` do primeiro campo, para o `label` do `KitField` apontar para ele. */
  id?: string;
}
export function KitListInput({
  value, onChange, placeholder, addLabel = 'Adicionar item', noun = 'item',
  disabled = false, max, id,
}: KitListInputProps) {
  // Foca o campo recém-criado: adicionar e ter de ir ao mouse para digitar
  // quebra o ritmo de quem está preenchendo uma lista. O foco vai pelo
  // CONTAINER (querySelector do último input) em vez de `ref` por linha —
  // `KitInput` não encaminha ref, e transformá-lo em `forwardRef` mexeria num
  // primitivo usado em toda a plataforma por causa de um detalhe daqui.
  const caixa = React.useRef<HTMLDivElement>(null);
  const focarProximo = React.useRef(false);
  React.useEffect(() => {
    if (!focarProximo.current) return;
    focarProximo.current = false;
    const campos = caixa.current?.querySelectorAll('input');
    campos?.[campos.length - 1]?.focus();
  }, [value.length]);

  const trocar = (i: number, texto: string) => onChange(value.map((v, j) => (j === i ? texto : v)));
  const remover = (i: number) => onChange(value.filter((_, j) => j !== i));
  const adicionar = () => { focarProximo.current = true; onChange([...value, '']); };

  const podeAdicionar = !disabled && (max === undefined || value.length < max);

  return (
    <div ref={caixa} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {value.map((item, i) => (
        // A chave é o ÍNDICE de propósito: o conteúdo é o que está sendo
        // editado, então não serve de identidade — com `key={item}` duas linhas
        // vazias colidiriam e o React remontaria o campo a cada tecla.
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <KitInput
            id={i === 0 ? id : undefined}
            value={item}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={`${noun} ${i + 1}`}
            onChange={(e) => trocar(i, e.target.value)}
            onKeyDown={(e) => {
              // Enter adiciona a próxima linha (e não submete o formulário);
              // Backspace numa linha vazia remove, como em toda lista.
              if (e.key === 'Enter') { e.preventDefault(); if (podeAdicionar) adicionar(); }
              if (e.key === 'Backspace' && item === '' && value.length > 1) { e.preventDefault(); remover(i); }
            }}
            wrapperStyle={{ flex: 1, minWidth: 0 }}
          />
          <KitIconButton
            size="sm"
            variant="ghost"
            label={`Remover ${noun} ${i + 1}`}
            disabled={disabled}
            onClick={() => remover(i)}
            icon={<X size={16} aria-hidden="true" />}
          />
        </div>
      ))}
      {podeAdicionar && (
        <KitButton variant="secondary" size="xs" onClick={adicionar} iconLeft={<Plus size={14} aria-hidden="true" />}>
          {addLabel}
        </KitButton>
      )}
    </div>
  );
}

// ---- Select --------------------------------------------------------------
export interface KitSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'pill';
  invalid?: boolean;
  wrapperStyle?: React.CSSProperties;
}
export function KitSelect({
  size = 'md', shape = 'rounded', invalid = false, disabled = false, style, wrapperStyle, children, ...rest
}: KitSelectProps) {
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'var(--red-500)' : focus ? 'var(--border-brand)' : 'var(--border-default)';
  return (
    <div style={{ position: 'relative', display: 'inline-flex', width: '100%', ...wrapperStyle }}>
      <select
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          appearance: 'none', WebkitAppearance: 'none', width: '100%', height: INPUT_H[size], padding: '0 36px 0 14px',
          background: disabled ? 'var(--surface-subtle)' : 'var(--surface-card)',
          border: `1px solid ${border}`, borderRadius: shape === 'pill' ? 'var(--radius-pill)' : INPUT_R[size],
          boxShadow: focus ? 'var(--focus-ring)' : 'none', outline: 'none', transition: 'var(--transition-control)',
          /* Texto do select no cinza da marca (#645B86), não no Asfalto: ele é
             um FILTRO — diz o recorte atual, não o conteúdo. Em Asfalto competia
             com o título dos cards que ele filtra. (O valor DIGITADO num campo
             continua Asfalto: aquilo é conteúdo da pessoa.) */
          fontFamily: 'var(--font-body)', fontSize: 'var(--body-md-size)', color: 'var(--text-muted)',
          letterSpacing: 'var(--control-tracking)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
          boxSizing: 'border-box', ...style,
        }}
        {...rest}
      >
        {children}
      </select>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
        strokeLinecap="round" aria-hidden="true"
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

// ---- MultiSelect (dropdown de múltipla escolha) ---------------------------
// Casca do KitSelect (mesma altura/borda/chevron) sobre um KitMenuPanel com
// itens marcáveis — nasceu em 2026-08-24 para o "Acesso às filas" dos perfis
// (Configurações); o <select multiple> nativo é ilegível e fora do DS.
// Resumo no gatilho: vazio → `placeholder` (ex.: "Todas as categorias");
// 1 → o rótulo do item; N → "N {noun}". O painel NÃO fecha ao marcar (escolha
// múltipla é uma sequência de cliques); fecha por fora/Escape/rota (MenuPanel).
export interface KitMultiSelectOption {
  value: string;
  label: string;
  /**
   * Cabeçalho sob o qual a opção aparece — o `optgroup` que o multi não tinha
   * (user, 28/09). Nasceu do público-alvo do Predict: perfis, grupos e alvos
   * do item numa lista corrida de 18 linhas, sem dizer onde uma natureza
   * termina e a outra começa.
   *
   * ADITIVO: quem não passa `group` renderiza exatamente como antes. As opções
   * devem vir JÁ AGRUPADAS — o cabeçalho sai quando o grupo muda em relação à
   * opção anterior, e não reordena nada por conta própria.
   */
  group?: string;
}
export interface KitMultiSelectProps {
  options: KitMultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Rótulo quando nada está selecionado — diga o significado do vazio
   *  (ex.: "Todas as categorias"), nunca um "Selecione…" genérico. */
  placeholder: string;
  /** Substantivo plural do resumo (ex.: "categorias" → "2 categorias"). */
  noun?: string;
  /** Resumo com VÁRIOS marcados: `count` = "2 categorias" (filtros, onde o
   *  que importa é o recorte); `labels` = "Status, SLA consumido (%)" — os
   *  próprios nomes (user, 2026-09-08: "não escreva 2 campos, diga quais
   *  foram selecionados"), para escolhas que a pessoa precisa conferir. */
  summary?: 'count' | 'labels';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  invalid?: boolean;
  'aria-label'?: string;
  wrapperStyle?: React.CSSProperties;
}
export function KitMultiSelect({
  options, value, onChange, placeholder, noun = 'selecionados', summary: modo = 'count', size = 'md',
  disabled = false, invalid = false, 'aria-label': ariaLabel, wrapperStyle,
}: KitMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'var(--red-500)' : focus || open ? 'var(--border-brand)' : 'var(--border-default)';
  const selected = options.filter((o) => value.includes(o.value));
  const summary = selected.length === 0
    ? placeholder
    : selected.length === 1 || modo === 'labels'
      ? selected.map((o) => o.label).join(', ')
      : `${selected.length} ${noun}`;
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <div style={{ position: 'relative', display: 'inline-flex', width: '100%', ...wrapperStyle }}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%', height: INPUT_H[size], padding: '0 36px 0 14px', textAlign: 'left',
          background: disabled ? 'var(--surface-subtle)' : 'var(--surface-card)',
          border: `1px solid ${border}`, borderRadius: 'var(--radius-sm)',
          boxShadow: focus ? 'var(--focus-ring)' : 'none', outline: 'none', transition: 'var(--transition-control)',
          fontFamily: 'var(--font-body)', fontSize: 'var(--body-md-size)',
          color: selected.length === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
          letterSpacing: 'var(--control-tracking)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
          boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {summary}
      </button>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
        strokeLinecap="round" aria-hidden="true"
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
      <KitMenuPanel
        open={open}
        onClose={() => setOpen(false)}
        aria-label={ariaLabel}
        style={{ left: 0, right: 0, width: 'auto', maxHeight: 280, overflowY: 'auto' }}
      >
        {options.map((o, i) => (
          <React.Fragment key={o.value}>
            {o.group && o.group !== options[i - 1]?.group && (
              <div
                role="presentation"
                style={{
                  padding: '8px var(--space-3) 3px', fontSize: 'var(--caption-size)',
                  fontWeight: WEIGHT.semibold, color: 'var(--text-muted)',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
              >
                {o.group}
              </div>
            )}
            <KitMenuItem
              label={o.label}
              checked={value.includes(o.value)}
              onClick={() => toggle(o.value)}
              trailing={value.includes(o.value) ? <Check size={15} color="var(--purple-600)" aria-hidden="true" /> : undefined}
            />
          </React.Fragment>
        ))}
      </KitMenuPanel>
    </div>
  );
}

/** Busca sem acento/caixa (o mesmo criterio do motor: quem digita "otavio"
 *  tem de achar "Otavio"). Local ao kit: o DS nao depende de @bela/types. */
function norm(v: string): string {
  return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ---- SearchPicker (escreve, escolhe, vira TAG) ----------------------------
// Pedido do dono (2026-08-27): "nao precisa ser drop, pode ser aqueles estilo
// pesquisa, que depois fica a tag". Nasceu para o campo "Para quem e este
// pedido?" da Nova Solicitacao, onde as opcoes sao heterogeneas e a lista de
// pessoas e longa demais para um <select>: escolha UNICA, busca por texto e a
// escolha vira uma etiqueta removivel no lugar do campo.
//
// Diferenca para o KitMultiSelect: la a escolha e multipla e o gatilho e um
// resumo ("2 categorias"); aqui e uma so, e o que fica na tela e a propria
// escolha. Diferenca para o KitSelect: aqui a lista se BUSCA.
export interface KitSearchOption {
  value: string;
  label: string;
  /** Segunda linha do item (area, cargo, e-mail) - tambem entra na busca. */
  hint?: string;
}
export interface KitSearchPickerProps {
  options: KitSearchOption[];
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  /** Texto quando a busca nao acha nada. */
  emptyText?: string;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  'aria-label'?: string;
  /** Rotulo do botao que remove a etiqueta (a11y). */
  clearLabel?: string;
}
export function KitSearchPicker({
  options, value, onChange, placeholder = 'Busque e escolha', emptyText = 'Nada encontrado',
  id, disabled = false, invalid = false, 'aria-label': ariaLabel, clearLabel = 'Remover escolha',
}: KitSearchPickerProps) {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const escolhido = options.find((o) => o.value === value) ?? null;

  const termo = norm(q);
  const lista = termo
    ? options.filter((o) => norm(o.label).includes(termo) || norm(o.hint ?? '').includes(termo))
    : options;

  const border = invalid ? 'var(--red-500)' : focus ? 'var(--border-brand)' : 'var(--border-default)';

  return (
    <div style={{ position: 'relative' }}>
      {/* CASCA IDENTICA A DO KitInput (altura, borda, raio, anel de foco): o
          campo tem de parecer um campo. A escolha vira uma ETIQUETA DENTRO
          dele - desenho do dono, 2026-08-27 - e a lupa fica a direita, que e
          onde ela sinaliza "isto se busca". */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minHeight: INPUT_H.md,
          padding: '0 14px', boxSizing: 'border-box',
          background: disabled ? 'var(--surface-subtle)' : 'var(--surface-card)',
          border: `1px solid ${border}`, borderRadius: INPUT_R.md,
          boxShadow: focus ? 'var(--focus-ring)' : 'none', transition: 'var(--transition-control)',
          opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text',
        }}
      >
        {escolhido && (
          <KitBadge tone="brand" style={{ flexShrink: 0 }}>
            {escolhido.label}
            <button
              type="button"
              aria-label={clearLabel}
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); onChange(null); setQ(''); inputRef.current?.focus(); }}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2,
                width: 16, height: 16, padding: 0, border: 'none', borderRadius: '50%',
                background: 'transparent', color: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </KitBadge>
        )}
        <input
          ref={inputRef}
          id={id}
          value={q}
          disabled={disabled}
          aria-label={ariaLabel}
          placeholder={escolhido ? '' : placeholder}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setFocus(true); setOpen(true); }}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1, minWidth: 40, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-body)', fontSize: 'var(--body-md-size)', color: 'var(--text-primary)',
            letterSpacing: 'var(--control-tracking)',
          }}
        />
        <Search size={16} aria-hidden="true" style={{ display: 'flex', flexShrink: 0, color: 'var(--text-muted)' }} />
      </div>

      <KitMenuPanel
        open={open && lista.length > 0}
        onClose={() => setOpen(false)}
        aria-label={ariaLabel}
        style={{ left: 0, right: 0, width: 'auto', maxHeight: 280, overflowY: 'auto' }}
      >
        {lista.map((o) => (
          <KitMenuItem
            key={o.value}
            label={
              o.hint ? (
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span>{o.label}</span>
                  <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>{o.hint}</span>
                </span>
              ) : (
                o.label
              )
            }
            onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
          />
        ))}
      </KitMenuPanel>
      {open && lista.length === 0 && (
        <span style={{ display: 'block', marginTop: 'var(--space-2)', fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>
          {emptyText}
        </span>
      )}
    </div>
  );
}

// ---- TagPicker (busca multipla; cada escolha vira etiqueta no campo) -----
//
// Irmao MULTIPLO do KitSearchPicker (dono, 2026-09-24: "input do tipo pesquisa
// com sugestao de autopreenchimento que vira tag dentro do input"). Nasceu para
// associar artigos da base a uma decisao de curadoria, onde o curador sabe o
// assunto mas nao o codigo do artigo - entao a lista precisa ser BUSCAVEL, e a
// escolha precisa ficar visivel como etiqueta, nao virar "3 selecionados".
//
// Por que nao os que ja existiam: KitSearchPicker busca mas escolhe UM;
// KitMultiSelect escolhe varios mas e um dropdown com resumo, sem busca;
// KitListInput e texto livre, sem sugestao. A casca, a etiqueta e o painel sao
// os MESMOS do KitSearchPicker - so a cardinalidade muda.
export interface KitTagPickerProps {
  options: KitSearchOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  'aria-label'?: string;
  /** Teto de escolhas; atingido, o campo para de sugerir. */
  max?: number;
  /** Rotulo do botao que remove UMA etiqueta (a11y) - recebe o label dela. */
  removeLabel?: (label: string) => string;
  /**
   * O que a ETIQUETA mostra, quando o label e longo demais para caber nela.
   *
   * A lista precisa do nome inteiro - e por ele que se reconhece a opcao -, mas
   * a etiqueta fica DENTRO do campo, e um titulo de artigo ocupa a linha toda
   * e empurra o cursor para baixo. Com isto a lista mostra "Esqueceu a senha?
   * Redefina em minutos..." e a etiqueta mostra "KB-001". O nome inteiro segue
   * no `title` da etiqueta, para o hover e o leitor de tela.
   */
  tagLabel?: (option: KitSearchOption) => string;
}
export function KitTagPicker({
  options, value, onChange, placeholder = 'Busque e escolha', emptyText = 'Nada encontrado',
  id, disabled = false, invalid = false, 'aria-label': ariaLabel, max,
  removeLabel = (l) => `Remover ${l}`, tagLabel,
}: KitTagPickerProps) {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const escolhidos = value
    .map((v) => options.find((o) => o.value === v))
    .filter((o): o is KitSearchOption => Boolean(o));
  const cheio = max !== undefined && value.length >= max;

  const termo = norm(q);
  // O que JA foi escolhido sai das sugestoes: oferecer de novo o que esta na
  // tela como etiqueta e oferecer um clique que nao faz nada.
  const lista = options
    .filter((o) => !value.includes(o.value))
    .filter((o) => (termo ? norm(o.label).includes(termo) || norm(o.hint ?? '').includes(termo) : true));

  const border = invalid ? 'var(--red-500)' : focus ? 'var(--border-brand)' : 'var(--border-default)';

  function adicionar(v: string) {
    if (cheio || value.includes(v)) return;
    onChange([...value, v]);
    setQ('');
    inputRef.current?.focus();
  }
  function remover(v: string) {
    onChange(value.filter((x) => x !== v));
    inputRef.current?.focus();
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Mesma casca do KitSearchPicker, com `flexWrap`: varias etiquetas
          precisam cair para a linha de baixo em vez de espremer o campo de
          digitacao ate ele sumir. `alignItems: center` vira `flex-start`
          porque com duas linhas de etiqueta o input centralizado flutua. */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)',
          minHeight: INPUT_H.md, padding: '6px 14px', boxSizing: 'border-box',
          background: disabled ? 'var(--surface-subtle)' : 'var(--surface-card)',
          border: `1px solid ${border}`, borderRadius: INPUT_R.md,
          boxShadow: focus ? 'var(--focus-ring)' : 'none', transition: 'var(--transition-control)',
          opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text',
        }}
      >
        {escolhidos.map((o) => (
          <KitBadge key={o.value} tone="brand" style={{ flexShrink: 0 }} title={o.label}>
            {tagLabel ? tagLabel(o) : o.label}
            <button
              type="button"
              aria-label={removeLabel(o.label)}
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); remover(o.value); }}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2,
                width: 16, height: 16, padding: 0, border: 'none', borderRadius: '50%',
                background: 'transparent', color: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </KitBadge>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={q}
          disabled={disabled || cheio}
          aria-label={ariaLabel}
          placeholder={escolhidos.length > 0 ? '' : placeholder}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setFocus(true); setOpen(true); }}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => {
            // Backspace no campo VAZIO tira a ultima etiqueta - o gesto que
            // todo campo de etiquetas tem, e sem ele so o X do mouse remove.
            if (e.key === 'Backspace' && q === '' && value.length > 0) {
              e.preventDefault();
              onChange(value.slice(0, -1));
              return;
            }
            // Enter escolhe a primeira sugestao: quem digitou o nome inteiro
            // nao deveria precisar ir ao mouse para confirmar.
            if (e.key === 'Enter' && open && lista.length > 0) {
              e.preventDefault();
              adicionar(lista[0].value);
              return;
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          style={{
            flex: 1, minWidth: 90, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-body)', fontSize: 'var(--body-md-size)', color: 'var(--text-primary)',
            letterSpacing: 'var(--control-tracking)', padding: '6px 0',
          }}
        />
        <Search size={16} aria-hidden="true" style={{ display: 'flex', flexShrink: 0, color: 'var(--text-muted)' }} />
      </div>

      <KitMenuPanel
        open={open && !cheio && lista.length > 0}
        onClose={() => setOpen(false)}
        aria-label={ariaLabel}
        style={{ left: 0, right: 0, width: 'auto', maxHeight: 280, overflowY: 'auto' }}
      >
        {lista.map((o) => (
          <KitMenuItem
            key={o.value}
            label={
              o.hint ? (
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span>{o.label}</span>
                  <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>{o.hint}</span>
                </span>
              ) : (
                o.label
              )
            }
            onClick={() => { adicionar(o.value); }}
          />
        ))}
      </KitMenuPanel>
      {open && !cheio && lista.length === 0 && (
        <span style={{ display: 'block', marginTop: 'var(--space-2)', fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>
          {emptyText}
        </span>
      )}
    </div>
  );
}

// ---- PathPicker (caminho de pasta: árvore no próprio campo) --------------
// Pedido do dono (2026-09-25): "quando clico no input já aparece embaixo a
// lista de opções com as diferentes pastas e subpastas, com chevron up nas
// abertas e chevron down nas recolhidas — e conforme vai digitando essas
// opções vão diminuindo".
//
// O PROBLEMA: caminho digitado no escuro. "/Politicas" sem acento não dá erro
// em lugar nenhum — a indexação varre zero arquivo, e só aparece na aba
// Indexação depois da varredura seguinte. E não havia como DESCOBRIR o que
// existe: quem não sabia o nome da pasta não tinha por onde começar.
//
// A ÁRVORE VEM ACHATADA e a hierarquia sai do próprio caminho. Aninhar a
// entrada obrigaria quem chama a montar a árvore antes, e a mesma lista já
// serve ao filtro por digitação.
export interface KitPathNode {
  /** Caminho completo, com barra inicial. É o valor que sai daqui. */
  path: string;
  /** Último segmento — o que a linha mostra. */
  name: string;
  hasChildren: boolean;
}
export interface KitPathPickerProps {
  nodes: KitPathNode[];
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Nenhuma pasta sobrou do filtro. */
  emptyText?: string;
  removeLabel?: (path: string) => string;
  'aria-label'?: string;
}

/** Profundidade de um caminho: "/a" = 0, "/a/b" = 1. Serve ao recuo. */
function nivelDoCaminho(p: string): number {
  return p.split('/').length - 2;
}

export function KitPathPicker({
  nodes, value, onChange, id, disabled = false,
  placeholder = 'Clique para ver as pastas', emptyText = 'Nenhuma pasta com esse nome.',
  removeLabel = (p) => `Remover ${p}`, 'aria-label': ariaLabel,
}: KitPathPickerProps) {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const [abertas, setAbertas] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const caixaRef = React.useRef<HTMLDivElement>(null);
  const termo = norm(q.trim());

  /* QUEM APARECE. Sem busca, manda a expansão: raiz sempre, e o resto só com
     todos os pais abertos. Com busca, a expansão é ignorada e sobem os que
     casam MAIS os pais deles — esconder o pai de um resultado deixaria o
     caminho sem contexto, e é o pai que diz de onde aquela subpasta vem. */
  const visiveis = React.useMemo(() => {
    const ordenadas = [...nodes].sort((a, b) => a.path.localeCompare(b.path, 'pt-BR'));
    /** Todo pai do caminho está aberto? (a raiz não tem pai, e sempre está). */
    const paisAbertos = (p: string): boolean => {
      const pai = p.slice(0, p.lastIndexOf('/'));
      if (!pai) return true;
      return abertas.includes(pai) && paisAbertos(pai);
    };
    if (!termo) return ordenadas.filter((n) => paisAbertos(n.path));
    const casam = ordenadas.filter((n) => norm(n.path).includes(termo));
    const comPais = new Set<string>();
    for (const n of casam) {
      comPais.add(n.path);
      let p = n.path.slice(0, n.path.lastIndexOf('/'));
      while (p) {
        comPais.add(p);
        p = p.slice(0, p.lastIndexOf('/'));
      }
    }
    return ordenadas.filter((n) => comPais.has(n.path));
  }, [nodes, abertas, termo]);

  /* A LISTA É UM KitMenuPanel, e não um bloco `absolute` aqui dentro: o corpo
     do drawer rola por dentro, e um painel absoluto no campo de baixo saía
     cortado pela borda (84px sumiam no campo de pastas excluídas). O painel do
     DS é portalado, vira para cima quando não cabe, e já traz Escape e clique
     fora. Só a LARGURA precisa de medida: o padrão dele é o menu do topbar, e
     aqui ele tem de casar com o campo. */
  const [largura, setLargura] = React.useState(280);
  React.useLayoutEffect(() => {
    if (!open) return;
    const medir = () => setLargura(caixaRef.current?.offsetWidth ?? 280);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [open]);

  function alternarEscolha(p: string) {
    onChange(value.includes(p) ? value.filter((v) => v !== p) : [...value, p]);
  }
  function alternarAberta(p: string) {
    setAbertas((a) => (a.includes(p) ? a.filter((x) => x !== p) : [...a, p]));
  }

  const border = focus ? 'var(--border-brand)' : 'var(--border-default)';

  return (
    <div ref={caixaRef} style={{ position: 'relative' }}>
      {/* Mesma casca do KitTagPicker: o caminho escolhido é uma etiqueta, e
          várias caem para a linha de baixo em vez de espremer a digitação. */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)',
          minHeight: INPUT_H.md, padding: '6px 14px', boxSizing: 'border-box',
          background: disabled ? 'var(--surface-subtle)' : 'var(--surface-card)',
          border: `1px solid ${border}`, borderRadius: INPUT_R.md,
          boxShadow: focus ? 'var(--focus-ring)' : 'none', transition: 'var(--transition-control)',
          opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text',
        }}
      >
        {value.map((p) => (
          <KitBadge key={p} tone="brand" style={{ flexShrink: 0 }} title={p}>
            {p}
            <button
              type="button"
              aria-label={removeLabel(p)}
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); alternarEscolha(p); }}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2,
                width: 16, height: 16, padding: 0, border: 'none', borderRadius: '50%',
                background: 'transparent', color: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </KitBadge>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={q}
          disabled={disabled}
          aria-label={ariaLabel}
          placeholder={value.length > 0 ? '' : placeholder}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setFocus(true); setOpen(true); }}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); return; }
            if (e.key === 'Enter' && open && visiveis.length > 0) {
              e.preventDefault();
              alternarEscolha(visiveis[0]!.path);
              setQ('');
            }
            // Backspace no campo vazio tira a última escolha, como no TagPicker.
            if (e.key === 'Backspace' && !q && value.length > 0) alternarEscolha(value[value.length - 1]!);
          }}
          style={{
            flex: 1, minWidth: 80, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-body)', fontSize: 'var(--body-md-size)', color: 'var(--text-primary)',
          }}
        />
        <Search size={16} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </div>

      <KitMenuPanel
        open={open}
        onClose={() => setOpen(false)}
        width={largura}
        aria-label={ariaLabel}
      >
        <>
          {visiveis.length === 0 && (
            <p style={{ margin: 0, padding: 'var(--space-4)', textAlign: 'center', fontSize: 'var(--body-sm-size)', color: 'var(--text-muted)' }}>
              {emptyText}
            </p>
          )}
          {visiveis.map((n) => {
            const marcada = value.includes(n.path);
            const aberta = abertas.includes(n.path);
            return (
              <div
                key={n.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  paddingLeft: `calc(var(--space-2) + ${nivelDoCaminho(n.path) * 16}px)`,
                  paddingRight: 'var(--space-2)',
                }}
              >
                {/* CHEVRON só onde há o que abrir: para cima quando aberta,
                    para baixo quando recolhida. Sem filho, o lugar dele fica
                    reservado para os nomes não dançarem entre as linhas. */}
                {n.hasChildren ? (
                  <button
                    type="button"
                    aria-label={aberta ? `Recolher ${n.name}` : `Abrir ${n.name}`}
                    aria-expanded={aberta}
                    onClick={(e) => { e.stopPropagation(); alternarAberta(n.path); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 20, height: 20, flexShrink: 0, padding: 0, border: 'none',
                      borderRadius: 'var(--radius-xs)', background: 'transparent',
                      color: 'var(--text-secondary)', cursor: 'pointer',
                    }}
                  >
                    {aberta ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                  </button>
                ) : (
                  <span style={{ width: 20, flexShrink: 0 }} aria-hidden="true" />
                )}
                {/* `menuitemcheckbox` e não `option`: a lista mora num painel
                    de MENU do DS, e `option` só é válido dentro de listbox. O
                    que a linha faz é marcar e desmarcar — é caixa, não escolha
                    única. */}
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={marcada}
                  onClick={() => { alternarEscolha(n.path); setQ(''); inputRef.current?.focus(); }}
                  style={{
                    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    padding: 'var(--space-2)', border: 'none', borderRadius: 'var(--radius-sm)',
                    background: marcada ? 'var(--surface-brand-subtle)' : 'transparent',
                    font: 'inherit', fontSize: 'var(--body-sm-size)', color: 'var(--text-primary)',
                    textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <Folder size={15} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.name}
                  </span>
                  {marcada && <Check size={15} aria-hidden="true" style={{ color: 'var(--text-brand-strong)', flexShrink: 0 }} />}
                </button>
              </div>
            );
          })}
        </>
      </KitMenuPanel>
    </div>
  );
}

// ---- Field (label + required + hint/error + optional trailing) -----------
export interface KitFieldProps {
  id?: string;
  label?: React.ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Rendered inline after the label — e.g. a KitConfidenceBadge. */
  trailing?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export function KitField({ id, label, required = false, hint, error, trailing, children, style }: KitFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontFamily: 'var(--font-body)', ...style }}>
      {/* Rótulo e badge de confiança na MESMA LINHA (Figma 26/08). Era
          `flex-wrap: wrap`: em campo estreito o badge caía para a linha de
          baixo e passava a parecer legenda do CAMPO, não do rótulo — e a altura
          do campo mudava conforme o comprimento do rótulo, desalinhando a
          fileira. `nowrap` mantém os dois juntos; o rótulo é que quebra dentro
          da própria largura, já que o badge é curto e `white-space: nowrap`. */}
      {(label || trailing) && (
        <div
          className="bela-kit-field-label"
          /* ALTURA FIXA do cabeçalho = a do badge (2026-08-27). Sem ela o
             cabeçalho media 21px sem badge e 24px com badge, e dois campos
             lado a lado começavam em alturas diferentes — o desalinhamento que
             o user apontou entre "E-mail" e "Ativo relacionado". Reservar a
             altura do badge em TODO campo faz a fileira nascer alinhada,
             tenha ele badge ou não. */
          style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 'var(--space-2)', minHeight: 24 }}
        >
          {label && (
            <label
              htmlFor={id}
              style={{ minWidth: 0, fontSize: 'var(--body-sm-size)', fontWeight: WEIGHT.semibold, color: 'var(--text-primary)', letterSpacing: 'var(--control-tracking)' }}
            >
              {label}
              {required && <span aria-hidden="true" style={{ color: 'var(--red-500)', marginLeft: 4 }}>*</span>}
            </label>
          )}
          {trailing}
        </div>
      )}
      {children}
      {(error || hint) && (
        <span
          id={error && id ? `${id}-error` : undefined}
          role={error ? 'alert' : undefined}
          style={{ fontSize: 'var(--caption-size)', color: error ? 'var(--red-500)' : 'var(--text-muted)' }}
        >
          {error || hint}
        </span>
      )}
    </div>
  );
}

/* PESO VISUAL DA FAIXA (dono, 16/09): mais forte quanto mais alta.
   VAZADO nos três — o preenchido pesava demais (dono, mesma data), e com razão:
   na Nova Solicitação são cinco selos numa tela de formulário, e cinco manchas
   de cor competem com os campos, que são o assunto. A rampa passa então para o
   TRAÇO e a cor do texto, dentro do mesmo roxo.
   Um HELPER, não dois mapas: o chamador espalha `{...evidenciaBadge(x)}` e não
   tem como pegar o tom certo com o peso errado. Três telas leem daqui — rótulo
   duplicado já nos custou duas divergências esta semana. */
const EVIDENCE_PESO: Record<EvidenceBand, React.CSSProperties> = {
  low: { borderColor: 'var(--purple-250)', color: 'var(--text-brand)' },
  medium: { borderColor: 'var(--purple-400)', color: 'var(--text-brand)' },
  high: { borderColor: 'var(--purple-600)', color: 'var(--text-brand-strong)' },
};

export function evidenciaBadge(pct: number): { tone: BadgeTone; style: React.CSSProperties } {
  return { tone: 'brandOutline', style: EVIDENCE_PESO[evidenceBand(pct)] };
}

// ---- ConfidenceBadge (per-field BELA enrichment marker) ------------------
export interface KitConfidenceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** 0–100. */
  value: number;
}
export function KitConfidenceBadge({ value, style, ...rest }: KitConfidenceBadgeProps) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  /* FAIXA, não percentual (dono, 16/09) — mesma régua da fila de curadoria, em
     `@bela/types/rules`. O número continua entrando aqui porque é o que as
     telas calculam; o que muda é o que a pessoa lê. Ver a nota daquele módulo
     sobre por que a medida de hoje é um proxy. */
  const faixa = EVIDENCE_BAND_LABELS[evidenceBand(pct)].toLowerCase();
  const inteiro = `confiança ${faixa}`;
  // Literally a brand KitBadge (light purple fill · purple-400 border · purple-700
  // text) + the spark — so it can never diverge from the other badges.
  //
  // CONTRAÇÃO CONDICIONAL (user, 2026-08-27): em campo estreito o badge vira
  // "conf. 92%" e devolve ~27px ao rótulo, que é quem quebrava a linha (a linha
  // é `nowrap`). Quem decide é a container query do DS — a palavra inteira volta
  // sozinha assim que o campo tem espaço. O texto completo nunca some: `title`
  // no hover e `aria-label` para leitor de tela, que de outro modo ouviria a
  // abreviação.
  return (
    <KitBadge
      {...evidenciaBadge(pct)}
      icon={<Spark size={8} color="currentColor" />}
      title={inteiro}
      aria-label={inteiro}
      style={{ ...evidenciaBadge(pct).style, ...style }}
      {...rest}
    >
      <span>
        <span className="bela-kit-conf-full">confiança</span>
        <span className="bela-kit-conf-abbr">conf.</span> {faixa}
      </span>
    </KitBadge>
  );
}

// ---- Eyebrow -------------------------------------------------------------
export interface KitEyebrowProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
}
export function KitEyebrow({ children, color = 'var(--text-muted)', style, ...rest }: KitEyebrowProps) {
  return (
    <div
      style={{
        fontSize: 'var(--eyebrow-size)', letterSpacing: 'var(--eyebrow-tracking)', textTransform: 'uppercase',
        fontWeight: WEIGHT.semibold, color, ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ---- Button --------------------------------------------------------------
type BtnVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
/**
 * DUAS medidas, e só duas (user, 2026-09-11):
 *  • `md` — a REGULAR, padrão. É o tamanho de qualquer botão que esteja solto
 *    na página: rodapé de drawer, barra de ação, toolbar de tela.
 *  • `xs` — só DENTRO de container: card/widget da bela, célula de tabela,
 *    linha de lista.
 *
 * Antes eram três (`sm`/`md`/`lg`) sem regra de quando usar cada uma, e o
 * resultado era rodapé com botões de alturas diferentes lado a lado —
 * "Responder" em 40px ao lado de "Pedir resposta" em 32px. `lg` nunca teve um
 * único uso; `sm` virou `xs` com os MESMOS valores (nada encolheu, mudou o nome
 * e a regra de uso).
 */
type BtnSize = 'xs' | 'md';
/* RAIO POR TAMANHO (Figma Bela_By_Belago, 2026-08-26). O botão deixou de ser
   PÍLULA. A regra antiga ("botões são sempre pílula", herdada do deck) fazia
   sentido quando o botão era quase sempre um CTA solto; no redesenho ele
   convive com card, campo e badge — e a pílula era a única forma do conjunto
   que não acompanhava o raio dos vizinhos. A PÍLULA continua sendo a forma do
   BADGE e do chip: é ela que separa "isto é um rótulo" de "isto é um botão".
   Medido no chip do drawer (nó 277:2155): 32px de altura com raio 10. */
const BTN_RADIUS: Record<BtnSize, string> = {
  xs: 'var(--radius-sm)',
  md: 'var(--radius-sm)',
};

const BTN_SIZES: Record<BtnSize, React.CSSProperties> = {
  // Padding vertical explícito (P2 A.3 da varredura, 2026-08-19): a altura fixa
  // + conteúdo centrado o absorvem (visual idêntico), mas o texto nunca encosta
  // na borda — e o detector deixa de acusar 0px vertical em texto de 14px.
  xs: { height: 'var(--control-height-sm)', padding: '5px 14px', fontSize: 'var(--body-sm-size)', gap: 6 },
  md: { height: 'var(--control-height-md)', padding: '6px 20px', fontSize: 'var(--body-md-size)', gap: 8 },
};
const BTN_VARIANTS: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: 'var(--surface-brand)', color: 'var(--text-on-brand)', border: '1px solid transparent', boxShadow: 'var(--shadow-xs)' },
  secondary: { background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xs)' },
  soft: { background: 'var(--surface-brand-subtle)', color: 'var(--text-brand)', border: '1px solid transparent' },
  ghost: { background: 'transparent', color: 'var(--text-primary)', border: '1px solid transparent' },
  danger: { background: 'var(--red-500)', color: 'var(--text-on-brand)', border: '1px solid transparent' },
};
const BTN_HOVER: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: 'var(--surface-brand-hover)' },
  secondary: { background: 'var(--surface-subtle)' },
  soft: { background: 'var(--surface-brand-soft)' },
  ghost: { background: 'var(--surface-subtle)' },
  danger: { background: 'var(--red-700)' },
};

export interface KitButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: BtnVariant;
  size?: BtnSize;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}
export function KitButton({
  children, variant = 'primary', size = 'md', iconLeft, iconRight, fullWidth = false, disabled = false, type = 'button', style, ...rest
}: KitButtonProps) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  return (
    <button
      type={type}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--font-body)', fontWeight: WEIGHT.semibold, letterSpacing: 'var(--control-tracking)', lineHeight: 1, whiteSpace: 'nowrap',
        borderRadius: BTN_RADIUS[size], cursor: disabled ? 'not-allowed' : 'pointer', transition: 'var(--transition-control)',
        transform: press && !disabled ? 'scale(0.98)' : 'none',
        ...BTN_SIZES[size], ...BTN_VARIANTS[variant], ...(hover && !disabled ? BTN_HOVER[variant] : null),
        // Disabled pela RECEITA do DS (mesma do KitCard), nunca por opacity:
        // a pilha de opacidade derrubava o rótulo a ~1.1:1 (achado do detect).
        ...(disabled ? { background: 'var(--surface-disabled)', border: '1px solid var(--border-disabled)', color: 'var(--text-secondary)', boxShadow: 'none' } : null),
        ...style,
      }}
      {...rest}
    >
      {iconLeft}{children}{iconRight}
    </button>
  );
}

// ---- IconButton ----------------------------------------------------------
const IB_SIZES = { sm: 32, md: 40, lg: 48 } as const;
export interface KitIconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  icon: React.ReactNode;
  label: string;
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  /** `square` (padrão desde 2026-08-26) = retângulo arredondado, como o Figma
   *  desenha o sino, a engrenagem e o voltar. `circle` ficou para o caso raro
   *  em que o alvo é redondo de verdade (avatar clicável). */
  shape?: 'circle' | 'square';
}
export function KitIconButton({ icon, label, variant = 'ghost', size = 'md', shape = 'square', disabled = false, style, ...rest }: KitIconButtonProps) {
  const [hover, setHover] = React.useState(false);
  const px = IB_SIZES[size];
  const base = variant === 'ghost' ? { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' } : BTN_VARIANTS[variant];
  return (
    <button
      type="button" aria-label={label} title={label} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', width: px, height: px, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: shape === 'circle' ? 'var(--radius-pill)' : 'var(--radius-sm)', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1, transition: 'var(--transition-control)',
        ...base, ...(hover && !disabled ? BTN_HOVER[variant] : null), ...style,
      }}
      {...rest}
    >
      {icon}
    </button>
  );
}

// ---- Avatar --------------------------------------------------------------
export interface KitAvatarProps {
  initials: string;
  size?: number;
  tone?: 'brand' | 'neutral';
  style?: React.CSSProperties;
}
export function KitAvatar({ initials, size = 32, tone = 'brand', style }: KitAvatarProps) {
  const tones = {
    brand: { background: 'var(--surface-brand-soft)', color: 'var(--text-brand-strong)' },
    neutral: { background: 'var(--ink-100)', color: 'var(--ink-700)' },
  } as const;
  return (
    <span
      style={{
        width: size, height: size, flexShrink: 0, borderRadius: 'var(--radius-pill)', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontWeight: WEIGHT.bold,
        fontSize: size * 0.36, letterSpacing: 'var(--control-tracking)', ...tones[tone], ...style,
      }}
    >
      {initials}
    </span>
  );
}

// ---- Logo (full-value word color, for use inside .bela-kit) ---------------
export interface KitLogoProps {
  size?: number;
  /**
   * Nome do PRODUTO ao lado da marca ("Console", "Desk"). Vira uma pílula
   * contornada à direita do logotipo — decisão do user (2026-08-27, com a
   * referência visual na mão): o nome do app NUNCA é tipografado junto do
   * wordmark (aquilo lia como um logotipo novo, "bela console"), e também não
   * fica empilhado embaixo. A marca é sempre "bela"; o produto é um selo ao
   * lado dela. Omitir = marca pura.
   */
  product?: string;
  style?: React.CSSProperties;
}
export function KitLogo({ size = 32, product, style }: KitLogoProps) {
  const mark = (
    <svg width={size * (219 / 60)} height={size} viewBox="0 0 219 60" fill="none" style={{ display: 'block' }}>
      <g opacity={1}>
        <path d={PETAL_LIGHT_A} fill="#B3A2FA" />
        <path d={PETAL_LIGHT_B} fill="#B3A2FA" />
      </g>
      <path d={PETAL_SOLID_A} fill="#3E0CF5" />
      <path d={PETAL_SOLID_B} fill="#3E0CF5" />
      {WORDMARK.map((d, i) => (
        <path key={i} fillRule="evenodd" clipRule="evenodd" d={d} fill="var(--text-primary)" />
      ))}
    </svg>
  );

  if (!product) {
    return (
      <span role="img" aria-label="bela" style={{ display: 'inline-flex', ...style }}>
        {mark}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={`bela ${product}`}
      /* LINHA DE BASE de verdade (`baseline`), não `flex-end`: alinhar as bordas
         inferiores deixa o texto subir a própria DESCIDA da fonte (~4px em
         19,5px) e o nome flutua em relação ao "bela" — foi o defeito que o user
         apontou. Com `baseline`, a base do "l" de bela e a do "r" de core caem
         na mesma linha, como na referência de marca; e por ser métrica da
         fonte, continua certo se a Red Hat Display não carregar. O SVG é
         elemento substituído: a base dele é a borda INFERIOR, e o wordmark tem
         4/60 do viewBox de folga abaixo — a margem negativa desce o logotipo
         exatamente essa folga para as duas bases coincidirem. */
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: size * 0.3, ...style }}
    >
      {mark}
      <span
        aria-hidden="true"
        style={{
          /* Peso MEDIUM e tamanho pela PROPORÇÃO da referência de marca (user,
             2026-08-27): a altura de x do nome do produto fica em ~60% da do
             wordmark. Os 14px do Figma pressupõem uma marca de ~19px; a
             sidebar usa 26px, então o mesmo 14 lia como rótulo de badge —
             daí a razão (0.75) no lugar do número fixo, que também mantém o
             logotipo inteiro em qualquer tamanho. */
          fontFamily: 'var(--font-display)', fontWeight: WEIGHT.medium,
          fontSize: size * 0.75, lineHeight: 1, letterSpacing: 'var(--control-tracking)',
          /* Roxo-ardósia da referência (#645B86) que vira LAVANDA no escuro —
             `--text-secondary` puro fica cinza lá e o nome do produto perdia o
             croma da marca, lendo como rótulo de badge. */
          color: 'var(--text-secondary-on-brand)', whiteSpace: 'nowrap',
          /* O SVG é item flex substituído: o navegador sintetiza a base dele na
             BORDA INFERIOR do viewBox, e a base dos glifos está acima disso.
             MEDIDO no bbox do wordmark (b/e/l/a não têm descendente, então o
             fundo da caixa É a linha de base): y = 56,77 de 60 → 3,23/60 de
             folga. Sobe-se essa folga (só na pintura, sem mexer no layout) e a
             base do "l" de bela cai exatamente na do "r" de core. */
          position: 'relative', top: -size * (3.23 / 60),
        }}
      >
        {product}
      </span>
    </span>
  );
}

// ---- Switch (ported from bela components/forms/Switch.jsx) ----------------
export interface KitSwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  /** Provide to make it interactive (label wrapper). Omit for a visual-only
   *  track whose interaction the parent owns (e.g. inside KitMenuItem). */
  onChange?: (next: boolean) => void;
  label?: React.ReactNode;
  /** Nome acessível quando NÃO há `label` visível — linha de tabela ou de
   *  lista, onde o rótulo já está na própria linha e repeti-lo ao lado do
   *  trilho seria ruído. Sem um dos dois o `role="switch"` fica sem nome.
   *  (2026-09-11, com o toggle das fontes de conhecimento.) */
  'aria-label'?: string;
  style?: React.CSSProperties;
  /** PALAVRAS NO TRILHO (user, 2026-09-08: "no espaço vazio do toggle aparece
   *  Sim ou Não"): o lado que o botão deixa livre diz o estado. O trilho
   *  alarga para caber a palavra; sem `words` é o switch de sempre. */
  words?: { on: string; off: string };
}
export function KitSwitch({ checked, defaultChecked, disabled = false, onChange, label, style, words, 'aria-label': ariaLabel }: KitSwitchProps) {
  const [inner, setInner] = React.useState(!!defaultChecked);
  const isOn = checked === undefined ? inner : checked;
  const largura = words ? 62 : 44;
  const track = (
    <span
      role={onChange ? 'switch' : undefined}
      aria-checked={onChange ? isOn : undefined}
      aria-label={label ? undefined : ariaLabel}
      style={{
        position: 'relative',
        width: largura, height: 26, flexShrink: 0, padding: 3, boxSizing: 'border-box', borderRadius: 'var(--radius-pill)',
        background: isOn ? 'var(--surface-brand)' : 'var(--ink-200)', display: 'flex', alignItems: 'center',
        transition: 'background-color var(--duration-base) var(--ease-out)',
      }}
    >
      {words && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, bottom: 0, display: 'flex', alignItems: 'center',
            left: isOn ? 9 : 'auto', right: isOn ? 'auto' : 9,
            fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1,
            color: isOn ? 'var(--text-on-brand)' : 'var(--text-secondary)', pointerEvents: 'none',
          }}
        >
          {isOn ? words.on : words.off}
        </span>
      )}
      <span
        style={{
          width: 20, height: 20, borderRadius: 'var(--radius-pill)', background: 'var(--white)', boxShadow: 'var(--shadow-xs)',
          transform: isOn ? `translateX(${largura - 26}px)` : 'none', transition: 'transform var(--duration-base) var(--ease-out)',
        }}
      />
    </span>
  );
  if (!onChange) return track;
  const toggle = () => {
    if (disabled) return;
    const next = !isOn;
    if (checked === undefined) setInner(next);
    onChange(next);
  };
  return (
    <label
      onClick={toggle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)', fontFamily: 'var(--font-body)',
        fontSize: 'var(--body-md-size)', color: 'var(--text-primary)', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, userSelect: 'none', ...style,
      }}
    >
      {track}
      {label}
    </label>
  );
}

// ---- Checkbox (varredura DS 2026-08-25) -----------------------------------
// O primitivo que FALTAVA: as tabelas com seleção (Aprovações, Lista, Assets,
// Discovery) usavam <input type="checkbox"> cru porque o DS não tinha opção.
// Nativo por baixo (semântica/teclado de graça), tema via accent-color.
export interface KitCheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  'aria-label': string;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export function KitCheckbox({ checked, onChange, disabled = false, style, ...rest }: KitCheckboxProps) {
  return (
    /* A forma mora em `.bela-kit-checkbox` (bela-kit.css): o checkmark é um
       `::after`, e pseudo-elemento não se escreve em style inline. */
    <input
      type="checkbox"
      className="bela-kit-checkbox"
      aria-label={rest['aria-label']}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.currentTarget.checked)}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
    />
  );
}

// ---- Nav label (sidebar section header) ----------------------------------
export function KitNavLabel({ children, style, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        padding: '0 var(--space-3) var(--space-1)', fontSize: 'var(--eyebrow-size)', letterSpacing: '0.08em',
        textTransform: 'uppercase', fontWeight: WEIGHT.semibold, color: 'var(--text-muted)', ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ---- Nav item (sidebar) --------------------------------------------------
export interface KitNavItemProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}
export function KitNavItem({ icon, label, active = false, onClick }: KitNavItemProps) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)', height: 40, width: '100%',
        padding: '0 var(--space-3)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', textAlign: 'left',
        background: active ? 'var(--surface-brand-subtle)' : hover ? 'var(--surface-subtle)' : 'transparent',
        color: active ? 'var(--text-brand)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)', fontSize: 'var(--body-sm-size)', fontWeight: WEIGHT.semibold, transition: 'var(--transition-control)',
      }}
    >
      {icon}
      {/* minWidth:0 — sem ele o nowrap vira largura mínima do flex item e o
          ellipsis nunca dispara (a sidebar inteira ganha scroll-x). */}
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{label}</span>
    </button>
  );
}

// ---- Menu item (dropdown row) --------------------------------------------
export interface KitMenuItemProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  trailing?: React.ReactNode;
  checked?: boolean;
  onClick?: () => void;
  /** `danger` — ação DESTRUTIVA (encerrar, remover, excluir): rótulo e ícone em
   *  vermelho, e o hover num vermelho lavado em vez do cinza. Autorizado pelo
   *  user em 2026-08-27 ("encerrar destacado em vermelho"). A cor é o único
   *  sinal que separa o item que desfaz do item que navega, então ela mora no
   *  DS — a alternativa era cada menu pintar o seu, que é como divergem. */
  tone?: 'default' | 'danger';
}
export function KitMenuItem({ icon, label, trailing, checked, onClick, tone = 'default' }: KitMenuItemProps) {
  const [hover, setHover] = React.useState(false);
  const destrutivo = tone === 'danger';
  return (
    <button
      type="button"
      role={checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
      aria-checked={checked}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
        borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)', border: 'none', cursor: 'pointer',
        background: hover
          ? (destrutivo ? 'var(--red-100)' : 'var(--surface-subtle)')
          : 'transparent',
        fontFamily: 'var(--font-body)',
        // um <button> tem text-align:center do UA — sem isto, um label de duas
        // linhas (nome + cargo no switcher) centraliza a linha mais curta
        fontSize: 'var(--body-sm-size)', color: destrutivo ? 'var(--red-500)' : 'var(--text-primary)',
        textAlign: 'left', transition: 'var(--transition-control)',
        overflow: 'hidden',
      }}
    >
      {/* minWidth:0 + flex:1 — o truncate do label (nowrap) mora no consumidor;
          sem isto o min-content do texto trava o encolhimento e estoura o menu
          (scroll-x no switcher de persona, achado da rodada de estética). */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0, flex: 1 }}>
        {icon}
        {label}
      </span>
      {trailing && <span style={{ display: 'flex', flexShrink: 0 }}>{trailing}</span>}
    </button>
  );
}

// ---- BackButton (saída de PÁGINA CHEIA) ----------------------------------
// Padrão único de navegação de saída (decisão 2026-08-12): página cheia
// VOLTA (ArrowLeft, contorno secondary/square); drawer/overlay FECHA (X,
// KitIconButton sm sem contorno). Não misturar — um drawer não "volta",
// ele fecha sobre a mesma página.
export function KitBackButton({ onClick, label = 'Voltar' }: { onClick: () => void; label?: string }) {
  return <KitIconButton icon={<ArrowLeft size={18} />} label={label} variant="secondary" shape="square" onClick={onClick} />;
}

// ---- MenuPanel (dropdown não-modal do topbar/switcher) --------------------
// Painel de menu ancorado (o pai imediato precisa ser position:relative, com o
// botão-gatilho dentro dele). Dismiss por pointerdown FORA do ancestral, Escape
// e troca de rota (hashchange). Deliberadamente SEM backdrop: um dropdown não é
// modal — o backdrop transparente de viewport inteiro engolia o primeiro clique
// de qualquer interação seguinte (achado P0 da varredura Fase 7), e pior:
// o menu sobrevivia à navegação. O pointerdown fecha o menu E deixa o clique
// original agir no alvo.
export interface KitMenuPanelProps {
  /** Lado em que o painel cresce. 'auto' (padrão) abre para baixo e VIRA para
   *  cima quando não cabe — o limite é a viewport ou o contêiner rolável mais
   *  próximo (a tabela do DS rola dentro de si desde 2026-08-26, e o menu da
   *  última linha seria cortado pela borda do quadro). 'top'/'bottom' forçam. */
  placement?: 'auto' | 'bottom' | 'top';
  open: boolean;
  onClose: () => void;
  /** Largura do painel (default 224, o menu do topbar). */
  width?: number;
  'aria-label'?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export function KitMenuPanel({ open, onClose, width = 224, placement = 'auto', 'aria-label': ariaLabel, children, style }: KitMenuPanelProps) {
  // Marcador de posição: fica no lugar do painel só para achar a ÂNCORA (o pai).
  const markerRef = React.useRef<HTMLSpanElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const anchor = markerRef.current?.parentElement;
      const dentro =
        e.target instanceof Node &&
        ((anchor?.contains(e.target) ?? false) || (panelRef.current?.contains(e.target) ?? false));
      if (!dentro) onCloseRef.current();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    const onHashChange = () => onCloseRef.current();
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [open]);

  // Posição em coordenadas de VIEWPORT: o painel é portalado para fora de
  // qualquer contêiner que recorte (2026-08-26 — dentro da tabela com altura
  // máxima, um menu `absolute` era cortado pela borda do quadro). Reposiciona
  // em scroll/resize para acompanhar a âncora.
  React.useLayoutEffect(() => {
    if (!open) return;
    const anchor = markerRef.current?.parentElement;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const medir = () => {
      const a = anchor.getBoundingClientRect();
      const h = panel.scrollHeight;
      const GAP = 8;
      const MARGEM = 8;
      const espacoAbaixo = window.innerHeight - a.bottom - GAP - MARGEM;
      const espacoAcima = a.top - GAP - MARGEM;
      // Cabe abaixo? fica abaixo. Não cabe? vai para o lado com mais espaço —
      // e o painel ganha a altura disponível (rola por dentro). Menu com 13
      // itens numa janela baixa não pode simplesmente vazar da tela.
      const paraCima =
        placement === 'bottom'
          ? false
          : placement === 'top'
            ? h <= espacoAcima || espacoAcima >= espacoAbaixo
            : h > espacoAbaixo && espacoAcima > espacoAbaixo;
      const left = Math.max(MARGEM, Math.min(a.right - width, window.innerWidth - width - MARGEM));
      const maxHeight = Math.max(120, Math.min(paraCima ? espacoAcima : espacoAbaixo, window.innerHeight - 2 * MARGEM));
      const usada = Math.min(h, maxHeight);
      // Coordenada única (top) e SEMPRE presa à janela: a âncora pode estar
      // fora da área visível (sidebar mais alta que a janela) e a conta de
      // espaço, sozinha, jogava o painel para fora da tela.
      const top = Math.max(
        MARGEM,
        Math.min(paraCima ? a.top - GAP - usada : a.bottom + GAP, window.innerHeight - MARGEM - usada),
      );
      setPos({ left, top, maxHeight });
    };
    medir();
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [open, placement, width]);

  React.useEffect(() => {
    if (!open) setPos(null);
  }, [open]);

  if (!open) return null;
  return (
    <>
      <span ref={markerRef} style={{ display: 'none' }} aria-hidden="true" />
      {createPortal(
        <div
          ref={panelRef}
          className="bela-kit"
          role="menu"
          aria-label={ariaLabel}
          style={{
            ...style,
            position: 'fixed',
            // Antes da 1ª medida o painel existe (para ser medido) mas não pinta.
            visibility: pos ? 'visible' : 'hidden',
            top: pos?.top ?? 0,
            bottom: 'auto',
            left: pos?.left ?? 0,
            right: 'auto',
            // Acima do drawer (60) — o menu do rodapé do drawer vive aqui.
            zIndex: 80,
            width,
            maxHeight: pos?.maxHeight,
            overflowY: 'auto',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-card)',
            padding: 'var(--space-1)',
            boxShadow: 'var(--shadow-lg)',
            // overflowX explícito: um consumidor que passe só overflowY:'auto'
            // (o switcher rolável) faria o eixo X computar para 'auto' pela
            // spec — e qualquer label largo viraria barra de rolagem horizontal.
            overflowX: 'hidden',
          }}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}

// ---- Drawer (overlay lateral padrão do DS) --------------------------------
// Casca ÚNICA dos drawers (decisão rodada estética 2026-08-13): backdrop com
// token --surface-overlay (antes eram 4 cores, 3 hardcoded), painel à direita
// com slide in/out sem bounce (translateX, --duration-base/--ease-out;
// prefers-reduced-motion corta o slide), Escape + backdrop + X num lugar só
// (X = KitIconButton sm sem contorno — drawer FECHA, página cheia VOLTA),
// 3 zonas: header fixo / corpo rolável / footer opcional. O componente fica
// montado durante a saída para animar: os slots da última abertura ficam
// congelados num ref enquanto `open=false` desliza para fora (o pai pode já
// não ter dado para renderizá-los). Foco entra no painel e volta ao gatilho.
const DRAWER_MS = 200; // = --duration-base (espelhado no timer JS de desmontagem)

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  React.useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const fn = () => setReduced(mq.matches);
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, []);
  return reduced;
}

export interface KitDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Largura do painel (px ou CSS; default 420). maxWidth 100vw embutido. */
  width?: number | string;
  'aria-label'?: string;
  /** Título simples do header. Para header rico use `header`. */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Header custom (ocupa a área à esquerda do X; prevalece sobre title). */
  header?: React.ReactNode;
  /** Slot à ESQUERDA do header (ex.: voltar interno de pilha do drawer). */
  headerLeading?: React.ReactNode;
  /** Rodapé fixo (borderTop, não rola). */
  footer?: React.ReactNode;
  closeLabel?: string;
  /** Estilo extra do corpo rolável (ex.: flex column + gap). */
  bodyStyle?: React.CSSProperties;
  /** Ref do corpo rolável (ex.: reset de scroll ao trocar de conteúdo). */
  bodyRef?: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
}

/** Ciclo de montagem/animação de um drawer: `present` mantém o painel montado
 *  durante a SAÍDA; `shown` dirige transform/opacity; `dur` respeita
 *  prefers-reduced-motion. Compartilhado pelo KitDrawer e pelo BelaChatDrawer
 *  (que mantém markup próprio mas o MESMO motion — decisão 2026-08-13). */
export function useKitDrawerMotion(open: boolean): { present: boolean; shown: boolean; dur: string } {
  const [present, setPresent] = React.useState(open);
  const [shown, setShown] = React.useState(false);
  const reduced = usePrefersReducedMotion();
  React.useEffect(() => {
    if (open) {
      setPresent(true);
      if (reduced) {
        setShown(true);
        return;
      }
      // setTimeout, não rAF: o browser-pane do dev não dispara rAF oculto.
      const t = setTimeout(() => setShown(true), 15);
      return () => clearTimeout(t);
    }
    setShown(false);
    if (!present) return;
    const t = setTimeout(() => setPresent(false), reduced ? 0 : DRAWER_MS + 50);
    return () => clearTimeout(t);
  }, [open, reduced, present]);
  return { present, shown, dur: reduced ? '0ms' : `${DRAWER_MS}ms` };
}

export function KitDrawer({
  open, onClose, width = 420, 'aria-label': ariaLabel, title, subtitle, header, headerLeading,
  footer, closeLabel = 'Fechar', bodyStyle, bodyRef, children,
}: KitDrawerProps) {
  const { present, shown, dur } = useKitDrawerMotion(open);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const panelRef = React.useRef<HTMLElement>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  // Congela os slots da última abertura para a animação de saída.
  const snapshot = { title, subtitle, header, headerLeading, footer, children, ariaLabel, width };
  const lastRef = React.useRef(snapshot);
  if (open) lastRef.current = snapshot;
  const c = open ? snapshot : lastRef.current;

  // Escape fecha; foco entra no painel e volta ao gatilho na saída.
  React.useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!present) return null;
  // PORTAL PARA O BODY (2026-08-27), mesmo remédio já aplicado ao KitMenuPanel:
  // `position: fixed` deixa de valer contra a viewport quando um ancestral cria
  // contexto de contenção — e o drawer aberto de dentro de uma coluna que rola
  // (`overflow: auto` na sidebar do 4.a) nascia preso ali: começava abaixo da
  // topbar, com o painel recortado. Overlay é do APP, não do container que o
  // abriu; no body ele não depende de quem o montou.
  return createPortal(
    <div className="bela-kit" style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <button
        aria-label={closeLabel}
        onClick={() => onCloseRef.current()}
        style={{
          position: 'absolute', inset: 0, border: 'none', padding: 0, cursor: 'default',
          background: 'var(--surface-overlay)', opacity: shown ? 1 : 0,
          transition: `opacity ${dur} var(--ease-out)`,
        }}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={c.ariaLabel}
        tabIndex={-1}
        style={{
          position: 'relative', height: '100%', width: c.width, maxWidth: '100vw',
          background: 'var(--surface-card)', borderLeft: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', outline: 'none',
          fontFamily: 'var(--font-body)',
          transform: shown ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform ${dur} var(--ease-out)`,
        }}
      >
        {(c.header || c.title || c.headerLeading) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            {c.headerLeading}
            <div style={{ flex: 1, minWidth: 0 }}>
              {c.header ?? (
                /* MESMO desenho do header rico do 4.b (user, 2026-08-27: "olha
                   a diferença"): o identificador vem pequeno em cima e o TÍTULO
                   embaixo, forte — `body-lg` bold. Antes o título saía semibold
                   no tamanho do corpo e o subtítulo em caption abaixo: dois
                   textos quase do mesmo peso, e o painel abria sem hierarquia. */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  {c.subtitle && <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>{c.subtitle}</span>}
                  <span style={{ fontWeight: WEIGHT.bold, fontSize: 'var(--body-lg-size)', letterSpacing: 'var(--control-tracking)', color: 'var(--text-primary)' }}>
                    {c.title}
                  </span>
                </div>
              )}
            </div>
            {/* Fechar SEMPRE com contorno, igual aos ícones da topbar (user,
                2026-08-27 — revoga o "X sem contorno" de 08-12): o botão que
                tira o painel da frente não pode ser o elemento mais fraco
                dele. */}
            <KitIconButton
              icon={<X size={18} />}
              label={closeLabel}
              variant="secondary"
              onClick={() => onCloseRef.current()}
              /* Centrado na altura do header (user, 2026-08-27), não colado no
                 topo: o header tem duas linhas (identificador + título) e o X
                 alinhado ao flex-start ficava preso à primeira, fora do eixo do
                 bloco que ele fecha. */
              style={{ alignSelf: 'center' }}
            />
          </div>
        )}
        <div ref={bodyRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-5) var(--space-6)', ...bodyStyle }}>
          {c.children}
        </div>
        {c.footer && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 'var(--space-4) var(--space-6)', background: 'var(--surface-card)', flexShrink: 0 }}>
            {c.footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}

// ---- BelaWidget (the canonical "bela widget" shell) ----------------------
// Every BELA-generated surface (§2 attribution) is a lavender panel stamped with
// a solid Roxo "Bela · <module>" tag + spark, then its content. This is THE bela
// widget — screens compose content inside it, never hand-roll the shell.
export interface KitBelaWidgetProps {
  /** Module name after "Bela · " — e.g. "Orienta", "Service Desk", "Aguardando sua ação". */
  module: string;
  /** Rendered in the header row, right after the module tag — e.g. an average
   *  confidence badge. */
  headerTrailing?: React.ReactNode;
  padding?: CardPadding;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  /** Anatomia padrão: título → texto → ações, nesta ordem, antes de `children`. */
  title?: React.ReactNode;
  text?: React.ReactNode;
  actions?: React.ReactNode;
}
/** O CARIMBO da bela, sozinho. Existe como primitivo porque já havia uma
 *  segunda cópia dele desenhada à mão (o cabeçalho do drawer de artigo, que
 *  ficou para trás com a medida antiga de 22px e o nome capitalizado quando o
 *  carimbo mudou). Quem precisa do carimbo fora de um KitBelaWidget usa ISTO.
 *
 *  DUAS FORMAS (user, 2026-09-04):
 *  · `ink` (PADRÃO) — sparkle + texto na cor da marca, sem preenchimento.
 *  · `solid` — o selo roxo preenchido, guardado como ALTERNATIVA caso o cliente
 *    prefira. Não use sem decisão: ver o porquê abaixo.
 *
 *  Por que o padrão deixou de ser o selo: ele usava o MESMO `--surface-brand` de
 *  fundo e o MESMO `--text-on-brand` do botão primário, separado dele só por
 *  4px de raio — rótulo e controle clicável liam igual. E contrariava a regra de
 *  26/08 ("a pílula é a forma do badge, e é ela que separa rótulo de clicável"),
 *  porque sobrescrevia o raio para `--radius-xs`. Sem preenchimento, a diferença
 *  passa a ser PESO VISUAL, que não depende de detalhe de geometria.
 *
 *  ⚠️ A cor é `--text-brand-strong`, NUNCA `--accent-bela-fg`: dentro de
 *  `.bela-kit` este último é só o trio HSL e a cor cai para o preto herdado
 *  (gotcha da ponte de tokens, 25/08). O `-strong` é o tom criado em 03/09
 *  para marca COMO TEXTO. Medido: 9,56:1 sobre o lavanda do widget.
 *
 *  Descartado no mesmo teste: contorno em pílula + `letter-spacing` de 0.05em
 *  ("mais carimbudo") — a caixa fechava o rótulo e pesava o widget, que é o
 *  oposto do ganho de tirar o preenchimento. Caixa alta seria a forma mais
 *  carimbuda de todas, mas contraria a decisão de 26/08 (carimbo em minúscula).
 */
export function KitBelaStamp({ module, label, variant = 'ink' }: {
  module?: string;
  label?: string;
  variant?: 'ink' | 'solid';
}) {
  /* `label` escreve o carimbo por extenso; `module` monta o "bela · X". Existe
     porque o carimbo tem DUAS VOZES (decisão do user, 2026-08-27): o widget
     carimba um bloco com o MÓDULO que o produziu ("bela · orienta") e a oferta
     dentro do composer diz o que a bela FAZ ali ("bela responde"). As palavras
     mudam; a FORMA é a mesma. */
  const conteudo = label ?? <>bela · {module}</>;

  if (variant === 'solid')
    return (
      <KitBadge
        tone="solid"
        icon={<Spark size={8} color="var(--text-on-brand)" />}
        style={{ height: 32, padding: '0 13px', borderRadius: 'var(--radius-xs)' }}
      >
        {conteudo}
      </KitBadge>
    );

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
        // A altura de 32 é a MESMA do selo: trocar de forma não mexe no
        // espaçamento de nenhum widget.
        height: 32, color: 'var(--text-brand-strong)',
        fontFamily: 'var(--font-body)', fontSize: 'var(--caption-size)',
        fontWeight: WEIGHT.bold, letterSpacing: '0.01em',
      }}
    >
      <Spark size={11} color="currentColor" />
      {conteudo}
    </span>
  );
}

/** ANATOMIA do widget (2026-09-03, "os widgets bela estão inconsistentes"):
 *  todo widget tinha um título desenhado à mão com o mesmo estilo, um texto
 *  com o mesmo estilo e uma fileira de botões com o mesmo estilo — sete cópias
 *  que divergiam no detalhe. Agora são três peças do DS. `KitBelaWidget` aceita
 *  `title`/`text`/`actions` e as monta na ordem certa; quem tem corpo próprio
 *  (composer, carrossel) continua usando `children`. */
export function KitBelaHeading({ children }: { children: React.ReactNode }) {
  /* MAIS PESO E TAMANHO (user, 2026-09-03): em body-sm/semibold o título do
     widget se confundia com o texto de apoio. Passou a body-md/bold — é a
     pergunta ou o assunto do widget, tem de ser lido primeiro. Vale para todos
     os widgets de uma vez: é o ponto de a peça ser uma só. */
  return (
    <div style={{ fontSize: 'var(--body-md-size)', fontWeight: WEIGHT.bold, letterSpacing: 'var(--control-tracking)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
      {children}
    </div>
  );
}
export function KitBelaBody({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 'var(--body-sm-size)', lineHeight: 1.5, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
      {children}
    </div>
  );
}
/** Fileira de ações do widget: pílulas TODAS iguais (secondary/sm) — a
 *  importância é a ORDEM, nunca a cor (decisão 2026-08-23). */
export function KitBelaActions({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>{children}</div>;
}

/**
 * ZONA DA BELA (regra do user, 2026-09-03): os widgets da bela são ACELERADORES
 * — ficam SEMPRE logo abaixo do título da página, lado a lado, e um filete os
 * separa do resto. A regra mora aqui para nenhuma tela decidir sozinha onde a
 * bela fica (Lista de tickets e Aprovações a tinham no rodapé; o Dashboard,
 * depois dos KPIs). Um widget ocupa a largura toda; dois ou três dividem. Some
 * inteira com o interruptor da bela — quem chama já faz o gate.
 */
export function KitBelaZone({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const filhos = React.Children.toArray(children).filter(Boolean);
  if (filhos.length === 0) return null;
  const cols = Math.min(filhos.length, 3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', ...style }}>
      <div className="bela-kit-zone" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 'var(--space-4)', alignItems: 'stretch' }}>
        {filhos}
      </div>
      <div aria-hidden="true" style={{ borderTop: '1px solid var(--border-subtle)' }} />
    </div>
  );
}

/**
 * O ASSISTENTE — o widget de pergunta que abre o chat contextual (2026-09-03,
 * "eles ainda estão diferentes"). Sete telas tinham o MESMO widget desenhado
 * sete vezes: a pergunta ora em display ao lado do carimbo, ora em cinza
 * pequeno, ora em corpo preto; o respiro até o campo variava; o rótulo do botão
 * também. Agora é UMA peça: carimbo "assistente", a pergunta como título do
 * widget, o campo grande com o envio dentro. A tela só diz a pergunta, o
 * placeholder e para onde a mensagem vai. `children` é o que a tela põe ABAIXO
 * do campo (ex.: os chips "Você costuma pedir" do Catálogo).
 */
export function KitBelaAssistant({
  question, placeholder, onSubmit, 'aria-label': ariaLabel, children,
}: {
  question: React.ReactNode;
  placeholder: string;
  /** Recebe o texto já validado (não-vazio) e limpa o campo depois. */
  onSubmit: (text: string) => void;
  'aria-label': string;
  children?: React.ReactNode;
}) {
  const [value, setValue] = React.useState('');
  const enviar = () => {
    const t = value.trim();
    if (!t) return;
    onSubmit(t);
    setValue('');
  };
  return (
    <KitBelaWidget module="assistente" title={question}>
      <form onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <KitInput
          size="lg"
          placeholder={placeholder}
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          action={<KitSendButton aria-label="Perguntar à bela" disabled={!value.trim()} />}
        />
      </form>
      {children}
    </KitBelaWidget>
  );
}

/** ITEM dentro de um widget da bela — a linha branca sobre o lavanda, para
 *  quando o widget mostra VÁRIOS itens de uma vez (os alertas do Predict). Um
 *  item só não precisa disso: vive direto no lavanda. `trailing` é o número
 *  que acompanha o item (confiança, score). */
export function KitBelaItem({ children, trailing }: { children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)',
        background: 'var(--surface-card)', border: '1px solid var(--purple-200)', borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
      }}
    >
      <div style={{ minWidth: 0, fontSize: 'var(--body-sm-size)', lineHeight: 1.5, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{children}</div>
      {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
    </div>
  );
}

export function KitBelaWidget({ module, headerTrailing, padding = 'md', children, style, title, text, actions }: KitBelaWidgetProps) {
  return (
    /* SUPERFÍCIE DO WIDGET (Figma Bela_By_Belago nó 277:1646, medido 2026-08-26):
       `#E5DFFD` (Hawkes Blue = --surface-brand-soft), SEM borda e com raio de
       card (14). Estava um degrau mais claro (`#F2EFFE`) e com um contorno
       lavanda: a faixa quase sumia no branco da página, e a borda dava a ela
       cara de caixa delimitada em vez de superfície da bela. As demais
       superfícies `brandSoft` do produto (a tira da bela dentro do card de
       chamado, o cartão da sidebar) seguem no tom claro — só o WIDGET desceu. */
    <KitCard tone="brandSoft" padding={padding} radius="md" elevation="none" style={{ background: 'var(--surface-brand-soft)', ...style }}>
      {/* BELA attribution stamp: a compact SOLID Roxo module tag, pulled up to the
          top edge so the content below leads. Filled so it never reads as a
          clickable chip (those are white pills with a grey border).
          "bela" em MINÚSCULA desde 2026-08-26 (Figma Bela_By_Belago): é como a
          marca se escreve, e o carimbo é o lugar onde ela aparece mais vezes na
          tela. O `module` traz a própria caixa — nome comum em minúscula
          ("orienta", "resumo executivo"), nome próprio como veio ("Service
          Desk", "Predict"). */}
      <div style={{ marginTop: -10, marginBottom: 'var(--space-3)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* MEDIDA DO CARIMBO (Figma Bela_By_Belago, 2026-08-26): 32px de altura,
            13px de respiro lateral e `radius/xs` (6px) — NÃO é a pílula de 22px
            que estava aqui. O carimbo não é um badge de status: ele é a
            assinatura da bela naquele bloco, e no Figma ele tem presença de
            rótulo, não de chip. O canto quadrado é o que o separa dos badges
            (esses seguem pílula de 24px). */}
        <KitBelaStamp module={module} />
        {headerTrailing}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {title && <KitBelaHeading>{title}</KitBelaHeading>}
        {text && <KitBelaBody>{text}</KitBelaBody>}
        {actions && <KitBelaActions>{actions}</KitBelaActions>}
        {children}
      </div>
    </KitCard>
  );
}

// ---- Linha clicável de lista (row + chevron) ------------------------------
// Promovida ao DS em 2026-08-26: era local da Nova Solicitação e o drawer 4.b
// precisava da MESMA linha. Toda a linha é o alvo (não um botão "Abrir" à
// direita): área de clique maior e uma afordância só.
export interface KitCardRowProps {
  leading?: React.ReactNode;
  children: React.ReactNode;
  /** Colunas fixas ANTES da seta (categoria, data, contagem) — a linha da Base
   *  de Conhecimento precisa disto; sem o slot, ela renascia desenhada à mão. */
  trailing?: React.ReactNode;
  /** Altura mínima da faixa. A KB usa 100 (medida do Figma); o padrão é o
   *  natural do conteúdo. */
  minHeight?: number;
  /** Como a linha anuncia que é clicável. `chevron` (padrão) é o › discreto de
   *  lista dentro de card; `arrow` é o quadrado de 40 com seta que o Figma usa
   *  na listagem da Base de Conhecimento (nó 297:31) — faixa larga pede um alvo
   *  visível na ponta. VISUAL apenas: quem recebe o clique é a linha inteira,
   *  porque <button> não aninha. */
  affordance?: 'chevron' | 'arrow';
  onClick?: () => void;
  'aria-label'?: string;
}
export function KitCardRow({ leading, children, trailing, minHeight, affordance = 'chevron', onClick, 'aria-label': ariaLabel }: KitCardRowProps) {
  const { hover, hoverProps } = useKitHover();
  const [focus, setFocus] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      {...hoverProps}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-6)', width: '100%', textAlign: 'left',
        minHeight, boxSizing: 'border-box',
        padding: 'var(--space-3) var(--space-5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
        background: hover ? 'var(--surface-subtle)' : 'var(--surface-card)', boxShadow: focus ? 'var(--focus-ring)' : 'none',
        cursor: 'pointer', transition: 'var(--transition-control)', fontFamily: 'var(--font-body)',
      }}
    >
      {leading}
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {trailing}
      {affordance === 'arrow' ? (
        <span
          aria-hidden="true"
          style={{
            display: 'grid', placeItems: 'center', width: 40, height: 40, flexShrink: 0,
            borderRadius: 'var(--radius-control)',
            border: `1px solid ${hover ? 'var(--border-brand)' : 'var(--border-default)'}`,
            background: 'var(--surface-card)',
            color: hover ? 'var(--text-brand)' : 'var(--text-primary)',
            transition: 'var(--transition-control)',
          }}
        >
          <ArrowRight size={18} />
        </span>
      ) : (
        <ChevronRight size={16} style={{ flexShrink: 0, color: hover ? 'var(--text-brand)' : 'var(--text-muted)', transition: 'var(--transition-control)' }} aria-hidden="true" />
      )}
    </button>
  );
}

// ---- bela Orienta (Knowledge/RAG) ----------------------------------------
// O widget de artigos da base: MESMO elemento na Nova Solicitação (antes de
// abrir o chamado) e no drawer 4.b (para o analista resolver). Só muda a frase
// de abertura — a casca, as linhas e o carimbo são um só (2026-08-26).
export interface KitOrientaItem {
  id: string;
  title: string;
  summary?: string;
}
export interface KitOrientaProps<T extends KitOrientaItem = KitOrientaItem> {
  /** Frase de abertura — o host adapta ao contexto. */
  intro: string;
  items: T[];
  onOpen: (item: T) => void;
}
export function KitOrienta<T extends KitOrientaItem>({ intro, items, onOpen }: KitOrientaProps<T>) {
  if (items.length === 0) return null;
  return (
    <KitBelaWidget module="orienta">
      <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--body-sm-size)', color: 'var(--text-secondary)' }}>
        {intro}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {items.map((a) => (
          /* TÍTULO em cima, resumo embaixo — revertido a pedido do user em
             2026-08-26. O Figma desenha invertido (resumo primeiro, título em
             negrito embaixo); a ordem de sempre venceu. O título deixa de
             truncar em uma linha: é ele que a pessoa vai procurar depois. */
          <KitCardRow key={a.id} onClick={() => onOpen(a)}>
            <span style={{ display: 'block', fontSize: 'var(--body-sm-size)', fontWeight: WEIGHT.semibold, color: 'var(--text-primary)' }}>
              {a.title}
            </span>
            {a.summary && (
              <span style={{ display: 'block', marginTop: 4, fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>{a.summary}</span>
            )}
          </KitCardRow>
        ))}
      </div>
    </KitBelaWidget>
  );
}

// ---- Tabs ----------------------------------------------------------------
// Promovido a primitivo do DS em 2026-08-20 (tela de Administração em abas).
// É o MESMO padrão de sublinhado que as telas de Assets, Predict hub e detalhe
// do alerta já desenhavam à mão — nasce aqui para as próximas não copiarem.
export interface KitTab {
  key: string;
  /** Nó, não só texto: uma aba 100% BELA leva o spark antes do rótulo. */
  label: React.ReactNode;
  /** Pinta um ponto de alerta na aba (ex.: seção com alteração não publicada
   *  vivendo numa aba que não é a ativa — o aviso não pode se esconder). */
  pending?: boolean;
}
export interface KitTabsProps {
  tabs: KitTab[];
  active: string;
  onChange: (key: string) => void;
  'aria-label': string;
  style?: React.CSSProperties;
}
export function KitTabs({ tabs, active, onChange, 'aria-label': ariaLabel, style }: KitTabsProps) {
  // Roving tabindex + setas: padrão WAI-ARIA de tablist (a11y do audit).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.key === active);
    const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next.key);
    const el = (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(`[data-tab-key="${next.key}"]`);
    el?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', ...style }}
    >
      {tabs.map((t) => {
        const selected = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            data-tab-key={t.key}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: 'none', background: 'transparent', cursor: 'pointer',
              padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-body)',
              fontSize: 'var(--body-sm-size)', fontWeight: WEIGHT.semibold,
              color: selected ? 'var(--text-brand)' : 'var(--text-secondary)',
              borderBottom: selected ? '2px solid var(--surface-brand)' : '2px solid transparent',
              marginBottom: -1, transition: 'var(--transition-control)',
            }}
          >
            {t.label}
            {t.pending && (
              <span
                aria-label="Alterações não publicadas"
                title="Alterações não publicadas"
                style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--amber-700)', flexShrink: 0 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Aba ativa sincronizada com o hash (`#/rota?tab=chave`) — o par do KitTabs.
 *  Promovido junto com a segmentação das telas do Console (2026-08-20): a
 *  Administração estreou o padrão e as demais telas o reusam. A chave
 *  `fallback` NÃO escreve parâmetro (a rota limpa é a aba padrão); link
 *  externo com `?tab=` troca a aba com a tela já montada (hashchange). */
export function useHashTab<K extends string>(keys: readonly K[], fallback: K): [K, (key: K) => void] {
  const read = (): K => {
    const k = window.location.hash.match(/[?&]tab=([\w-]+)/)?.[1] as K | undefined;
    return k && keys.includes(k) ? k : fallback;
  };
  const [tab, setTab] = React.useState<K>(read);
  const readRef = React.useRef(read);
  readRef.current = read;
  React.useEffect(() => {
    const onHash = () => setTab(readRef.current());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const select = (key: K) => {
    setTab(key);
    const path = window.location.hash.split('?')[0];
    window.location.hash = key === fallback ? path : `${path}?tab=${key}`;
  };
  return [tab, select];
}

export { Spark };
