import * as React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react';
import { KitCard, KitBadge, KitIconTile, KitIconButton, WEIGHT } from './index';
import { KitInfoTip } from './infotip';

/**
 * Padrões de composição das telas de ADMINISTRAÇÃO (Console BELA) — promovidos
 * de `@bela/console-admin` quando a segunda tela do Console precisou deles.
 * Só composição de componentes Kit* + tokens; nenhum primitivo visual novo.
 */

/** Invólucro de seção: KitCard + hierarquia de heading (h2, display bold).
 *  `pending` marca a seção alterada depois da última publicação — é o que liga
 *  um "N alterações não publicadas" do topo a um lugar concreto da tela. */
export function KitSection({
  title, description, descriptionDisplay = 'text', info, pending = false, actions, children, style,
}: {
  title: string;
  description?: string;
  /**
   * "(i)" AO LADO DO TÍTULO, convivendo com a descrição em texto.
   *
   * `descriptionDisplay: 'tooltip'` resolve outro caso — ele TROCA o parágrafo
   * pelo tooltip. Quando a seção precisa das duas coisas (uma descrição que se
   * lê de relance e um detalhe que só interessa a quem for agir) não havia
   * como, e o (i) acabava em `actions`, do outro lado do cabeçalho, longe do
   * que explica. O padrão do produto é o do KitPageHeader: o (i) encosta no
   * título (dono, 2026-09-24).
   */
  info?: string;
  /** Passa ao KitCard — p/ a seção preencher a coluna (`height: 100%`) quando
   *  divide altura com outra ao lado (Dashboard, 2026-09-03). */
  style?: React.CSSProperties;
  /** `tooltip` troca o parágrafo por um "(i)" ao lado do título (KitInfoTip) —
   *  pedido do user 2026-08-20 para as seções da Administração. `text` (padrão)
   *  mantém o parágrafo — as demais telas não mudam. */
  descriptionDisplay?: 'text' | 'tooltip';
  pending?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <KitCard padding="lg" style={{ scrollMarginTop: 88, ...style }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <h2
                style={{
                  margin: 0, fontFamily: 'var(--font-display)', fontWeight: WEIGHT.bold,
                  fontSize: 'var(--heading-sm-size)', letterSpacing: 'var(--heading-sm-tracking)',
                  color: 'var(--text-primary)',
                }}
              >
                {title}
              </h2>
              {description && descriptionDisplay === 'tooltip' && <KitInfoTip text={description} />}
              {info && <KitInfoTip text={info} />}
              {pending && <KitBadge tone="warning" dot>Não publicado</KitBadge>}
            </div>
            {description && descriptionDisplay === 'text' && (
              /* `--measure-prose`: texto corrido tem largura máxima de leitura
                 (~68 caracteres). Sem isso a descrição herda a largura do card
                 e chega a ~126 chars/linha no container de 1200px. */
              <p style={{ margin: 0, fontSize: 'var(--body-sm-size)', color: 'var(--text-secondary)', maxWidth: 'var(--measure-prose)' }}>{description}</p>
            )}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </KitCard>
  );
}

/** Card de KPI do topo das telas de administração: rótulo pequeno, número em
 *  display bold e a PROCEDÊNCIA do número logo abaixo (`hint` — o "motivo" do
 *  padrão número/motivo; um KPI sem procedência é só um número bonito).
 *  Promovido na terceira tela que o copiava. */
export function KitKpi({
  label, value, hint, alert = false, icon, onClick, active = false, trend, note, badge, spark, onInfo, infoLabel, variant = 'default',
}: {
  label: string; value: string; hint?: string; alert?: boolean;
  /** VARIANTE DENSA (user, 2026-09-09, referência do Dicionário de Indicadores
   *  do Marista): para telas com muitos KPIs e muita informação por KPI (o
   *  Dashboard). Sem o quadradinho de ícone — é ele que come a largura —, o
   *  tile empilha: cabeçalho (bolinha de estado + rótulo, hint embaixo, (i) à
   *  direita), número grande com tendência, e um rodapé com a meta à esquerda
   *  e a PÍLULA de estado à direita. As demais telas seguem no `default`. */
  variant?: 'default' | 'dense';
  /** RODAPÉ da variante densa (2026-09-09): uma nota à esquerda (ex.: "vs.
   *  mês anterior · 61%") e um selo à direita (ex.: "piora"). Quem chama
   *  decide texto e tom — o tile não conhece a regra. Sem os dois, o rodapé
   *  ainda existe (vazio) para os tiles da fileira alinharem. */
  note?: string;
  badge?: { text: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; icon?: React.ReactNode };
  /** LINHA MIÚDA (user, 2026-09-09): a história do indicador dentro do tile,
   *  entre o número e o rodapé — em vez de um card por indicador. Quem chama
   *  monta o `KitSparkline`; o tile só reserva o lugar. */
  spark?: React.ReactNode;
  /** FICHA DO INDICADOR (2026-09-09): o (i) no canto do tile abre a ficha
   *  (descrição, fórmula, base, regras) num drawer da tela. É botão próprio,
   *  separado do clique-filtro do cartão — os dois convivem. */
  onInfo?: () => void;
  infoLabel?: string;
  /** TENDÊNCIA ao lado do número (autorizada pelo user, 2026-09-03): seta +
   *  variação. Quem chama diz o TOM — subir chamados abertos é ruim, subir FCR
   *  é bom; o tile não adivinha. Nasceu no tile para todas as telas herdarem;
   *  antes vivia num cartão local do Dashboard. */
  /** `critical` (2026-09-09): a seta em VERMELHO — o âmbar de `bad` é o tom
   *  de atenção, e crítico não pode ler igual a atenção. */
  trend?: { pct: number; tone: 'good' | 'bad' | 'critical' | 'neutral'; /** Texto no lugar de "+12%" (ex.: "+3,2 p.p."). */ display?: string };
  /** CLICÁVEL (user, 2026-08-28): o KPI vira filtro da lista abaixo, como os
   *  tiles de Meus chamados. Com `onClick` o cartão passa a ser um <button> de
   *  verdade — foco, Enter/Espaço e cursor vêm do elemento, não de um `div` com
   *  handler. Sem `onClick` nada muda: as telas de administração seguem com o
   *  cartão estático. */
  onClick?: () => void;
  /** Filtro ligado — o cartão fica marcado, para a lista abaixo não parecer
   *  incompleta sem motivo. */
  active?: boolean;
  /** Variante com ÍCONE: o tile das telas do bela desk (Lista 3.b, Aprovações,
   *  Dashboard). HORIZONTAL desde 2026-08-26 (Figma Bela_By_Belago): quadrado de
   *  ícone de 48px à ESQUERDA, número e rótulo empilhados à direita — era ícone
   *  de 24px em cima e o texto embaixo. O ícone deixa de ser um selo cinza
   *  discreto e vira a âncora visual da linha de KPIs. Sem `icon`, a hierarquia
   *  original (rótulo em cima) das telas de administração fica intacta. */
  icon?: React.ReactNode;
}) {
  const clickProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-pressed': active,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
        },
      }
    : {};
  const infoButton = onInfo ? (
    <KitIconButton
      size="sm"
      variant="ghost"
      label={infoLabel ?? `Sobre ${label}`}
      icon={<Info size={15} aria-hidden="true" />}
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onInfo(); }}
      onKeyDown={(e: React.KeyboardEvent) => { e.stopPropagation(); }}
    />
  ) : null;

  if (variant === 'dense') {
    return (
      <KitCard
        padding="md"
        interactive={!!onClick}
        onClick={onClick}
        {...clickProps}
        style={{
          display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', height: '100%',
          /* CONTORNO NA COR DO SELO (user, 2026-09-09): crítico e atenção
             pintam a linha do cartão com o MESMO traço do KitBadge (red-500 /
             amber-500) — o tile inteiro passa a ler o estado, não só a pílula.
             Estável e evolução seguem com a borda padrão: destaque é para o
             que pede olhar. */
          ...(badge?.tone === 'danger'
            ? { border: '1px solid var(--red-500)' }
            : badge?.tone === 'warning'
              ? { border: '1px solid var(--amber-500)' }
              : null),
          ...(active ? { border: '1px solid var(--border-brand)', background: 'var(--surface-brand-subtle)' } : null),
        }}
      >
        {/* CABEÇALHO: bolinha de estado + rótulo; o hint (procedência) logo
            abaixo, indentado até o rótulo; o (i) no canto, alinhado ao topo. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            {/* SEM bolinha no cabeçalho (user, 2026-09-09): a pílula do rodapé
                já carrega o estado; duas marcas para a mesma coisa era ruído. */}
            <span style={{ fontSize: 'var(--body-md-size)', fontWeight: WEIGHT.semibold, color: 'var(--text-primary)', minWidth: 0 }}>{label}</span>
            {hint && <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>{hint}</span>}
          </div>
          {infoButton && <span style={{ flexShrink: 0, marginTop: -4, marginRight: -4 }}>{infoButton}</span>}
        </div>
        {/* NÚMERO com a tendência ao lado. */}
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-2)', minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)', fontWeight: WEIGHT.bold, fontSize: 'var(--heading-lg-size)', lineHeight: 1.05,
              letterSpacing: 'var(--heading-lg-tracking)', color: alert ? 'var(--red-500)' : 'var(--text-primary)',
            }}
          >
            {value}
          </span>
          {trend && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap',
                fontSize: 'var(--caption-size)', fontWeight: WEIGHT.semibold, fontFamily: 'var(--font-body)',
                color: trend.tone === 'critical' ? 'var(--red-500)' : trend.tone === 'bad' ? 'hsl(var(--status-at-risk-fg))' : trend.tone === 'good' ? 'hsl(var(--status-on-track-fg))' : 'var(--text-muted)',
              }}
            >
              {trend.tone === 'neutral' && trend.pct === 0 ? <Minus size={12} aria-hidden="true" /> : trend.pct >= 0 ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}
              {trend.display ?? `${trend.pct >= 0 ? '+' : ''}${trend.pct}%`}
            </span>
          )}
        </span>
        {/* RODAPÉ: meta à esquerda, pílula de estado à direita. `marginTop:
            auto` cola o rodapé no pé do cartão quando os tiles da fileira têm
            alturas diferentes de conteúdo. */}
        {spark}
        {/* RODAPÉ SEMPRE (mesmo vazio). `marginTop: auto` só QUANDO HÁ a linha
            miúda: sem ela o rodapé desceria sozinho e abriria um vão no meio do
            tile (user, 2026-09-09: "aproxime o agora do 15"). */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', marginTop: spark ? 'auto' : 'calc(var(--space-1) - var(--space-3))', minHeight: 24 }}>
          <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{note ?? ''}</span>
          {badge && <KitBadge tone={badge.tone} icon={badge.icon}>{badge.text}</KitBadge>}
        </div>
      </KitCard>
    );
  }

  if (icon) {
    return (
      <KitCard
        padding="md"
        interactive={!!onClick}
        onClick={onClick}
        /* `KitCard` é uma <div> — o teclado não vem de graça. `role`/`tabIndex`
           e o Enter/Espaço fazem o cartão-filtro ser operável sem mouse, sem
           trocar o elemento do primitivo (que outras telas usam como cartão
           estático). */
        {...(onClick
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-pressed': active,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
              },
            }
          : {})}
        style={{
          position: 'relative',
          ...(active ? { border: '1px solid var(--border-brand)', background: 'var(--surface-brand-subtle)' } : null),
        }}
      >
        {infoButton && (
          <span style={{ position: 'absolute', top: 'var(--space-2)', right: 'var(--space-2)' }}>{infoButton}</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Quadradinho do DS (KitIconTile). Era desenhado aqui, com o glifo em
              Roxo pleno — sobrou da migração de 26/08 e ficou divergindo do
              quadradinho do Catálogo e de Meus chamados, que usam o cinza da
              marca. Um lugar só decide a forma e a cor. */}
          {/* SELECIONADO: o quadradinho escurece um passo (user, 2026-09-02).
              O cartão ativo passa a ter fundo `--surface-brand-subtle` — o
              MESMO do tile —, e o quadradinho sumia dentro dele justo no
              cartão que está filtrando. `--surface-brand-soft` é o degrau
              seguinte da mesma família (claro e escuro). */}
          <KitIconTile icon={icon} style={active ? { background: 'var(--surface-brand-soft)' } : undefined} />
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-2)', minWidth: 0 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)', fontWeight: WEIGHT.bold, fontSize: 'var(--heading-lg-size)', lineHeight: 1.05,
                letterSpacing: 'var(--heading-lg-tracking)', color: alert ? 'var(--red-500)' : 'var(--text-primary)',
              }}
            >
              {value}
            </span>
            {trend && (
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap',
                  fontSize: 'var(--caption-size)', fontWeight: WEIGHT.semibold, fontFamily: 'var(--font-body)',
                  color: trend.tone === 'critical'
                    ? 'var(--red-500)'
                    : trend.tone === 'bad'
                      ? 'hsl(var(--status-at-risk-fg))'
                      : trend.tone === 'good'
                        ? 'hsl(var(--status-on-track-fg))'
                        : 'var(--text-muted)',
                }}
              >
                {trend.tone === 'neutral' && trend.pct === 0 ? <Minus size={12} aria-hidden="true" /> : trend.pct >= 0 ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}
                {trend.display ?? `${trend.pct >= 0 ? '+' : ''}${trend.pct}%`}
              </span>
            )}
          </span>
        </div>
        {/* RÓTULO E HINT FORA DA LINHA DO ÍCONE (user, 2026-09-02). O ícone é
            CENTRALIZADO — mas centralizado no NÚMERO, que é a única linha de
            altura fixa do tile. Enquanto rótulo e hint moravam dentro daquela
            linha, o tile cujo texto quebrava em duas linhas ("Entrando em
            obsolescência", "check-in nas últimas 24h de registros") crescia e
            empurrava o quadradinho para baixo — quatro ícones em quatro alturas
            na mesma fileira. Agora o número manda em todos, e o texto cresce
            por baixo, indentado até ele (48 do quadradinho + o gap). */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
            marginTop: 2, marginLeft: 'calc(48px + var(--space-4))',
          }}
        >
          <span style={{ fontSize: 'var(--body-md-size)', color: 'var(--text-secondary)' }}>{label}</span>
          {hint && <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>{hint}</span>}
        </div>
      </KitCard>
    );
  }
  return (
    <KitCard
      padding="md"
      interactive={!!onClick}
      onClick={onClick}
      {...(onClick
        ? {
            role: 'button' as const,
            tabIndex: 0,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
            },
          }
        : {})}
      /* SELECIONADO, como nas outras duas variantes. Esta — a sem ícone — só
         marcava `aria-pressed`: o leitor de tela sabia qual tile filtrava a
         lista e quem olhava, não. Mesmo traço e mesmo fundo das variantes
         `dense` e com ícone, para o tile-filtro parecer o mesmo controle em
         qualquer tela. */
      style={active ? { border: '1px solid var(--border-brand)', background: 'var(--surface-brand-subtle)' } : undefined}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>{label}</span>
        <span
          style={{
            fontFamily: 'var(--font-display)', fontWeight: WEIGHT.bold, fontSize: 'var(--heading-md-size)',
            letterSpacing: 'var(--heading-md-tracking)', color: alert ? 'var(--red-500)' : 'var(--text-primary)',
          }}
        >
          {value}
        </span>
        {hint && <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>{hint}</span>}
      </div>
    </KitCard>
  );
}

