// O hook da conversa — invólucro FINO do cérebro (src/cerebro.ts, puro e
// coberto pela suíte de estresse). Aqui mora só o que é do navegador: a fila
// do "escrevendo" com piso de 1200ms (regra de DS 08-27), o relógio das
// bolhas e o POST /api/lead quando o cérebro manda gravar.
import * as React from 'react';
import {
  avancar, estadoInicial, saudacaoInicial, resolverVerificacao, botoesDe,
  type EstadoMotor, type Etapa, type BotoesDaEtapa,
} from './cerebro';

export type { Etapa } from './cerebro';
export type Autor = 'bela' | 'self';

export interface Mensagem {
  id: number;
  from: Autor;
  texto: string;
  hora: string;
}

export interface EstadoConversa {
  mensagens: Mensagem[];
  digitando: boolean;
  /** true enquanto ainda há falas da bela na fila — os botões esperam. */
  ocupada: boolean;
  etapa: Etapa;
  codigo: string | null;
  /** true = código já girou; a tela não mostra o cartão grande. */
  codigoUsado: boolean;
  /** Botões da etapa (confirmação por botão, regra do cliente 09-15) e se o
   *  composer trava até a confirmação ser respondida. */
  botoes: BotoesDaEtapa | null;
  enviar: (texto: string) => void;
}

/** Piso do indicador "escrevendo" (regra de DS do user, 2026-08-27: mesmo com
 *  resposta instantânea, perder 1–2s mostrando). Soma um fôlego proporcional
 *  ao tamanho da fala — capado — para falas longas não chegarem "prontas". */
const MIN_ESCREVENDO_MS = 1200;
function tempoDeEscrita(texto: string): number {
  return MIN_ESCREVENDO_MS + Math.min(texto.length * 6, 900);
}

