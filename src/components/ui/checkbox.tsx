import { Check } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Native checkbox drawn as the SYSTORY box, with a label and optional hint. */
export function Checkbox({ label, hint, className, id, ...props }: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode; hint?: ReactNode }) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span className="relative mt-[3px] size-5 shrink-0">
        <input id={cid} type="checkbox" aria-describedby={hint ? `${cid}-hint` : undefined} className="peer absolute inset-0 size-full cursor-pointer opacity-0" {...props} />
        <span
          aria-hidden="true"
          className="pointer-events-none flex size-5 items-center justify-center rounded-sm border-[1.5px] border-input bg-card text-white transition-colors peer-checked:border-primary peer-checked:bg-primary peer-hover:border-deep-teal peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring [&>svg]:hidden peer-checked:[&>svg]:block"
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      </span>
      <span className="flex flex-col">
        <label htmlFor={cid} className="cursor-pointer text-body">
          {label}
        </label>
        {hint && (
          <span id={`${cid}-hint`} className="text-caption text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}
