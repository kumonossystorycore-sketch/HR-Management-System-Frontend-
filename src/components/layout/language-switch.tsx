'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { authApi } from '@/features/auth/services';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const OPTIONS: Array<[Locale, string, string]> = [
  ['lo', 'ລາວ', 'ພາສາລາວ'],
  ['en', 'EN', 'English'],
];

/**
 * Switches the interface language and, when signed in, saves it to the account so
 * e-mails and the next sign-in use it too.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuth();
  const [pending, startTransition] = useTransition();

  const change = (next: Locale) => {
    if (next === locale) return;
    const query = Object.fromEntries(new URLSearchParams(window.location.search));
    startTransition(() => router.replace({ pathname, query }, { locale: next }));
    if (user && user.locale !== next) authApi.updateLocale(next).then(setUser).catch(() => undefined);
  };

  return (
    <div role="group" aria-label={t('language')} className={cn('inline-flex rounded-full bg-background p-[3px] shadow-[inset_0_0_0_1px_var(--color-border)]', className)} aria-busy={pending || undefined}>
      {OPTIONS.map(([value, short, full]) => (
        <button
          key={value}
          type="button"
          lang={value}
          title={full}
          aria-pressed={value === locale}
          onClick={() => change(value)}
          className={cn(
            'h-[30px] min-w-11 rounded-full px-3 text-label font-semibold transition-colors',
            value === locale ? 'bg-deep-teal text-primary-foreground' : 'text-muted-foreground hover:text-deep-teal',
          )}
        >
          {short}
        </button>
      ))}
    </div>
  );
}
