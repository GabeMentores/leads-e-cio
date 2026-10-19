export interface RespostaPronta {
  /** Rótulo da ação — diz O QUE a bela vai responder. */
  label: string;
  /** A mensagem que será gravada no chamado. */
  message: string;
}

export interface PedidoDaPergunta {
  identidade: boolean;
  ativo: boolean;
  endereco: boolean;
}

export function oQuePergunta(pergunta: string | null | undefined): PedidoDaPergunta;

export function componhaRespostaPronta(dados: {
  pergunta?: string | null;
  identidade?: { nome?: string; email?: string } | null;
  ativos?: Array<{ code: string; model?: string | null; category?: string | null }> | null;
  endereco?: string | null;
}): RespostaPronta | null;
