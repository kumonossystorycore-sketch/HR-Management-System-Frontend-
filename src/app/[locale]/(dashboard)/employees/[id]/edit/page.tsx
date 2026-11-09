import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RequirePermission } from '@/components/layout/require-permission';
import { EmployeeFormPage } from '@/features/employees/employee-form';
import { asLocale } from '@/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('employees'))('form.editTitle') };
}

export default async function EditEmployeePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(asLocale(locale));
  return (
    <RequirePermission anyOf={['employee:update']}>
      <EmployeeFormPage id={id} />
    </RequirePermission>
  );
}
