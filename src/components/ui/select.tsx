import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** SelectField: a native select (keyboard and screen-reader friendly, phone pickers) in SYSTORY style. */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <select
        className={cn(
          'h-control-md w-full cursor-pointer appearance-none rounded-md border border-input bg-card pr-10 pl-3 text-[15px] leading-[26px] text-foreground transition-colors',
          'hover:border-muted-foreground focus-visible:border-deep-teal focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
          'disabled:cursor-not-allowed disabled:bg-background disabled:text-muted-foreground aria-invalid:border-destructive',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}
