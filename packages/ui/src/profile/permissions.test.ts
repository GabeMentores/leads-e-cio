import { describe, it, expect } from 'vitest';
import { profileAllows, PROFILES, type ProfileId } from './store';

/**
 * Permissionamento de telas (Caderno §4.3 e §4.4).
 *
 * É o requisito mais consequente do documento: quem alcança a tela errada vê
 * dado de gente que não deveria. E é o mais fácil de quebrar sem perceber —
 * basta uma rota nova entrar no roteador e ninguém lembrar de acrescentá-la ao
 * conjunto do perfil, que foi exatamente o que aconteceu com "Tickets da
 * equipe" (comentário em `store.ts`: a rota apareceu no menu da colaboradora
 * porque não estava em MANAGED_ROUTES).
 *
 * Estes testes fixam a MATRIZ do Caderno §4.4, não a implementação. Quando uma
 * tela nova entrar, um caso aqui falha até que a matriz seja atualizada de
 * propósito — que é o objetivo.
 *
 * NOTA: o gate do front é experiência de uso. A segurança é a revalidação no
 * backend (§4.3) e essa vive em `apps/server`.
 */

const TELAS_DE_TODOS = ['#/', '#/nova-solicitacao', '#/meus-tickets', '#/base-conhecimento', '#/detalhe-ticket'];

/** Uma persona representativa de cada família do §4.4. */
const COLABORADORA: ProfileId = 'colaborador';
const APROVADOR: ProfileId = 'gestor2';
const GESTORA_OPERACAO: ProfileId = 'gestora_operacao';
const ANALISTA: ProfileId = 'analista';
const ADMIN: ProfileId = 'admin';

describe('§4.4 — o que cada perfil alcança no bela desk', () => {
  it('todo perfil do desk alcança o catálogo, a abertura, os próprios chamados e a base', () => {
    for (const perfil of [COLABORADORA, APROVADOR, GESTORA_OPERACAO, ANALISTA, ADMIN]) {
      for (const rota of TELAS_DE_TODOS) {
        expect(profileAllows(perfil, rota), `${perfil} → ${rota}`).toBe(true);
      }
    }
  });

  it('a colaboradora NÃO alcança nada de operação, ativos ou governança', () => {
    const proibidas = [
      '#/lista-tickets', '#/tickets-equipe', '#/aprovacoes', '#/dashboard',
      '#/assets', '#/discovery', '#/consumo', '#/configuracoes', '#/integracao-glpi',
    ];
    for (const rota of proibidas) {
      expect(profileAllows(COLABORADORA, rota), `colaboradora → ${rota}`).toBe(false);
    }
  });

  it('o gestor aprovador tem Aprovações e mais nada de operação (decisão 2026-08-19/27)', () => {
    expect(profileAllows(APROVADOR, '#/aprovacoes')).toBe(true);
    // Aprovador não é operador de fila nem administrador da plataforma.
    expect(profileAllows(APROVADOR, '#/lista-tickets')).toBe(false);
    expect(profileAllows(APROVADOR, '#/dashboard')).toBe(false);
    expect(profileAllows(APROVADOR, '#/consumo')).toBe(false);
    expect(profileAllows(APROVADOR, '#/configuracoes')).toBe(false);
  });

  it('o analista opera a fila mas não aprova nem administra', () => {
    expect(profileAllows(ANALISTA, '#/lista-tickets')).toBe(true);
    expect(profileAllows(ANALISTA, '#/tickets-equipe')).toBe(true);
    expect(profileAllows(ANALISTA, '#/assets')).toBe(true);
    expect(profileAllows(ANALISTA, '#/discovery')).toBe(true);
    expect(profileAllows(ANALISTA, '#/aprovacoes')).toBe(false);
    expect(profileAllows(ANALISTA, '#/configuracoes')).toBe(false);
    expect(profileAllows(ANALISTA, '#/consumo')).toBe(false);
    // Decisão explícita de 2026-09-03: o corte do analista é a fila, não o
    // painel global — contraria o §4.4 de propósito, e o backend acompanha.
    expect(profileAllows(ANALISTA, '#/dashboard')).toBe(false);
  });

  it('a gestora de operação lê o painel, a fila, os ativos e o consumo — e não aprova', () => {
    expect(profileAllows(GESTORA_OPERACAO, '#/dashboard')).toBe(true);
    expect(profileAllows(GESTORA_OPERACAO, '#/lista-tickets')).toBe(true);
    expect(profileAllows(GESTORA_OPERACAO, '#/assets')).toBe(true);
    expect(profileAllows(GESTORA_OPERACAO, '#/consumo')).toBe(true);
    expect(profileAllows(GESTORA_OPERACAO, '#/aprovacoes')).toBe(false);
    expect(profileAllows(GESTORA_OPERACAO, '#/configuracoes')).toBe(false);
  });

  it('só o admin do bela desk alcança Configurações e a Integração GLPI', () => {
    expect(profileAllows(ADMIN, '#/configuracoes')).toBe(true);
    expect(profileAllows(ADMIN, '#/integracao-glpi')).toBe(true);
    for (const perfil of [COLABORADORA, APROVADOR, GESTORA_OPERACAO, ANALISTA]) {
      expect(profileAllows(perfil, '#/configuracoes'), `${perfil} → configuracoes`).toBe(false);
      expect(profileAllows(perfil, '#/integracao-glpi'), `${perfil} → integracao-glpi`).toBe(false);
    }
  });
});

