// Suíte de estresse de linguagem do canal de leads — roda o CÉREBRO puro
// (src/cerebro.ts) contra tudo que participante de evento fala, e confere a
// CLASSE da resposta por um trecho que só aquela classe contém. Cobertura
// medida, não deduzida (filosofia do nl-suite do desk).
//
//   npm run estresse   (em apps/leads)
//
// Regra de bolso ao acrescentar caso: o `espera` é um trecho ESTÁVEL da
// resposta da classe — não a frase inteira, que a copy pode evoluir.
import { avancar, botoesDe, estadoInicial, resolverVerificacao, type EstadoMotor, type Etapa } from '../src/cerebro';

/** Avança simulando a resolução da verificação de e-mail como "livre"
 *  (a rede é do hook; aqui a consulta resolve na hora). */
function avancarResolvendo(estado: EstadoMotor, entrada: string) {
  const r = avancar(estado, entrada);
  if (r.verificarEmail) {
    const res = resolverVerificacao(r.estado, false);
    return { ...r, estado: res.estado, falas: [...r.falas, ...res.falas] };
  }
  return r;
}

interface Caso {
  grupo: string;
  frase: string;
  /** Trecho que a resposta TEM de conter (regex, case-insensitive). */
  espera: RegExp;
  /** Etapa em que o participante está (padrão: abertura). */
  etapa?: Etapa;
  /** A resposta deve INICIAR o cadastro (etapa vira `nome`). */
  inicia?: boolean;
  /** A resposta deve pedir gravação. */
  grava?: boolean;
}

const MEIO: Partial<EstadoMotor> = {
  etapa: 'celular',
  dados: { nome: 'Ana Souza', email: 'ana@acme.com.br', celular: '', empresa: '', cargo: '' },
};

