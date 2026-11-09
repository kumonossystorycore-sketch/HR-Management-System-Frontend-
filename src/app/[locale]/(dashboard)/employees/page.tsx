import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { RequirePermission } from '@/components/layout/require-permission';
import { EmployeeList } from '@/features/employees/employee-list';
import { asLocale } from '@/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('employees'))('title') };
}

export default async function EmployeesPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  return (
    <RequirePermission anyOf={['employee:read']}>
      <Suspense>
        <EmployeeList />
      </Suspense>
    </RequirePermission>
  );
}
