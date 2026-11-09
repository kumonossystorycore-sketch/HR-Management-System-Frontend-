import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { RequirePermission } from '@/components/layout/require-permission';
import { AttendanceView } from '@/features/attendance/attendance-view';
import { asLocale } from '@/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('attendance'))('title') };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  return (
    <RequirePermission anyOf={['attendance:read', 'attendance:check_in']}>
      <Suspense>
        <AttendanceView />
      </Suspense>
    </RequirePermission>
  );
}
