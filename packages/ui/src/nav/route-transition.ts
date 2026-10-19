import { useSyncExternalStore } from 'react';

/**
 * JANELA ARTIFICIAL DE TROCA DE PÁGINA (user, 2026-09-04).
 *
 * O cliente não se satisfez com o esqueleto que só aparecia quando o dado
 * demorava: *"toda troca de página tem que ter um período artificial de
 * carregamento com skeleton, que ressalte a impressão de troca — não precisa
 * ser longo, só marcado"*.
 *
 * É o MESMO mecanismo da troca de perfil (`isProfileSwitching`, 2026-09-03),
 * agora disparado pela rota: ao mudar de página abre-se uma janela de
 * `TROCA_ROTA_MS` em que o `useSkeletonGate` devolve `true` mesmo que o dado
 * já esteja em cache. Com isso a tela nova NASCE em esqueleto e a transição
 * ganha corpo, em vez de trocar o conteúdo num quadro.
 *
 * ⚠️ Só conta troca de PÁGINA. `#/lista-tickets?code=%230512` e
 * `#/base-conhecimento?id=3` mudam o hash sem mudar de tela — são deep links
 * que abrem drawer/artigo DENTRO da página, e piscar esqueleto neles leria
 * como defeito. Por isso a comparação ignora o que vem depois do `?`.
 */
const TROCA_ROTA_MS = 400;

function pagina(hash: string): string {
  return hash.split('?')[0];
}

let rotaAtual = typeof window !== 'undefined' ? pagina(window.location.hash) : '';
let trocandoAte = 0;
let versao = 0;
const ouvintes = new Set<() => void>();

function emit() {
  versao += 1;
  ouvintes.forEach((f) => f());
}

/** Abre a janela. Exportado porque a navegação por código (`location.hash = …`)
 *  dispara `hashchange` de forma assíncrona — quem quiser o esqueleto no MESMO
 *  quadro do clique chama isto antes. */
export function marcarTrocaDeRota(): void {
  trocandoAte = Date.now() + TROCA_ROTA_MS;
  if (typeof window !== 'undefined') window.setTimeout(emit, TROCA_ROTA_MS);
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const nova = pagina(window.location.hash);
    if (nova === rotaAtual) return; // só mudou a query (drawer, artigo)
    rotaAtual = nova;
    marcarTrocaDeRota();
  });
}

function subscribe(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
function getVersion(): number {
  return versao;
}

/** Está trocando de página AGORA? Leitura fora de componente. */
export function isRouteSwitching(): boolean {
  return Date.now() < trocandoAte;
}

/** O `useSkeletonGate` lê isto para pintar o esqueleto na troca de página. */
export function useRouteSwitching(): boolean {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return isRouteSwitching();
}
