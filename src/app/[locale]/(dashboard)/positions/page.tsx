import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { RequirePermission } from '@/components/layout/require-permission';
import { PositionList } from '@/features/organization/position-list';
import { asLocale } from '@/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('positions'))('title') };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  return (
    <RequirePermission anyOf={['position:read']}>
      <Suspense>
        <PositionList />
      </Suspense>
    </RequirePermission>
  );
}
