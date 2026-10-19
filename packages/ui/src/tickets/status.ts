/**
 * Vocabulário e cor dos STATUS de chamado — fonte única das duas superfícies
 * (decisões do user, 2026-08-23).
 *
 * USUÁRIO FINAL (3.a, 4.a): vocabulário SIMPLIFICADO em 6 rótulos, na
 * perspectiva de quem pediu — "Aguardando atendimento" cobre triado E em
 * atendimento (para o solicitante é tudo "está com o time"), "Necessita sua
 * resposta" é a única que pede ação dele, e resolvido/encerrado viram um só
 * "Encerrado" (a nuance "confirme a resolução" vive no card da bela, não no
 * chip). OPERAÇÃO (3.b, 4.b) mantém os 8 rótulos do servidor (statusLabel) —
 * o analista PRECISA distinguir triado de em-atendimento — e só ganha a cor.
 *
 * Cor por FAMÍLIA semântica, nunca uma matiz por status: azul = em movimento
 * com o time · âmbar = parado esperando uma pessoa · verde = desfecho bom ·
 * vermelho = reincidência · neutro nas pontas. Preenchido = leitura viva;
 * contorno = a versão quieta da mesma família. Roxo NUNCA (significante da
 * bela). O chip de status NÃO leva ponto — o ponto é do chip de SLA/prazo: é a
 * forma que separa as duas dimensões mesmo repetindo família.
 *
 * `USER_TICKET_STATUS_LABELS` espelha o mapa homônimo de @bela/types (o host
 * do chat usa lá) — este pacote evita a dependência de propósito.
 */

/** Os 8 estados crus do workflow ITSM (como o servidor envia em `status`). */
export type RawTicketStatus =
  | 'open' | 'triaged' | 'in_progress' | 'waiting_requester'
  | 'waiting_approval' | 'resolved' | 'closed' | 'reopened';

/** Tons disponíveis nos DOIS sistemas de badge (KitBadge tone / Badge variant). */
export type TicketStatusTone =
  | 'neutral' | 'info' | 'infoOutline' | 'warning' | 'warningOutline'
  | 'neutralOutline' | 'success' | 'danger';

/** Rótulos do USUÁRIO FINAL (6). */
export const USER_TICKET_STATUS_LABELS: Record<RawTicketStatus, string> = {
  open: 'aberto',
  triaged: 'aguardando atendimento',
  in_progress: 'aguardando atendimento',
  waiting_requester: 'necessita sua resposta',
  waiting_approval: 'aguardando aprovação',
  // RESOLVIDO ≠ ENCERRADO desde 2026-08-28. Os dois eram "encerrado" porque,
  // para o usuário final, davam no mesmo. Não dão mais: resolvido PEDE AÇÃO
  // dele (avaliar — que encerra — ou reabrir) e encerrado não pede nada. Com o
  // rótulo colapsado, o card dizia "encerrado" no chip e "confirme se está tudo
  // certo" logo abaixo — dois recados opostos no mesmo cartão.
  resolved: 'resolvido',
  closed: 'encerrado',
  reopened: 'reaberto',
};

/** Tons do chip nas telas do USUÁRIO FINAL — o sistema é POR QUEM AGE
 *  (decisão do user, 2026-08-23): tudo em que ele SÓ ESPERA fica quieto
 *  (azul contorno, inclusive aprovação — o rótulo diz quem segura, a cor diz
 *  "não é com você"); "Necessita sua resposta" é o ÚNICO chip quente
 *  preenchido da tela — a hierarquia inteira aponta para ele. Reaberto é o
 *  alerta raro de reincidência (vermelho), acima da espera e abaixo da ação. */
