import * as React from 'react';
import type { Status } from '@bela/tokens';
import { cn } from '../../lib/utils';

/**
 * The "number/status" half of the explainability pattern (CLAUDE.md §2/§2.1).
 * Renders ONLY the quick-decision status. The explanation (motive, source,
 * timestamp, confidence) must live in a SEPARATE element next to it — never
 * baked into the label here.
 */
const STATUS_SURFACE: Record<Status, string> = {
  critical: 'bg-status-critical-surface border-status-critical-border text-status-critical-fg',
  'at-risk': 'bg-status-at-risk-surface border-status-at-risk-border text-status-at-risk-fg',
  regular: 'bg-status-regular-surface border-status-regular-border text-status-regular-fg',
  'on-track': 'bg-status-on-track-surface border-status-on-track-border text-status-on-track-fg',
};

const STATUS_DOT: Record<Status, string> = {
  critical: 'bg-status-critical',
  'at-risk': 'bg-status-at-risk',
  regular: 'bg-status-regular',
  'on-track': 'bg-status-on-track',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: Status;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true, className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[var(--space-2xs)] rounded-[var(--radius-pill)] border px-[var(--space-sm)] py-[var(--space-3xs)] text-[length:var(--caption-size)] font-[var(--weight-semibold)] whitespace-nowrap',
        STATUS_SURFACE[status],
        className,
      )}
      {...props}
    >
      {showDot && <span className={cn('h-2 w-2 rounded-[var(--radius-full)]', STATUS_DOT[status])} aria-hidden="true" />}
      {children}
    </span>
  );
}
