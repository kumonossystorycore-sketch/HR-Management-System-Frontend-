'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from './auth-provider';
import { loginSchema, type LoginValues } from './schemas';
import type { Profile } from './types';
import { safeNext, useErrorMessage, useFieldError } from './use-messages';

export function LoginForm() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const locale = useLocale();
  const search = useSearchParams();
  const { status, user, signIn, endedReason } = useAuth();
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const { errors, isSubmitting } = form.formState;

  /** After sign-in: a temporary password first; then where the user was going, in their own language. */
  const proceed = (profile: Profile) => {
    if (profile.mustChangePassword) router.replace('/change-password', { locale: profile.locale });
    else router.replace(safeNext(search.get('next')), { locale: profile.locale });
  };

  useEffect(() => {
    if (status === 'authenticated' && user) proceed(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once the session is known
  }, [status]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      proceed(await signIn(values.email, values.password));
    } catch (error) {
      setFormError(errorMessage(error));
      form.setValue('password', '');
      form.setFocus('password');
    }
  });

  const notice = search.get('reason') === 'reset' ? t('passwordReset') : endedReason === 'session' || search.get('reason') === 'session' ? t('sessionEnded') : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" lang={locale}>
      <div className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {notice && !formError && <Alert tone="info">{notice}</Alert>}
      {formError && <Alert>{formError}</Alert>}

      <FormField label={t('email')} required error={fieldError(errors.email?.message, t('email'))}>
        {(a) => <Input {...a} type="email" autoComplete="username" inputMode="email" placeholder={t('emailPlaceholder')} className="h-control-lg" {...form.register('email')} />}
      </FormField>
      <FormField label={t('password')} required error={fieldError(errors.password?.message, t('password'))}>
        {(a) => <PasswordInput {...a} autoComplete="current-password" placeholder={t('passwordPlaceholder')} className="h-control-lg" {...form.register('password')} />}
      </FormField>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-body-sm font-semibold text-deep-teal underline underline-offset-4 hover:text-primary">
          {t('forgot')}
        </Link>
      </div>

      <Button type="submit" size="lg" loading={isSubmitting || status === 'loading'} className="w-full">
        {t('submit')}
      </Button>
    </form>
  );
}
