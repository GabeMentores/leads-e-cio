import { describe, it, expect } from 'vitest';
import {
  deriveAssetCriticality, deriveAssetHealth, explainAssetHealth, BIA_CATEGORY_WEIGHT,
  evidenceBand, EVIDENCE_BAND_LABELS,
} from './rules';

/**
 * Regras derivadas de ativo (CLAUDE.md §9 — régua PROVISÓRIA até a Belago
 * definir a oficial). São testadas porque produzem NÚMERO NA TELA: a saúde e a
 * criticidade aparecem no Assets, no drawer e no Predict, e um erro aqui não
 * quebra nada — só mostra o número errado, que é o pior tipo de defeito.
 *
 * Os testes fixam o CONTRATO, não os pesos: quando a régua oficial chegar, o
 * que deve continuar valendo é a ordenação (obsoleto vale menos que novo),
 * o `null` de manutenção/baixa e o casamento entre número e explicação.
 */

const DAY = 86_400_000;
/** Data fixa: sem `now` fixo, "garantia vencida" muda de resultado amanhã. */
const NOW = new Date('2026-09-10T12:00:00.000Z');

describe('deriveAssetCriticality', () => {
  it('usa o peso da categoria como base', () => {
    expect(deriveAssetCriticality({ category: 'Redes' })).toBe('high'); // 3 pts
    expect(deriveAssetCriticality({ category: 'Computadores' })).toBe('medium'); // 2 pts
    expect(deriveAssetCriticality({ category: 'Periféricos' })).toBe('low'); // 1 pt
  });

  it('trata categoria desconhecida como o menor peso, em vez de quebrar', () => {
    expect(deriveAssetCriticality({ category: 'Categoria que não existe' })).toBe('low');
  });

  it('sobe um degrau para responsável VIP e outro para ativo compartilhado', () => {
    expect(deriveAssetCriticality({ category: 'Computadores' })).toBe('medium');
    expect(deriveAssetCriticality({ category: 'Computadores', ownerVip: true })).toBe('high');
    expect(deriveAssetCriticality({ category: 'Computadores', ownerVip: true, shared: true })).toBe('critical');
  });

  it('satura em crítica — nenhum acúmulo passa do topo da escala', () => {
    expect(deriveAssetCriticality({ category: 'Redes', ownerVip: true, shared: true })).toBe('critical');
  });

  it('mantém todas as categorias do seed dentro da escala conhecida', () => {
    const escala = ['low', 'medium', 'high', 'critical'];
    for (const categoria of Object.keys(BIA_CATEGORY_WEIGHT)) {
      expect(escala).toContain(deriveAssetCriticality({ category: categoria }));
    }
  });
});

describe('deriveAssetHealth', () => {
  it('devolve null (N/A) em manutenção ou baixa — não há sinal confiável', () => {
    expect(deriveAssetHealth({ lifecycle: 'active', status: 'maintenance', now: NOW })).toBeNull();
    expect(deriveAssetHealth({ lifecycle: 'retired', status: 'in_use', now: NOW })).toBeNull();
  });

  it('dá 100 ao ativo novo, em uso e sem nenhum agravante', () => {
    expect(deriveAssetHealth({ lifecycle: 'active', status: 'in_use', now: NOW })).toBe(100);
  });

  it('penaliza o obsoleto muito mais que a garantia vencida', () => {
    const obsoleto = deriveAssetHealth({ lifecycle: 'obsolete', status: 'in_use', now: NOW })!;
    const semGarantia = deriveAssetHealth({
      lifecycle: 'active', status: 'in_use', warrantyEnd: new Date(NOW.getTime() - 10 * DAY), now: NOW,
    })!;
    expect(obsoleto).toBeLessThan(semGarantia);
  });

  it('distingue garantia vencida de garantia por vencer', () => {
    const vencida = deriveAssetHealth({
      lifecycle: 'active', status: 'in_use', warrantyEnd: new Date(NOW.getTime() - DAY), now: NOW,
    })!;
    const porVencer = deriveAssetHealth({
      lifecycle: 'active', status: 'in_use', warrantyEnd: new Date(NOW.getTime() + 30 * DAY), now: NOW,
    })!;
    const folgada = deriveAssetHealth({
      lifecycle: 'active', status: 'in_use', warrantyEnd: new Date(NOW.getTime() + 400 * DAY), now: NOW,
    })!;
    expect(vencida).toBeLessThan(porVencer);
    expect(porVencer).toBeLessThan(folgada);
    expect(folgada).toBe(100);
  });

  it('nunca sai da faixa 3–100, mesmo com todos os agravantes juntos', () => {
    const pior = deriveAssetHealth({
      lifecycle: 'obsolete',
      status: 'in_use',
      warrantyEnd: new Date(NOW.getTime() - 500 * DAY),
      purchasedAt: new Date(NOW.getTime() - 12 * 365 * DAY),
      hasOpenTicket: true,
      now: NOW,
    })!;
    expect(pior).toBeGreaterThanOrEqual(3);
    expect(pior).toBeLessThanOrEqual(100);
  });

  it('é determinístico: a mesma entrada devolve o mesmo número', () => {
    const entrada = {
      lifecycle: 'active' as const, status: 'in_use' as const,
      purchasedAt: new Date(NOW.getTime() - 3 * 365 * DAY), now: NOW,
    };
    expect(deriveAssetHealth(entrada)).toBe(deriveAssetHealth(entrada));
  });
});

