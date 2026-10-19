import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * Tabela de dados do DS (era Tailwind — Lista de Tickets, Aprovações, Assets).
 * Decisão 2026-08-19:
 *  • o CONTÊINER tem preenchimento próprio (`bg-surface-1`) — as linhas nunca
 *    mostram o fundo da página (antes o wrapper era transparente);
 *  • cabeçalho ORDENÁVEL: 1º clique ordena pelo sentido "mais relevante
 *    primeiro" definido pelo comparator da coluna (ex.: Prazo = mais crítico →
 *    menos crítico), 2º clique inverte, com indicador visível e `aria-sort`.
 *
 * O comparator de cada coluna DEFINE a ordem do primeiro clique — quem escreve
 * a tabela decide o que é "mais relevante" (numérico desc, alfabético asc…).
 * Passe `comparators` estável (module-level ou useMemo).
 */

export type TableComparators<T, K extends string = string> = Record<K, (a: T, b: T) => number>;

export interface TableSort<K extends string = string> {
  /** Coluna ativa (null = ordem natural dos dados, ex. openedAt desc da API). */
  sortKey: K | null;
  /** true = segundo clique (ordem do comparator invertida). */
  inverted: boolean;
  toggle: (key: K) => void;
}

export function useTableSort<T, K extends string>(
  rows: T[],
  comparators: TableComparators<T, K>,
): TableSort<K> & { sorted: T[] } {
  // Estado ÚNICO (chave+direção): setState aninhado dentro de updater não é
  // puro — o double-invoke do StrictMode anulava a inversão do 2º clique.
  const [state, setState] = React.useState<{ key: K | null; inverted: boolean }>({ key: null, inverted: false });
  const toggle = React.useCallback((key: K) => {
    setState((s) => (s.key === key ? { key, inverted: !s.inverted } : { key, inverted: false }));
  }, []);
  const sorted = React.useMemo(() => {
    if (!state.key) return rows;
    const arr = [...rows].sort(comparators[state.key]);
    if (state.inverted) arr.reverse();
    return arr;
  }, [rows, comparators, state]);
  return { sorted, sortKey: state.key, inverted: state.inverted, toggle };
}

/**
 * Contêiner + <table> com o preenchimento do DS.
 *
 * Decisão 2026-08-26 (user): a tabela tem ALTURA MÁXIMA e rola sobre si mesma,
 * com o cabeçalho fixo. Antes a lista empurrava a página inteira — filtros,
 * KPIs e o widget da bela saíam de vista e, rolando, o analista perdia o nome
 * das colunas. Agora o miolo rola dentro do próprio quadro: o contexto da tela
 * fica parado e o cabeçalho acompanha (o `sticky` mora no SortableTh).
 */
export function DataTable({
  minWidth,
  maxHeight = 600,
  children,
  'aria-label': ariaLabel,
}: {
  minWidth?: number;
  /** Altura máxima do quadro rolável. 600 = padrão do DS. */
  maxHeight?: number;
  children: React.ReactNode;
  'aria-label'?: string;
}) {
  return (
    <div
      className="overflow-auto rounded-[var(--radius-card)] border border-border-table bg-surface-1"
      style={{ maxHeight }}
    >
      <table aria-label={ariaLabel} className="w-full text-[length:var(--body-sm-size)]" style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

/** Célula de cabeçalho ORDENÁVEL. Sem `onToggle`, é um th estático. */
export function SortableTh<K extends string>({
  children,
  className,
  colKey,
  sort,
}: {
  children?: React.ReactNode;
  className?: string;
  /** Chave da coluna nos comparators; omitida = coluna não ordenável. */
  colKey?: K;
  sort?: TableSort<K>;
}) {
  const sortable = !!colKey && !!sort;
  const active = sortable && sort!.sortKey === colKey;
  return (
    <th
      aria-sort={active ? (sort!.inverted ? 'ascending' : 'descending') : undefined}
      className={`font-[var(--weight-semibold)] ${className ?? ''}`}
      style={{
        padding: 'var(--space-cell-y) var(--space-cell-x)',
        // Cabeçalho fixo: o th é o elemento grudado (um <tr> sticky não segura
        // em todos os navegadores). `inherit` puxa o fundo do próprio <tr>
        // (bg-surface-2) — sem repetir token e sem deixar linha transparecer.
        position: 'sticky',
        top: 0,
        zIndex: 1,
        background: 'inherit',
        // A borda do <tr> some sob `border-collapse` quando o th gruda; a
        // sombra interna redesenha o mesmo traço, que então acompanha a rolagem.
        boxShadow: 'inset 0 -1px 0 var(--c-border-table)',
      }}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => sort!.toggle(colKey!)}
          className="inline-flex items-center gap-[var(--space-3xs)] font-[var(--weight-semibold)] hover:text-text-primary"
          title="Ordenar por esta coluna"
        >
          {children}
          {active ? (
            sort!.inverted ? (
              <ChevronUp size={13} aria-hidden="true" />
            ) : (
              <ChevronDown size={13} aria-hidden="true" />
            )
          ) : (
            <ChevronsUpDown size={13} className="opacity-40" aria-hidden="true" />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

/** Célula padrão (padding do DS). */
export function DataTd({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={className} style={{ padding: 'var(--space-cell-y) var(--space-cell-x)' }}>
      {children}
    </td>
  );
}
