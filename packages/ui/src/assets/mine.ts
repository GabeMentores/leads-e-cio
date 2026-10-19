import { useEffect, useState } from 'react';
import { getActiveProfile } from '../profile/store';

/**
 * Ativos do usuário logado (join real usuário↔ativo, `GET /api/assets?owner=me`)
 * — alimenta o campo "Ativo relacionado" da Nova Solicitação, que antes era uma
 * lista mockada no front. ITSM nativo (existe sem a BELA): a BELA só decide QUAL
 * dos ativos reais sugerir, nunca inventa a lista.
 *
 * `extraCode` cobre o fluxo "Abrir chamado para este ativo" (tela Assets): o
 * ativo apontado pode não pertencer ao usuário logado — é buscado por code em
 * `GET /api/assets/:id` e entra no topo da lista.
 */
export interface MyAssetRef {
  id: string;
  code: string;
  model: string | null;
  category: string;
}

interface AssetListDTO {
  items: MyAssetRef[];
}

export interface MyAssetsState {
  assets: MyAssetRef[];
  loading: boolean;
  loaded: boolean;
}

export function useMyAssets(enabled: boolean, extraCode?: string | null): MyAssetsState {
  const persona = getActiveProfile().email;
  const [state, setState] = useState<MyAssetsState>({ assets: [], loading: false, loaded: false });

  useEffect(() => {
    if (!enabled) {
      setState({ assets: [], loading: false, loaded: false });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    const headers = { 'X-Persona': persona };
    const mine = fetch('/api/assets?owner=me&pageSize=100', { headers })
      .then((r) => (r.ok ? (r.json() as Promise<AssetListDTO>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => d.items)
      .catch(() => [] as MyAssetRef[]);
    const extra: Promise<MyAssetRef | null> = extraCode
      ? fetch(`/api/assets/${encodeURIComponent(extraCode)}`, { headers })
          .then((r) => (r.ok ? (r.json() as Promise<MyAssetRef>) : null))
          .catch(() => null)
      : Promise.resolve(null);
    void Promise.all([mine, extra]).then(([items, found]) => {
      if (!alive) return;
      const merged = found && !items.some((a) => a.code === found.code)
        ? [{ id: found.id, code: found.code, model: found.model, category: found.category }, ...items]
        : items;
      setState({ assets: merged, loading: false, loaded: true });
    });
    return () => {
      alive = false;
    };
  }, [enabled, extraCode, persona]);

  return state;
}
