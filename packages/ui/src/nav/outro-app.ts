import * as React from 'react';

/**
 * CAMINHO ENTRE OS DOIS APPS (user, 2026-09-04, pedido do cliente para o
 * evento): do bela desk se chega ao bela core e vice-versa, pelo menu ⚙.
 *
 * É PROVISÓRIO e existe por causa da demonstração — os dois são produtos
 * separados, com logins separados (CLAUDE §1), e num cliente real ninguém
 * navega de um para o outro por um item de menu.
 *
 * O endereço muda conforme onde roda, e em UM dos ambientes o outro app
 * simplesmente NÃO EXISTE. Por isso a resolução devolve `null` quando não
 * alcança, e o menu esconde o item — um caminho que dá em 404 na frente do
 * cliente é pior do que não ter caminho nenhum (user, 2026-09-04: "na nuvem
 * não é necessário").
 *
 *  1. **Variável de build** (`VITE_CORE_URL` / `VITE_DESK_URL`) — se alguém um
 *     dia quiser ligar dois domínios, é só definir.
 *  2. **Nuvem de teste** — par de domínios conhecido (mapa `NUVEM` abaixo).
 *  3. **Porta de dev** — 5190 (desk) e 5192 (core) na mesma máquina.
 *  4. **Mesma origem (modo EVENTO)** — o `subir-servidor.cmd` serve os DOIS do
 *     mesmo servidor, com o core buildado em `base: '/console/'` (ver
 *     apps/console-bela/vite.config.ts). Sem configuração nenhuma.
 *  5. **Nada disso** → `null`, e o item some do menu.
 */
export type AppAtual = 'desk' | 'core';

const PORTA = { desk: '5190', core: '5192' } as const;
/** Prefixo sob o qual o core é servido quando os dois dividem um servidor. */
const SOB_CONSOLE = '/console/';

/**
 * NUVEM DE TESTE — os dois links são fixos e conhecidos (user, 2026-09-04), então
 * o par vive aqui em vez de exigir `VITE_*_URL` no painel do Render: config que
 * mora só no painel some na primeira vez que alguém recria o serviço.
 * A variável de build continua tendo precedência, para qualquer outro deploy.
 */
const NUVEM: Record<string, string> = {
  'bela-demo.onrender.com': 'https://bela-core-demo.onrender.com',
  'bela-core-demo.onrender.com': 'https://bela-demo.onrender.com',
};

function envUrl(chave: string): string | undefined {
  try {
    // `import.meta.env` só existe sob o Vite; o try cobre teste/SSR.
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    const v = env?.[chave];
    return v && v.trim() ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** O que dá para decidir NA HORA, sem ir à rede. */
function resolveDireto(atual: AppAtual): string | null {
  const explicito = envUrl(atual === 'desk' ? 'VITE_CORE_URL' : 'VITE_DESK_URL');
  if (explicito) return explicito;
  if (typeof window === 'undefined') return null;

  const { protocol, hostname, port, pathname } = window.location;

  // 2 · nuvem de teste: par conhecido, um domínio para cada app.
  const naNuvem = NUVEM[hostname];
  if (naNuvem) return naNuvem;

  // 3 · dev: dois servidores na mesma máquina.
  if (port === PORTA[atual]) {
    const outra = atual === 'desk' ? PORTA.core : PORTA.desk;
    return `${protocol}//${hostname}:${outra}/`;
  }

  // 4 · o CORE sabe sozinho: se ele está sob /console/, divide servidor com o
  //     desk, que então está na raiz. Na nuvem ele mora na raiz e isto é falso.
  if (atual === 'core') return pathname.startsWith(SOB_CONSOLE) ? '/' : null;

  return null; // o desk precisa perguntar — ver o hook.
}

/**
 * Endereço do outro app, ou `null` se ele não estiver ao alcance.
 *
 * O DESK não tem como saber sozinho: ele fica na raiz tanto no evento quanto na
 * nuvem. A única diferença é se `/console/` responde — então ele pergunta, uma
 * vez, com um HEAD de mesma origem (barato, sem CORS, e o resultado não muda
 * durante a sessão).
 */
export function useOutroApp(atual: AppAtual): string | null {
  const [url, setUrl] = React.useState<string | null>(() => resolveDireto(atual));

  React.useEffect(() => {
    if (url !== null || atual !== 'desk' || typeof window === 'undefined') return;
    let vivo = true;
    fetch(SOB_CONSOLE, { method: 'HEAD' })
      .then((r) => {
        if (vivo && r.ok) setUrl(SOB_CONSOLE);
      })
      .catch(() => {
        /* sem console servido aqui — o item continua escondido */
      });
    return () => {
      vivo = false;
    };
  }, [atual, url]);

  return url;
}

/** Rótulo do item de menu — os nomes seguem o lockup (minúscula, 2026-08-27). */
export function outroAppLabel(atual: AppAtual): string {
  return atual === 'desk' ? 'Abrir o bela core' : 'Abrir o bela desk';
}