const CASOS: Caso[] = [
  // ---- Pedido de participar (inclusive em pergunta) — TUDO inicia o fluxo
  { grupo: 'participar', frase: 'quero participar do sorteio', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'como faço pra participar?', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'como faço pra ganhar?', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'quero ganhar uma alexa', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'me inscreve aí', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'quero me cadastrar', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'sorteio', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'roleta!', espera: /cinco perguntas/, inicia: true },
  // Palavra única sobre prêmio = curiosidade (lista + convite), não recomeço:
  // "Prêmios" solto caía no "Não entendi" (achado do user em produção, 09-01).
  { grupo: 'prêmios', frase: 'Prêmios', espera: /Kindles, smartwatches.*Quer participar\?/is },
  { grupo: 'prêmios', frase: 'brinde', espera: /Kindles, smartwatches/ },
  { grupo: 'prêmios', frase: 'alexa', espera: /Kindles, smartwatches/ },
  { grupo: 'prêmios', frase: 'premiação', espera: /Kindles, smartwatches/ },
  { grupo: 'prêmios', frase: 'que presentes tem aí', espera: /Kindles, smartwatches/ },
  { grupo: 'prêmios', frase: 'recompensas', espera: /Kindles, smartwatches/ },
  { grupo: 'prêmios', frase: 'tem algum mimo pra quem passar aí', espera: /Kindles, smartwatches/ },
  { grupo: 'participar', frase: 'Participar do sorteio', espera: /cinco perguntas/, inicia: true },
  { grupo: 'saber mais', frase: 'Saber mais sobre o sorteio', espera: /conjunto de perguntas rápidas.*uma girada na roleta.*Quer participar\?/is },
  { grupo: 'saber mais', frase: 'me explica esse sorteio', espera: /conjunto de perguntas rápidas/ },
  { grupo: 'participar', frase: 'ganhar', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'eu quero é ganhar', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'como entro no sorteio?', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'quero girar a roleta', espera: /cinco perguntas/, inicia: true },
  { grupo: 'participar', frase: 'onde pego meu código?', espera: /cinco perguntas/, inicia: true },

  // ---- Curiosidade sobre prêmios — responde e CONVIDA (nunca oferece antes)
  { grupo: 'prêmios', frase: 'o que dá pra ganhar?', espera: /Kindles, smartwatches/ },
  { grupo: 'prêmios', frase: 'quais são os prêmios?', espera: /Quer participar\?/ },
  { grupo: 'prêmios', frase: 'tem brinde?', espera: /Kindles, smartwatches/ },
  { grupo: 'prêmios', frase: 'vocês tão dando alexa?', espera: /Kindles, smartwatches/ },
  { grupo: 'prêmios', frase: 'prêmios?', espera: /Quer participar\?/ },

  // ---- Sobre a bela (identidade) e o que ela faz (capacidades)
  { grupo: 'bela', frase: 'o que é a bela?', espera: /assistente virtual da Belago/ },
  { grupo: 'bela', frase: 'o que é o bela?', espera: /assistente virtual da Belago/ },
  { grupo: 'bela', frase: 'quem é você?', espera: /assistente virtual da Belago/ },
  { grupo: 'bela', frase: 'você é um robô?', espera: /assistente virtual da Belago/ },
  { grupo: 'bela', frase: 'tô falando com quem?', espera: /assistente virtual da Belago/ },
  { grupo: 'bela', frase: 'você é o chatgpt?', espera: /assistente virtual da Belago/ },
  { grupo: 'capacidades', frase: 'o que você faz?', espera: /abro e acompanho chamados/ },
  { grupo: 'capacidades', frase: 'que coisas você sabe fazer?', espera: /abro e acompanho chamados/ },
  { grupo: 'capacidades', frase: 'pra que você serve?', espera: /abro e acompanho chamados/ },

  // ---- Belago e comercial
  { grupo: 'belago', frase: 'o que é a belago?', espera: /atendimento e gestão de serviços/ },
  { grupo: 'comercial', frase: 'quanto custa?', espera: /time do estande/ },
  { grupo: 'comercial', frase: 'quero uma demonstração', espera: /time do estande/ },
  { grupo: 'comercial', frase: 'quero falar com um humano', espera: /time do estande/ },
  { grupo: 'comercial', frase: 'como contrato o bela desk?', espera: /time do estande/ },

  // ---- LGPD e logística
  { grupo: 'lgpd', frase: 'vão me mandar spam?', espera: /nada de spam/ },
  { grupo: 'lgpd', frase: 'pra onde vão meus dados?', espera: /pedir a exclusão/ },
  { grupo: 'lgpd', frase: 'isso é seguro?', espera: /exclusão/ },
  { grupo: 'logística', frase: 'como funciona o sorteio?', espera: /um giro por pessoa/ },
  { grupo: 'logística', frase: 'posso girar duas vezes?', espera: /um giro por pessoa/ },
  { grupo: 'logística', frase: 'é de graça?', espera: /sem custo/ },
  { grupo: 'logística', frase: 'onde eu giro a roleta?', espera: /um giro por pessoa|estande/ },
  { grupo: 'logística', frase: 'perdi meu código', espera: /mesmo e-mail/, inicia: true },

  // ---- Small talk
  { grupo: 'social', frase: 'oi', espera: /o que você precisa/ },
  { grupo: 'social', frase: 'bom dia!', espera: /o que você precisa/ },
  { grupo: 'social', frase: 'tudo bem?', espera: /Tudo ótimo/ },
  { grupo: 'social', frase: 'obrigado!', espera: /Por nada/ },
  { grupo: 'social', frase: 'valeu', espera: /Por nada/ },
  { grupo: 'social', frase: 'tchau', espera: /Até já/ },
  { grupo: 'social', frase: 'kkkkkk', espera: /o que você precisa/ },

  // ---- Dado solto fora de contexto
  { grupo: 'dado solto', frase: 'ana@belago.com.br', espera: /o que você precisa/ },
  { grupo: 'dado solto', frase: 'meu email é ana@acme.com.br e quero participar', espera: /cinco perguntas/, inicia: true },

  // ---- Sem sentido e fora de escopo — resposta honesta, nunca silêncio
  { grupo: 'ruído', frase: 'asdfghjkl', espera: /Não entendi/ },
  { grupo: 'ruído', frase: 'batata', espera: /Não entendi/ },
  { grupo: 'ruído', frase: '???', espera: /Não entendi/ },
  { grupo: 'fora de escopo', frase: 'qual a capital da frança?', espera: /foge do meu balcão/ },
  { grupo: 'fora de escopo', frase: 'me conta uma piada?', espera: /foge do meu balcão/ },
  { grupo: 'fora de escopo', frase: 'vai chover amanhã?', espera: /foge do meu balcão/ },

  // ---- Estresse NO MEIO do fluxo (etapa celular, nome/e-mail já dados)
  { grupo: 'meio: motivo', frase: 'pra que você quer meu celular?', espera: /falar com você depois do evento.*com DDD/is, etapa: 'celular' },
  { grupo: 'meio: recusa de campo', frase: 'não quero passar meu telefone', espera: /nada de spam, nada de repasse/, etapa: 'celular' },
  { grupo: 'meio: desvio', frase: 'quais os prêmios mesmo?', espera: /Kindles.*celular com DDD/is, etapa: 'celular' },
  { grupo: 'meio: desvio', frase: 'quem é você?', espera: /assistente virtual da Belago.*celular com DDD/is, etapa: 'celular' },
  { grupo: 'meio: re-pedido', frase: 'quero participar!', espera: /já está participando.*celular com DDD/is, etapa: 'celular' },
  { grupo: 'meio: desistência', frase: 'ah deixa pra lá, desisto', espera: /paro por aqui/, etapa: 'celular' },
  { grupo: 'meio: dado errado', frase: '11987654321', espera: /parece um telefone/, etapa: 'email' },
  { grupo: 'meio: consentimento', frase: 'por que você precisa guardar?', espera: /é a lei.*revogar a autorização quando quiser/is, etapa: 'consentimento' },
  // Gírias e variações de sim/não (user, 09-14) no aceite LGPD
  { grupo: 'consentimento: sim', frase: 'é', espera: /^$/, etapa: 'consentimento', grava: true },
  { grupo: 'consentimento: sim', frase: 'ya', espera: /^$/, etapa: 'consentimento', grava: true },
  { grupo: 'consentimento: sim', frase: 'sí', espera: /^$/, etapa: 'consentimento', grava: true },
  { grupo: 'consentimento: sim', frase: 'tá bom', espera: /^$/, etapa: 'consentimento', grava: true },
  { grupo: 'consentimento: sim', frase: 'ctz', espera: /^$/, etapa: 'consentimento', grava: true },
  { grupo: 'consentimento: não', frase: 'acho que não', espera: /não consigo te inscrever/, etapa: 'consentimento' },
  { grupo: 'consentimento: não', frase: 'nah', espera: /não consigo te inscrever/, etapa: 'consentimento' },
  { grupo: 'consentimento: não', frase: 'não aceito', espera: /não consigo te inscrever/, etapa: 'consentimento' },
  // "é, não quero" NÃO é um sim — a curtíssima "é" só vale sozinha
  { grupo: 'consentimento: não', frase: 'é, não quero', espera: /sim.*ou.*não|não consigo te inscrever/is, etapa: 'consentimento' },
  { grupo: 'meio: consentimento', frase: 'sei lá, talvez', espera: /sim.*ou.*não/is, etapa: 'consentimento' },
];

