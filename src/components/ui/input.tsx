import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Text input on `surface` with a 3:1 `border-strong` edge; red edge when `aria-invalid`. */
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-control-md w-full min-w-0 rounded-md border border-input bg-card px-3 text-[15px] leading-[26px] text-foreground transition-colors duration-150 ease-out',
        'placeholder:text-muted-foreground hover:border-muted-foreground',
        'focus-visible:border-deep-teal focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:bg-background disabled:text-muted-foreground',
        'aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive',
        className,
      )}
      {...props}
    />
  );
}
