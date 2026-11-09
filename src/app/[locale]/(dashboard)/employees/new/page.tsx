import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RequirePermission } from '@/components/layout/require-permission';
import { EmployeeFormPage } from '@/features/employees/employee-form';
import { asLocale } from '@/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('employees'))('form.createTitle') };
}

export default async function NewEmployeePage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  return (
    <RequirePermission anyOf={['employee:create']}>
      <EmployeeFormPage />
    </RequirePermission>
  );
}
