import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * bela Eyebrow — the deck's signature uppercase micro-label that sits above a
 * display/heading line ("CATÁLOGO", "ENTENDER"). Wide tracking, 12px. Use it to
 * label a section, never as body text.
 */
export const Eyebrow = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, style, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        'text-[length:var(--eyebrow-size)] font-[var(--weight-semibold)] uppercase text-text-muted',
        className,
      )}
      style={{ letterSpacing: 'var(--eyebrow-tracking)', ...style }}
      {...props}
    />
  ),
);
Eyebrow.displayName = 'Eyebrow';
