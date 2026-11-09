'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Scope } from '@/features/auth/types';
import { useErrorMessage } from '@/features/auth/use-messages';
import { http } from '@/lib/api-client';
import { permKey, PRIVILEGED, SUPER_ADMIN, type Permission, type Role } from './types';

const SCOPES: Scope[] = ['OWN', 'DEPARTMENT', 'ALL'];

/** FR-USR-04: a role's permissions, each with a scope. Super Admin is shown read-only. */
export function RoleDialog({ role, editable, onClose }: { role: Role | 'new'; editable: boolean; onClose: () => void }) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tr = useTranslations('common.roles');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const existing = role === 'new' ? null : role;
  const permissions = useQuery({ queryKey: ['permissions'], queryFn: async () => (await http.get<Permission[]>('/permissions')).data, staleTime: Infinity });
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [grants, setGrants] = useState<Record<string, Scope>>(() => Object.fromEntries(existing?.grants.map((g) => [g.key, g.scope]) ?? []));
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const displayName = existing ? (tr.has(existing.name as 'Employee') ? tr(existing.name as 'Employee') : existing.name) : '';

  const modules = useMemo(() => {
    const by = new Map<string, Permission[]>();
    for (const p of permissions.data ?? []) by.set(p.module, [...(by.get(p.module) ?? []), p]);
    return [...by.entries()];
  }, [permissions.data]);
  const moduleLabel = (m: string) => (t.has(`modules.${m}` as 'modules.users') ? t(`modules.${m}` as 'modules.users') : m);
  const permLabel = (p: Permission) => (t.has(`permissions.${permKey(p.key)}` as 'permissions.user__read') ? t(`permissions.${permKey(p.key)}` as 'permissions.user__read') : p.description);

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        ...(existing?.isSystem ? {} : { name: name.trim() }),
        description: description.trim(),
        grants: Object.entries(grants).map(([key, scope]) => ({ key, scope })),
      };
      if (existing) await http.put(`/roles/${existing.id}`, body);
      else await http.post('/roles', body);
    },
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['roles'] }), qc.invalidateQueries({ queryKey: ['users'] })]);
      toast.success(t('roleForm.saved'));
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = () => {
    if (!existing?.isSystem && name.trim().length < 2) return setNameError(tc('fieldErrors.invalid'));
    setNameError(null);
    setError(null);
    mutation.mutate();
  };

  const title = !existing ? t('roleForm.createTitle') : editable ? t('roleForm.editTitle', { name: displayName }) : t('roleForm.viewTitle', { name: displayName });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={existing?.name === SUPER_ADMIN ? t('roleForm.locked') : t('roleForm.matrixHint')}
      className="max-w-[720px]"
      actions={
        editable ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
              {tc('cancel')}
            </Button>
            <Button onClick={submit} loading={mutation.isPending}>
              {tc('save')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {tc('close')}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        {editable && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('roleForm.name')} required hint={existing?.isSystem ? t('roleForm.systemName') : undefined} error={nameError ?? undefined}>
              {(a) => <Input {...a} maxLength={50} disabled={existing?.isSystem} value={existing?.isSystem ? displayName : name} onChange={(e) => setName(e.target.value)} />}
            </FormField>
            <FormField label={t('roleForm.description')}>{(a) => <Input {...a} maxLength={255} value={description} onChange={(e) => setDescription(e.target.value)} />}</FormField>
          </div>
        )}
        {permissions.isPending ? (
          <Skeleton className="h-96" />
        ) : (
          <div className="flex flex-col gap-5">
            {modules.map(([module, perms]) => (
              <fieldset key={module} className="flex flex-col gap-1">
                <legend className="mb-1 text-label text-muted-foreground">{moduleLabel(module)}</legend>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {perms.map((p) => {
                    const scope = grants[p.key];
                    const privileged = PRIVILEGED.includes(p.key);
                    return (
                      <li key={p.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-body-sm">
                            {permLabel(p)}
                            {privileged && <TriangleAlert className="size-4 shrink-0 text-warning" aria-label={t('roleForm.privileged')} />}
                          </span>
                          <code className="text-caption text-muted-foreground">{p.key}</code>
                        </span>
                        {editable ? (
                          <Select
                            aria-label={permLabel(p)}
                            value={scope ?? ''}
                            onChange={(e) => {
                              const v = e.target.value as Scope | '';
                              setGrants((g) => {
                                const next = { ...g };
                                if (v) next[p.key] = v;
                                else delete next[p.key];
                                return next;
                              });
                            }}
                            className="w-36"
                          >
                            <option value="">{t('scope.none')}</option>
                            {SCOPES.map((s) => (
                              <option key={s} value={s}>
                                {t(`scope.${s}`)}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <span className={scope ? 'text-body-sm font-semibold text-deep-teal' : 'text-body-sm text-muted-foreground'}>{scope ? t(`scope.${scope}`) : t('scope.none')}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function RemoveRoleDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const t = useTranslations('users');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => http.delete(`/roles/${role.id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success(t('roleForm.removed'));
      onClose();
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      onClose();
    },
  });
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('roleForm.removeTitle', { name: role.name })}
      description={t('roleForm.removeText')}
      confirmLabel={t('roleForm.delete')}
      loading={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  );
}
