import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, rows = 3, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'min-h-24 w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-[15px] leading-[26px] text-foreground transition-colors placeholder:text-muted-foreground',
        'hover:border-muted-foreground focus-visible:border-deep-teal focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:bg-background aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}
