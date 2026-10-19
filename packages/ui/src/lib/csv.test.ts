import { describe, it, expect } from 'vitest';
import { toCsv, csvDateSuffix } from './csv';

/**
 * Formato do CSV exportado (Caderno §4.2 e §4.5). Testado porque o arquivo sai
 * do produto e é aberto no Excel do cliente: um separador errado joga a planilha
 * inteira numa coluna só, e um acento quebrado aparece em toda linha. Nenhuma
 * das duas falhas aparece numa revisão visual da tela.
 */

describe('toCsv', () => {
  it('usa ponto e vírgula — o Excel em pt-BR não separa por vírgula', () => {
    const csv = toCsv(['A', 'B'], [['1', '2']]);
    expect(csv).toContain('A;B');
    expect(csv).toContain('1;2');
  });

  it('começa com BOM UTF-8, senão o Excel corrompe os acentos', () => {
    expect(toCsv(['Código'], [['Ação']]).charCodeAt(0)).toBe(0xfeff);
  });

  it('separa as linhas com CRLF', () => {
    const csv = toCsv(['A'], [['1'], ['2']]);
    expect(csv).toBe('﻿A\r\n1\r\n2');
  });

  it('escapa célula com ponto e vírgula', () => {
    expect(toCsv(['A'], [['x;y']])).toContain('"x;y"');
  });

  it('escapa aspas dobrando-as (RFC 4180)', () => {
    expect(toCsv(['A'], [['diz "olá"']])).toContain('"diz ""olá"""');
  });

  it('escapa quebra de linha dentro da célula sem partir a linha do arquivo', () => {
    const csv = toCsv(['A', 'B'], [['linha1\nlinha2', 'ok']]);
    expect(csv).toContain('"linha1\nlinha2";ok');
    // Uma linha de dado só: o \n de dentro da célula está entre aspas.
    expect(csv.split('\r\n')).toHaveLength(2);
  });

  it('não escapa o que não precisa — nada de aspas decorativas', () => {
    expect(toCsv(['A'], [['simples']])).toBe('﻿A\r\nsimples');
  });

  it('trata null e undefined como célula vazia, não como o texto "null"', () => {
    expect(toCsv(['A', 'B', 'C'], [[null, undefined, 'x']])).toBe('﻿A;B;C\r\n;;x');
  });

  it('aceita número sem convertê-lo em texto com aspas', () => {
    expect(toCsv(['N'], [[42]])).toBe('﻿N\r\n42');
  });

  it('escapa também o cabeçalho — coluna com ; não pode partir a grade', () => {
    expect(toCsv(['Saúde; %'], [['1']])).toContain('"Saúde; %"');
  });

  it('sem linhas, devolve só o cabeçalho (arquivo válido, não vazio)', () => {
    expect(toCsv(['A', 'B'], [])).toBe('﻿A;B');
  });
});

describe('csvDateSuffix', () => {
  it('formata como AAAA-MM-DD, com zero à esquerda', () => {
    expect(csvDateSuffix(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(csvDateSuffix(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('usa a data LOCAL — o nome do arquivo tem que bater com o dia de quem exporta', () => {
    // 23h locais do dia 9: em UTC já seria dia 10 no fuso de São Paulo.
    expect(csvDateSuffix(new Date(2026, 8, 9, 23, 30))).toBe('2026-09-09');
  });
});
