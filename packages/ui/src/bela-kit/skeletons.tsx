import { KitCard, KitSkeleton, KitTileGrid } from './index';

/**
 * ESQUELETOS COMPOSTOS — as três formas que se repetem no app.
 *
 * Nasceram em 2026-09-04, quando o cliente pediu que **toda troca de página**
 * pintasse esqueleto: 15 telas ainda escreviam "Carregando…" em texto, e
 * desenhar 15 esqueletos à mão repetiria a mesma grade 15 vezes (e violaria
 * §10.1 — nada de forma desenhada na tela). Cada tela compõe com estes,
 * escolhendo a forma que espelha o SEU conteúdo:
 *
 *  · `KitSkeletonTiles`  — a fileira de KPIs do topo;
 *  · `KitSkeletonTable`  — cabeçalho + linhas da tabela;
 *  · `KitSkeletonCards`  — blocos/seções empilhados (Configurações, Admin, RAG).
 *
 * A regra continua sendo a de sempre (CLAUDE §10.3): o esqueleto ESPELHA a
 * forma do conteúdo real. Um retângulo genérico no meio da tela não é
 * esqueleto, é outro jeito de escrever "Carregando".
 */

/** Fileira de KPIs — mesma grade do `KitTileGrid` que a tela usa de verdade. */
export function KitSkeletonTiles({ count = 4, cols = 4 }: { count?: number; cols?: 2 | 3 | 4 }) {
  return (
    <KitTileGrid cols={cols}>
      {Array.from({ length: count }, (_, i) => (
        <KitCard key={i} padding="md">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <KitSkeleton height={34} style={{ width: '40%' }} />
            <KitSkeleton height={16} style={{ width: '70%' }} />
            <KitSkeleton height={12} style={{ width: '85%' }} />
          </div>
        </KitCard>
      ))}
    </KitTileGrid>
  );
}

/** Tabela — a barra de filtro, o cabeçalho e N linhas. */
export function KitSkeletonTable({ rows = 6, toolbar = true }: { rows?: number; toolbar?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {toolbar && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <KitSkeleton height={40} style={{ flex: 1, maxWidth: 400 }} />
          <KitSkeleton height={40} style={{ width: 170 }} />
          <KitSkeleton height={40} style={{ width: 140 }} />
        </div>
      )}
      <KitCard padding="none">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-table)', background: 'var(--surface-2)' }}>
            <KitSkeleton height={14} style={{ width: '30%' }} />
          </div>
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: 'var(--space-4)', alignItems: 'center',
                padding: 'var(--space-4)',
                borderBottom: i === rows - 1 ? 'none' : '1px solid var(--border-table)',
              }}
            >
              <KitSkeleton height={14} style={{ flex: 2 }} />
              <KitSkeleton height={22} style={{ width: 96, borderRadius: 'var(--radius-pill)' }} />
              <KitSkeleton height={14} style={{ flex: 1 }} />
              <KitSkeleton height={14} style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      </KitCard>
    </div>
  );
}

/** Blocos empilhados — telas de seções (Configurações, Governança, RAG…). */
export function KitSkeletonCards({ count = 3, lines = 4 }: { count?: number; lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {Array.from({ length: count }, (_, c) => (
        <KitCard key={c} padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <KitSkeleton height={20} style={{ width: 200 }} />
            {Array.from({ length: lines }, (_, i) => (
              <KitSkeleton key={i} height={14} style={i === lines - 1 ? { width: '70%' } : undefined} />
            ))}
          </div>
        </KitCard>
      ))}
    </div>
  );
}

/**
 * O ESQUELETO PADRÃO DE PÁGINA — user, 2026-09-04: *"padronize os esqueletos,
 * eles estão diferentes em cada página"*.
 *
 * Desde que o esqueleto virou marcador de TRANSIÇÃO (janela de 400ms a cada
 * troca de rota), ele deixou de ser o retrato daquela tela: uma forma diferente
 * por página fazia a navegação piscar coisas diferentes a cada clique, que é
 * justamente o oposto de "ressaltar a troca". Uma forma só, igual em toda
 * página, lê como o app trocando de tela.
 *
 * Composto dos mesmos primitivos: a fileira de blocos do topo + o bloco de
 * conteúdo. Toda tela do Desk e do Core usa ISTO — não desenhe outro.
 */
export function KitPageSkeleton() {
  return (
    <>
      <KitSkeletonTiles count={4} />
      <KitSkeletonTable rows={6} />
    </>
  );
}
