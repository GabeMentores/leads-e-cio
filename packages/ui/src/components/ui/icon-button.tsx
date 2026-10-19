import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/** bela IconButton — a square/circular icon-only control. `label` is required
 *  (accessible name + tooltip). Same variants as Button. */
const iconButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center transition-[color,background-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--border-focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-0))]',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-[hsl(var(--primary-hover))]',
        secondary: 'bg-surface-1 text-text-primary border border-border-default shadow-[var(--shadow-xs)] hover:bg-surface-2',
        soft: 'bg-accent-bela-surface text-accent-bela-fg hover:bg-[hsl(var(--surface-brand-soft))]',
        ghost: 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
      },
      size: { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' },
      shape: { circle: 'rounded-[var(--radius-pill)]', square: 'rounded-[var(--radius-sm)]' },
    },
    defaultVariants: { variant: 'ghost', size: 'md', shape: 'circle' },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /** Accessible name (also the tooltip). Required — an icon alone has no label. */
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, shape, label, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ variant, size, shape }), className)}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = 'IconButton';

export { iconButtonVariants };
