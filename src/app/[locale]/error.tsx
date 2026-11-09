'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/** Last-resort screen for an unexpected rendering error: no technical details shown. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('common');
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <EmptyState icon={TriangleAlert} title={t('errorTitle')} description={t('errorText')} action={<Button onClick={reset}>{t('retry')}</Button>} />
    </main>
  );
}
