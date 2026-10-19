import * as React from 'react';
import type { Origin } from '@bela/tokens';
import { cn } from '../../lib/utils';

/**
 * Expresses the transversal ITSM-native vs BELA rule as a tag (CLAUDE.md §2).
 * Violet chrome = anything BELA-generated (module, or the enriched part of a
 * hybrid field). Neutral chrome = pure ITSM-native / session data.
 */
const DEFAULT_LABEL: Record<Origin, string> = {
  'itsm-native': 'ITSM nativo',
  'bela-module': 'bela IA',
  'hybrid-layer': 'Híbrido',
};

export interface OriginTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  origin: Origin;
}

export function OriginTag({ origin, className, children, ...props }: OriginTagProps) {
  const isBela = origin !== 'itsm-native';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[var(--space-2xs)] rounded-[var(--radius-pill)] border px-[var(--space-sm)] py-[var(--space-3xs)] text-[length:var(--caption-size)] font-[var(--weight-semibold)] whitespace-nowrap',
        isBela
          ? 'bg-accent-bela-surface border-accent-bela-border text-accent-bela-fg'
          : 'bg-tag-neutral border-tag-neutral-border text-tag-neutral-fg',
        className,
      )}
      {...props}
    >
      {isBela && <span aria-hidden="true">✦</span>}
      {children ?? DEFAULT_LABEL[origin]}
    </span>
  );
}