describe('§4.3 — o gate não pode ser contornado pela URL', () => {
  it('ignora a query: o mesmo destino com parâmetro decide igual', () => {
    expect(profileAllows(ANALISTA, '#/lista-tickets?risk=1')).toBe(profileAllows(ANALISTA, '#/lista-tickets'));
    expect(profileAllows(COLABORADORA, '#/configuracoes?x=1')).toBe(false);
  });

  it('sub-rota herda a decisão da rota-mãe (artigo da base, novo alerta)', () => {
    expect(profileAllows(COLABORADORA, '#/base-conhecimento/artigo')).toBe(true);
    expect(profileAllows(COLABORADORA, '#/configuracoes/qualquer-coisa')).toBe(false);
  });

  it('não confunde prefixo de nome com sub-rota', () => {
    // "#/assets-secreto" NÃO é sub-rota de "#/assets" — e como não é gerida,
    // passa; o que não pode é ser tratada como se fosse a tela de ativos.
    expect(profileAllows(COLABORADORA, '#/assets')).toBe(false);
  });

  it('toda persona cai numa landing que ela própria alcança', () => {
    for (const id of Object.keys(PROFILES) as ProfileId[]) {
      const { landing } = PROFILES[id];
      expect(profileAllows(id, landing), `${id} não alcança a própria landing ${landing}`).toBe(true);
    }
  });
});

describe('§4.4 — separação entre os dois produtos', () => {
  it('nenhuma persona do bela desk alcança tela do bela core', () => {
    const doCore = ['#/admin', '#/rag', '#/automacoes', '#/auditoria', '#/predict'];
    for (const perfil of [COLABORADORA, APROVADOR, GESTORA_OPERACAO, ANALISTA, ADMIN]) {
      for (const rota of doCore) {
        expect(profileAllows(perfil, rota), `${perfil} → ${rota}`).toBe(false);
      }
    }
  });

  it('a curadora do Predict só alcança o Predict — nem administra nem audita', () => {
    expect(profileAllows('predict_curator', '#/predict')).toBe(true);
    expect(profileAllows('predict_curator', '#/predict/novo')).toBe(true);
    expect(profileAllows('predict_curator', '#/admin')).toBe(false);
    expect(profileAllows('predict_curator', '#/auditoria')).toBe(false);
    expect(profileAllows('predict_curator', '#/configuracoes')).toBe(false);
  });

  it('o auditor alcança as telas do core (a escrita é recusada no backend)', () => {
    for (const rota of ['#/admin', '#/rag', '#/automacoes', '#/consumo', '#/auditoria', '#/predict']) {
      expect(profileAllows('auditor', rota), `auditor → ${rota}`).toBe(true);
    }
  });

  it('a administradora da bela alcança todo o core', () => {
    for (const rota of ['#/admin', '#/rag', '#/automacoes', '#/consumo', '#/auditoria', '#/predict', '#/configuracoes']) {
      expect(profileAllows('admin_bela', rota), `admin_bela → ${rota}`).toBe(true);
    }
  });
});

describe('roster — o que o switcher oferece', () => {
  it('cada persona declara um app, e só os dois que existem', () => {
    for (const id of Object.keys(PROFILES) as ProfileId[]) {
      expect(['deskone', 'console']).toContain(PROFILES[id].app);
    }
  });

  it('o e-mail da persona é único — é a ponte de identidade do X-Persona', () => {
    const emails = Object.values(PROFILES).map((p) => p.email);
    expect(new Set(emails).size).toBe(emails.length);
  });
});
