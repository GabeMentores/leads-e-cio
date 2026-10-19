import { useCallback, useEffect, useState } from 'react';
import { getActiveProfile } from '../profile/store';

/**
 * Visões salvas de tabela (Caderno §4.2 "salvar visão"; §4.5 padrão de TABELA).
 *
 * GENÉRICO POR TELA: o hook recebe a chave da tela e o formato do filtro é da
 * tela — assim Lista de tickets, Assets e qualquer tabela futura usam o mesmo
 * store sem variante própria.
 *
 * NO BANCO, não em localStorage (decisão 2026-09-10): no evento os PCs são
 * thin clients e a persona troca de máquina; visão em localStorage sumiria
 * exatamente na demonstração multiusuário. Ver `apps/server/src/routes/
 * saved-views.ts`.
 */

export interface SavedView<F = Record<string, unknown>> {
  id: string;
  screen: string;
  name: string;
  filters: F;
  updatedAt: string;
}

function headers(json = false): Record<string, string> {
  return { ...(json ? { 'Content-Type': 'application/json' } : {}), 'X-Persona': getActiveProfile().email };
}

/** Mensagem do backend quando houver; senão uma frase genérica. */
async function errorOf(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body?.message || fallback;
  } catch {
    return fallback;
  }
}

export interface UseSavedViews<F> {
  views: SavedView<F>[];
  loading: boolean;
  /** Salva (ou sobrescreve pelo nome) e devolve a visão gravada. */
  save: (name: string, filters: F) => Promise<SavedView<F>>;
  remove: (id: string) => Promise<void>;
  /** Última falha de escrita, para a tela mostrar num toast. */
  error: string | null;
}

/**
 * As visões da persona ativa para uma tela.
 *
 * Recarrega quando a persona muda: o switcher troca a identidade sem remontar
 * a tela, e sem isso o analista veria as visões de quem estava logado antes.
 */
export function useSavedViews<F = Record<string, unknown>>(screen: string): UseSavedViews<F> {
  const [views, setViews] = useState<SavedView<F>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const persona = getActiveProfile().email;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/views?screen=${encodeURIComponent(screen)}`, { headers: headers() })
      .then((res) => (res.ok ? (res.json() as Promise<SavedView<F>[]>) : []))
      .then((rows) => {
        if (alive) setViews(rows);
      })
      // Falha de rede não derruba a tabela: a tela funciona sem visão salva.
      .catch(() => {
        if (alive) setViews([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [screen, persona]);

  const save = useCallback(
    async (name: string, filters: F) => {
      setError(null);
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ screen, name, filters }),
      });
      if (!res.ok) {
        const msg = await errorOf(res, 'Não consegui salvar a visão.');
        setError(msg);
        throw new Error(msg);
      }
      const saved = (await res.json()) as SavedView<F>;
      setViews((prev) => {
        const rest = prev.filter((v) => v.id !== saved.id);
        return [...rest, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      });
      return saved;
    },
    [screen],
  );

  const remove = useCallback(async (id: string) => {
    setError(null);
    const res = await fetch(`/api/views/${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() });
    if (!res.ok) {
      const msg = await errorOf(res, 'Não consegui apagar a visão.');
      setError(msg);
      throw new Error(msg);
    }
    setViews((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return { views, loading, save, remove, error };
}
