import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Per-field confidence of a BELA enrichment (CLAUDE.md §2: "Toda vez que a BELA
 * enriquece um campo, mostra a confiança daquele enriquecimento especificamente").
 * Attach next to the enriched field — not as a page-level score.
 */
export interface ConfidenceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** 0–100. */
  value: number;
}

export function ConfidenceBadge({ value, className, ...props }: ConfidenceBadgeProps) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[var(--space-2xs)] rounded-[var(--radius-pill)] border bg-accent-bela-surface border-accent-bela-border text-accent-bela-fg px-[var(--space-xs)] py-[var(--space-3xs)] text-[length:var(--caption-size)] font-[var(--weight-semibold)] whitespace-nowrap',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">✦</span>
      confiança {pct}%
    </span>
  );
}
