'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { forgotSchema, type ForgotValues } from './schemas';
import { authApi } from './services';
import { useErrorMessage, useFieldError } from './use-messages';

/** FR-USR-03: asks for a reset link. The answer is the same whether or not the e-mail exists. */
export function ForgotForm() {
  const t = useTranslations('auth.forgot');
  const tl = useTranslations('auth.login');
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await authApi.forgotPassword(email);
      setSentTo(email);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  if (sentTo) {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <span className="inline-flex size-control-lg items-center justify-center rounded-full bg-teal-soft text-deep-teal">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-h1">{t('sentTitle')}</h1>
        <p className="text-body-sm text-muted-foreground">{t('sentText', { email: sentTo })}</p>
        <Button asChild variant="secondary">
          <Link href="/login">{t('backToLogin')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      {formError && <Alert>{formError}</Alert>}
      <FormField label={tl('email')} required error={fieldError(form.formState.errors.email?.message, tl('email'))}>
        {(a) => <Input {...a} type="email" autoComplete="email" inputMode="email" placeholder={tl('emailPlaceholder')} className="h-control-lg" {...form.register('email')} />}
      </FormField>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting} className="w-full">
        {t('submit')}
      </Button>
      <Link href="/login" className="self-center text-body-sm font-semibold text-deep-teal underline underline-offset-4">
        {t('backToLogin')}
      </Link>
    </form>
  );
}
