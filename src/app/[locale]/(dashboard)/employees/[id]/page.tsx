import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RequirePermission } from '@/components/layout/require-permission';
import { EmployeeDetail } from '@/features/employees/employee-detail';
import { asLocale } from '@/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('employees'))('title') };
}

export default async function EmployeePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(asLocale(locale));
  return (
    <RequirePermission anyOf={['employee:read']}>
      <EmployeeDetail id={id} />
    </RequirePermission>
  );
}
