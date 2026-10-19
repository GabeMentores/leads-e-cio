import { describe, it, expect } from 'vitest';
import { USAGE_UNIT, USAGE_UNIT_DEDUP, USAGE_UNIT_LABELS } from './bela';

/**
 * Política de deduplicação por ciclo (Caderno §4.2.2).
 *
 * Testada porque é uma regra COMERCIAL: classificar uma unidade no modo errado
 * cobra o cliente a mais (ou a menos) e só aparece no fechamento do mês. E é
 * silenciosa — uma unidade nova entra no `USAGE_UNIT` e, sem entrada aqui, o
 * TypeScript reclama, mas um valor copiado da linha de cima passa liso.
 */

describe('USAGE_UNIT_DEDUP', () => {
  it('classifica TODAS as unidades — nenhuma fica sem política', () => {
    for (const unidade of USAGE_UNIT) {
      expect(USAGE_UNIT_DEDUP[unidade], `${unidade} sem política de dedup`).toBeDefined();
    }
    expect(Object.keys(USAGE_UNIT_DEDUP)).toHaveLength(USAGE_UNIT.length);
  });

  it('usa só os dois modos previstos', () => {
    for (const unidade of USAGE_UNIT) {
      expect(['per_origin', 'per_event']).toContain(USAGE_UNIT_DEDUP[unidade]);
    }
  });

  it('ticket assistido conta uma vez por chamado — o exemplo literal do Caderno', () => {
    expect(USAGE_UNIT_DEDUP.ticket_assisted).toBe('per_origin');
  });

  it('automação executada e consulta RAG contam por execução — a ressalva do Caderno', () => {
    // "salvo automações transacionais expressamente contratadas": cada execução
    // e cada pergunta é um trabalho novo, não a repetição do mesmo item.
    expect(USAGE_UNIT_DEDUP.automation_executed).toBe('per_event');
    expect(USAGE_UNIT_DEDUP.rag_query).toBe('per_event');
  });

  it('tudo que nomeia um ITEM trabalhado é deduplicado por origem', () => {
    const porItem = ['ticket_assisted', 'ticket_resolved', 'asset_managed', 'asset_onboarded', 'predict_item_evaluated', 'deskone_user_item'] as const;
    for (const unidade of porItem) {
      expect(USAGE_UNIT_DEDUP[unidade], `${unidade} deveria contar por item`).toBe('per_origin');
    }
  });

  it('toda unidade tem rótulo — a tela nunca mostra a chave técnica', () => {
    for (const unidade of USAGE_UNIT) {
      expect(USAGE_UNIT_LABELS[unidade]).toBeTruthy();
    }
  });
});

/**
 * A contagem em si (a função que a rota aplica). Reproduzida aqui em miniatura
 * para fixar o CONTRATO: `per_origin` colapsa por origem, `per_event` não.
 */
function contar(mode: 'per_origin' | 'per_event', origens: string[]): number {
  return mode === 'per_origin' ? new Set(origens).size : origens.length;
}

describe('contagem deduplicada', () => {
  it('o mesmo chamado assistido três vezes conta como um', () => {
    expect(contar('per_origin', ['#4200', '#4200', '#4200'])).toBe(1);
  });

  it('chamados diferentes contam separado', () => {
    expect(contar('per_origin', ['#4200', '#4201', '#4202'])).toBe(3);
  });

  it('três execuções da mesma automação contam três', () => {
    expect(contar('per_event', ['vpn-reset', 'vpn-reset', 'vpn-reset'])).toBe(3);
  });

  it('ciclo sem evento nenhum conta zero, não quebra', () => {
    expect(contar('per_origin', [])).toBe(0);
    expect(contar('per_event', [])).toBe(0);
  });

  it('a contagem deduplicada nunca passa do número de chamadas', () => {
    const origens = ['a', 'b', 'a', 'c', 'b'];
    expect(contar('per_origin', origens)).toBeLessThanOrEqual(origens.length);
  });
});
