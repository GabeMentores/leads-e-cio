import { useEffect, useState, useSyncExternalStore } from 'react';
import { getActiveProfile, subscribeProfile } from './store';

/**
 * Endereço de ENTREGA + cidade da persona logada (`GET /api/personas/me`) — o
 * dado real do banco (colunas address* do User, decisão 2026-08-19), formatado
 * pelo backend. `address` alimenta o "Entrega em …" que a bela compõe; `city`
 * (2026-08-24) alimenta a "Localidade" da Nova Solicitação — identidade de
 * sessão, ITSM-nativa (antes um literal 'São Paulo' hardcoded). Reage à troca
 * de persona; `enabled=false` não busca.
 */
export function useDeliveryAddress(enabled = true): { address: string | null; city: string | null; loaded: boolean } {
  const email = useSyncExternalStore(subscribeProfile, () => getActiveProfile().email, () => getActiveProfile().email);
  const [state, setState] = useState<{ address: string | null; city: string | null; loaded: boolean }>({ address: null, city: null, loaded: false });

  useEffect(() => {
    if (!enabled) {
      setState({ address: null, city: null, loaded: false });
      return;
    }
    let alive = true;
    fetch('/api/personas/me', { headers: { 'X-Persona': email } })
      .then((r) => (r.ok ? r.json() : null))
      .then((dto: { deliveryAddress?: string | null; city?: string | null } | null) => {
        if (alive) setState({ address: dto?.deliveryAddress ?? null, city: dto?.city ?? null, loaded: true });
      })
      .catch(() => {
        if (alive) setState({ address: null, city: null, loaded: true });
      });
    return () => {
      alive = false;
    };
  }, [enabled, email]);

  return state;
}
