import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** One line saying what is missing, one saying what to do, and an optional action. */
export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className="mb-4 inline-flex size-control-lg items-center justify-center rounded-full bg-teal-soft text-deep-teal">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-h3 text-foreground">{title}</h2>
      {description && <p className="mt-1 max-w-[400px] text-body-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
