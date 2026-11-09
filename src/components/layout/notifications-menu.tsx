'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useRouter } from '@/i18n/navigation';
import { http } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface Notification {
  id: string;
  type: string;
  titleKey: string;
  params: Record<string, string | number> | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/** The bell: unread count (checked every minute) and the latest notifications, translated from their keys. */
export function NotificationsMenu() {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const queryClient = useQueryClient();

  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => (await http.get<{ unread: number }>('/notifications/unread-count')).data.unread,
    refetchInterval: 60_000,
  });
  const list = useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: async () => (await http.get<Notification[]>('/notifications', { params: { pageSize: 8 } })).data,
    enabled: false,
  });
  const markAll = useMutation({
    mutationFn: () => http.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => http.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const count = unread.data ?? 0;
  const text = (n: Notification) => {
    const key = n.titleKey.replace(/^notifications\./, '') as 'leave.requested';
    return t.has(key) ? t(key, (n.params ?? {}) as Record<string, string>) : t('unknown');
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && void list.refetch()}>
      <DropdownMenuTrigger
        aria-label={count ? tc('notificationsCount', { count }) : tc('notifications')}
        className="relative inline-flex size-control-md items-center justify-center rounded-md text-muted-foreground hover:bg-teal-soft hover:text-deep-teal"
      >
        <Bell className="size-5" aria-hidden="true" />
        {count > 0 && <span aria-hidden="true" className="absolute top-[9px] right-[9px] size-2 rounded-full bg-brand-burgundy shadow-[0_0_0_2px_var(--color-surface)]" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] max-w-[calc(100vw-32px)]">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span className="text-h3">{t('title')}</span>
          {count > 0 && (
            <button type="button" onClick={() => markAll.mutate()} className="text-caption font-semibold text-deep-teal underline underline-offset-4">
              {t('markAllRead')}
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list.data?.length ? (
          list.data.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="items-start"
              onSelect={() => {
                if (!n.readAt) markOne.mutate(n.id);
                if (n.link) router.push(n.link);
              }}
            >
              <span className={cn('mt-2 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-brand-burgundy')} aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span className={cn('text-body-sm', !n.readAt && 'font-semibold')}>{text(n)}</span>
                <span className="text-caption text-muted-foreground tabular">{formatDateTime(n.createdAt)}</span>
              </span>
            </DropdownMenuItem>
          ))
        ) : list.isError && !list.isFetching ? (
          <div role="alert" className="flex flex-col items-center gap-2 px-3 py-6 text-center text-body-sm text-danger-text">
            <p>{t('loadError')}</p>
            <button type="button" onClick={() => void list.refetch()} className="font-semibold underline underline-offset-4">
              {t('retry')}
            </button>
          </div>
        ) : (
          <p className="px-3 py-6 text-center text-body-sm text-muted-foreground">{list.isFetching ? tc('loading') : t('empty')}</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
