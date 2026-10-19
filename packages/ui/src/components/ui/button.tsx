import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // bela: always pill, Semibold with -0.008em tracking, press = scale(0.98). One move, cleanly.
  'inline-flex items-center justify-center gap-[var(--space-2xs)] rounded-[var(--radius-pill)] font-[var(--weight-semibold)] tracking-[-0.008em] whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] active:scale-[0.98] disabled:pointer-events-none disabled:bg-surface-2 disabled:text-text-secondary disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--border-focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-0))]',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-[hsl(var(--primary-hover))]',
        secondary: 'bg-surface-1 text-text-primary border border-border-default shadow-[var(--shadow-xs)] hover:bg-surface-2',
        // soft = how AI actions are styled: lavender brand tint, Roxo text (kit
        // uses --text-brand = purple-500, not the darker purple-700 fg).
        soft: 'bg-accent-bela-surface text-accent-bela hover:bg-[hsl(var(--surface-brand-soft))]',
        ghost: 'text-text-primary hover:bg-surface-2',
        // text-on-accent (branco nos DOIS temas) — text-inverse vira #171717 no
        // escuro e caía a 3.7:1 sobre o vermelho sólido (achado do detect).
        destructive: 'bg-status-critical text-text-on-accent hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-[14px] text-[length:var(--body-sm-size)]',
        md: 'h-10 px-[20px] text-[length:var(--body-sm-size)]',
        lg: 'h-12 px-[28px] text-[length:var(--body-md-size)]',
        icon: 'h-10 w-10',
      },
    },
    // Restraint rule: secondary is the default; primary/destructive are deliberate.
    // (bela: one Roxo surface per screen — the primary button is usually that one.)
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
