import { useProfile } from '../profile/store';
import { useMyAssets } from '../assets/mine';
import { useDeliveryAddress } from '../profile/delivery';
// A COMPOSIÇÃO vive fora daqui desde 15/09: o chat da bela responde a mesma
// pendência e precisa dar a MESMA resposta (dono: "o chat deve conversar com os
// demais widgets"). Este hook ficou com o que é de tela — buscar o dado.
import { componhaRespostaPronta, oQuePergunta } from '@bela/types/resposta-pronta.mjs';

/**
 * Resposta PRONTA para a pendência de um chamado "Necessita sua resposta" —
 * camada BELA simulada no front (mesma doutrina do belaSummary, CLAUDE §2).
 *
 * Regra do dono (2026-08-23): ação rápida da bela tem de RESOLVER, não
 * orientar — "responder" que só abre um lugar para digitar não agrega nada.
 * A bela lê a pergunta REAL do time (pendingNote, que vem da conversa) e,
 * quando ela pede um dado que a bela JÁ TEM — identidade da sessão, ativos do
 * usuário no CMDB, endereço cadastrado — devolve a mensagem composta: um toque
 * grava no ticket (replyToTicket) e o atendimento retoma. Pergunta fora dos
 * padrões → null, e o card oferece responder pelo chat (coleta guiada).
 */
export interface SmartReply {
  /** Rótulo do botão — diz O QUE a bela vai responder ("Responder com …"). */
  label: string;
  /** A mensagem pronta que será gravada no chamado. */
  message: string;
}

/** O mínimo que a resposta pronta precisa do chamado — aceita tanto o `Ticket`
 *  da visão pessoal (3.a) quanto um recorte do `TicketDetailDTO` (4.a, desde
 *  2026-08-24: a MESMA pendência ganha a MESMA resposta nas duas telas, §7). */
export interface SmartReplyTicket {
  statusRaw: string;
  pendingNote?: string | null;
}

export function useSmartReply(ticket: SmartReplyTicket | null | undefined, enabled = true): SmartReply | null {
  const { email, persona } = useProfile();
  const wants = enabled && !!ticket && ticket.statusRaw === 'waiting_requester' && !!ticket.pendingNote;
  const pergunta = wants ? (ticket.pendingNote ?? '') : '';
  // O QUE a pergunta pede decide qual dado buscar — a tela não chama hook de
  // ativo à toa. A leitura é a compartilhada, não uma cópia dos regexes.
  const pede = oQuePergunta(pergunta);

  // Hooks SEMPRE chamados (ordem estável); só buscam quando a pergunta pede.
  const { assets } = useMyAssets(wants && pede.ativo);
  const { address } = useDeliveryAddress(wants && pede.endereco);

  if (!wants) return null;

  // A COMPOSIÇÃO é a compartilhada. Os rótulos continuam SINTÉTICOS — verbo +
  // dado, nunca um pedaço do que vai ser enviado (user, 2026-08-27: "a pílula
  // não faz sentido porque é só um fragmento da resposta"); o texto completo já
  // está à vista, logo acima do botão.
  return componhaRespostaPronta({
    pergunta,
    identidade: { nome: persona.name, email },
    ativos: assets,
    endereco: address,
  });
}