function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function useRoteiro(): EstadoConversa {
  const [mensagens, setMensagens] = React.useState<Mensagem[]>([]);
  const [digitando, setDigitando] = React.useState(false);
  const [etapa, setEtapa] = React.useState<Etapa>(() => estadoInicial().etapa);
  const [codigo, setCodigo] = React.useState<string | null>(null);
  const [codigoUsado, setCodigoUsado] = React.useState(false);
  const [botoes, setBotoes] = React.useState<BotoesDaEtapa | null>(() => botoesDe(estadoInicial()));
  const [ocupada, setOcupada] = React.useState(false);
  const estado = React.useRef<EstadoMotor>(estadoInicial());
  const proximoId = React.useRef(1);
  const fila = React.useRef<Promise<void>>(Promise.resolve());
  // Falas ainda não entregues — `digitando` apaga ENTRE bolhas e faria os
  // botões piscarem; o contador só zera quando a última bolha sai.
  const pendentes = React.useRef(0);

  const acrescentar = React.useCallback((from: Autor, texto: string) => {
    setMensagens((m) => [...m, { id: proximoId.current++, from, texto, hora: horaAgora() }]);
  }, []);

  /** Enfileira falas da bela: para CADA bolha, "escrevendo" pelo piso e só
   *  então a mensagem — o piso segura a bolha junto, nunca só o indicador. */
  const bela = React.useCallback((...falas: string[]) => {
    for (const fala of falas.filter(Boolean)) {
      pendentes.current += 1;
      setOcupada(true);
      fila.current = fila.current.then(async () => {
        setDigitando(true);
        await new Promise((r) => setTimeout(r, tempoDeEscrita(fala)));
        setDigitando(false);
        acrescentar('bela', fala);
        pendentes.current -= 1;
        if (pendentes.current === 0) setOcupada(false);
      });
    }
    return fila.current;
  }, [acrescentar]);

  const aplicar = React.useCallback((novo: EstadoMotor) => {
    estado.current = novo;
    setEtapa(novo.etapa);
    setCodigo(novo.codigo);
    setCodigoUsado(novo.codigoUsado);
    setBotoes(botoesDe(novo));
  }, []);

  // Saudação — dispara sozinha na chegada. (StrictMode monta 2×; o ref segura.)
  const saudou = React.useRef(false);
  React.useEffect(() => {
    if (saudou.current) return;
    saudou.current = true;
    void bela(...saudacaoInicial());
  }, [bela]);

  const gravar = React.useCallback(async () => {
    const d = estado.current.dados;
    try {
      const resposta = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...d, consentiu: true }),
      });
      const corpo = await resposta.json().catch(() => ({}));

      if (resposta.ok) {
        if (corpo.jaExistia) {
          // Mesmos dois checks e mesma copy da verificação antecipada —
          // decisão e texto moram no cérebro (resolverVerificacao).
          const r = resolverVerificacao(estado.current, true, corpo.codigo, corpo.codigoUsadoEm);
          aplicar(r.estado);
          void bela(...r.falas);
        } else {
          aplicar({ ...estado.current, etapa: 'fim', codigo: corpo.codigo, codigoUsado: false });
          void bela(
            // Sem ecoar o nome capturado (regra do user, 09-15 — vale pra
            // TODA fala: o palpite da captura não se repete em voz alta).
            `Prontinho! Seu código da roleta é **${corpo.codigo}**.`,
            'Mostra ele no estande da Belago, gira a roleta e boa sorte! 🍀',
            // A bela entra aqui como PRODUTO apresentado (3ª pessoa), nunca
            // como a voz do canal (user, 09-15).
            'E já aproveita pra perguntar como a **bela**, a assistente da Belago, pode ajudar a sua empresa no dia a dia 😉 Até já!',
          );
        }
        return;
      }

      if (corpo.erro === 'EMAIL_DOMINIO') {
        aplicar({ ...estado.current, etapa: 'email', dados: { ...d, email: '' } });
        void bela(`Hmm, o domínio **${corpo.dominio}** não parece receber e-mails 🤔 Confere pra mim? Me manda o seu e-mail corporativo de novo.`);
        return;
      }
      if (corpo.erro === 'EMAIL_GRATUITO' || corpo.erro === 'EMAIL_DESCARTAVEL' || corpo.erro === 'EMAIL_FORMATO') {
        aplicar({ ...estado.current, etapa: 'email', dados: { ...d, email: '' } });
        void bela('Esse e-mail não passou por aqui 😅 Me manda o seu **e-mail corporativo** — o da empresa onde você trabalha?');
        return;
      }
      aplicar({ ...estado.current, etapa: 'retry' });
      void bela('Opa, algo deu errado aqui e eu não consegui gravar 😔 Me manda um **ok** que eu tento de novo.');
    } catch {
      aplicar({ ...estado.current, etapa: 'retry' });
      void bela('Opa, a conexão falhou aqui e eu não consegui gravar 😔 Me manda um **ok** que eu tento de novo.');
    }
  }, [aplicar, bela]);

  /** Etapa `verificando_email` (user, 09-01): a próxima pergunta SÓ sai
   *  depois de o servidor dizer se o e-mail já participa — já cadastrado
   *  corta a conversa com o código original; consulta falhou → segue em
   *  frente (a gravação final é idempotente e pega o duplicado). */
  const verificarDuplicado = React.useCallback(async (email: string) => {
    let jaExiste = false; let codigo: string | undefined; let usadoEm: string | null | undefined;
    try {
      const resposta = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consulta: true }),
      });
      if (resposta.ok) {
        const corpo = await resposta.json();
        jaExiste = corpo.jaExiste === true;
        codigo = corpo.codigo;
        usadoEm = corpo.codigoUsadoEm;
      }
    } catch { /* offline momentâneo — segue como livre */ }
    if (estado.current.etapa !== 'verificando_email') return;
    const r = resolverVerificacao(estado.current, jaExiste, codigo, usadoEm);
    aplicar(r.estado);
    void bela(...r.falas);
  }, [aplicar, bela]);

  // Enviar durante o "escrevendo" é PERMITIDO (chat de verdade): o cérebro é
  // síncrono e a fila ordena as respostas. Bloquear aqui descartava a mensagem
  // de quem digita rápido — achado da verificação de 09-01.
  const enviar = React.useCallback((texto: string) => {
    const limpo = texto.trim();
    if (!limpo || etapa === 'gravando' || etapa === 'verificando_email') return;
    acrescentar('self', limpo);
    const r = avancar(estado.current, limpo);
    aplicar(r.estado);
    void bela(...r.falas);
    if (r.gravar) { void gravar(); return; }
    if (r.verificarEmail) void verificarDuplicado(r.estado.dados.email);
  }, [acrescentar, aplicar, bela, etapa, gravar, verificarDuplicado]);

  return { mensagens, digitando, ocupada, etapa, codigo, codigoUsado, botoes, enviar };
}

/** Placeholder do composer acompanha o que a bela pediu — affordance barata. */
export function placeholderDaEtapa(etapa: Etapa): string {
  switch (etapa) {
    case 'nome': return 'Nome e sobrenome';
    case 'email': return 'voce@empresa.com.br';
    case 'celular': return '(11) 91234-5678';
    case 'empresa': return 'Nome da empresa';
    case 'cargo': return 'Seu cargo';
    case 'consentimento': case 'recusado': return 'sim ou não';
    case 'retry': return 'ok';
    case 'quiz': return 'Sua resposta';
    case 'fim': return 'Conversa concluída';
    default: return 'Escreva aqui';
  }
}
