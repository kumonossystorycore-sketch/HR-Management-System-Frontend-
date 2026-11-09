'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserRoundX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { PersonCell } from '@/components/ui/person-cell';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/auth-provider';
import { can } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { formatDateTime, formatNumber } from '@/lib/format';
import { RemoveRoleDialog, RoleDialog } from './role-dialog';
import { SUPER_ADMIN, type Role, type UserAccount } from './types';
import { ResetPasswordDialog, UserDialog } from './user-dialog';

const PAGE_SIZE = 20;
const KEYS = ['view', 'search', 'roleId', 'isActive'] as const;

export const useRoles = () => useQuery({ queryKey: ['roles'], queryFn: async () => (await http.get<Role[]>('/roles')).data, staleTime: 60_000 });

/** FR-USR-01..04: accounts, and the roles that decide what each account may do. */
export function UsersView() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const { values, set } = useListParams(KEYS);
  const view = values.view === 'roles' ? 'roles' : 'users';
  return (
    <>
      <PageHeader title={t('title')} crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]} />
      <Tabs value={view} onValueChange={(v) => set({ view: v === 'users' ? null : v, search: null, roleId: null, isActive: null })}>
        <TabsList aria-label={t('title')}>
          <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
          <TabsTrigger value="roles">{t('tabs.roles')}</TabsTrigger>
        </TabsList>
        <TabsContent value="users">{view === 'users' && <UsersPanel />}</TabsContent>
        <TabsContent value="roles">{view === 'roles' && <RolesPanel />}</TabsContent>
      </Tabs>
    </>
  );
}

