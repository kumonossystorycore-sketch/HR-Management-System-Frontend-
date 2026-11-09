'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from './auth-provider';
import { ChangePasswordForm } from './change-password-form';

/** After an admin reset or a new account: the user picks their own password before anything else. */
export function ForcedPasswordChange() {
  const t = useTranslations('auth.change');
  const { status, user } = useAuth();
  const router = useRouter();
  /** Set once the password is changed here, so the redirect below does not race the one in onDone. */
  const changed = useRef(false);

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
    // Someone without a temporary password who opens this page changes it on My account instead.
    else if (status === 'authenticated' && user && !user.mustChangePassword && !changed.current) router.replace('/account');
  }, [status, user, router]);

  if (status !== 'authenticated' || !user?.mustChangePassword) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4" />
        <Skeleton className="h-control-md" />
        <Skeleton className="h-control-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1">{t('forcedTitle')}</h1>
        <p className="text-body-sm text-muted-foreground">{t('forcedSubtitle')}</p>
      </div>
      <ChangePasswordForm
        forced
        onDone={(profile) => {
          changed.current = true;
          router.replace('/dashboard', { locale: profile.locale });
        }}
      />
    </div>
  );
}
