import * as React from 'react';
import { cn } from '../../lib/utils';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-[length:var(--body-sm-size)] font-[var(--weight-medium)] text-text-primary',
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = 'Label';
