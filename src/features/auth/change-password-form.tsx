'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuth } from './auth-provider';
import { changeSchema, type ChangeValues } from './schemas';
import { authApi } from './services';
import type { Profile } from './types';
import { useErrorMessage, useFieldError } from './use-messages';

/**
 * Change password with the current one. Used on the forced page (temporary password) and on
 * My account. The API keeps this session and signs out the others.
 */
export function ChangePasswordForm({ forced = false, onDone }: { forced?: boolean; onDone?: (profile: Profile) => void }) {
  const t = useTranslations('auth.change');
  const ta = useTranslations('auth');
  const { setUser } = useAuth();
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ChangeValues>({ resolver: zodResolver(changeSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
  const { errors, isSubmitting } = form.formState;
  const currentLabel = forced ? t('currentTemporary') : t('currentPassword');

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null);
    try {
      const profile = await authApi.changePassword(currentPassword, newPassword);
      setUser(profile);
      form.reset();
      toast.success(t('done'));
      onDone?.(profile);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && <Alert>{formError}</Alert>}
      <FormField label={currentLabel} required error={fieldError(errors.currentPassword?.message, currentLabel)}>
        {(a) => <PasswordInput {...a} autoComplete="current-password" {...form.register('currentPassword')} />}
      </FormField>
      <FormField label={t('newPassword')} required hint={ta('passwordRule')} error={fieldError(errors.newPassword?.message, t('newPassword'))}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register('newPassword')} />}
      </FormField>
      <FormField label={t('confirmPassword')} required error={fieldError(errors.confirmPassword?.message, t('confirmPassword'))}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register('confirmPassword')} />}
      </FormField>
      <Button type="submit" size={forced ? 'lg' : 'md'} loading={isSubmitting} className={forced ? 'w-full' : 'self-start'}>
        {t('submit')}
      </Button>
    </form>
  );
}
