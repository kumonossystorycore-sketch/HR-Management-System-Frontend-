'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useErrorMessage, useFieldError } from '@/features/auth/use-messages';
import { http } from '@/lib/api-client';
import { applyApiError } from '@/lib/form-errors';
import type { EmployeeDetail } from './types';

const PHONE = /^\+?[\d\s-]{6,30}$/;
const schema = z.object({
  phone: z.string().trim().min(1, 'required').regex(PHONE, 'phone'),
  address: z.string().trim().max(2000),
  emergencyContactName: z.string().trim().max(150),
  emergencyContactRelation: z.string().trim().max(50),
  emergencyContactPhone: z.string().trim().refine((v) => v === '' || PHONE.test(v), 'phone'),
});
type Values = z.infer<typeof schema>;
const FIELDS = ['phone', 'address', 'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone'] as const;

/** FR-EMP-06: employees keep their own phone, address and emergency contact up to date (PATCH /employees/me). */
export function SelfContactCard() {
  const t = useTranslations('employees');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const me = useQuery({ queryKey: ['employees', 'me'], queryFn: async () => (await http.get<EmployeeDetail>('/employees/me')).data });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { phone: '', address: '', emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '' } });
  const { errors, isSubmitting, isDirty } = form.formState;

  useEffect(() => {
    if (me.data)
      form.reset({
        phone: me.data.phone,
        address: me.data.address ?? '',
        emergencyContactName: me.data.emergencyContactName ?? '',
        emergencyContactRelation: me.data.emergencyContactRelation ?? '',
        emergencyContactPhone: me.data.emergencyContactPhone ?? '',
      });
  }, [me.data, form]);

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      const saved = (await http.patch<EmployeeDetail>('/employees/me', { ...v, emergencyContactPhone: v.emergencyContactPhone || null })).data;
      qc.setQueryData(['employees', 'me'], saved);
      toast.success(t('self.saved'));
    } catch (error) {
      if (!applyApiError(error, form.setError, FIELDS, { duplicate: tc('fieldErrors.duplicate'), invalid: tc('fieldErrors.invalid') })) setFormError(errorMessage(error));
    }
  });

  const label = (k: (typeof FIELDS)[number]) => t(`fields.${k}`);
  const titleId = useId();
  return (
    <Card className="xl:col-span-2" aria-labelledby={titleId}>
      <CardHeader titleId={titleId} title={t('self.title')} description={t('self.description')} />
      {me.isError && <Alert>{errorMessage(me.error)}</Alert>}
      {me.isPending && <Skeleton className="h-40" />}
      {me.data && (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {formError && <Alert>{formError}</Alert>}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField label={label('phone')} required error={fieldError(errors.phone?.message, label('phone'))}>
              {(a) => <Input {...a} type="tel" inputMode="tel" autoComplete="tel" {...form.register('phone')} />}
            </FormField>
            <FormField label={label('address')} error={fieldError(errors.address?.message, label('address'))}>
              {(a) => <Textarea {...a} rows={1} autoComplete="street-address" {...form.register('address')} />}
            </FormField>
            <FormField label={label('emergencyContactName')} error={fieldError(errors.emergencyContactName?.message, label('emergencyContactName'))}>
              {(a) => <Input {...a} {...form.register('emergencyContactName')} />}
            </FormField>
            <FormField label={label('emergencyContactRelation')} error={fieldError(errors.emergencyContactRelation?.message, label('emergencyContactRelation'))}>
              {(a) => <Input {...a} {...form.register('emergencyContactRelation')} />}
            </FormField>
            <FormField label={label('emergencyContactPhone')} error={fieldError(errors.emergencyContactPhone?.message, label('emergencyContactPhone'))}>
              {(a) => <Input {...a} type="tel" inputMode="tel" {...form.register('emergencyContactPhone')} />}
            </FormField>
          </div>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty} className="self-start">
            {tc('actions.saveChanges')}
          </Button>
        </form>
      )}
    </Card>
  );
}
