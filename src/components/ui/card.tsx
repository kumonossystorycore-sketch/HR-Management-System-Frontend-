import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Surface with a hairline border and quiet shadow (design system: depth). */
export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('rounded-lg border border-border bg-card p-6 shadow-sm', className)} {...props} />;
}

/** `titleId` lets the card name itself (`aria-labelledby`), so it becomes a landmark region. */
export function CardHeader({ title, description, action, className, titleId }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string; titleId?: string }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 id={titleId} className="text-h3 text-foreground">
          {title}
        </h2>
        {description && <p className="text-caption text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
