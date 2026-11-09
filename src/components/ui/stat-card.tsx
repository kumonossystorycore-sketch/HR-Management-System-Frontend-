import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** KPI tile: label, icon tile, big tabular number, optional hint line. */
export function StatCard({ label, value, unit, hint, icon: Icon, className }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <section aria-label={label} className={cn('flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-6 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-body-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span className="inline-flex size-control-md shrink-0 items-center justify-center rounded-md bg-teal-soft text-deep-teal">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="text-stat tabular text-foreground">
        {value}
        {unit && <span className="text-[15px] font-medium text-muted-foreground"> {unit}</span>}
      </p>
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
    </section>
  );
}