// ---- Runner ---------------------------------------------------------------

let passou = 0;
const falhas: string[] = [];

function montarEstado(caso: Caso): EstadoMotor {
  const base = estadoInicial();
  // O fluxo novo abre em QUIZ; a etapa 'abertura' virou legado por texto —
  // os CASOS de linguagem continuam medindo o motor nela.
  if (!caso.etapa || caso.etapa === 'abertura') return { ...base, etapa: 'abertura' };
  return { ...base, ...MEIO, etapa: caso.etapa } as EstadoMotor;
}

for (const caso of CASOS) {
  const r = avancar(montarEstado(caso), caso.frase);
  const texto = r.falas.join('\n');
  const okTexto = caso.espera.test(texto);
  const okInicia = caso.inicia === undefined || (r.estado.etapa === 'nome') === caso.inicia;
  const okGrava = caso.grava === undefined || Boolean(r.gravar) === caso.grava;
  if (okTexto && okInicia && okGrava) {
    passou++;
  } else {
    falhas.push(
      `✗ [${caso.grupo}] "${caso.frase}"` +
      (okTexto ? '' : `\n    esperava ${caso.espera} — veio: ${JSON.stringify(texto)}`) +
      (okInicia ? '' : `\n    esperava iniciar=${caso.inicia}, etapa ficou "${r.estado.etapa}"`) +
      (okGrava ? '' : `\n    esperava gravar=${caso.grava}`),
    );
  }
}

// ---- Fluxos encadeados ----------------------------------------------------

function rodarFluxo(nome: string, entradas: string[], confere: (e: EstadoMotor, gravou: boolean) => string | null) {
  let estado = estadoInicial();
  let gravou = false;
  for (const entrada of entradas) {
    const r = avancarResolvendo(estado, entrada);
    estado = r.estado;
    if (r.gravar) { gravou = true; estado = { ...estado, etapa: 'fim', codigo: 'TESTE1' }; }
  }
  const problema = confere(estado, gravou);
  if (problema) falhas.push(`✗ [fluxo] ${nome}: ${problema}`);
  else passou++;
}

