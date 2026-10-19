// Regras da API do canal de captação, independentes de runtime: as funções da
// Vercel (api/*.ts) e o middleware do dev server (vite-plugin-leads-api)
// chamam ESTES handlers — cada um só adapta req/res. A lógica não se duplica.
import { resolveMx, lookup } from 'node:dns/promises';
import { randomInt, timingSafeEqual } from 'node:crypto';
// Imports relativos COM extensão .js (convenção TS/ESM): o compilador da
// Vercel roda as funções api/* em moduleResolution nodenext, que exige a
// extensão explícita — sem ela o deploy quebra (TS2835). Vite/esbuild
// resolvem .js → .ts normalmente, então o front não muda nada.
import { validarEmail, validarCelular } from '../shared/email.js';
import { normalizarCodigo } from '../shared/codigo.js';

export { normalizarCodigo };

// ---- Persistência ---------------------------------------------------------

export interface LeadRecord {
  nome: string;
  email: string;
  celular: string;
  empresa: string;
  cargo: string;
  consentimentoEm: string;
  codigo: string;
  codigoUsadoEm: string | null;
  origem: string;
  criadoEm?: string;
}

export interface LeadsStore {
  findByEmail(email: string): Promise<LeadRecord | null>;
  findByCodigo(codigo: string): Promise<LeadRecord | null>;
  /** Lança { code: 'DUP_EMAIL' | 'DUP_CODIGO' } em violação de unicidade. */
  insert(lead: LeadRecord): Promise<LeadRecord>;
  /** Marca o código como usado SÓ se ainda não foi (atômico). Devolve o
   *  registro atualizado, ou null se já estava usado/não existe. */
  markUsado(codigo: string, quando: string): Promise<LeadRecord | null>;
  listAll(): Promise<LeadRecord[]>;
}

export interface HandlerResult {
  status: number;
  body: unknown;
}

// ---- Código da roleta -----------------------------------------------------
// 6 caracteres de alfabeto sem ambíguos (nada de O/0/I/1): o participante vai
// LER o código em voz alta ou mostrar a tela ao staff. Gerado no servidor,
// nunca no front (regra anti-mock 08-24). ~29^6 ≈ 594M combinações.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.replace(/[O0I1]/g, '');

export function gerarCodigo(): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += ALFABETO[randomInt(ALFABETO.length)];
  return out;
}

