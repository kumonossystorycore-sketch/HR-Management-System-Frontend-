import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { ResetForm } from '@/features/auth/reset-form';
import { asLocale } from '@/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.reset');
  // The URL carries a one-time token: never send it to other sites as a referrer.
  return { title: t('title'), referrer: 'no-referrer' };
}

export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
