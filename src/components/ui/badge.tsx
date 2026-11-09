import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const tones = {
  success: 'bg-success-soft text-success-text [--dot:var(--color-success)]',
  warning: 'bg-warning-soft text-warning-text [--dot:var(--color-warning)]',
  danger: 'bg-danger-soft text-danger-text [--dot:var(--color-danger)]',
  info: 'bg-info-soft text-info-text [--dot:var(--color-info)]',
  teal: 'bg-teal-soft text-deep-teal [--dot:var(--color-deep-teal)]',
  neutral: 'bg-background text-muted-foreground shadow-[inset_0_0_0_1px_var(--color-border)] [--dot:var(--color-muted-foreground)]',
};
export type BadgeTone = keyof typeof tones;

/** StatusBadge: colour + dot + word, never colour alone. */
export function StatusBadge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-label whitespace-nowrap', tones[tone], className)}>
      <span className="size-1.5 rounded-full bg-[var(--dot)]" aria-hidden="true" />
      {children}
    </span>
  );
}
