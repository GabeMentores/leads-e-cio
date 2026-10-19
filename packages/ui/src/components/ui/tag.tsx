import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * bela Tag — a pill chip for filters/selections. `selected` fills it with the
 * brand; `onRemove` adds a dismiss control; `onClick` makes it a toggle.
 */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  selected?: boolean;
  icon?: React.ReactNode;
  onRemove?: () => void;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, selected = false, icon, onRemove, onClick, children, ...props }, ref) => (
    <span
      ref={ref}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-[var(--space-2xs)] rounded-[var(--radius-pill)] border text-[length:var(--body-sm-size)] font-[var(--weight-medium)] transition-[color,background-color,border-color] duration-[var(--duration-fast)]',
        onRemove ? 'pl-[var(--space-sm)] pr-[var(--space-2xs)]' : 'px-[var(--space-sm)]',
        onClick ? 'cursor-pointer' : '',
        selected
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'border-border-default bg-surface-1 text-text-primary hover:bg-accent-bela-surface',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Remover"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="grid h-[18px] w-[18px] place-items-center rounded-[var(--radius-pill)] opacity-70 hover:opacity-100"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </span>
  ),
);
Tag.displayName = 'Tag';