/** LISTA DE FATOS (autorizada pelo user, 2026-09-09 — ficha do indicador):
 *  pares rótulo/valor em duas colunas, para o drawer que explica um número
 *  (descrição, fórmula, base, fonte, regras, atualização, dono). Rótulo em
 *  caption/muted, valor em corpo; `mono` para fórmula. Sem cartão próprio —
 *  vive dentro do drawer ou de um KitSection. */
export function KitFactList({ rows, labelWidth = 104 }: {
  rows: { label: string; value: React.ReactNode; mono?: boolean }[];
  labelWidth?: number;
}) {
  return (
    <dl
      style={{
        display: 'grid', gridTemplateColumns: `${labelWidth}px minmax(0, 1fr)`, columnGap: 'var(--space-3)', rowGap: 'var(--space-3)',
        margin: 0,
      }}
    >
      {rows.map((r) => (
        <React.Fragment key={r.label}>
          <dt style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)', fontWeight: WEIGHT.semibold, paddingTop: 2 }}>{r.label}</dt>
          <dd
            style={{
              margin: 0, minWidth: 0, fontSize: 'var(--body-sm-size)', color: 'var(--text-primary)', lineHeight: 1.45,
              ...(r.mono
                ? {
                    fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 'var(--caption-size)',
                    background: 'var(--surface-subtle)', borderRadius: 'var(--radius-xs)', padding: 'var(--space-2) var(--space-3)',
                    wordBreak: 'break-word',
                  }
                : null),
            }}
          >
            {r.value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/** Cartão de ESTADO centrado (varredura DS 2026-08-25) — o padrão que vivia
 *  copiado como StateCard/CenterCard em 4 telas: carregando, vazio, restrito,
 *  erro. Ícone e título opcionais; `children` para uma ação (ex.: tentar de
 *  novo). Um lugar só para o estado "a tela não tem conteúdo agora".
 *
 *  SEM FUNDO PRÓPRIO (user, 2026-08-27: "mesma cor do fundo"): estado não é
 *  conteúdo — pintá-lo de cinza dava a um "não temos nada aqui" o mesmo peso
 *  visual de um card com informação, e a mancha ainda destoava da página
 *  (`--surface-subtle` #F5F5F5 sobre #F7F9FF). Transparente, ele herda o fundo
 *  onde estiver: página, card ou drawer. */
export function KitStateCard({
  icon, title, text, children,
}: {
  icon?: React.ReactNode;
  title?: string;
  text: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <KitCard tone="plain" elevation="none" padding="lg">
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 'var(--space-2)', padding: 'var(--space-4) 0', textAlign: 'center',
        }}
      >
        {icon && <span aria-hidden="true" style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>{icon}</span>}
        {title && <span style={{ fontSize: 'var(--body-md-size)', fontWeight: WEIGHT.semibold, color: 'var(--text-primary)' }}>{title}</span>}
        <span style={{ margin: 0, maxWidth: 420, fontSize: 'var(--body-sm-size)', color: 'var(--text-secondary)' }}>{text}</span>
        {children}
      </div>
    </KitCard>
  );
}

/** Linha de configuração: rótulo + explicação à esquerda, controle à direita.
 *  A unidade que se repete em canais, módulos, flags, guardrails e automações. */
export function KitSettingRow({
  label, hint, trailing, disabled = false, children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Badge/estado à direita do rótulo (ex.: "aplicado pelo motor"). */
  trailing?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap',
        padding: 'var(--space-3) 0', borderTop: '1px solid var(--border-subtle)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 220, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--body-sm-size)', fontWeight: WEIGHT.semibold, color: 'var(--text-primary)' }}>{label}</span>
          {trailing}
        </div>
        {hint && (
          <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)', lineHeight: 1.45 }}>{hint}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>{children}</div>
    </div>
  );
}
