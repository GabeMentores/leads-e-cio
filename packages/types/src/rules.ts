/**
 * ⚠️ REGRAS DERIVADAS PROVISÓRIAS — NÃO são regra de negócio oficial.
 *
 * Os docs-fonte citam os CONCEITOS "Criticidade BIA" e "score de Saúde" de um
 * ativo, mas NÃO definem a régua/fórmula (CLAUDE.md §9 — lacuna documental).
 * Estas funções existem só para a demo rodar sobre uma derivação REAL e
 * consistente (a pedido do user, 2026-07-31), em vez de valores chutados à mão.
 *
 * A régua oficial ainda precisa ser definida pela Belago/fábrica — ver
 * `docs/regras-derivadas-provisorias.md`. Ao trocar por valores oficiais, basta
 * reimplementar estas duas funções; nada mais no schema/seed muda.
 *
 * Puras e sem dependências (mesmo contrato do resto de @bela/types).
 */

import type { AssetLifecycle, AssetStatus, Criticality } from './itsm';

/* ───────────────────────── Criticidade BIA (provisória) ──────────────────────
 * Modelo de pontos por Business Impact Analysis simplificado:
 *   base por categoria + VIP do responsável + ativo compartilhado (infra).
 * Faixa: ≤1 baixa · 2 média · 3 alta · ≥4 crítica. */

/** Peso-base por categoria de ativo (impacto ao negócio se o ativo falhar). */
export const BIA_CATEGORY_WEIGHT: Record<string, number> = {
  Redes: 3, // firewall/switch → afeta toda a rede
  Software: 3, // ERP/licença-servidor → afeta processos
  Computadores: 2,
  Telefones: 1,
  Periféricos: 1,
  Monitores: 1,
};

export interface AssetCriticalityInput {
  category: string;
  ownerVip?: boolean;
  /** Ativo compartilhado / de infraestrutura (sem responsável individual). */
  shared?: boolean;
}

/** Deriva a criticidade BIA (PROVISÓRIA) a partir dos campos disponíveis. */
export function deriveAssetCriticality(a: AssetCriticalityInput): Criticality {
  let pts = BIA_CATEGORY_WEIGHT[a.category] ?? 1;
  if (a.ownerVip) pts += 1;
  if (a.shared) pts += 1;
  if (pts >= 4) return 'critical';
  if (pts === 3) return 'high';
  if (pts === 2) return 'medium';
  return 'low';
}

/* ─────────────────────────── Score de Saúde (provisório) ─────────────────────
 * 0–100 a partir de lifecycle, garantia, idade e chamados abertos. Retorna
 * `null` (N/A) quando o ativo está em manutenção ou baixado — não há sinal de
 * saúde confiável. Fatores ancorados no que §3.7.2 lista como "risco de ativo,
 * obsolescência, recorrência" (lifecycle, garantia, contrato, vínculo com
 * tickets); a ponderação exata é PROVISÓRIA. */

export interface AssetHealthInput {
  lifecycle: AssetLifecycle;
  status: AssetStatus;
  warrantyEnd?: Date | null;
  purchasedAt?: Date | null;
  /** Há um chamado de manutenção/incidente aberto referenciando o ativo. */
  hasOpenTicket?: boolean;
  /** Data de referência do cálculo (default: agora). Deixa o seed determinístico. */
  now?: Date;
}

const DAY = 86_400_000;

export interface AssetHealthBreakdown {
  score: number | null;
  /** Os fatores que DE FATO pesaram no score (motivo do número, §6.12) — a
   *  MESMA função produz número e explicação, então nunca divergem. */
  factors: string[];
}

/** Score + fatores numa passada só (2026-08-24). É a fonte única do "Fatores:"
 *  do drawer do ativo — antes o front re-derivava por conta própria e podia
 *  listar fator que não pesou (ou omitir um que pesou). */
