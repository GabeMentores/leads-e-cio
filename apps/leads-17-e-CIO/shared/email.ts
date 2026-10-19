// Validação de e-mail do canal de captação — MÓDULO ÚNICO consumido pelo front
// (feedback imediato na conversa) e pelas funções da API (enforcement real).
// Duplicar a lista nos dois lados foi descartado de saída: era só questão de
// tempo até um bloquear o que o outro aceita.
//
// Camadas (decisão 2026-09-01, docs/leads-chat-passo1-RASCUNHO.md):
//   1. formato
//   2. provedor GRATUITO — regra dura: só e-mail corporativo participa
//   3. domínio DESCARTÁVEL (temporário)
//   4. MX do domínio — essa é só do servidor (node:dns), não vive aqui.

export type EmailRecusa = 'formato' | 'gratuito' | 'descartavel';
export type EmailVeredito =
  | { ok: true; email: string; dominio: string }
  | { ok: false; motivo: EmailRecusa };

// Provedores de e-mail PESSOAL (gratuitos ou de consumo). Domínio registrável;
// subdomínios caem junto (`endsWith`). Lista viva — acrescentar aqui vale para
// o front e para a API ao mesmo tempo.
const GRATUITOS = [
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.com.br', 'ymail.com', 'rocketmail.com',
  'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br',
  'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'zoho.com', 'gmx.com', 'gmx.net', 'mail.com', 'email.com',
  'yandex.com', 'yandex.ru', 'mail.ru',
  'tutanota.com', 'tuta.io', 'tuta.com', 'hey.com', 'fastmail.com',
  // brasileiros
  'bol.com.br', 'uol.com.br', 'terra.com.br', 'ig.com.br',
  'globo.com', 'globomail.com', 'oi.com.br', 'r7.com',
  'zipmail.com.br', 'itelefonica.com.br', 'pop.com.br',
  'tuamaeaquelaursa.com',
];

// Serviços de e-mail temporário/descartável (recusados sempre).
const DESCARTAVEIS = [
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', 'grr.la',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org',
  'temp-mail.io', 'tempmail.dev', 'throwawaymail.com', 'yopmail.com',
  'getnada.com', 'nada.email', 'trashmail.com', 'dispostable.com',
  'maildrop.cc', 'mintemail.com', 'mohmal.com', 'fakeinbox.com',
  'mailnesia.com', 'tempr.email', 'discard.email', 'spamgourmet.com',
  'mytemp.email', 'burnermail.io', 'emailondeck.com', 'mail-temp.com',
];

const FORMATO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizarEmail(bruto: string): string {
  return bruto.trim().toLowerCase().replace(/^mailto:/, '');
}

function bateLista(dominio: string, lista: string[]): boolean {
  return lista.some((d) => dominio === d || dominio.endsWith(`.${d}`));
}

/** Distância de Damerau–Levenshtein (OSA) — só até onde interessa (limite 1).
 *  Pega "gmial.com", "hotmal.com", "gmail.con": erro de digitação de provedor
 *  pessoal é provedor pessoal, não domínio corporativo novo. */
function distancia1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  const m = a.length; const n = b.length;
  const linha = [Array(n + 1).fill(0), Array(n + 1).fill(0), Array(n + 1).fill(0)];
  for (let j = 0; j <= n; j++) linha[0][j] = j;
  for (let i = 1; i <= m; i++) {
    const atual = linha[i % 3]; const prev = linha[(i - 1) % 3]; const prev2 = linha[(i - 2) % 3];
    atual[0] = i;
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(prev[j] + 1, atual[j - 1] + 1, prev[j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        atual[j] = Math.min(atual[j], prev2[j - 2] + 1); // transposição
      }
    }
  }
  return linha[m % 3][n] <= 1;
}

/** O domínio é (ou quase é) um provedor pessoal? Typo a 1 edição de um
 *  gratuito conta como gratuito. */
function provedorPessoal(dominio: string): boolean {
  if (bateLista(dominio, GRATUITOS)) return true;
  return GRATUITOS.some((d) => distancia1(dominio, d));
}

export function validarEmail(bruto: string): EmailVeredito {
  const email = normalizarEmail(bruto);
  if (!FORMATO.test(email)) return { ok: false, motivo: 'formato' };
  const dominio = email.slice(email.lastIndexOf('@') + 1);
  if (provedorPessoal(dominio)) return { ok: false, motivo: 'gratuito' };
  if (bateLista(dominio, DESCARTAVEIS)) return { ok: false, motivo: 'descartavel' };
  return { ok: true, email, dominio };
}

/** Celular BR: 10–11 dígitos (DDD + número), DDD válido, e no caso de 11
 *  dígitos o nono dígito é 9. Devolve só os dígitos ou null. */
export function validarCelular(bruto: string): string | null {
  const digitos = bruto.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (digitos.length < 10 || digitos.length > 11) return null;
  const ddd = Number(digitos.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  if (digitos.length === 11 && digitos[2] !== '9') return null;
  return digitos;
}