// Nome COMPLETO obrigatório (user 09-01): só o primeiro nome → pede o
// sobrenome e SOMA a resposta seguinte; particela ("da Silva") soma; nome
// inteiro repetido substitui.
{
  const casos: Array<[string[], string]> = [
    [['Belago', 'Vamos', 'Gabriel', 'Moraes'], 'Gabriel Moraes'],
    [['Belago', 'Vamos', 'Gabriel', 'da Silva'], 'Gabriel da Silva'],
    [['Belago', 'Vamos', 'Gabriel', 'Gabriel Moraes'], 'Gabriel Moraes'],
  ];
  for (const [entradas, esperado] of casos) {
    let estado = estadoInicial();
    for (const entrada of entradas) estado = avancar(estado, entrada).estado;
    if (estado.dados.nome === esperado && estado.etapa === 'email') passou++;
    else falhas.push(`✗ [nome completo] ${JSON.stringify(entradas)} → nome "${estado.dados.nome}" (esperava "${esperado}"), etapa "${estado.etapa}"`);
  }
  const inicioNome = avancar(avancar(estadoInicial(), 'Belago').estado, 'Vamos').estado;
  const so1 = avancar(inicioNome, 'Gabriel');
  if (/sobrenome/.test(so1.falas.join('\n')) && so1.estado.etapa === 'nome') passou++;
  else falhas.push(`✗ [nome completo] só o primeiro nome não pediu sobrenome — veio: ${JSON.stringify(so1.falas.join('\n'))}`);

  // Apresentação vira nome limpo (produção, 09-15): "Meu nome é Paulo Abade"
  // registrava "Meu" e a bela dizia "Prazer, Meu!". A abertura é descascada.
  const apresentacoes: Array<[string, string]> = [
    ['Meu nome é Paulo Abade', 'Paulo Abade'],
    ['meu nome e Paulo Abade', 'Paulo Abade'],
    ['me chamo Ana Souza', 'Ana Souza'],
    ['Eu me chamo Ana Souza', 'Ana Souza'],
    ['Sou o Gabriel Moraes', 'Gabriel Moraes'],
    ['eu sou a Bia Reis', 'Bia Reis'],
    ['Oi, meu nome é Bia Reis', 'Bia Reis'],
    ['pode me chamar de Ana Souza', 'Ana Souza'],
    ['nome: Paulo Abade', 'Paulo Abade'],
    // "É Fulano" (produção, 09-15: "É José Almeida" → "Prazer, É!")
    ['É José Almeida', 'José Almeida'],
    ['é o José Almeida', 'José Almeida'],
  ];
  for (const [entrada, esperado] of apresentacoes) {
    const r = avancar(inicioNome, entrada);
    if (r.estado.dados.nome === esperado && r.estado.etapa === 'email') passou++;
    else falhas.push(`✗ [apresentação] ${JSON.stringify(entrada)} → nome "${r.estado.dados.nome}" (esperava "${esperado}"), etapa "${r.estado.etapa}"`);
  }
  // Só o primeiro nome com apresentação: guarda o nome certo, pede sobrenome —
  // e "meu sobrenome é X" na segunda rodada também é descascado.
  // "Prazer!" SEM ecoar o nome (user, 09-15): a captura de frase solta erra
  // feio demais pra repetir em voz alta.
  const ap1 = avancar(inicioNome, 'meu nome é Paulo');
  const prazerOk = /Prazer! E o seu \*\*sobrenome\*\*/.test(ap1.falas.join('\n'))
    && !/Prazer,/.test(ap1.falas.join('\n'))
    && ap1.estado.dados.nome === 'Paulo' && ap1.estado.etapa === 'nome';
  const ap2 = avancar(ap1.estado, 'meu sobrenome é Abade');
  if (prazerOk && ap2.estado.dados.nome === 'Paulo Abade' && ap2.estado.etapa === 'email') passou++;
  else falhas.push(`✗ [apresentação] "meu nome é Paulo"/"meu sobrenome é Abade" → "${ap1.falas.join(' | ')}" · nome "${ap2.estado.dados.nome}", etapa "${ap2.estado.etapa}"`);

  // NUNCA ecoar o nome capturado (user, 09-15) — a retomada também: "Boa!
  // Continuando", nunca "Boa, Fulano!".
  const meio = avancar(avancar(inicioNome, 'Ana Souza').estado, 'desisto');
  const retomou = avancar(meio.estado, 'Vamos');
  if (/Boa! Continuando/.test(retomou.falas.join('\n')) && !/Boa, /.test(retomou.falas.join('\n'))) passou++;
  else falhas.push(`✗ [sem eco] retomada ecoou o nome — veio: ${JSON.stringify(retomou.falas.join('\n'))}`);
}