export function explainAssetHealth(a: AssetHealthInput): AssetHealthBreakdown {
  if (a.status === 'maintenance' || a.lifecycle === 'retired') {
    return { score: null, factors: [] };
  }
  const now = a.now ?? new Date();
  let h = 100;
  const factors: string[] = [];

  if (a.lifecycle === 'obsolete') {
    h -= 60;
    factors.push('fora do ciclo de vida (obsoleto)');
  }

  if (a.warrantyEnd) {
    const daysLeft = (a.warrantyEnd.getTime() - now.getTime()) / DAY;
    if (daysLeft < 0) {
      h -= 20;
      factors.push('garantia vencida');
    } else if (daysLeft < 90) {
      h -= 8;
      factors.push('garantia próxima do vencimento');
    }
  }

  if (a.purchasedAt) {
    const years = (now.getTime() - a.purchasedAt.getTime()) / (DAY * 365);
    const wear = Math.min(30, Math.round(years * 6)); // desgaste por idade (cap 30)
    if (wear > 0) {
      h -= wear;
      factors.push(`desgaste por idade (~${Math.max(1, Math.round(years))} ano${Math.round(years) > 1 ? 's' : ''} de uso)`);
    }
  }

  if (a.hasOpenTicket) {
    h -= 10;
    factors.push('chamado aberto referenciando o ativo');
  }

  // clamp; piso 3 para operacional (0 pareceria "sem dado")
  return { score: Math.max(3, Math.min(100, Math.round(h))), factors };
}

/** Deriva o score de saúde (PROVISÓRIO). `null` = indisponível (manutenção/baixa). */
export function deriveAssetHealth(a: AssetHealthInput): number | null {
  return explainAssetHealth(a).score;
}

/* ─────────────────────── Score de evidência (provisório) ──────────────────────
 * Item 63 do checklist do cliente: trocar "confiança XX%" por "Score de
 * evidência" ou pelas faixas Alta, Média e Baixa. Escolhida a FAIXA, e não o
 * percentual renomeado, porque o número não sustenta um percentual:
 *
 * o que o motor calcula (`keywordRetrieve`) é a FRAÇÃO DOS TERMOS da pergunta
 * cobertos pelo artigo — sobreposição de palavras, não probabilidade calibrada.
 * A granularidade é 1/nº de termos: uma pergunta de quatro palavras só pode dar
 * 0, 25, 50, 75 ou 100. Exibir "48%" promete uma precisão que a medida não tem,
 * e é justamente essa promessa que o cliente pediu para desfazer — o mesmo
 * espírito dos itens 62, 64 e 65.
 *
 * A RÉGUA É PROVISÓRIA, como as duas acima: os cortes saem de um metro de
 * sobreposição, não de calibração contra resposta julgada por humano. Quando
 * houver medida de verdade (evidência recuperada, trecho citado, avaliação do
 * curador), é só reimplementar aqui. */

export type EvidenceBand = 'high' | 'medium' | 'low';

/** Cortes definidos pelo dono em 16/09, enquanto não há régua oficial:
 *  0–60 baixa · 61–80 média · 81–100 alta. */
export const EVIDENCE_CUTS = { high: 81, medium: 61 } as const;

export const EVIDENCE_BAND_LABELS: Record<EvidenceBand, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

/**
 * O QUE CADA FAIXA QUER DIZER (definição do dono, 16/09). O eixo é o LASTRO da
 * resposta e o que ele implica sobre revisão humana — não um intervalo de
 * número.
 *
 * ⚠️ A MEDIDA DE HOJE NÃO ALCANÇA ESTA DEFINIÇÃO, e isso precisa estar escrito
 * aqui em vez de descoberto depois: `keywordRetrieve` calcula sobreposição de
 * termos, que não distingue "chutou" de "acredita por uso anterior" — as duas
 * coisas podem dar a mesma fração. Os cortes de EVIDENCE_CUTS são um PROXY até existir
 * a medida que a definição pede: histórico de tickets parecidos, trecho
 * citado, lógica aplicada e avaliação do curador. Quando ela existir, é só
 * reimplementar `evidenceBand`; os rótulos e estes textos continuam valendo.
 */
export const EVIDENCE_BAND_MEANING: Record<EvidenceBand, string> = {
  low: 'O modelo só chutou — nada no histórico ou na lógica sustenta a resposta.',
  medium: 'O modelo acredita, por uso anterior ou por lógica, que é essa a resposta — mas orienta revisão.',
  high: 'Histórico de chamados e lógica apontam fortemente para a resposta; o modelo não vê necessidade de revisão.',
};

/** Faixa de evidência a partir do percentual de cobertura (0–100). */
export function evidenceBand(pct: number): EvidenceBand {
  if (!Number.isFinite(pct)) return 'low';
  if (pct >= EVIDENCE_CUTS.high) return 'high';
  if (pct >= EVIDENCE_CUTS.medium) return 'medium';
  return 'low';
}