// ---- MX -------------------------------------------------------------------
// Camada 4 da validação de e-mail: o domínio precisa RECEBER e-mail. Só nega
// em resposta definitiva do DNS (domínio não existe / sem MX). Falha de rede
// ou timeout NÃO bloqueia: no evento, um soluço de DNS não pode derrubar a
// captação — o lead vale mais que a checagem.
async function dominioRecebeEmail(dominio: string): Promise<boolean> {
  try {
    const mx = await Promise.race([
      resolveMx(dominio),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    if (mx === null) return true; // timeout → benefício da dúvida
    return mx.length > 0;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOTFOUND' || code === 'ENODATA') return false;
    // A consulta MX (c-ares fala direto com o DNS) pode estar bloqueada na
    // rede (VPN/firewall → ECONNREFUSED). Segunda opinião pelo resolver do
    // PRÓPRIO sistema (getaddrinfo): pega domínio inexistente mesmo assim.
    // Só o "não existe" definitivo dele reprova; qualquer outra falha passa.
    try {
      await lookup(dominio);
      return true;
    } catch (err2) {
      return (err2 as NodeJS.ErrnoException).code !== 'ENOTFOUND';
    }
  }
}

// ---- Autenticação por token (validador do staff / export do comercial) ----

function tokenConfere(recebido: string | undefined, esperado: string | undefined): boolean {
  if (!esperado) return false; // env ausente = fecha, nunca abre
  if (!recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---- POST /api/lead -------------------------------------------------------

export interface CriarLeadInput {
  nome?: unknown;
  email?: unknown;
  celular?: unknown;
  empresa?: unknown;
  cargo?: unknown;
  consentiu?: unknown;
  /** true = só CONSULTA se o e-mail já participa (não grava nada) — o chat
   *  usa no momento em que o e-mail é digitado, para avisar na hora em vez
   *  de deixar a pessoa responder o resto à toa. */
  consulta?: unknown;
}

export async function criarLead(store: LeadsStore, input: CriarLeadInput): Promise<HandlerResult> {
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  if (input.consulta === true) {
    const email = validarEmail(texto(input.email));
    if (!email.ok) return { status: 200, body: { jaExiste: false } };
    const existente = await store.findByEmail(email.email);
    return {
      status: 200,
      body: existente
        ? { jaExiste: true, codigo: existente.codigo, codigoUsadoEm: existente.codigoUsadoEm }
        : { jaExiste: false },
    };
  }
  const nome = texto(input.nome);
  const empresa = texto(input.empresa);
  const cargo = texto(input.cargo);

  // Consentimento LGPD é pré-condição de GRAVAR, não campo do formulário: sem
  // o aceite afirmativo na conversa, o POST nem deveria ter acontecido.
  if (input.consentiu !== true) return { status: 422, body: { erro: 'SEM_CONSENTIMENTO' } };
  if (nome.length < 2 || empresa.length < 2 || cargo.length < 2) {
    return { status: 422, body: { erro: 'CAMPOS' } };
  }

  const email = validarEmail(texto(input.email));
  if (!email.ok) {
    const mapa = { formato: 'EMAIL_FORMATO', gratuito: 'EMAIL_GRATUITO', descartavel: 'EMAIL_DESCARTAVEL' } as const;
    return { status: 422, body: { erro: mapa[email.motivo] } };
  }

  const celular = validarCelular(texto(input.celular));
  if (!celular) return { status: 422, body: { erro: 'CELULAR' } };

  if (!(await dominioRecebeEmail(email.dominio))) {
    return { status: 422, body: { erro: 'EMAIL_DOMINIO', dominio: email.dominio } };
  }

  // Idempotente por e-mail: quem já participa recebe o MESMO código de volta
  // (F5, troca de aparelho, segunda conversa) — nunca uma segunda chance.
  const existente = await store.findByEmail(email.email);
  if (existente) {
    return {
      status: 200,
      body: { codigo: existente.codigo, jaExistia: true, codigoUsadoEm: existente.codigoUsadoEm },
    };
  }

  const agora = new Date().toISOString();
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      const criado = await store.insert({
        nome, email: email.email, celular, empresa, cargo,
        consentimentoEm: agora, codigo: gerarCodigo(), codigoUsadoEm: null,
        origem: 'evento-qr',
      });
      return { status: 201, body: { codigo: criado.codigo, jaExistia: false, codigoUsadoEm: null } };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'DUP_EMAIL') {
        // corrida entre dois envios do mesmo e-mail — devolve o que venceu
        const vencedor = await store.findByEmail(email.email);
        if (vencedor) {
          return { status: 200, body: { codigo: vencedor.codigo, jaExistia: true, codigoUsadoEm: vencedor.codigoUsadoEm } };
        }
      }
      if (code !== 'DUP_CODIGO') throw err; // colisão de código → tenta outro
    }
  }
  return { status: 500, body: { erro: 'CODIGO_ESGOTADO' } };
}

// ---- POST /api/validar ----------------------------------------------------
// Dois momentos com o MESMO endpoint: consulta (confirmar ausente/false) mostra
// quem é o dono do código; confirmação (confirmar true) marca como usado e
// libera o giro. A marcação é atômica no store — dois staffs com o mesmo
// código, só um confirma.

export interface ValidarInput {
  codigo?: unknown;
  confirmar?: unknown;
}

export async function validarCodigo(
  store: LeadsStore, input: ValidarInput, tokenRecebido: string | undefined, tokenStaff: string | undefined,
): Promise<HandlerResult> {
  if (!tokenConfere(tokenRecebido, tokenStaff)) return { status: 401, body: { erro: 'NAO_AUTORIZADO' } };

  const codigo = normalizarCodigo(typeof input.codigo === 'string' ? input.codigo : '');
  if (codigo.length !== 6) return { status: 422, body: { erro: 'CODIGO_FORMATO' } };

  const lead = await store.findByCodigo(codigo);
  if (!lead) return { status: 200, body: { status: 'nao_encontrado' } };
  if (lead.codigoUsadoEm) {
    return { status: 200, body: { status: 'ja_usado', nome: lead.nome, usadoEm: lead.codigoUsadoEm } };
  }

  if (input.confirmar !== true) {
    return { status: 200, body: { status: 'valido', nome: lead.nome, empresa: lead.empresa } };
  }

  const marcado = await store.markUsado(codigo, new Date().toISOString());
  if (!marcado) {
    const atual = await store.findByCodigo(codigo);
    return { status: 200, body: { status: 'ja_usado', nome: lead.nome, usadoEm: atual?.codigoUsadoEm ?? null } };
  }
  return { status: 200, body: { status: 'confirmado', nome: marcado.nome } };
}

// ---- GET /api/leads -------------------------------------------------------

export async function listarLeads(
  store: LeadsStore, tokenRecebido: string | undefined, tokenAdmin: string | undefined, formato?: string,
): Promise<HandlerResult> {
  if (!tokenConfere(tokenRecebido, tokenAdmin)) return { status: 401, body: { erro: 'NAO_AUTORIZADO' } };

  const leads = await store.listAll();
  if (formato === 'csv') {
    const esc = (v: string | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [
      'nome,email,celular,empresa,cargo,codigo,codigo_usado_em,consentimento_em,criado_em',
      ...leads.map((l) => [l.nome, l.email, l.celular, l.empresa, l.cargo, l.codigo, l.codigoUsadoEm, l.consentimentoEm, l.criadoEm ?? ''].map(esc).join(',')),
    ];
    return { status: 200, body: linhas.join('\r\n') };
  }
  return { status: 200, body: { total: leads.length, leads } };
}