// Empresa sugerida pelo domínio do e-mail (user 09-01): a bela CONFIRMA
// ("trabalha na Mentores, correto?") — sim fecha, não abre a pergunta
// clássica, e digitar outro nome direto também vale.
{
  let estado = estadoInicial();
  for (const fala of ['Belago', 'Vamos', 'Ana Souza', 'ana@mentores.com.br']) estado = avancarResolvendo(estado, fala).estado;
  const aposCelular = avancar(estado, '11 98765-4321');
  const perguntou = /trabalha na \*\*Mentores\*\*, correto\?/.test(aposCelular.falas.join('\n'));

  const disseSim = avancar(aposCelular.estado, 'sim');
  const simOk = disseSim.estado.dados.empresa === 'Mentores' && disseSim.estado.etapa === 'cargo';

  // "Correto"/"exato"/"isso mesmo" respondem "…, correto?" — apareceram como
  // NOME DE EMPRESA no banco do evento (bug real, 09-02).
  const confirmacoes = [
    'Correto', 'correto!', 'Exato', 'isso mesmo', 'Perfeito', 'confirmado',
    'siiim', 'aham', 'confere', 'na mosca', 'pode crer', 'exatamente', 'certeza',
    'verdade', 'é essa mesmo', 'isso aí', 'óbvio', 'claro que sim', 'joia', 'blz',
    // gírias e outras línguas (user, 09-14) — as curtíssimas só valem sozinhas
    'é', 'eh', 'sí', 'ya', 'aha', 'issooo', 'tá bom', 'tabom', 'ctz', 'yup',
    // e digitar o PRÓPRIO nome sugerido também confirma
    'Mentores', 'mentores',
  ];
  const confirmaOk = confirmacoes.every((c) => {
    const r2 = avancar(aposCelular.estado, c);
    return r2.estado.dados.empresa === 'Mentores' && r2.estado.etapa === 'cargo';
  });
  const negouErrado = avancar(aposCelular.estado, 'errado');
  const erradoOk = /qual empresa/i.test(negouErrado.falas.join('\n')) && negouErrado.estado.dados.empresa === '';

  const disseNao = avancar(aposCelular.estado, 'não');
  const abriuPergunta = /qual empresa/i.test(disseNao.falas.join('\n'));
  const corrigiu = avancar(disseNao.estado, 'Belago');
  const naoOk = abriuPergunta && corrigiu.estado.dados.empresa === 'Belago' && corrigiu.estado.etapa === 'cargo';

  // Outro nome no lugar da confirmação NÃO grava direto: a bela reconfirma
  // ("Combinado então: **X** — isso?") e só o "isso" fecha (user, 09-14).
  const direto = avancar(aposCelular.estado, 'Belago');
  const reconfirmou = /Combinado então: \*\*Belago\*\* — isso\?/.test(direto.falas.join('\n'))
    && direto.estado.etapa === 'empresa' && direto.estado.dados.empresa === '';
  const fechou = avancar(direto.estado, 'Isso');
  const diretoOk = reconfirmou && fechou.estado.dados.empresa === 'Belago' && fechou.estado.etapa === 'cargo';

  // Negar a pendência abre a pergunta clássica; um segundo nome substitui a
  // pendência e reconfirma de novo; digitar o mesmo nome pendente confirma.
  const negouPendente = avancar(direto.estado, 'não');
  const pendenteNaoOk = /qual empresa/i.test(negouPendente.falas.join('\n')) && negouPendente.estado.empresaPendente === null;
  const trocou = avancar(direto.estado, 'Acme Corp');
  const trocouOk = /Combinado então: \*\*Acme Corp\*\* — isso\?/.test(trocou.falas.join('\n'));
  const repetiu = avancar(direto.estado, 'belago');
  const repetiuOk = repetiu.estado.dados.empresa === 'Belago' && repetiu.estado.etapa === 'cargo';
  // e o desvio no meio da pendência retoma a RECONFIRMAÇÃO, não a sugestão
  const desviouPendente = avancar(direto.estado, 'quais os prêmios?');
  const desvioPendenteOk = /Combinado então: \*\*Belago\*\* — isso\?/.test(desviouPendente.falas.join('\n'));

  if (perguntou && simOk && naoOk && diretoOk && confirmaOk && erradoOk && pendenteNaoOk && trocouOk && repetiuOk && desvioPendenteOk) passou++;
  else falhas.push(`✗ [empresa sugerida] perguntou=${perguntou} sim=${simOk} nao=${naoOk} direto=${diretoOk} confirma=${confirmaOk} errado=${erradoOk} pendNao=${pendenteNaoOk} trocou=${trocouOk} repetiu=${repetiuOk} desvioPend=${desvioPendenteOk}`);
}

