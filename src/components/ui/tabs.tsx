'use client';

import { Tabs as Primitive } from 'radix-ui';
import { useEffect, useRef, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Tabs with arrow-key navigation; the active tab has a teal underline. */
export const Tabs = Primitive.Root;

/**
 * On narrow screens the tabs scroll sideways: the selected tab is brought into view, and a fade on
 * the edge shows that more tabs are there.
 */
export function TabsList({ className, ...props }: ComponentProps<typeof Primitive.List>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const update = () => {
      list.dataset.moreStart = String(list.scrollLeft > 1);
      list.dataset.moreEnd = String(list.scrollLeft + list.clientWidth < list.scrollWidth - 1);
    };
    const reveal = () => {
      const active = list.querySelector<HTMLElement>('[data-state=active]');
      if (active && (active.offsetLeft < list.scrollLeft || active.offsetLeft + active.offsetWidth > list.scrollLeft + list.clientWidth)) {
        list.scrollLeft = active.offsetLeft - 16;
      }
      update();
    };
    reveal();
    const observer = new MutationObserver(reveal);
    observer.observe(list, { subtree: true, attributes: true, attributeFilter: ['data-state'] });
    list.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return (
    <Primitive.List
      ref={ref}
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]',
        'data-[more-end=true]:[mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)]',
        'data-[more-start=true]:[mask-image:linear-gradient(to_right,transparent,black_40px)]',
        'data-[more-start=true]:data-[more-end=true]:[mask-image:linear-gradient(to_right,transparent,black_40px,black_calc(100%-40px),transparent)]',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      className={cn(
        'relative inline-flex h-11 shrink-0 items-center gap-2 rounded-t-md px-4 text-body-sm font-medium whitespace-nowrap text-muted-foreground hover:bg-teal-soft hover:text-deep-teal',
        'focus-visible:outline-offset-[-2px] data-[state=active]:font-semibold data-[state=active]:text-deep-teal',
        'after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-t-full after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content className={cn('pt-6 outline-none', className)} {...props} />;
}
