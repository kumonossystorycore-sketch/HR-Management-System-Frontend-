import { redirect } from '@/i18n/navigation';
import { asLocale } from '@/i18n/routing';

/** /lo and /en open the dashboard; the dashboard sends signed-out visitors to sign in. */
export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/dashboard', locale: asLocale(locale) });
}
