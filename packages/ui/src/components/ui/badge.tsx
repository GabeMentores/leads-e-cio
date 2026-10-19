import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-[var(--space-2xs)] rounded-[var(--radius-pill)] border px-[var(--space-sm)] py-[var(--space-3xs)] text-[length:var(--caption-size)] font-[var(--weight-semibold)] whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-tag-neutral border-tag-neutral-border text-tag-neutral-fg',
        // accent = the BELA "IA" tone (alias of brand). Kept for existing screens.
        accent: 'bg-accent-bela-surface border-accent-bela-border text-accent-bela-fg',
        brand: 'bg-accent-bela-surface border-accent-bela-border text-accent-bela-fg',
        solid: 'bg-primary border-transparent text-primary-foreground',
        outline: 'bg-transparent border-border-default text-text-secondary',
        // Status tones (number/status half of the explainability pattern).
        success: 'bg-status-on-track-surface border-status-on-track-border text-status-on-track-fg',
        warning: 'bg-status-at-risk-surface border-status-at-risk-border text-status-at-risk-fg',
        danger: 'bg-status-critical-surface border-status-critical-border text-status-critical-fg',
        // Família "em movimento" + versões CONTORNO (status de chamado, 2026-08-23):
        // contorno = a leitura quieta da mesma família (fundo transparente).
        info: 'bg-status-regular-surface border-status-regular-border text-status-regular-fg',
        infoOutline: 'bg-transparent border-status-regular-border text-status-regular-fg',
        warningOutline: 'bg-transparent border-status-at-risk-border text-status-at-risk-fg',
        neutralOutline: 'bg-transparent border-border-default text-text-muted',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
