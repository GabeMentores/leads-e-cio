import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * bela Card. Encodes the brand card look (generously rounded, hairline border,
 * soft neutral shadow) and its full API so screens never hand-roll a card `div`.
 * Defaults reproduce the previous Card exactly (tone default, no padding, xs
 * shadow, 20px radius) so existing `Card > CardHeader/CardContent` usage and the
 * 7 migrated screens are unaffected. Pass `padding`/`interactive` for a
 * self-contained clickable card (e.g. a catalog service card).
 */
type CardTone = 'default' | 'subtle' | 'brand' | 'brandSoft' | 'inverse';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardElevation = 'none' | 'xs' | 'sm' | 'md' | 'lg';
type CardRadius = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const CARD_TONE: Record<CardTone, string> = {
  default: 'bg-surface-1 border border-border-subtle text-text-primary',
  subtle: 'bg-surface-0 border border-transparent text-text-primary',
  brand: 'bg-primary border border-transparent text-primary-foreground',
  brandSoft: 'bg-accent-bela-surface border border-transparent text-text-primary',
  inverse: 'bg-text-primary border border-transparent text-text-inverse',
};
const CARD_PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-[var(--space-4)]',
  md: 'p-[var(--space-6)]',
  lg: 'p-[var(--space-8)]',
};
const CARD_ELEVATION: Record<CardElevation, string> = {
  none: 'shadow-none',
  xs: 'shadow-[var(--shadow-xs)]',
  sm: 'shadow-[var(--shadow-sm)]',
  md: 'shadow-[var(--shadow-md)]',
  lg: 'shadow-[var(--shadow-lg)]',
};
const CARD_RADIUS: Record<CardRadius, string> = {
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]',
  xl: 'rounded-[var(--radius-xl)]',
  '2xl': 'rounded-[var(--radius-2xl)]',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  padding?: CardPadding;
  elevation?: CardElevation;
  radius?: CardRadius;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone = 'default', padding = 'none', elevation = 'xs', radius = 'lg', interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        CARD_TONE[tone],
        CARD_PADDING[padding],
        CARD_ELEVATION[elevation],
        CARD_RADIUS[radius],
        interactive &&
          'cursor-pointer transition-[box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)]',
        interactive && tone === 'default' && 'hover:border-border-default',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-[var(--space-2xs)] p-[var(--space-lg)]', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-[length:var(--body-lg-size)] font-[var(--weight-bold)] tracking-[-0.012em] leading-[var(--line-height-tight)]', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-[length:var(--body-sm-size)] text-text-secondary', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-[var(--space-lg)] pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-[var(--space-sm)] p-[var(--space-lg)] pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