// Apresentação também na EMPRESA (user, 09-15, par do caso "Prazer, Meu!"):
// "trabalho na Mentores" gravaria a frase inteira no banco — descascada, vale
// como confirmação da sugestão, como correção (pendência limpa) e na aberta.
{
  let estado = estadoInicial();
  for (const fala of ['Belago', 'Vamos', 'Ana Souza', 'ana@mentores.com.br']) estado = avancarResolvendo(estado, fala).estado;
  const aposCelular = avancar(estado, '11 98765-4321');

  // a MESMA empresa da sugestão, dita numa frase → confirma direto
  const confirmou = avancar(aposCelular.estado, 'trabalho na Mentores');
  if (confirmou.estado.dados.empresa === 'Mentores' && confirmou.estado.etapa === 'cargo') passou++;
  else falhas.push(`✗ [empresa apresentação] "trabalho na Mentores" como confirmação → empresa "${confirmou.estado.dados.empresa}", etapa "${confirmou.estado.etapa}"`);

  // OUTRA empresa numa frase, no meio da confirmação → pendência já limpa
  const corrigiu = avancar(aposCelular.estado, 'eu trabalho na Belago');
  if (corrigiu.estado.empresaPendente === 'Belago' && /Combinado então: \*\*Belago\*\* — isso\?/.test(corrigiu.falas.join('\n'))) passou++;
  else falhas.push(`✗ [empresa apresentação] correção em frase → pendência "${corrigiu.estado.empresaPendente}" · ${JSON.stringify(corrigiu.falas.join('\n'))}`);

  // pergunta ABERTA (recusou a sugestão) → frases variadas viram só o nome
  const aberta = avancar(aposCelular.estado, 'não').estado;
  const frases: Array<[string, string]> = [
    ['trabalho na Belago', 'Belago'],
    ['sou da Mentores', 'Mentores'],
    ['minha empresa é a Belago', 'Belago'],
    ['a empresa se chama Mentores', 'Mentores'],
    ['é a Belago', 'Belago'],
    ['tô na Belago Tech', 'Belago Tech'],
    ['Estou na Mentores', 'Mentores'],
    ['empresa: Belago', 'Belago'],
    ['É Belago', 'Belago'],
  ];
  for (const [entrada, esperado] of frases) {
    const r = avancar(aberta, entrada);
    if (r.estado.dados.empresa === esperado && r.estado.etapa === 'cargo') passou++;
    else falhas.push(`✗ [empresa apresentação] ${JSON.stringify(entrada)} → empresa "${r.estado.dados.empresa}" (esperava "${esperado}"), etapa "${r.estado.etapa}"`);
  }
}

// Verificação de e-mail ANTES da próxima pergunta (user 09-01): livre → segue
// para o celular; já cadastrado → corta com o código (um código por pessoa);
// já usado → "não dá pra girar duas vezes".
{
  let estado = estadoInicial();
  for (const fala of ['Belago', 'Vamos', 'Ana Souza']) estado = avancar(estado, fala).estado;
  const r = avancar(estado, 'ana@acme.com.br');
  const pediuVerificacao = r.verificarEmail === true && r.estado.etapa === 'verificando_email' && r.falas.length === 0;

  const livre = resolverVerificacao(r.estado, false);
  const livreOk = livre.estado.etapa === 'celular' && /celular com DDD/.test(livre.falas.join('\n'));

  const dup = resolverVerificacao(r.estado, true, 'AB23CD', null);
  const dupOk = dup.estado.etapa === 'fim' && /um código.*apenas.*AB23CD/is.test(dup.falas.join('\n'));

  // Check 1 + check 2: gerado E usado → sem código em destaque; dia/hora do
  // giro + participação única + estande. E o pós-fim não devolve o código.
  const usado = resolverVerificacao(r.estado, true, 'AB23CD', '2026-09-01T15:00:00Z');
  const textoUsado = usado.falas.join('\n');
  const usadoOk = usado.estado.codigoUsado === true
    && /já se cadastrou por aqui e gerou o código \*\*AB23CD\*\* 😉/.test(textoUsado)
    && /foi \*\*usado\*\* dia \d{2}\/\d{2} às \d{2}:\d{2} 🍀 A \*\*participação é única\*\* por pessoa/.test(textoUsado)
    && /alguém da Belago/.test(textoUsado);
  const perdidoUsado = avancar(usado.estado, 'perdi meu código');
  const perdidoUsadoOk = /única por pessoa/.test(perdidoUsado.falas.join('\n')) && !/AB23CD/.test(perdidoUsado.falas.join('\n'));

  if (pediuVerificacao && livreOk && dupOk && usadoOk && perdidoUsadoOk) passou++;
  else falhas.push(`✗ [verificação de e-mail] pediu=${pediuVerificacao} livre=${livreOk} dup=${dupOk} usado=${usadoOk} perdidoUsado=${perdidoUsadoOk} — ${JSON.stringify(textoUsado)}`);
}

