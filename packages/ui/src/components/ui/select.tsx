import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Native styled select (no Radix dependency). Chevron is decorative. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-9 w-full appearance-none rounded-[var(--radius-sm)] border border-border-default bg-surface-1 pl-[var(--space-sm)] pr-[var(--space-xl)] text-[length:var(--body-sm-size)] text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--border-focus))] focus-visible:border-[hsl(var(--border-focus))] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-[var(--space-sm)] top-1/2 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
    </div>
  ),
);
Select.displayName = 'Select';
