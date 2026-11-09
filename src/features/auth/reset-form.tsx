'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { PasswordInput } from '@/components/ui/password-input';
import { Link, useRouter } from '@/i18n/navigation';
import { resetSchema, type ResetValues } from './schemas';
import { authApi } from './services';
import { useErrorMessage, useFieldError } from './use-messages';

/** Opened from the e-mailed link (?token=…). On success the user signs in with the new password. */
export function ResetForm() {
  const t = useTranslations('auth.reset');
  const ta = useTranslations('auth');
  const router = useRouter();
  const token = useSearchParams().get('token');
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { newPassword: '', confirmPassword: '' } });
  const { errors, isSubmitting } = form.formState;

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-h1">{t('title')}</h1>
        <Alert>{t('missingToken')}</Alert>
        <Button asChild variant="secondary">
          <Link href="/forgot-password">{t('requestNew')}</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async ({ newPassword }) => {
    setFormError(null);
    try {
      await authApi.resetPassword(token, newPassword);
      router.replace({ pathname: '/login', query: { reason: 'reset' } });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      {formError && (
        <Alert>
          {formError}{' '}
          <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
            {t('requestNew')}
          </Link>
        </Alert>
      )}
      <FormField label={t('newPassword')} required hint={ta('passwordRule')} error={fieldError(errors.newPassword?.message, t('newPassword'))}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" className="h-control-lg" {...form.register('newPassword')} />}
      </FormField>
      <FormField label={t('confirmPassword')} required error={fieldError(errors.confirmPassword?.message, t('confirmPassword'))}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" className="h-control-lg" {...form.register('confirmPassword')} />}
      </FormField>
      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        {t('submit')}
      </Button>
    </form>
  );
}