// Pitch ouvido → "sim" NÃO repete a lista de prêmios (polida 09-01): a
// abertura curta menciona as cinco perguntas, e Alexa/roleta ficam de fora.
{
  // No fluxo novo: quem passou pelo "Quero saber mais" (a explicação já cita
  // os prêmios) recebe a abertura CURTA ao topar.
  const r1 = avancar(estadoInicial(), 'Belago');            // quiz → convite
  const r1b = avancar(r1.estado, 'Quero saber mais');       // explica (ofereceu)
  const r2 = avancar(r1b.estado, 'Vamos');
  const texto = r2.falas.join('\n');
  if (/cinco perguntas rápidas/.test(texto) && !/Kindle|roleta/i.test(texto) && r2.estado.etapa === 'nome') passou++;
  else falhas.push(`✗ [polida] pós-pitch repetiu prêmios ou não iniciou — veio: ${JSON.stringify(texto)}`);
}

rodarFluxo(
  'feliz completo (com desvio no meio)',
  ['Belago', 'Vamos', 'Ana Souza', 'ana@acme.com.br', 'quais os prêmios?', '11 98765-4321', 'Acme', 'Gerente', 'pra que guardar?', 'sim'],
  (e, gravou) => (!gravou ? 'não chegou à gravação' : e.dados.celular !== '11987654321' ? `celular errado: ${e.dados.celular}` : null),
);

rodarFluxo(
  'desiste no celular e retoma de onde parou (desistir volta ao CONVITE)',
  ['Belago', 'Vamos', 'Ana Souza', 'ana@acme.com.br', 'desisto', 'Vamos'],
  (e) => (e.etapa !== 'celular' ? `esperava retomar em "celular", ficou "${e.etapa}"` : e.dados.nome !== 'Ana Souza' ? 'perdeu o nome ao retomar' : null),
);

rodarFluxo(
  'recusa o consentimento e volta atrás',
  ['Belago', 'Vamos', 'Ana Souza', 'ana@acme.com.br', '11 98765-4321', 'Acme', 'Gerente', 'não', 'pensei melhor, sim'],
  (e, gravou) => (!gravou ? 'o "sim" depois da recusa não gravou' : null),
);

rodarFluxo(
  'pós-fim: perdeu o código e agradece (motor cobre; a TELA sela o teclado)',
  ['Belago', 'Vamos', 'Ana Souza', 'ana@acme.com.br', '11 98765-4321', 'Acme', 'Gerente', 'sim', 'perdi meu código', 'obrigado!'],
  (e) => (e.etapa !== 'fim' ? `pós-fim mudou a etapa para "${e.etapa}"` : null),
);

// pós-fim: as respostas certas com o código em mãos
{
  const fim: EstadoMotor = { ...estadoInicial(), etapa: 'fim', codigo: 'AB23CD', dados: { nome: 'Ana', email: 'a@a.com.br', celular: '11987654321', empresa: 'Acme', cargo: 'G' } };
  const casosFim: Array<[string, RegExp]> = [
    ['perdi meu código', /AB23CD/],
    ['quero participar de novo', /já está dentro.*AB23CD/is],
    ['onde eu giro?', /um giro por pessoa|estande/],
    ['obrigado', /Boa sorte na roleta/],
    ['blz então', /cartão logo acima|estande/],
  ];
  for (const [frase, espera] of casosFim) {
    const r = avancar(fim, frase);
    if (espera.test(r.falas.join('\n'))) passou++;
    else falhas.push(`✗ [pós-fim] "${frase}" — veio: ${JSON.stringify(r.falas.join('\n'))}`);
  }
}

