'use client';

import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';

/** Turns any error into a sentence in the current language, by the API's stable error code. */
export const useErrorMessage = () => {
  const t = useTranslations('errors');
  return (error: unknown) => {
    const e = error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', String(error));
    if (e.code === 'ACCOUNT_LOCKED') {
      const seconds = (e.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds ?? 900;
      return t('ACCOUNT_LOCKED', { minutes: Math.max(1, Math.ceil(seconds / 60)) });
    }
    return t.has(e.code as 'UNKNOWN') ? t(e.code as 'UNKNOWN') : t('UNKNOWN');
  };
};

/** Zod messages in this app are keys of the `validation` namespace; `field` names the input. */
export const useFieldError = () => {
  const t = useTranslations('validation');
  return (message: string | undefined, field: string) => (message ? (t.has(message as 'required') ? t(message as 'required', { field }) : message) : undefined);
};

/** Only same-app paths are allowed after sign-in, never another site (open-redirect guard). */
export const safeNext = (next: string | null) => (next && /^\/(?!\/)[\w\-/?=&.%]*$/.test(next) && !next.startsWith('/login') ? next : '/dashboard');
