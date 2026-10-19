import * as React from 'react';
import { useLiveEvents } from '../live/client';
import { getActiveProfile } from '../profile/store';

/**
 * Single source of truth for whether the BELA module is active on a screen
 * (CLAUDE.md §7: "Um único interruptor deve controlar todos os widgets BELA de
 * uma mesma tela simultaneamente"). Every BELA widget reads `enabled` from here
 * so they can never drift out of sync. When false, the ITSM-native baseline of
 * the screen must remain fully functional.
 *
 * UM NÍVEL SÓ (decisão do user, 2026-08-24 — revoga os "dois níveis" de
 * 2026-08-10): o interruptor é o do TENANT (`belaIntegrationEnabled` no banco,
 * `GET /api/deskone/bela`). O switch do menu ⚙ e o toggle das Configurações
 * executam a MESMA função (`setEnabled` → PATCH /api/deskone/config); desligar
 * derruba a camada bela em TODOS os clientes ao vivo (SSE `config.changed`).
 * O nível "dispositivo" (por navegador) deixou de existir. Só o Admin Bela
 * Desk vê os interruptores (o backend recusa o resto — 403).
 * O Console BELA não passa `tenantGoverned` — lá a bela nunca desliga (é o
 * app DELA) e `setEnabled` é inócuo.
 */
interface BelaContextValue {
  /** O interruptor do TENANT — é o que todo widget de página consome. */
  enabled: boolean;
  /** Tenant E a feature flag `bela_side_panel`. Hoje quem lê isto é só a PORTA
   *  do assistente no topbar ("Perguntar à bela"). Recorte mínimo por decisão
   *  do dono (16/09): enquanto "painel lateral" não estiver definido — é o
   *  drawer? a coluna de widgets? os dois? —, desligar a flag tira a porta e
   *  não mexe no conteúdo das páginas. Alargar depois é trocar quem lê isto. */
  assistenteDisponivel: boolean;
  /** Liga/desliga o TENANT (PATCH; só Admin — a MESMA função nas duas portas:
   *  menu ⚙ e Configurações). Falhou → re-sincroniza do banco. */
  setEnabled: (v: boolean) => void;
  /** Re-consulta o bit do tenant e a flag do painel. Existe para quem muda a
   *  governança por OUTRA porta que não o `setEnabled` — hoje, a tela de
   *  Configurações ao trocar a feature flag: o canal ao vivo descarta o eco do
   *  próprio autor, então sem isto só quem clicou não veria o efeito. */
  refresh: () => void;
}

const BelaContext = React.createContext<BelaContextValue>({
  enabled: true,
  assistenteDisponivel: true,
  setEnabled: () => {},
  refresh: () => {},
});

export function BelaProvider({ children, tenantGoverned = false }: {
  children: React.ReactNode;
  /** DeskOne passa true: o nível tenant passa a valer (fetch + SSE + PATCH). */
  tenantGoverned?: boolean;
}) {
  const [tenant, setTenant] = React.useState(true);
  /* Feature flag `bela_side_panel`. Chega junto com o bit do tenant, no
     mesmo GET e no mesmo `config.changed` — um sinal só de rede para duas
     governanças. Default true: flag ausente não pode apagar o painel. */
  const [painel, setPainel] = React.useState(true);

  const refreshTenant = React.useCallback(() => {
    if (!tenantGoverned) return;
    fetch('/api/deskone/bela')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { enabled?: boolean; sidePanel?: boolean } | null) => {
        if (j && typeof j.enabled === 'boolean') setTenant(j.enabled);
        if (j && typeof j.sidePanel === 'boolean') setPainel(j.sidePanel);
      })
      .catch(() => {
        /* API fora → mantém o último valor (default true; a demo não trava) */
      });
  }, [tenantGoverned]);

  React.useEffect(() => {
    refreshTenant();
  }, [refreshTenant]);

  // Admin desligou (aqui ou noutro PC) → todos os clientes re-consultam e a
  // camada BELA some ao vivo, sem F5 (inclusive no PC de quem só assiste).
  useLiveEvents(
    (e) => {
      if (e.type === 'config.changed') refreshTenant();
    },
    tenantGoverned,
  );

  // A MESMA função nas duas portas (menu ⚙ e Configurações): PATCH do tenant.
  // Sucesso → aplica local na hora (o SSE ignora o eco do próprio autor);
  // falha (403/rede) → re-sincroniza e o switch volta ao estado real.
  const setEnabled = React.useCallback(
    (next: boolean) => {
      if (!tenantGoverned) return;
      fetch('/api/deskone/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Persona': getActiveProfile().email },
        body: JSON.stringify({ belaIntegrationEnabled: next }),
      })
        .then((r) => {
          if (r.ok) setTenant(next);
          else refreshTenant();
        })
        .catch(() => refreshTenant());
    },
    [tenantGoverned, refreshTenant],
  );

  const value = React.useMemo(
    () => ({ enabled: tenant, assistenteDisponivel: tenant && painel, setEnabled, refresh: refreshTenant }),
    [tenant, painel, setEnabled, refreshTenant],
  );
  return <BelaContext.Provider value={value}>{children}</BelaContext.Provider>;
}

export function useBela(): BelaContextValue {
  return React.useContext(BelaContext);
}
