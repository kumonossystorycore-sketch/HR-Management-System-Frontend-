'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useErrorMessage, useFieldError } from '@/features/auth/use-messages';
import { GENDERS } from '@/features/employees/types';
import { useRouter } from '@/i18n/navigation';
import { ApiError, http } from '@/lib/api-client';
import { applyApiError } from '@/lib/form-errors';
import { localDay } from '@/lib/format';
import type { Applicant } from './types';

const schema = z.object({
  lastName: z.string().trim().max(100),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?[\d\s-]{6,30}$/.test(v), 'phone'),
  employeeCode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[A-Za-z0-9-]{3,20}$/.test(v), 'code'),
  gender: z.string().min(1, 'choose'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date'),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date'),
  employmentStatus: z.enum(['PROBATION', 'ACTIVE']),
  basicSalary: z.string().trim().regex(/^\d{1,13}(\.\d{1,2})?$/, 'money'),
});
type Values = z.infer<typeof schema>;

/**
 * FR-REC-05: an accepted applicant becomes an employee. Name, email, phone, department and
 * position come from the application; HR adds the rest. Then the employee page opens.
 */
export function HireDialog({ applicant: a, onClose }: { applicant: Applicant; onClose: () => void }) {
  const t = useTranslations('recruitment');
  const te = useTranslations('employees');
  const tc = useTranslations('common');
  const tg = useTranslations('common.gender');
  const ts = useTranslations('common.employmentStatus');
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const qc = useQueryClient();
  const router = useRouter();
  const singleName = a.fullName.trim().split(/\s+/).length < 2;
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(
      schema.superRefine((v, ctx) => {
        if (singleName && !v.lastName) ctx.addIssue({ code: 'custom', path: ['lastName'], message: 'required' });
        if (!a.phone && !v.phone) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'required' });
      }),
    ),
    defaultValues: { lastName: '', phone: '', employeeCode: '', gender: '', dateOfBirth: '', hireDate: localDay(), employmentStatus: 'PROBATION', basicSalary: '' },
  });
  const { errors, isSubmitting } = form.formState;
  const L = (k: 'lastName' | 'phone' | 'employeeCode' | 'gender' | 'dateOfBirth' | 'hireDate' | 'employmentStatus' | 'basicSalary') => te(`fields.${k}`);
  const err = (k: keyof Values) => fieldError(errors[k]?.message, L(k));

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const body = {
      gender: v.gender,
      dateOfBirth: v.dateOfBirth,
      hireDate: v.hireDate,
      employmentStatus: v.employmentStatus,
      basicSalary: v.basicSalary,
      ...(v.lastName ? { lastName: v.lastName } : {}),
      ...(v.phone ? { phone: v.phone } : {}),
      ...(v.employeeCode ? { employeeCode: v.employeeCode.toUpperCase() } : {}),
    };
    try {
      const employee = (await http.post<{ id: string }>(`/applicants/${a.id}/convert`, body)).data;
      await Promise.all([qc.invalidateQueries({ queryKey: ['recruitment'] }), qc.invalidateQueries({ queryKey: ['employees'] }), qc.invalidateQueries({ queryKey: ['dashboard'] })]);
      toast.success(t('hireForm.done'));
      onClose();
      router.push(`/employees/${employee.id}`);
    } catch (error) {
      // NAME_REQUIRED / PHONE_REQUIRED name the field that is missing.
      if (error instanceof ApiError && (error.code === 'NAME_REQUIRED' || error.code === 'PHONE_REQUIRED')) {
        form.setError(error.code === 'NAME_REQUIRED' ? 'lastName' : 'phone', { type: 'server', message: 'required' });
        return;
      }
      if (!applyApiError(error, form.setError, ['employeeCode', 'phone', 'lastName', 'basicSalary', 'dateOfBirth', 'hireDate'], { duplicate: tc('fieldErrors.duplicate'), invalid: tc('fieldErrors.invalid') }))
        setFormError(errorMessage(error));
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('hireForm.title', { name: a.fullName })}
      description={t('hireForm.description', { vacancy: `${a.vacancy.position.title}`, department: a.vacancy.department.name })}
      className="max-w-[560px]"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {tc('cancel')}
          </Button>
          <Button type="submit" form="hire-form" loading={isSubmitting}>
            {t('hireForm.submit')}
          </Button>
        </>
      }
    >
      <form id="hire-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {formError && <Alert className="sm:col-span-2">{formError}</Alert>}
        {singleName && (
          <FormField label={L('lastName')} required hint={t('hireForm.lastNameHint')} error={err('lastName')} className="sm:col-span-2">
            {(f) => <Input {...f} {...form.register('lastName')} />}
          </FormField>
        )}
        {!a.phone && (
          <FormField label={L('phone')} required hint={t('hireForm.phoneHint')} error={err('phone')} className="sm:col-span-2">
            {(f) => <Input {...f} type="tel" {...form.register('phone')} />}
          </FormField>
        )}
        <FormField label={L('gender')} required error={err('gender')}>
          {(f) => (
            <Select {...f} {...form.register('gender')}>
              <option value="">—</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {tg(g)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={L('dateOfBirth')} required error={err('dateOfBirth')}>
          {(f) => <Input {...f} type="date" max={localDay()} {...form.register('dateOfBirth')} />}
        </FormField>
        <FormField label={L('hireDate')} required error={err('hireDate')}>
          {(f) => <Input {...f} type="date" {...form.register('hireDate')} />}
        </FormField>
        <FormField label={L('employmentStatus')} required>
          {(f) => (
            <Select {...f} {...form.register('employmentStatus')}>
              <option value="PROBATION">{ts('PROBATION')}</option>
              <option value="ACTIVE">{ts('ACTIVE')}</option>
            </Select>
          )}
        </FormField>
        <FormField label={L('basicSalary')} required hint={te('fields.basicSalaryHint')} error={err('basicSalary')}>
          {(f) => <Input {...f} inputMode="decimal" className="tabular" {...form.register('basicSalary')} />}
        </FormField>
        <FormField label={L('employeeCode')} hint={te('fields.employeeCodeHint')} error={err('employeeCode')}>
          {(f) => <Input {...f} className="uppercase" placeholder="SYS-0000" {...form.register('employeeCode')} />}
        </FormField>
      </form>
    </Dialog>
  );
}
