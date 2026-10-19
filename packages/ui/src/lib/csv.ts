/**
 * Exportação CSV — o helper único do app (Caderno §4.2 e §4.5: "exportação"
 * é requisito de TABELA, não de uma tela específica).
 *
 * Existia em duplicata inline em Assets e em Consumo, cada uma com o seu
 * escape e o seu BOM. Ao entrar a terceira (Lista de tickets) a regra do DS
 * (CLAUDE.md §10.1) vale igual para utilitário: a forma nasce em um lugar só.
 *
 * Decisões que o formato carrega:
 * - **`;` como separador** — o Excel em pt-BR abre CSV vírgula numa coluna só.
 * - **BOM UTF-8** (`﻿`) — sem ele o Excel lê "Código" como "CÃ³digo".
 * - **CRLF** entre linhas — o que o Excel espera; `\n` puro funciona no Sheets
 *   mas quebra em versões antigas do Excel.
 * - Escapa só quando precisa (`;`, `"`, quebra de linha), aspa dupla dobrada.
 */

/** Valor aceito numa célula. `null`/`undefined` viram string vazia. */
export type CsvCell = string | number | null | undefined;

/** Escapa uma célula conforme RFC 4180 (com `;` como separador). */
function escapeCell(value: CsvCell): string {
  const s = value == null ? '' : String(value);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Monta o texto do CSV (com BOM) a partir do cabeçalho e das linhas. */
export function toCsv(header: readonly string[], rows: readonly CsvCell[][]): string {
  const body = rows.map((r) => r.map(escapeCell).join(';'));
  return `﻿${[header.map(escapeCell).join(';'), ...body].join('\r\n')}`;
}

/**
 * Gera o CSV e dispara o download no navegador.
 *
 * `filename` entra sem extensão — o `.csv` é acrescentado aqui para que nenhuma
 * tela precise lembrar disso. Devolve quantas LINHAS de dado foram exportadas,
 * para a tela usar no toast sem recontar.
 */
export function downloadCsv(
  filename: string,
  header: readonly string[],
  rows: readonly CsvCell[][],
): number {
  const blob = new Blob([toCsv(header, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return rows.length;
}

/** Sufixo de data para o nome do arquivo (`2026-09-10`), fuso local. */
export function csvDateSuffix(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