function UsersPanel() {
  const t = useTranslations('users');
  const tr = useTranslations('common.roles');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(KEYS);
  const roles = useRoles();
  const [editing, setEditing] = useState<UserAccount | 'new' | null>(null);
  const [resetting, setResetting] = useState<UserAccount | null>(null);
  const query = useQuery({
    queryKey: ['users', values.search, values.roleId, values.isActive, page],
    queryFn: () =>
      http.get<UserAccount[]>('/users', {
        params: { page, pageSize: PAGE_SIZE, sort: 'email:asc', search: values.search || undefined, roleId: values.roleId || undefined, isActive: values.isActive || undefined },
      }),
    placeholderData: keepPreviousData,
  });
  const roleName = (n: string) => (tr.has(n as 'Employee') ? tr(n as 'Employee') : n);
  const manage = can(user, 'user:manage');
  const reset = can(user, 'user:reset_password');

  const actions = (u: UserAccount) => (
    <span className="inline-flex gap-1">
      {reset && u.id !== user?.id && (
        <Button variant="ghost" size="icon" onClick={() => setResetting(u)} aria-label={t('users.resetOf', { email: u.email })}>
          <KeyRound aria-hidden="true" />
        </Button>
      )}
      {manage && (
        <Button variant="ghost" size="icon" onClick={() => setEditing(u)} aria-label={t('users.editOf', { email: u.email })}>
          <Pencil aria-hidden="true" />
        </Button>
      )}
    </span>
  );
  const status = (u: UserAccount) => (
    <span className="flex flex-wrap gap-1">
      <StatusBadge tone={u.isActive ? 'success' : 'neutral'}>{u.isActive ? t('users.active') : t('users.inactive')}</StatusBadge>
      {u.mustChangePassword && u.isActive && <StatusBadge tone="warning">{t('users.mustChange')}</StatusBadge>}
    </span>
  );

  const columns: Column<UserAccount>[] = [
    {
      key: 'email',
      header: t('users.email'),
      cell: (u) => (
        <span className="flex flex-col">
          <span className="font-semibold break-all">
            {u.email}
            {u.id === user?.id && <span className="ml-2 text-caption font-normal text-muted-foreground">({t('users.you')})</span>}
          </span>
        </span>
      ),
    },
    {
      key: 'employee',
      header: t('users.employee'),
      cell: (u) =>
        u.employee ? <PersonCell name={`${u.employee.firstName} ${u.employee.lastName}`} meta={`${u.employee.employeeCode} · ${u.employee.department.name}`} /> : <span className="text-muted-foreground">{t('users.noEmployee')}</span>,
    },
    { key: 'roles', header: t('users.roles'), cell: (u) => u.roles.map((r) => roleName(r.role.name)).join(', ') },
    { key: 'status', header: t('users.status'), cell: status },
    { key: 'last', header: t('users.lastLogin'), numeric: true, cell: (u) => (u.lastLoginAt ? formatDateTime(u.lastLoginAt) : t('users.never')) },
    ...(manage || reset ? [{ key: 'actions', header: <span className="sr-only">{t('actions')}</span>, align: 'end' as const, cell: actions }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {manage && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden="true" />
            {t('users.add')}
          </Button>
        </div>
      )}
      {query.isError && <Alert>{`${t('loadError')} ${errorMessage(query.error)}`}</Alert>}
      <DataTable
        caption={t('users.caption')}
        columns={columns}
        rows={query.data?.data}
        rowKey={(u) => u.id}
        loading={query.isPending}
        empty={<EmptyState icon={UserRoundX} title={t('users.empty')} />}
        toolbar={
          <>
            <SearchInput value={values.search} onChange={(v) => set({ search: v })} placeholder={t('users.searchPlaceholder')} label={t('users.searchLabel')} className="w-full sm:w-64" />
            <Select aria-label={t('users.roles')} value={values.roleId} onChange={(e) => set({ roleId: e.target.value })} className="w-full sm:w-48">
              <option value="">{t('users.allRoles')}</option>
              {roles.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {roleName(r.name)}
                </option>
              ))}
            </Select>
            <Select aria-label={t('users.status')} value={values.isActive} onChange={(e) => set({ isActive: e.target.value })} className="w-full sm:w-40">
              <option value="">{t('users.allStatuses')}</option>
              <option value="true">{t('users.active')}</option>
              <option value="false">{t('users.inactive')}</option>
            </Select>
          </>
        }
        mobileItem={(u) => (
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold break-all">{u.email}</p>
              <p className="text-caption text-muted-foreground">{u.roles.map((r) => roleName(r.role.name)).join(', ')}</p>
              <div className="mt-1">{status(u)}</div>
            </div>
            {(manage || reset) && actions(u)}
          </div>
        )}
        footer={query.data?.meta && query.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
      {editing && <UserDialog key={editing === 'new' ? 'new' : editing.id} account={editing} roles={roles.data ?? []} onClose={() => setEditing(null)} />}
      {resetting && <ResetPasswordDialog account={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}

function RolesPanel() {
  const t = useTranslations('users');
  const tr = useTranslations('common.roles');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const roles = useRoles();
  const [open, setOpen] = useState<Role | 'new' | null>(null);
  const [removing, setRemoving] = useState<Role | null>(null);
  const manage = can(user, 'role:manage');
  const roleName = (n: string) => (tr.has(n as 'Employee') ? tr(n as 'Employee') : n);
  // Built-in roles were described in English by the seed: show them in the user's language.
  const roleDescription = (r: Role) => (r.isSystem && t.has(`systemRoles.${r.name}` as 'systemRoles.Employee') ? t(`systemRoles.${r.name}` as 'systemRoles.Employee') : r.description);

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: t('roles.name'),
      cell: (r) => (
        <span className="flex flex-col">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            {roleName(r.name)}
            {r.isSystem && <StatusBadge tone="teal">{t('roles.system')}</StatusBadge>}
          </span>
          {roleDescription(r) && <span className="text-caption text-muted-foreground">{roleDescription(r)}</span>}
        </span>
      ),
    },
    { key: 'perms', header: t('roles.permissions'), numeric: true, cell: (r) => t('roles.count', { count: formatNumber(r.grants.length) }) },
    { key: 'users', header: t('roles.users'), numeric: true, cell: (r) => formatNumber(r.userCount) },
    {
      key: 'actions',
      header: <span className="sr-only">{t('actions')}</span>,
      align: 'end',
      cell: (r) => (
        <span className="inline-flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setOpen(r)} aria-label={manage && r.name !== SUPER_ADMIN ? t('roles.editOf', { name: roleName(r.name) }) : t('roles.viewOf', { name: roleName(r.name) })}>
            {manage && r.name !== SUPER_ADMIN ? <Pencil aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          </Button>
          {manage && !r.isSystem && (
            <Button variant="ghost" size="icon" onClick={() => setRemoving(r)} aria-label={t('roles.deleteOf', { name: r.name })} className="hover:enabled:bg-danger-soft hover:enabled:text-danger-text">
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {manage && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen('new')}>
            <Plus aria-hidden="true" />
            {t('roles.add')}
          </Button>
        </div>
      )}
      {roles.isError && <Alert>{errorMessage(roles.error)}</Alert>}
      <DataTable
        caption={t('roles.caption')}
        columns={columns}
        rows={roles.data}
        rowKey={(r) => r.id}
        loading={roles.isPending}
        empty={<EmptyState icon={ShieldCheck} title={t('roles.caption')} />}
        mobileItem={(r) => (
          <button type="button" onClick={() => setOpen(r)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-background">
            <span className="min-w-0">
              <span className="block font-semibold">{roleName(r.name)}</span>
              <span className="block text-caption text-muted-foreground">
                {t('roles.count', { count: formatNumber(r.grants.length) })} · {t('roles.users')} {formatNumber(r.userCount)}
              </span>
            </span>
            {r.isSystem && <StatusBadge tone="teal">{t('roles.system')}</StatusBadge>}
          </button>
        )}
      />
      {open && <RoleDialog key={open === 'new' ? 'new' : open.id} role={open} editable={manage && (open === 'new' || open.name !== SUPER_ADMIN)} onClose={() => setOpen(null)} />}
      {removing && <RemoveRoleDialog role={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}
