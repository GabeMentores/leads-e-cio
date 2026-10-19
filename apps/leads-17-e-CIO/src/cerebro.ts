// O cérebro do canal — a "inteligência" da bela aqui, SIMULADA e PURA (sem
// React, sem rede): recebe (estado, frase) e devolve (estado novo, falas).
// Puro de propósito: é o que a suíte de estresse (scripts/estresse.ts) roda
// aos montes sem navegador — a cobertura de linguagem é MEDIDA, não deduzida
// (mesma filosofia do nl-suite do desk).
//
// A régua de qualidade: TODA frase plausível de participante recebe uma
// resposta válida e entendível, como se a bela estivesse conectada — quem
// pergunta recebe resposta; quem pede, ação; quem escreve ruído recebe um
// pedido de reformulação, nunca silêncio nem erro de formulário.

import { validarEmail, validarCelular } from '../shared/email';

export type Etapa =
  | 'quiz' | 'convite' | 'abertura' | 'nome' | 'email' | 'verificando_email' | 'celular' | 'empresa' | 'cargo'
  | 'consentimento' | 'recusado' | 'gravando' | 'retry' | 'fim';

export interface Dados { nome: string; email: string; celular: string; empresa: string; cargo: string }

export interface EstadoMotor {
  etapa: Etapa;
  dados: Dados;
  /** A bela perguntou "Quer participar?" (convite RESPONSIVO — só depois de
   *  pergunta sobre prêmios; ela nunca oferece de saída). */
  ofereceu: boolean;
  /** A pessoa negou a sugestão de empresa tirada do domínio do e-mail —
   *  não sugerir de novo, perguntar aberto. */
  sugestaoEmpresaRecusada: boolean;
  /** Nome de empresa digitado NO LUGAR da confirmação — aguardando o "isso"
   *  ("Combinado então: **X** — isso?", user 09-14). */
  empresaPendente: string | null;
  codigo: string | null;
  /** O código já girou a roleta — a tela NÃO exibe o cartão grande e as
   *  respostas falam do giro feito, não do código (user, 09-01). */
  codigoUsado: boolean;
}

export interface Avanco {
  estado: EstadoMotor;
  falas: string[];
  /** O hook deve disparar o POST /api/lead (única parte com rede). */
  gravar?: boolean;
  /** O hook deve CONSULTAR se o e-mail já participa ANTES da próxima
   *  pergunta (regra do user, 09-01: verifica primeiro; só sem cadastro a
   *  conversa segue para o celular). Resolve com `resolverVerificacao`. */
  verificarEmail?: boolean;
}

export function estadoInicial(): EstadoMotor {
  return {
    etapa: 'quiz',
    dados: { nome: '', email: '', celular: '', empresa: '', cargo: '' },
    ofereceu: false,
    sugestaoEmpresaRecusada: false,
    empresaPendente: null,
    codigo: null,
    codigoUsado: false,
  };
}

// ---- Empresa sugerida pelo domínio ---------------------------------------
// Só e-mail corporativo entra (regra dura), então o domínio SEMPRE carrega a
// empresa: "ana@mentores.com.br" → "Mentores". A bela confirma em vez de
// perguntar do zero (user, 09-01) — é o tipo de esperteza que faz a conversa
// ler como conectada.
const SUFIXOS_DOMINIO = new Set([
  'com', 'net', 'org', 'co', 'io', 'ai', 'app', 'dev', 'br', 'info', 'biz',
  'me', 'tv', 'us', 'online', 'site', 'store', 'tech', 'cloud', 'group',
  'global', 'digital', 'solutions', 'systems', 'services', 'consulting',
  'edu', 'gov', 'tec', 'inf', 'ind', 'adv', 'eng', 'agr', 'art', 'srv',
]);