// Confirmação por BOTÃO (regra do CLIENTE, 09-15): toda confirmação trava o
// teclado até ser respondida; texto livre só onde o input manual é necessário.
// Cada rótulo de botão precisa resolver no vocabulário — o clique vira
// mensagem real.
{
  const problemas: string[] = [];

  // QUIZ de abertura (cliente, 09-15): resposta ABERTA — teclado livre, sem
  // botões; acerta quem escrever algo "que tenha bela", o resto ganha a piada.
  // Os dois caminhos convergem no CONVITE.
  if (botoesDe(estadoInicial()) !== null) problemas.push('quiz é resposta aberta — não devia ter botões');
  const acerto = avancar(estadoInicial(), 'Belago');
  if (!(/Isso aí/.test(acerto.falas.join('\n')) && acerto.estado.etapa === 'convite')) problemas.push('acertar o quiz devia dar Isso ai + convite');
  for (const certa of ['belago tech', 'Belago Technologies', 'a bela!', 'BELAGO', 'Belago e Luxor', 'Luxor', 'Belago | Luxor', 'a luxor!']) {
    if (!/Isso aí/.test(avancar(estadoInicial(), certa).falas.join('\n'))) problemas.push(`"${certa}" tem bela ou luxor — devia ser acerto`);
  }
  // Errar o quiz = UMA resposta CORINGA (user, 09-15, simplificação): serve
  // pra empresa errada, "não sei", dúvida, nome de pessoa ou ruído — sempre
  // revela a certa e segue pro mesmo convite. (A bifurcação piada/hesitação
  // foi descartada: "Essa é boa também" pra "Carlos" errava o tom.)
  for (const errada of [
    'IBM', 'Google', 'a Amazon', 'Microsoft Brasil',
    'Não sei', 'nao sei', 'sei lá', 'não quero responder', 'Quem pode saber?',
    'qual é', 'Alguma aí', 'tanto faz', 'Carlos', 'meu chefe', 'hmm', 'ué', 'kkkk', '???',
  ]) {
    const r = avancar(estadoInicial(), errada);
    if (!(/a resposta, na verdade, é a \*\*Belago e a Luxor\*\* 😛/.test(r.falas.join('\n')) && r.estado.etapa === 'convite')) {
      problemas.push(`"${errada}" devia levar a coringa + convite — veio: ${JSON.stringify(r.falas.join(' | '))}`);
    }
  }
  const noConvite = botoesDe(acerto.estado);
  if (!(noConvite && noConvite.bloqueiaEntrada && noConvite.botoes.join('|') === 'Vamos|Quero saber mais')) problemas.push('convite devia travar com Vamos/Quero saber mais');
  const soube = avancar(acerto.estado, 'Quero saber mais');
  if (!(/conjunto de perguntas rápidas/.test(soube.falas.join('\n')) && botoesDe(soube.estado)?.botoes.join('|') === 'Vamos')) {
    problemas.push('Quero saber mais devia explicar e deixar so o botao Vamos');
  }
  if (avancar(soube.estado, 'Vamos').estado.etapa !== 'nome') problemas.push('Vamos apos saber mais devia iniciar o cadastro');

  // Fluxo inteiro respondendo confirmações SÓ pelos rótulos dos botões.
  let estado = estadoInicial();
  for (const fala of ['Belago', 'Vamos', 'Ana Souza', 'ana@mentores.com.br']) {
    const r = avancarResolvendo(estado, fala);
    estado = r.estado;
  }
  estado = avancar(estado, '11 98765-4321').estado;
  const naEmpresa = botoesDe(estado);
  if (!naEmpresa?.bloqueiaEntrada) problemas.push('sugestão de empresa devia travar o teclado');

  const negou = avancar(estado, 'Não, em outra');
  if (botoesDe(negou.estado) !== null) problemas.push('empresa ABERTA (pós-não) devia liberar input manual sem botões');

  estado = avancar(estado, 'Sim, correto').estado;
  if (estado.dados.empresa !== 'Mentores' || botoesDe(estado) !== null) problemas.push('Sim, é essa devia fechar Mentores e liberar o cargo');

  estado = avancar(estado, 'Gerente').estado;
  const noConsent = botoesDe(estado);
  if (!(noConsent && noConsent.bloqueiaEntrada && noConsent.botoes.length === 3)) problemas.push('consentimento devia travar com 3 botões');

  const porque = avancar(estado, 'Por que precisam?');
  if (!(/é a lei.*revogar a autorização quando quiser/is.test(porque.falas.join('\n')) && porque.estado.etapa === 'consentimento')) problemas.push('Por que precisam? devia justificar e manter a etapa');

  const autorizou = avancar(estado, 'Sim, autorizo');
  if (autorizou.gravar !== true) problemas.push('Sim, autorizo devia gravar');
  const negouConsent = avancar(estado, 'Não autorizo');
  if (negouConsent.estado.etapa !== 'recusado') problemas.push('Não autorizo devia recusar');
  if (botoesDe(negouConsent.estado)?.bloqueiaEntrada !== true) problemas.push('recusado tem atalho de volta com teclado TRAVADO');

  const retry: EstadoMotor = { ...estado, etapa: 'retry' };
  if (!(botoesDe(retry)?.botoes.length === 1 && avancar(retry, 'Tentar de novo').gravar === true)) problemas.push('retry devia ter 1 botão que regrava');

  for (const et of ['nome', 'email', 'celular', 'cargo', 'fim'] as Etapa[]) {
    if (botoesDe({ ...estadoInicial(), etapa: et }) !== null) problemas.push(`${et} é input manual — não devia ter botões`);
  }

  if (problemas.length === 0) passou++;
  else falhas.push(`✗ [confirmação por botão] ${problemas.join(' | ')}`);
}

// ---- Resultado ------------------------------------------------------------

const total = passou + falhas.length;
console.log(`\nSuíte de estresse do canal de leads: ${passou}/${total}\n`);
if (falhas.length) {
  for (const f of falhas) console.log(f + '\n');
  process.exit(1);
}
