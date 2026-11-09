import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { LanguageSwitch } from '@/components/layout/language-switch';
import { asLocale } from '@/i18n/routing';

/**
 * Sign-in, password reset and the forced password change share the Phase 2 login layout:
 * the deep-teal brand panel on the left (on top on phones) and the form card on the right.
 */
export default async function AuthLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  const t = await getTranslations('auth');
  const tc = await getTranslations('common');
  const support = process.env.NEXT_PUBLIC_SUPPORT_CONTACT;

  return (
    <div className="flex min-h-dvh flex-wrap bg-background">
      <section className="flex flex-[1_1_520px] flex-col justify-between gap-10 overflow-hidden bg-deep-teal px-6 py-8 text-primary-foreground sm:px-12 sm:py-10">
        <div className="flex items-center gap-3 self-start rounded-lg bg-card px-4 py-2.5">
          <Image src="/logo/systory-logo.png" alt="SYSTORY" width={72} height={52} priority className="h-[52px] w-[72px]" />
          <span className="flex flex-col border-l border-border pl-3">
            <span className="text-base leading-6 font-bold text-deep-teal">{tc('product')}</span>
            <span className="text-caption leading-[18px] text-muted-foreground">{tc('tagline')}</span>
          </span>
        </div>
        <div className="flex max-w-[520px] flex-col gap-4">
          <p className="text-[26px] leading-[40px] font-bold sm:text-display">{t('heroTitle')}</p>
          <p className="text-body text-sidebar-foreground">{t('heroText')}</p>
          <p className="mt-2 text-body-sm font-semibold">{tc('slogan')}</p>
        </div>
        <div aria-hidden="true" className="hidden h-[168px] items-end gap-4 md:flex">
          <span className="block h-12 w-18 rounded-md bg-secondary-teal" />
          <span className="flex flex-col items-center gap-2">
            <span className="block size-6 rounded-sm bg-brand-burgundy" />
            <span className="block h-22 w-18 rounded-md bg-primary-teal" />
          </span>
          <span className="block h-32 w-18 rounded-md bg-teal-soft" />
        </div>
      </section>

      <section className="flex flex-[1_1_520px] flex-col items-center justify-center gap-6 px-4 py-10 sm:px-6">
        <div className="flex w-full max-w-[440px] justify-end">
          <LanguageSwitch />
        </div>
        <div className="w-full max-w-[440px] rounded-lg border border-border bg-card p-6 shadow-sm sm:p-10">{children}</div>
        {support && <p className="max-w-[440px] text-center text-caption text-muted-foreground">{t('login.support', { contact: support })}</p>}
      </section>
    </div>
  );
}
