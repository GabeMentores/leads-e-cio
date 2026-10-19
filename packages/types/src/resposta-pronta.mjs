/**
 * RESPOSTA PRONTA para a pendência de um chamado — a composição, pura.
 *
 * FONTE ÚNICA de propósito (dono, 15/09: "o chat deve conversar com os demais
 * widgets"). Até aqui a PÁGINA do chamado compunha a resposta inteira quando a
 * pergunta pedia um dado que a bela já tem, e o CHAT publicava literal o que a
 * pessoa escrevesse — a mesma pendência com duas respostas diferentes, o que
 * CLAUDE.md §7 proíbe em letra ("as duas instâncias nunca podem divergir") e o
 * próprio smart-reply já prometia ("a MESMA pendência ganha a MESMA resposta
 * nas duas telas").
 *
 * É `.mjs` porque os dois consumidores não compartilham cadeia de build: o
 * motor roda em Node cru (os corpora chamam `node` direto, sem TypeScript) e as
 * telas rodam no Vite. Mesmo caminho que o corpus da base de conhecimento já
 * usa, que o motor importa do pacote como JSON.
 *
 * Puro: recebe a pergunta e o que se sabe da pessoa, devolve a mensagem. Quem
 * BUSCA o dado é o chamador — o motor pelo host, a tela pelos hooks.
 */

const semAcento = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** O que a pergunta do analista está pedindo. Exportado para o chamador poder
 *  buscar só o dado necessário (a tela não chama hook de ativo à toa). */
export function oQuePergunta(pergunta) {
  const q = semAcento(pergunta);
  return {
    identidade: /(usuario|credencia|login|conta de rede|e-?mail|matricula)/.test(q),
    ativo: /(patrimonio|equipament|notebook|computador|numero de serie|serie do|modelo)/.test(q),
    endereco: /(endereco|entrega|cep)/.test(q),
  };
}

/**
 * Compõe a resposta, ou devolve `null` quando a pergunta foge dos padrões — e
 * aí quem responde é a pessoa, com as palavras dela.
 *
 * @param {{
 *   pergunta?: string | null,
 *   identidade?: { nome?: string, email?: string } | null,
 *   ativos?: Array<{ code: string, model?: string | null, category?: string | null }> | null,
 *   endereco?: string | null,
 * }} dados
 * @returns {{ label: string, message: string } | null}
 */
export function componhaRespostaPronta({ pergunta, identidade, ativos, endereco } = {}) {
  if (!pergunta) return null;
  const pede = oQuePergunta(pergunta);

  if (pede.identidade && identidade?.email) {
    const usuario = String(identidade.email).split('@')[0];
    return {
      label: 'Confirmar dados',
      message:
        `Confirmo meus dados: usuário de rede ${usuario}, e-mail ${identidade.email}` +
        (identidade.nome ? `, em nome de ${identidade.nome}` : '') + '.',
    };
  }
  if (pede.ativo && ativos && ativos.length > 0) {
    const a = ativos.find((x) => x.category === 'Computadores') ?? ativos[0];
    return {
      label: 'Enviar dados do equipamento',
      message: `O equipamento em questão é o ${a.model ?? a.category} (patrimônio ${a.code}).`,
    };
  }
  if (pede.endereco && endereco) {
    return { label: 'Enviar endereço', message: `O endereço para entrega é: ${endereco}.` };
  }
  return null;
}
