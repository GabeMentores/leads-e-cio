import { useMemo, useState } from 'react';

export type RowSelection = ReturnType<typeof useRowSelection>;

/** Reusable table row-selection state (select one / select all / clear). */
export function useRowSelection(ids: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return useMemo(() => {
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    return {
      selected,
      count: selected.size,
      allSelected,
      isSelected: (id: string) => selected.has(id),
      toggle: (id: string) =>
        setSelected((s) => {
          const next = new Set(s);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      toggleAll: () => setSelected(allSelected ? new Set() : new Set(ids)),
      /** Seleção programática (ex.: card BELA seleciona as linhas de baixo
       *  risco e o humano CONFIRMA no verbo da toolbar — §7, decisão humana). */
      selectMany: (list: string[]) => setSelected(new Set(list)),
      clear: () => setSelected(new Set()),
    };
  }, [ids, selected]);
}