export function sugerirEmpresa(email: string): string | null {
  const arroba = email.lastIndexOf('@');
  if (arroba < 0) return null;
  const partes = email.slice(arroba + 1).split('.');
  while (partes.length > 1 && SUFIXOS_DOMINIO.has(partes[partes.length - 1])) partes.pop();
  const rotulo = partes[partes.length - 1] ?? '';
  if (rotulo.length < 2) return null;
  return rotulo
    .split(/[-_.]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export function saudacaoInicial(): string[] {
  // NOVO INÍCIO em QUIZ (cliente, 09-15): a conversa abre com uma brincadeira
  // de marca — errar também é caminho feliz (resposta humorada + convite).
  return [
    'Oi! Que bom te ver por aqui 💙',
    'Pra iniciarmos, me conta: qual empresa entrega os **melhores brindes** do 17º e-CIO?',
  ];
}

// ---- Vocabulário ----------------------------------------------------------

// "correto" entrou depois de aparecer como NOME DE EMPRESA no banco do evento
// (user, 09-02): a bela pergunta "…, correto?" e a resposta natural é
// "Correto" — sem ela no vocabulário, caía na captura literal do campo.
// Vocabulário LARGO de propósito (user, 09-02: "adicione outras afirmativas"):
// no estande as pessoas respondem de todo jeito — "siiim", "aham", "confere",
// "na mosca", "pode crer" — e afirmativa não reconhecida vira dado errado ou
// re-pergunta. Ancorado no COMEÇO da frase ("não quero" nunca casa com "quero").
const SIM = /^(s+i+m+( senhora?)?|s|yes|yep|yeah|yup|sure|of course|aham|ahan|uhum|pode( sim| ser| p[áa]| mandar| crer| ir)?|claro( que sim)?|ok|okay|beleza|belezinha|blz|joia|j[óo]ia|bora( l[áa])?|vamo+s?( l[áa])?|partiu|aceito( sim)?|autorizo|topo|com (toda )?certeza|com ctz|ctz|certeza|obviamente|[óo]bvio|l[óo]gico|certamente|isso( mesmo| a[íi])?|positivo|👍|✅|dale|demorou|fechado|fechou( ent[ãa]o)?|show|top|firmeza|suave|tranquilo|de boa|dboa|t[áa]( bom| bem| certo)?|tabom|quero( sim)?|correto|cert[oa]|cert[íi]ssimo|exat[oa](mente)?( isso)?|perfeito|confirmo|confirmado|afirmativo|confere|bate|acertou( em cheio)?|na mosca|justamente|verdade|manda( ver| bala)?|vai (l[áa]|fundo)|segue|prossiga|continu[ae]|por favor|[ée] (isso|essa|ela|sim|claro|verdade)( mesmo| a[íi])?)\b/i;
// Afirmativas CURTÍSSIMAS ("é", "eh", "sí", "ya", "aha") só valem SOZINHAS —
// "é, não quero" começa com "é" e NÃO é um sim (user, 09-14: gírias e
// variações, inclusive de outras línguas).
const SIM_ISOLADO = /^([ée]h?|s[íi]|ya+h?|aha+|ah[ãa]+|is+o+)[\s!.…😊👍✅]*$/i;
const NAO = /^(n[ãa]o( mesmo| quero| aceito| rola)?|n|nn+|ñ|nunca|jamais|nope|nah|nem( pensar| rola| a pau)?|de jeito nenhum|prefiro n[ãa]o|melhor n[ãa]o|negativo|errad[oa]|errou|incorreto|t[áa] errado|acho que n[ãa]o|creio que n[ãa]o|ainda n[ãa]o|agora n[ãa]o|qual nada|nada (a ver|disso)|pelo contr[áa]rio|n[ãa]o [ée] (essa|isso|ela)|[ée] outra)\b/i;

/** Toda leitura de sim/não passa por aqui — nunca pelo regex direto. */
function ehSim(texto: string): boolean {
  return SIM.test(texto) || SIM_ISOLADO.test(texto);
}
function ehNao(texto: string): boolean {
  return NAO.test(texto);
}

/** Classes de intenção reconhecidas fora (e dentro) do fluxo de cadastro. */
export type Intencao =
  | 'participar' | 'curiosidade_premio' | 'codigo_perdido' | 'saber_mais'
  | 'sobre_bela' | 'capacidades' | 'sobre_belago' | 'produto_comercial'
  | 'lgpd' | 'logistica_roleta'
  | 'saudacao' | 'como_vai' | 'agradecimento' | 'despedida' | 'risada'
  | 'fora_de_escopo';

const PADROES: Array<{ intencao: Intencao; padrao: RegExp }> = [
  // Específicos primeiro — a ordem É a precedência.
  { intencao: 'codigo_perdido', padrao: /(perdi|esqueci|apaguei|sumiu|n[ãa]o (acho|encontro)).{0,25}c[óo]digo|c[óo]digo.{0,15}(sumiu|perdi)|recuperar.{0,15}c[óo]digo/i },
  { intencao: 'saber_mais', padrao: /saber mais|(explica|entender|conhecer).{0,20}(sorteio|roleta)|como assim/i },
  { intencao: 'curiosidade_premio', padrao: /\b(o que|oq|que|quais|qual)\b.{0,25}(pr[êe]mi|premia|brinde|ganh|dando|concorr|presente|recompensa|mimo)|tem (pr[êe]mio|brinde|presente)|t[ãa]o dando|(pr[êe]mios?|brindes?)\s*\?|^(pr[êe]mios?|premia[çc][ãa]o|brindes?|presentes?|recompensas?|mimos?|alexa|kindles?|smartwatch(es)?)[\s!.?]*$/i },
  { intencao: 'logistica_roleta', padrao: /como funciona|quando (é|gira|sai|acontece)|onde .{0,12}(gir|fica a roleta)|quantas vezes|girar (de novo|duas)|duas vezes|de gra[çc]a|gr[áa]tis|precisa pagar|regulamento/i },
  { intencao: 'participar', padrao: /participar|concorrer|inscrev|inscri[çc]|cadastr|me (bota|coloca|p[õo]e)|(quero|como|posso|onde).{0,30}(ganhar|girar|sorteio|roleta|brinde|c[óo]digo|alexa|kindle|smartwatch)|^(sorteio|roleta|c[óo]digo)[\s!.]*$|entrar.{0,15}(sorteio|roleta)|to dentro|t[ôo] dentro/i },
  { intencao: 'capacidades', padrao: /o que (voc[êe]|vc|c[êe]) (faz|sabe|consegue)|(que|quais) .{0,20}(pode|sabe|consegue) fazer|coisas que (pode|faz)|pra que (voc[êe] )?serve|como (voc[êe]|vc) funciona|me mostra o que/i },
  { intencao: 'sobre_belago', padrao: /belago/i },
  { intencao: 'sobre_bela', padrao: /(o que|oq|quem) [ée] (a |o )?bela\b|quem [ée] (voc[êe]|vc)|(voc[êe]|vc) [ée] (um|uma)? ?(rob[ôo]|ia|intelig[êe]ncia|bot|humana?|pessoa|de verdade)|[ée] uma? ia\b|rob[ôo]\s*\?|falando com (quem|rob[ôo])|chatgpt|gpt\b/i },
  { intencao: 'produto_comercial', padrao: /quanto custa|pre[çc]o|valor|or[çc]amento|contratar|comprar|licen[çc]a|demonstra[çc][ãa]o|\bdemo\b|vendedor|comercial|proposta|falar com (um |uma )?(algu[ée]m|pessoa|humano|gente|atendente)|\bhumano\b|atendente|quero (o|um) (desk|core)|bela (desk|core)/i },
  { intencao: 'lgpd', padrao: /lgpd|meus dados|privacidade|seguran[çc]a|\bspam\b|excluir|apagar|vender (meus|os) dados|[ée] seguro/i },
  { intencao: 'como_vai', padrao: /tudo (bem|bom|certo|joia|j[óo]ia)|como (vai|voc[êe] est[áa]|c[êe] t[áa]|est[áa]s)|beleza\s*\?|suave\s*\?/i },
  { intencao: 'saudacao', padrao: /^(oi+|ol[áa]+|e a[íi]+|opa+|bom dia|boa tarde|boa noite|hey|hello|eae|eai|salve)\b[\s!.,]*$/i },
  { intencao: 'agradecimento', padrao: /obrigad|brigad[ãa]?o?|valeu|vlw|thanks|agrade[çc]o/i },
  { intencao: 'despedida', padrao: /^(tchau|at[ée] (mais|logo|j[áa])|falou|flw|adeus|fui)\b[\s!.]*$/i },
  { intencao: 'risada', padrao: /^([k]{2,}|rs+|ha[ha]+|he[he]+|😂|🤣|😄|😆)+[\s!.]*$/i },
  // REDES DE SEGURANÇA (regra do user, 09-01: prêmios/ganhar e sinônimos TUDO
  // ativa) — só disparam quando nenhum padrão específico acima pegou:
  // verbo de ação em qualquer frase inicia; substantivo de prêmio responde.
  { intencao: 'participar', padrao: /\bganh(ar|o|a|ei)\b|\bgirar\b|\bconcorr/i },
  { intencao: 'curiosidade_premio', padrao: /pr[êe]mi|premia|brinde|recompensa|presente|mimo|sortei|rolet/i },
];

export function classificar(texto: string): Intencao | null {
  for (const { intencao, padrao } of PADROES) if (padrao.test(texto)) return intencao;
  // Pergunta de verdade que nenhum padrão pegou = fora de escopo (a bela é
  // honesta sobre o balcão dela, em vez de fingir que não viu a pergunta).
  if (texto.includes('?') && /\p{L}{2,}/u.test(texto)) return 'fora_de_escopo';
  return null;
}

// ---- Respostas ------------------------------------------------------------

const PREMIOS = 'Na roleta tem prêmios variados — **Kindles, smartwatches** e mais. Você gira no estande com o código que eu te dou no fim da conversa.';

const RESPOSTAS: Record<Exclude<Intencao, 'participar' | 'curiosidade_premio' | 'codigo_perdido' | 'saber_mais' | 'saudacao' | 'como_vai' | 'agradecimento' | 'despedida' | 'risada'>, string> = {
  sobre_bela: 'Eu sou a assistente virtual da Belago 💙 Atendo os times das empresas: abro chamados, respondo dúvidas e resolvo pendências direto na conversa.',
  capacidades: 'No dia a dia eu atendo os times das empresas dentro dos produtos da Belago: abro e acompanho chamados, oriento com a base de conhecimento e resolvo pendências direto na conversa. Aqui no evento eu também cuido do código da **roleta de prêmios** 😉',
  sobre_belago: 'A Belago cria produtos de atendimento e gestão de serviços — e eu sou a inteligência que trabalha dentro deles. O time do estande adora mostrar 😉',
  produto_comercial: 'Essa é com o time do estande 🙂 Preço, proposta e demonstração eles resolvem na hora — é só chamar alguém lá.',
  lgpd: 'Seus dados ficam com a Belago, só para o sorteio e para falarmos com você depois do evento — nada de spam, nada de repasse. E você pode pedir a exclusão quando quiser.',
  logistica_roleta: 'Funciona assim: você faz um cadastro rápido comigo, eu te dou um **código**, você mostra no estande da Belago e gira a roleta — **um giro por pessoa**, sem custo nenhum 🍀',
  fora_de_escopo: 'Essa foge do meu balcão aqui no evento 😅 Por aqui eu te conto da Belago — e cuido da roleta de prêmios.',
};

const NAO_ENTENDI = 'Não entendi 😅 Pode escrever de outro jeito?';

const PERGUNTAS: Partial<Record<Etapa, string>> = {
  nome: 'Primeiro: qual é o seu **nome e sobrenome**?',
  email: 'Qual é o seu **e-mail corporativo**?',
  celular: 'E o seu celular com DDD?',
  empresa: 'Em qual empresa você trabalha?',
  cargo: 'E qual é o seu cargo por lá?',
  consentimento: 'Posso guardar esses dados para o sorteio e para a Belago falar com você depois do evento? Você pode pedir a exclusão quando quiser.',
};

/** Por que a bela pede cada campo — resposta para "pra que isso?"/"não quero
 *  informar" no meio do fluxo. Campo obrigatório continua obrigatório, mas o
 *  motivo vem primeiro. */
const JUSTIFICATIVAS: Partial<Record<Etapa, string>> = {
  nome: 'É como eu te chamo na conversa 🙂',
  email: 'O e-mail corporativo identifica a sua participação e é por ele que a Belago fala com você depois do evento — sem ele eu não consigo te inscrever.',
  celular: 'É um canal a mais para a Belago falar com você depois do evento — nada de spam, nada de repasse. Sem ele eu não consigo te inscrever.',
  empresa: 'Ajuda o time da Belago a preparar uma conversa que faça sentido para a sua realidade.',
  cargo: 'Ajuda o time da Belago a preparar uma conversa que faça sentido para a sua realidade.',
  // Consentimento LIVRE e ESCLARECIDO de verdade (user, 09-15): finalidade,
  // exclusividade E o direito de revogar — dito com carinho, não em juridiquês.
  consentimento: 'Sem o seu consentimento eu não guardo nada — é a lei, e é o certo 🙂 Seus dados servem **só** para o sorteio e para o contato da Belago. E se você mudar de ideia depois, sem drama: pode **revogar a autorização quando quiser**, e a gente apaga tudo.',
};

/** A pergunta do passo, ciente do estado: na EMPRESA, com e-mail em mãos e
 *  sugestão não recusada, a bela CONFIRMA pelo domínio em vez de perguntar
 *  do zero (user, 09-01). */
function perguntaDe(e: EstadoMotor, etapa: Etapa): string {
  if (etapa === 'empresa') {
    // Correção em confirmação vem antes da sugestão do domínio.
    if (e.empresaPendente) return `Combinado então: **${e.empresaPendente}** — isso?`;
    if (!e.sugestaoEmpresaRecusada) {
      const sugestao = sugerirEmpresa(e.dados.email);
      if (sugestao) return `Pelo seu e-mail: você trabalha na **${sugestao}**, correto?`;
    }
  }
  return PERGUNTAS[etapa] ?? '';
}

const PEDIU_MOTIVO = /por ?qu[êe]|pra ?qu[êe]|para ?qu[êe]|necess[áa]rio|obrigat[óo]rio|precisa (disso|mesmo)|n[ãa]o quero (dar|informar|passar|falar)|vai usar/i;
const DESISTIU = /desist|n[ãa]o quero mais|cancela|deixa (pra l[áa]|quieto)|esquece|sai fora|para (tudo|com isso)/i;

// REGRA (user, 09-15): NUNCA ecoar o nome capturado numa fala ("Prazer,
// Fulano!", "Boa, Fulano!", "Prontinho, Fulano!") — a captura de texto livre
// erra demais pra repetir o palpite em voz alta. O nome vai pro banco, não
// pra conversa.
function pareceNome(texto: string): boolean {
  const limpo = texto.trim();
  return limpo.length >= 2 && limpo.length <= 80 && /\p{L}{2,}/u.test(limpo) && !limpo.includes('?') && !ehSim(limpo);
}

/** Descasca a apresentação antes de capturar o nome — "Meu nome é Paulo Abade"
 *  registrava "Meu" e a bela respondia "Prazer, Meu!" (visto em produção,
 *  09-15). Cobre saudação na frente e as aberturas usuais; o que sobra é o
 *  nome. Sobrenome também ("meu sobrenome é Abade" na segunda rodada). */
function extrairNome(texto: string): string {
  return texto
    .replace(/^(?:(?:oi|ol[áa]|bom dia|boa tarde|boa noite)[,!.]?\s+)?(?:meu\s+(?:nome|sobrenome)(?:\s+(?:completo|todo))?\s*(?:[ée]h?\s+|:\s*|\s)|(?:eu\s+)?me\s+chamo\s+|(?:pode\s+)?me\s+chamar?\s+de\s+|(?:eu\s+)?sou\s+(?:[oa]\s+)?|aqui\s+[ée]h?\s+(?:[oa]\s+)?|[ée]h?\s+(?:[oa]\s+)?|nome\s*:\s*)/i, '')
    .trim();
}

/** Mesma ideia para a EMPRESA (user, 09-15): "trabalho na Mentores" gravaria a
 *  frase inteira no banco. Descasca "trabalho na/em", "sou da", "tô na",
 *  "minha empresa é/se chama", "é a" — o que sobra é o nome. */
function extrairEmpresa(texto: string): string {
  return texto
    .replace(/^(?:(?:eu\s+)?trabalho\s+(?:n[ao]s?\s+|em\s+|pr[ao]\s+|para\s+[ao]?\s*)|(?:eu\s+)?sou\s+d[ao]s?\s+|(?:eu\s+)?(?:estou|t[ôo])\s+n[ao]s?\s+|(?:a\s+)?(?:minha\s+)?empresa\s+(?:se\s+chama\s+(?:[ao]\s+)?|[ée]h?\s+(?:[ao]\s+)?|:\s*)|empresa\s*:\s*|[ée]h?\s+(?:[ao]\s+)?)/i, '')
    .trim();
}

// ---- A máquina ------------------------------------------------------------

const CAMPOS: Etapa[] = ['nome', 'email', 'celular', 'empresa', 'cargo'];

function proximoCampoVazio(dados: Dados): Etapa {
  for (const campo of CAMPOS) if (!dados[campo as keyof Dados]) return campo;
  return 'consentimento';
}

/** Começa (ou RETOMA) o cadastro — sempre a partir do primeiro campo vazio,
 *  para quem desistiu e voltou não responder tudo de novo. */
function iniciarFluxo(e: EstadoMotor): Avanco {
  const alvo = proximoCampoVazio(e.dados);
  const falas: string[] = [];
  if (alvo === 'nome') {
    if (e.ofereceu) {
      // A pessoa acabou de ouvir a lista de prêmios e topou — repetir Alexa/
      // roleta aqui lia como script decorado (polida do dono, 09-01). Direto
      // ao ponto, numa bolha só.
      falas.push(`Boa! São cinco perguntas rápidas e o seu código sai aqui na conversa. ${PERGUNTAS.nome}`);
    } else {
      falas.push('Boa! Vou te fazer cinco perguntas rápidas e liberar seu código para girar a **roleta de prêmios** — tem Kindle, smartwatch e mais.');
      falas.push(PERGUNTAS.nome!);
    }
  } else {
    falas.push('Boa! Continuando de onde paramos:');
    falas.push(perguntaDe(e, alvo));
  }
  return { estado: { ...e, etapa: alvo }, falas };
}

function responderIntencao(e: EstadoMotor, intencao: Intencao): Avanco {
  switch (intencao) {
    case 'participar':
      return iniciarFluxo(e);
    case 'curiosidade_premio':
      return { estado: { ...e, ofereceu: true }, falas: [PREMIOS, 'Quer participar?'] };
    case 'saber_mais':
      // A explicação honesta do trato (pill "Saber mais", user 09-01): as
      // respostas ajudam a Belago a apresentar a bela; completar dá UMA girada.
      return {
        estado: { ...e, ofereceu: true },
        falas: [
          'Claro! Funciona assim: eu te faço **um conjunto de perguntas rápidas** — suas respostas ajudam a Belago a preparar um contato que faça sentido depois do evento.',
          'Completando, você garante **uma girada na roleta de prêmios** — tem Kindle, smartwatch e mais te esperando 🍀 Quer participar?',
        ],
      };
    case 'codigo_perdido': {
      if (e.codigo && e.codigoUsado) {
        return { estado: e, falas: ['Seu código já foi usado na roleta — a participação é única por pessoa 🙂 Qualquer coisa, o pessoal da Belago no estande te ajuda.'] };
      }
      if (e.codigo) return { estado: e, falas: [`Tá aqui 😉 Seu código é **${e.codigo}** — ele também está no cartão logo acima.`] };
      const inicio = iniciarFluxo(e);
      return {
        estado: inicio.estado,
        falas: ['A gente recupera: refaz o cadastro comigo usando o **mesmo e-mail** e eu te devolvo o SEU código, não um novo 😉', inicio.falas[inicio.falas.length - 1]],
      };
    }
    case 'saudacao':
      return { estado: e, falas: ['Oi! 🙂 Me conta: o que você precisa?'] };
    case 'como_vai':
      return { estado: e, falas: ['Tudo ótimo por aqui 💙 E você? Me conta o que você precisa.'] };
    case 'agradecimento':
      return { estado: e, falas: [e.etapa === 'fim' ? 'Por nada! Boa sorte na roleta 🍀' : 'Por nada! 💙'] };
    case 'despedida':
      return { estado: e, falas: [e.etapa === 'fim' ? 'Até já! Boa sorte na roleta 🍀' : 'Até já! 💙 Se precisar, é só voltar aqui.'] };
    case 'risada':
      return { estado: e, falas: ['😄 Me conta: o que você precisa?'] };
    default:
      return { estado: e, falas: [RESPOSTAS[intencao]] };
  }
}

/** Desvio DENTRO do fluxo: responde e RETOMA a pergunta do passo atual —
 *  a bela nunca perde o fio. */
function desviarComRetomada(e: EstadoMotor, intencao: Intencao): Avanco {
  // Quem já está no fluxo e pede para participar recebe a confirmação, não um
  // recomeço; código perdido dentro do fluxo idem (o código sai no fim).
  const falasBase =
    intencao === 'participar' ? ['Você já está participando 😉 Só faltam alguns dados.']
    : intencao === 'codigo_perdido' ? ['Seu código sai no fim deste cadastro — já já ele aparece 😉']
    : responderIntencao(e, intencao).falas;
  return { estado: e, falas: [...falasBase, perguntaDe(e, e.etapa)].filter(Boolean) };
}

export function avancar(e: EstadoMotor, entrada: string): Avanco {
  const limpo = entrada.trim();
  if (!limpo) return { estado: e, falas: [] };

  switch (e.etapa) {
    case 'quiz': {
      // RESPOSTA ABERTA (cliente, 09-15): acerta quem escrever qualquer coisa
      // "que tenha bela" — Belago, Belago Tech, Belago Technologies… — ou
      // "luxor" (17º e-CIO: Belago | Luxor, só Luxor e afins). Qualquer
      // OUTRA coisa (empresa errada, "não sei", dúvida, nome de gente, ruído)
      // ganha UMA resposta coringa que revela a certa (user, 09-15 — a
      // bifurcação piada/hesitação errava o tom em nome de pessoa; detectar
      // a intenção aqui não paga o risco).
      if (/bela|luxor/i.test(limpo)) {
        return { estado: { ...e, etapa: 'convite', ofereceu: false }, falas: ['Isso aí! 🎯', 'Vamos ver na prática participando do **sorteio**?'] };
      }
      return {
        estado: { ...e, etapa: 'convite', ofereceu: false },
        falas: [
          'Hehe… a resposta, na verdade, é a **Belago e a Luxor** 😛 É lá que estão os **melhores prêmios** do 17º e-CIO: Kindle, smartwatch e muito mais!',
          'Vamos ver na prática participando do **sorteio**?',
        ],
      };
    }

    case 'convite': {
      // "QUERO saber mais" começa com "quero" e casaria no sim genérico —
      // a intenção específica decide ANTES (achado da suíte, 09-15).
      if (classificar(limpo) === 'saber_mais') return responderIntencao(e, 'saber_mais'); // explica + "Quer participar?" (ofereceu)
      if (ehSim(limpo)) return iniciarFluxo(e); // "Vamos"
      return { estado: e, falas: ['Bora? 😄 É rapidinho — e tem prêmio esperando.'] };
    }

    case 'abertura':
    case 'recusado': {
      // "sim" vale como pedido quando a bela acabou de convidar ("Quer
      // participar?") ou quando a pessoa recusou o consentimento e voltou.
      // Na volta atrás o sim pode vir no meio da frase ("pensei melhor, sim").
      const simSolto = !ehNao(limpo) && /\b(sim|pode|aceito|autorizo|topo|quero)\b/i.test(limpo);
      if ((ehSim(limpo) || simSolto) && (e.ofereceu || e.etapa === 'recusado')) {
        if (e.etapa === 'recusado') return { estado: { ...e, etapa: 'gravando' }, falas: [], gravar: true };
        return iniciarFluxo(e);
      }
      // "Agora não" ao convite (botão, 09-15): fecha o convite sem drama e a
      // conversa volta ao estado aberto.
      if (e.etapa === 'abertura' && e.ofereceu && ehNao(limpo)) {
        return { estado: { ...e, ofereceu: false }, falas: ['Tranquilo! Se mudar de ideia, é só me chamar 😉'] };
      }
      // Um e-mail SOLTO fora de contexto — a pessoa quer alguma coisa, mas o
      // cadastro ainda não começou. Sem isso, "ana@belago.com.br" caía na
      // resposta institucional da Belago (o domínio contém "belago"). Só o
      // e-mail sozinho: numa frase inteira, a intenção manda.
      if (/^\S+@\S+$/.test(limpo)) {
        return { estado: e, falas: ['Anoto já já 🙂 Primeiro me conta: o que você precisa?'] };
      }
      const intencao = classificar(limpo);
      if (intencao) return responderIntencao(e, intencao);
      return { estado: e, falas: [NAO_ENTENDI] };
    }

    case 'nome': {
      if (PEDIU_MOTIVO.test(limpo)) return { estado: e, falas: [JUSTIFICATIVAS.nome!, PERGUNTAS.nome!] };
      if (DESISTIU.test(limpo)) return { estado: { ...e, etapa: 'convite' }, falas: ['Tudo bem, paro por aqui 🙂 Se quiser participar depois, é só me chamar.'] };
      if (limpo.includes('@')) return { estado: e, falas: ['Vamos por partes 🙂 Primeiro só o seu nome — o e-mail vem já já.'] };
      const nome = extrairNome(limpo);
      if (!pareceNome(nome)) {
        const intencao = classificar(limpo);
        if (intencao) return desviarComRetomada(e, intencao);
        return { estado: e, falas: ['Não peguei o seu nome 😅 Qual é o seu nome e sobrenome?'] };
      }
      if (limpo.includes('?')) {
        const intencao = classificar(limpo);
        if (intencao) return desviarComRetomada(e, intencao);
      }
      // NOME COMPLETO obrigatório (user, 09-01): é como o estande localiza o
      // ganhador. Veio só o primeiro nome → a bela guarda e pede o sobrenome;
      // a resposta seguinte COMPLETA. Se ela já contém o que foi guardado
      // ("Gabriel Moraes" depois de "Gabriel"), substitui; senão soma — cobre
      // tanto "Moraes" quanto "da Silva" sem virar "Gabriel Gabriel Moraes".
      const completando = e.dados.nome !== '';
      const jaContem = completando && nome.toLowerCase().includes(e.dados.nome.toLowerCase());
      const nomeFinal = completando && !jaContem ? `${e.dados.nome} ${nome}` : nome;
      const palavrasFinal = nomeFinal.split(/\s+/).filter((p) => /\p{L}{2,}/u.test(p));
      if (palavrasFinal.length < 2) {
        return {
          estado: { ...e, dados: { ...e.dados, nome } },
          // Só "Prazer!", sem ecoar o nome (user, 09-15): a captura de frases
          // soltas ("É José…") erra feio demais pra repetir em voz alta.
          falas: ['Prazer! E o seu **sobrenome**?'],
        };
      }
      const dados = { ...e.dados, nome: nomeFinal };
      const proxima = proximoCampoVazio(dados);
      const perguntaProxima = perguntaDe({ ...e, dados }, proxima);
      return {
        estado: { ...e, dados, etapa: proxima },
        falas: [completando ? `Anotado! ${perguntaProxima}` : `Prazer! ${perguntaProxima}`],
      };
    }

    case 'email': {
      const veredito = validarEmail(limpo);
      if (!veredito.ok) {
        if (PEDIU_MOTIVO.test(limpo)) return { estado: e, falas: [JUSTIFICATIVAS.email!, PERGUNTAS.email!] };
        if (DESISTIU.test(limpo)) return { estado: { ...e, etapa: 'convite' }, falas: ['Tudo bem, paro por aqui 🙂 Se quiser participar depois, é só me chamar.'] };
        const intencao = classificar(limpo);
        if (intencao) return desviarComRetomada(e, intencao);
        if (/^[\d\s()+-]{8,}$/.test(limpo)) return { estado: e, falas: ['Esse parece um telefone 🙂 Primeiro o **e-mail corporativo** — o celular vem depois.'] };
        if (veredito.motivo === 'gratuito') return { estado: e, falas: ['Esse aí é pessoal 😉 Pra participar eu preciso do seu **e-mail corporativo** — o da empresa onde você trabalha.'] };
        if (veredito.motivo === 'descartavel') return { estado: e, falas: ['Esse domínio é de e-mail temporário 😅 Preciso do seu e-mail corporativo de verdade.'] };
        return { estado: e, falas: ['Hmm, esse endereço não parece completo. Me manda no formato **nome@empresa.com.br**?'] };
      }
      const dados = { ...e.dados, email: veredito.email };
      // Correção de e-mail depois do consentimento (o MX reprovou na gravação):
      // o aceite já foi dado — grava direto, sem repetir a pergunta.
      if (dados.celular && dados.cargo) return { estado: { ...e, dados, etapa: 'gravando' }, falas: [], gravar: true };
      // Antes de seguir, VERIFICAR se o e-mail já participa (user, 09-01):
      // a pergunta do celular só sai quando a consulta disser que não há
      // cadastro — sem ela, o aviso de duplicado chegava DEPOIS da pergunta.
      return { estado: { ...e, dados, etapa: 'verificando_email' }, falas: [], verificarEmail: true };
    }

    case 'celular': {
      const celular = validarCelular(limpo);
      if (!celular) {
        if (PEDIU_MOTIVO.test(limpo)) return { estado: e, falas: [JUSTIFICATIVAS.celular!, PERGUNTAS.celular!] };
        if (DESISTIU.test(limpo)) return { estado: { ...e, etapa: 'convite' }, falas: ['Tudo bem, paro por aqui 🙂 Se quiser participar depois, é só me chamar.'] };
        const intencao = classificar(limpo);
        if (intencao) return desviarComRetomada(e, intencao);
        return { estado: e, falas: ['Não consegui entender esse número 😅 Me manda com DDD, tipo **(11) 91234-5678**?'] };
      }
      const dados = { ...e.dados, celular };
      const proxima = proximoCampoVazio(dados);
      return { estado: { ...e, dados, etapa: proxima }, falas: [perguntaDe({ ...e, dados }, proxima)] };
    }

    case 'empresa':
    case 'cargo': {
      // CONFIRMAÇÃO de empresa em duas formas: a sugestão do domínio
      // ("trabalha na Mentores, correto?") e a correção digitada pela pessoa
      // ("Combinado então: **Belago** — isso?", user 09-14). "sim" fecha o
      // nome em confirmação; "não" abre a pergunta clássica; digitar o MESMO
      // nome também confirma. Outro nome vira a nova pendência — nada entra
      // no banco sem um "isso" da pessoa.
      // Na empresa, a resposta chega descascada da apresentação ("trabalho na
      // Mentores" → "Mentores") — vale na confirmação, na pendência e no dado.
      const valor = e.etapa === 'empresa' ? extrairEmpresa(limpo) : limpo;
      if (e.etapa === 'empresa') {
        const sugestao = !e.sugestaoEmpresaRecusada ? sugerirEmpresa(e.dados.email) : null;
        const emConfirmacao = e.empresaPendente ?? sugestao;
        if (emConfirmacao) {
          if (ehSim(limpo) || valor.toLowerCase() === emConfirmacao.toLowerCase()) {
            const dados = { ...e.dados, empresa: emConfirmacao };
            return { estado: { ...e, dados, empresaPendente: null, etapa: 'cargo' }, falas: [PERGUNTAS.cargo!] };
          }
          if (ehNao(limpo)) {
            return {
              estado: { ...e, empresaPendente: null, sugestaoEmpresaRecusada: true },
              falas: ['Sem problema! Em qual empresa você trabalha então?'],
            };
          }
        }
      }
      if (PEDIU_MOTIVO.test(limpo)) return { estado: e, falas: [JUSTIFICATIVAS[e.etapa]!, perguntaDe(e, e.etapa)] };
      if (DESISTIU.test(limpo)) return { estado: { ...e, etapa: 'convite' }, falas: ['Tudo bem, paro por aqui 🙂 Se quiser participar depois, é só me chamar.'] };
      if (limpo.includes('?')) {
        const intencao = classificar(limpo);
        if (intencao) return desviarComRetomada(e, intencao);
      }
      if (valor.length < 2) {
        return { estado: e, falas: [e.etapa === 'empresa' ? 'Qual é o nome da empresa?' : 'Não peguei — qual é o seu cargo?'] };
      }
      // Outro nome digitado NO MEIO de uma confirmação de empresa → não grava
      // direto: vira a nova pendência e a bela reconfirma (user, 09-14).
      if (e.etapa === 'empresa' && (e.empresaPendente !== null || (!e.sugestaoEmpresaRecusada && sugerirEmpresa(e.dados.email)))) {
        return { estado: { ...e, empresaPendente: valor }, falas: [`Combinado então: **${valor}** — isso?`] };
      }
      const dados = { ...e.dados, [e.etapa]: valor } as Dados;
      const proxima = proximoCampoVazio(dados);
      if (proxima === 'consentimento') {
        return { estado: { ...e, dados, etapa: 'consentimento' }, falas: [`Fechando: ${PERGUNTAS.consentimento}`] };
      }
      return { estado: { ...e, dados, etapa: proxima }, falas: [PERGUNTAS[proxima]!] };
    }

    case 'consentimento': {
      if (ehSim(limpo)) return { estado: { ...e, etapa: 'gravando' }, falas: [], gravar: true };
      if (ehNao(limpo)) {
        return { estado: { ...e, etapa: 'recusado' }, falas: ['Sem problema! Sem o seu consentimento eu não guardo nada — então não consigo te inscrever na roleta. Se mudar de ideia, é só me dizer **sim** aqui 💙'] };
      }
      if (PEDIU_MOTIVO.test(limpo)) return { estado: e, falas: [JUSTIFICATIVAS.consentimento!, PERGUNTAS.consentimento!] };
      const intencao = classificar(limpo);
      if (intencao) return desviarComRetomada(e, intencao);
      return { estado: e, falas: ['Só preciso de um **sim** ou **não**: posso guardar seus dados para o sorteio e o contato da Belago?'] };
    }

    case 'retry': {
      return { estado: { ...e, etapa: 'gravando' }, falas: [], gravar: true };
    }

    case 'fim': {
      // A conversa continua depois do código — dúvida de logística, obrigado,
      // "perdi o código": tudo tem resposta, como numa conversa de verdade.
      if (classificar(limpo) === 'participar' || (ehSim(limpo) && e.ofereceu)) {
        if (e.codigoUsado) {
          return { estado: e, falas: ['Seu código já foi usado na roleta — a participação é única por pessoa 🙂 Qualquer coisa, o pessoal da Belago no estande te ajuda.'] };
        }
        return { estado: e, falas: [`Você já está dentro 😉 Seu código é **${e.codigo}** — é só mostrar no estande.`] };
      }
      const intencao = classificar(limpo);
      if (intencao) return responderIntencao(e, intencao);
      return { estado: e, falas: ['Seu código está no cartão logo acima 👆 Qualquer dúvida do sorteio, o pessoal do estande resolve na hora 🙂'] };
    }

    case 'verificando_email':
    case 'gravando':
      return { estado: e, falas: [] };
  }
}

/** Resolve a etapa `verificando_email` com a resposta da consulta (o hook faz
 *  a rede; a decisão e a copy moram aqui, cobertas pela suíte).
 *  Já cadastrado → corta a conversa com o código original; livre → segue para
 *  a próxima pergunta (celular, normalmente). */
function formatarGiro(iso: string): string {
  const d = new Date(iso);
  return `dia ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function resolverVerificacao(
  e: EstadoMotor, jaExiste: boolean, codigo?: string, codigoUsadoEm?: string | null,
): Avanco {
  if (jaExiste && codigo) {
    // Check 1 + check 2 (user, 09-01): código já GEROU E GIROU → sem cartão,
    // sem repetir o código em destaque — só o dia/hora do giro e o estande.
    if (codigoUsadoEm) {
      return {
        estado: { ...e, etapa: 'fim', codigo, codigoUsado: true },
        falas: [
          `Opa! Notei que você já se cadastrou por aqui e gerou o código **${codigo}** 😉`,
          `Seu código foi **usado** ${formatarGiro(codigoUsadoEm)} 🍀 A **participação é única** por pessoa.`,
          'Qualquer coisa, é só falar com alguém da Belago no estande 💙',
        ],
      };
    }
    // Só o check 1: cadastro existe, giro ainda vale — devolve o código.
    return {
      estado: { ...e, etapa: 'fim', codigo, codigoUsado: false },
      falas: [
        `Seu cadastro já foi feito por aqui 😉 Cada pessoa pode gerar **um código** apenas — e o seu é **${codigo}**.`,
        'Mostra ele no estande da Belago e boa sorte! 🍀',
      ],
    };
  }
  const alvo = proximoCampoVazio(e.dados);
  return { estado: { ...e, etapa: alvo }, falas: [perguntaDe(e, alvo)] };
}

// ---- Confirmação por BOTÃO -----------------------------------------------
// Regra do CLIENTE (09-15): tudo que não é necessidade de input manual vira
// botão, e o teclado fica BLOQUEADO até a confirmação ser respondida. Texto
// livre é só para o que precisa ser digitado (nome, e-mail, celular, empresa
// aberta, cargo). O rótulo do botão É o texto enviado ao motor — mensagem
// real, nunca prefill (padrão ChatQuickActions) — então cada rótulo daqui
// precisa resolver no vocabulário/intenções acima.
export interface BotoesDaEtapa {
  botoes: string[];
  /** true = confirmação pendente: o composer trava até um botão responder. */
  bloqueiaEntrada: boolean;
}

export function botoesDe(e: EstadoMotor): BotoesDaEtapa | null {
  switch (e.etapa) {
    // Regra fechada pelo user (09-15): BOTÃO NA TELA = TECLADO TRAVADO.
    // Texto livre só onde a resposta é digitada (nome, e-mail, celular,
    // empresa aberta, cargo).
    // O QUIZ é resposta ABERTA (cliente, 09-15) — sem botões, teclado livre;
    // qualquer resposta leva adiante (acerto ou piada).
    case 'convite':
      // Depois do "saber mais" só resta topar — repetir o botão de explicar
      // seria oferecer o que a pessoa acabou de ouvir.
      if (e.ofereceu) return { botoes: ['Vamos'], bloqueiaEntrada: true };
      return { botoes: ['Vamos', 'Quero saber mais'], bloqueiaEntrada: true };
    case 'abertura':
      // Legado (entrada antiga por texto) — inalcançável no fluxo novo.
      if (e.ofereceu) return { botoes: ['Quero participar', 'Agora não'], bloqueiaEntrada: true };
      return { botoes: ['Participar do sorteio', 'Saber mais sobre o sorteio'], bloqueiaEntrada: true };
    case 'recusado':
      return { botoes: ['Mudei de ideia — quero participar'], bloqueiaEntrada: true };
    case 'empresa': {
      const alvo = e.empresaPendente ?? (!e.sugestaoEmpresaRecusada ? sugerirEmpresa(e.dados.email) : null);
      if (alvo) return { botoes: ['Sim, correto', 'Não, em outra'], bloqueiaEntrada: true };
      return null; // pergunta aberta: o nome precisa ser digitado
    }
    case 'consentimento':
      return { botoes: ['Sim, autorizo', 'Não autorizo', 'Por que precisam?'], bloqueiaEntrada: true };
    case 'retry':
      return { botoes: ['Tentar de novo'], bloqueiaEntrada: true };
    default:
      return null;
  }
}
