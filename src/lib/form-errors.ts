import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api-client';

/**
 * Puts API errors on the fields they concern: a duplicate e-mail or code under that field,
 * a validation issue under its field. Returns true when every problem landed on a field;
 * otherwise the caller shows a message at the top of the form.
 */
export function applyApiError<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[], messages: { duplicate: string; invalid: string }) {
  if (!(error instanceof ApiError)) return false;
  if (error.code === 'DUPLICATE') {
    const clashing = ((error.details as { fields?: string[] } | undefined)?.fields ?? []).filter((f) => fields.includes(f));
    clashing.forEach((f, i) => setError(f as Path<T>, { type: 'server', message: messages.duplicate }, { shouldFocus: i === 0 }));
    return clashing.length > 0;
  }
  if (error.code === 'VALIDATION_ERROR') {
    const issues = (error.details as { issues?: Array<{ path: string }> } | undefined)?.issues ?? [];
    const known = issues.filter((i) => fields.includes(i.path));
    known.forEach((i, n) => setError(i.path as Path<T>, { type: 'server', message: messages.invalid }, { shouldFocus: n === 0 }));
    return known.length > 0 && known.length === issues.length;
  }
  return false;
}