export const USER_TICKET_STATUS_TONES: Record<RawTicketStatus, TicketStatusTone> = {
  open: 'neutral',
  /* ÂMBAR SÓ ONDE A BOLA ESTÁ COM O USUÁRIO (user, 2026-08-28). "Aguardando
     atendimento" (triaged/in_progress) volta ao azul-quieto: quem age ali é o
     TIME — pintar de âmbar mandava o solicitante agir num chamado em que ele
     não tem o que fazer, e diluía o destaque dos que de fato o esperam.
     Isto REVOGA o âmbar que a rodada do Figma de 26/08 tinha dado a estes dois
     rótulos, e restaura a regra de 23/08 ("cor por quem age") para eles. */
  triaged: 'infoOutline',
  in_progress: 'infoOutline',
  waiting_requester: 'warning',
  waiting_approval: 'infoOutline',
  /* Resolvido virou estado de AÇÃO do solicitante (28/08) — âmbar preenchido,
     como os outros em que a bola está com ele. Era cinza de contorno, a cor de
     "não é com você", justamente no único momento em que é. */
  resolved: 'warning',
  closed: 'neutralOutline',
  reopened: 'danger',
};

/** Tons OPERACIONAIS (3.b/4.b — 8 rótulos do servidor). MESMA lógica "por quem
 *  age" com o assento trocado (decisão do user, 2026-08-23): na fila, quem age
 *  é O TIME — âmbar preenchido = aguardando ação do time (aberto/triado, a fila
 *  parada), vermelho = reaberto (reincidência, o chamado mais urgente), azul
 *  preenchido = em atendimento (alguém do time já age), azul CONTORNO quieto =
 *  a bola está com OUTRO (solicitante/aprovador — não é com o time), verde =
 *  resolvido (desfecho), contorno apagado = encerrado. Espelha as abas da
 *  Lista ("Aguardando o time" / "Aguardando o usuário" / "Encerrados"). */
export const OPS_TICKET_STATUS_TONES: Record<RawTicketStatus, TicketStatusTone> = {
  open: 'warning',
  triaged: 'warning',
  in_progress: 'info',
  waiting_requester: 'infoOutline',
  waiting_approval: 'infoOutline',
  resolved: 'success',
  closed: 'neutralOutline',
  reopened: 'danger',
};

/** PRIORIDADE — rampa de gravidade (user, 2026-08-28). Mora AQUI, junto dos
 *  outros mapas de tom, porque duas telas a usam: a coluna da Lista 3.b e o
 *  cabeçalho do drawer 4.b. Nasceu dentro da tabela e o drawer pintava tudo de
 *  neutro; um chip dizia "Média" em azul e o outro em cinza para o mesmo
 *  chamado.
 *
 *  Só a CRÍTICA é preenchida, e isso separa as DUAS DIMENSÕES da linha: a coluna
 *  de status ao lado já usa âmbar, azul e vermelho preenchidos, e a prioridade
 *  preenchida faria dois chips idênticos significarem coisas diferentes. Em
 *  contorno, a prioridade lê como outra família — e a crítica, única cheia,
 *  fica com o peso que precisa. (Não há `dangerOutline` no DS; as quatro
 *  simétricas em contorno exigiriam um tom novo.) */
export const PRIORITY_TONES: Record<string, TicketStatusTone> = {
  critical: 'danger',
  high: 'warningOutline',
  medium: 'infoOutline',
  low: 'neutralOutline',
};
/** Ordem de GRAVIDADE — ordenar o rótulo por texto daria Alta, Baixa, Crítica,
 *  Média, que não é ordem nenhuma para quem tria fila. */
export const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];

export function priorityTone(priority: string): TicketStatusTone {
  return PRIORITY_TONES[priority] ?? 'neutralOutline';
}

const FALLBACK_TONE: TicketStatusTone = 'neutral';

export function userTicketStatusLabel(status: string): string {
  return USER_TICKET_STATUS_LABELS[status as RawTicketStatus] ?? status;
}
export function userTicketStatusTone(status: string): TicketStatusTone {
  return USER_TICKET_STATUS_TONES[status as RawTicketStatus] ?? FALLBACK_TONE;
}
export function opsTicketStatusTone(status: string): TicketStatusTone {
  return OPS_TICKET_STATUS_TONES[status as RawTicketStatus] ?? FALLBACK_TONE;
}
