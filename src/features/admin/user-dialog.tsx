'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/auth-provider';
import { useErrorMessage } from '@/features/auth/use-messages';
import { ApiError, http } from '@/lib/api-client';
import { useEmployeeOptions } from '@/lib/queries';
import { generatePassword, type Role, type UserAccount } from './types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strong = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

/** FR-USR-01/02: create an account (invitation or temporary password) or edit one. */
export function UserDialog({ account, roles, onClose }: { account: UserAccount | 'new'; roles: Role[]; onClose: () => void }) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tr = useTranslations('common.roles');
  const tv = useTranslations('validation');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const existing = account === 'new' ? null : account;
  const self = existing?.id === user?.id;
  const employees = useEmployeeOptions();
  const [email, setEmail] = useState(existing?.email ?? '');
  const [employeeId, setEmployeeId] = useState(existing?.employee?.id ?? '');
  const [roleIds, setRoleIds] = useState<string[]>(existing?.roles.map((r) => r.role.id) ?? roles.filter((r) => r.name === 'Employee').map((r) => r.id));
  // '' = the company's default language (Settings), decided by the API.
  const [locale, setLocale] = useState<'lo' | 'en' | ''>(existing?.locale ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [mode, setMode] = useState<'invite' | 'temporary'>('invite');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'email' | 'roles' | 'password', string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const roleName = (n: string) => (tr.has(n as 'Employee') ? tr(n as 'Employee') : n);

  // The linked employee stays selectable even when they are not in the current-staff list.
  const linked = existing?.employee && !employees.data?.some((e) => e.id === existing.employee!.id) ? existing.employee : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (existing) {
        const body: Record<string, unknown> = {};
        if (email.trim().toLowerCase() !== existing.email) body.email = email.trim();
        if ((employeeId || null) !== (existing.employee?.id ?? null)) body.employeeId = employeeId || null;
        if (locale && locale !== existing.locale) body.locale = locale;
        if (!self && isActive !== existing.isActive) body.isActive = isActive;
        const before = existing.roles.map((r) => r.role.id).sort().join();
        if (!self && [...roleIds].sort().join() !== before) body.roleIds = roleIds;
        if (Object.keys(body).length) await http.put(`/users/${existing.id}`, body);
        return 'saved' as const;
      }
      await http.post('/users', {
        email: email.trim(),
        employeeId: employeeId || null,
        roleIds,
        ...(locale ? { locale } : {}),
        ...(mode === 'invite' ? { sendInvite: true } : { temporaryPassword: password }),
      });
      return mode === 'invite' ? ('createdInvite' as const) : ('createdTemp' as const);
    },
    onSuccess: async (kind) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['users'] }), qc.invalidateQueries({ queryKey: ['roles'] }), qc.invalidateQueries({ queryKey: ['employees'] })]);
      toast.success(t(`userForm.${kind}`), { duration: kind === 'createdTemp' ? 8000 : undefined });
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'DUPLICATE') {
        const fields = (e.details as { fields?: string[] } | undefined)?.fields ?? [];
        if (fields.includes('email')) return setErrors({ email: tc('fieldErrors.duplicate') });
      }
      setFormError(errorMessage(e));
    },
  });

  const submit = () => {
    const next: typeof errors = {};
    if (!EMAIL.test(email.trim())) next.email = tv('email');
    if (!roleIds.length) next.roles = t('userForm.rolesHint');
    if (!existing && mode === 'temporary' && !strong(password)) next.password = t('userForm.tempHint');
    setErrors(next);
    setFormError(null);
    if (!Object.keys(next).length) mutation.mutate();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing ? t('userForm.editTitle') : t('userForm.createTitle')}
      className="max-w-[560px]"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        {self && <Alert tone="info">{t('userForm.selfNote')}</Alert>}
        <FormField label={t('userForm.email')} required error={errors.email}>
          {(a) => <Input {...a} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </FormField>
        <FormField label={t('userForm.employee')} hint={t('userForm.employeeHint')}>
          {(a) => (
            <Select {...a} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">{t('userForm.noEmployee')}</option>
              {linked && <option value={linked.id}>{`${linked.firstName} ${linked.lastName} (${linked.employeeCode})`}</option>}
              {employees.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {`${e.firstName} ${e.lastName} (${e.employeeCode}) · ${e.department.name}`}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <fieldset className="flex flex-col gap-2" disabled={self}>
          <legend className="mb-1 text-label">
            {t('userForm.roles')}
            <span className="text-brand-burgundy" aria-hidden="true">
              {' '}
              *
            </span>
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {roles.map((r) => (
              <Checkbox
                key={r.id}
                label={roleName(r.name)}
                checked={roleIds.includes(r.id)}
                onChange={(e) => setRoleIds(e.target.checked ? [...roleIds, r.id] : roleIds.filter((x) => x !== r.id))}
              />
            ))}
          </div>
          {errors.roles && (
            <p role="alert" className="text-caption text-danger-text">
              {errors.roles}
            </p>
          )}
        </fieldset>
        <FormField label={t('userForm.language')} className="sm:max-w-48">
          {(a) => (
            <Select {...a} value={locale} onChange={(e) => setLocale(e.target.value as 'lo' | 'en' | '')}>
              {!existing && <option value="">{t('userForm.languageDefault')}</option>}
              <option value="lo">{tc('languageLo')}</option>
              <option value="en">{tc('languageEn')}</option>
            </Select>
          )}
        </FormField>
        {existing ? (
          <Checkbox label={t('userForm.active')} hint={t('userForm.activeHint')} checked={isActive} disabled={self} onChange={(e) => setIsActive(e.target.checked)} />
        ) : (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-label">{t('userForm.access')}</legend>
            <label className="flex items-start gap-3 text-body">
              <input type="radio" name="access" className="mt-1.5 size-4 accent-[var(--color-primary)]" checked={mode === 'invite'} onChange={() => setMode('invite')} />
              {t('userForm.invite')}
            </label>
            <label className="flex items-start gap-3 text-body">
              <input type="radio" name="access" className="mt-1.5 size-4 accent-[var(--color-primary)]" checked={mode === 'temporary'} onChange={() => setMode('temporary')} />
              {t('userForm.temporary')}
            </label>
            {mode === 'temporary' && (
              <div className="flex items-end gap-2">
                <FormField label={t('userForm.tempPassword')} required hint={t('userForm.tempHint')} error={errors.password} className="min-w-0 flex-1">
                  {(a) => <Input {...a} autoComplete="new-password" className="font-mono" value={password} onChange={(e) => setPassword(e.target.value)} />}
                </FormField>
                <Button type="button" variant="secondary" className="mb-6" onClick={() => setPassword(generatePassword())}>
                  <Wand2 aria-hidden="true" />
                  {t('userForm.generate')}
                </Button>
              </div>
            )}
          </fieldset>
        )}
      </div>
    </Dialog>
  );
}

/** FR-USR-03: a temporary password; the user is signed out and must change it. */
export function ResetPasswordDialog({ account, onClose }: { account: UserAccount; onClose: () => void }) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => http.put(`/users/${account.id}/password`, { temporaryPassword: password }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('reset.done'));
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('reset.title', { email: account.email })}
      description={t('reset.description')}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => (strong(password) ? mutation.mutate() : setError(t('userForm.tempHint')))} loading={mutation.isPending}>
            {t('reset.confirm')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <div className="flex items-end gap-2">
          <FormField label={t('userForm.tempPassword')} hint={t('userForm.tempHint')} className="min-w-0 flex-1">
            {(a) => <Input {...a} autoComplete="new-password" className="font-mono" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </FormField>
          <Button type="button" variant="secondary" className="mb-6" onClick={() => setPassword(generatePassword())}>
            <Wand2 aria-hidden="true" />
            {t('userForm.generate')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