describe('explainAssetHealth — número e motivo saem da mesma passada', () => {
  it('lista só os fatores que de fato pesaram (CLAUDE.md §2, padrão número/motivo)', () => {
    const { score, factors } = explainAssetHealth({
      lifecycle: 'obsolete', status: 'in_use',
      warrantyEnd: new Date(NOW.getTime() - DAY), hasOpenTicket: true, now: NOW,
    });
    expect(score).toBeLessThan(100);
    expect(factors).toContain('fora do ciclo de vida (obsoleto)');
    expect(factors).toContain('garantia vencida');
    expect(factors).toContain('chamado aberto referenciando o ativo');
    // Não inventa fator: sem data de compra, desgaste por idade não entra.
    expect(factors.some((f) => f.includes('desgaste'))).toBe(false);
  });

  it('ativo impecável tem score cheio e NENHUM fator — nada a explicar', () => {
    const { score, factors } = explainAssetHealth({ lifecycle: 'active', status: 'in_use', now: NOW });
    expect(score).toBe(100);
    expect(factors).toEqual([]);
  });

  it('sem score (N/A) também não há fatores', () => {
    const { score, factors } = explainAssetHealth({ lifecycle: 'active', status: 'maintenance', now: NOW });
    expect(score).toBeNull();
    expect(factors).toEqual([]);
  });

  it('concorda com deriveAssetHealth — as duas portas devolvem o mesmo número', () => {
    const entrada = {
      lifecycle: 'obsolete' as const, status: 'in_use' as const,
      purchasedAt: new Date(NOW.getTime() - 5 * 365 * DAY), now: NOW,
    };
    expect(explainAssetHealth(entrada).score).toBe(deriveAssetHealth(entrada));
  });
});

/**
 * SCORE DE EVIDÊNCIA (item 63 do cliente). A régua é provisória, mas os cortes
 * precisam ser estáveis: é por eles que a fila de curadoria classifica, e um
 * ajuste silencioso mudaria a leitura da fila inteira sem ninguém perceber.
 */
describe('evidenceBand — faixa de evidência', () => {
  it('classifica pelos cortes do dono: 0–60 baixa, 61–80 média, 81–100 alta', () => {
    expect(evidenceBand(100)).toBe('high');
    expect(evidenceBand(81)).toBe('high');
    expect(evidenceBand(80)).toBe('medium');
    expect(evidenceBand(61)).toBe('medium');
    expect(evidenceBand(60)).toBe('low');
    expect(evidenceBand(0)).toBe('low');
  });

  it('número inválido cai para baixa — nunca promete evidência que não mediu', () => {
    expect(evidenceBand(Number.NaN)).toBe('low');
  });

  it('os valores que a medida REALMENTE produz caem onde se espera', () => {
    // O motor calcula termos-casados / termos-da-pergunta. Com 4 termos só
    // existem cinco resultados possíveis — a granularidade que desautoriza o
    // percentual e justifica a faixa.
    expect([0, 25, 50, 75, 100].map(evidenceBand)).toEqual(['low', 'low', 'low', 'medium', 'high']);
  });

  it('toda faixa tem rótulo em português', () => {
    expect(EVIDENCE_BAND_LABELS[evidenceBand(90)]).toBe('Alta');
    expect(EVIDENCE_BAND_LABELS[evidenceBand(70)]).toBe('Média');
    expect(EVIDENCE_BAND_LABELS[evidenceBand(10)]).toBe('Baixa');
  });
});
