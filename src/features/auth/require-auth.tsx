'use client';

import { useTranslations } from 'next-intl';
import { useEffect, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from './auth-provider';

/**
 * Shows the app only to a signed-in user who has a password of their own. This decides what
 * the browser shows; the API decides what data anyone gets.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const tc = useTranslations('common');
  const { status, user, endedReason } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace({ pathname: '/login', query: { next: pathname, ...(endedReason ? { reason: endedReason } : {}) } });
    } else if (status === 'authenticated' && user?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [status, user, endedReason, pathname, router]);

  if (status !== 'authenticated' || user?.mustChangePassword) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-deep-teal" role="status" aria-live="polite">
        <Spinner className="size-6" />
        <span className="sr-only">{tc('loading')}</span>
      </div>
    );
  }
  return children;
}
