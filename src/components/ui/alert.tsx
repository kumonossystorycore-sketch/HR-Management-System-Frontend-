import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const tones = {
  danger: { box: 'bg-danger-soft text-danger-text border-danger/20', Icon: CircleAlert },
  success: { box: 'bg-success-soft text-success-text border-success/20', Icon: CircleCheck },
  info: { box: 'bg-info-soft text-info-text border-info/20', Icon: Info },
};

/** A banner inside a form or card. Danger alerts are announced to screen readers. */
export function Alert({ tone = 'danger', children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  const { box, Icon } = tones[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-2 rounded-md border px-3 py-2 text-body-sm', box, className)}>
      <Icon className="mt-1 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
