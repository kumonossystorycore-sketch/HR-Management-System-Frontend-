'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as Primitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Dialog: scrim, focus trap, Esc to close, title and description announced. `actions` sit
 * bottom-right; `tone="danger"` is used for destructive confirmations.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const tc = useTranslations('common');
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-50 bg-[rgba(32,43,42,0.48)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Primitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-lg bg-card shadow-lg outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            className,
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="flex items-start gap-3 px-6 pt-6">
            <div className="min-w-0 flex-1">
              <Primitive.Title className="text-h3">{title}</Primitive.Title>
              {description && <Primitive.Description className="mt-1 text-body-sm text-muted-foreground">{description}</Primitive.Description>}
            </div>
            <Primitive.Close className="-mt-1.5 -mr-2.5 inline-flex size-control-md items-center justify-center rounded-md text-muted-foreground hover:bg-teal-soft hover:text-deep-teal" aria-label={tc('close')}>
              <X className="size-5" aria-hidden="true" />
            </Primitive.Close>
          </div>
          {children && <div className="px-6 pt-5">{children}</div>}
          {actions && <div className="flex flex-wrap justify-end gap-2 p-6">{actions}</div>}
          {!actions && <div className="pb-6" />}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
