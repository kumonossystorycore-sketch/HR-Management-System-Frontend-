import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ForcedPasswordChange } from '@/features/auth/forced-password-change';
import { asLocale } from '@/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.change');
  return { title: t('forcedTitle') };
}

export default async function ChangePasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  return <ForcedPasswordChange />;
}
