'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Plus, SearchX, Trash2, UserCog } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/auth-provider';
import { can, scopeOf } from '@/features/auth/permissions';
import { useErrorMessage, useFieldError } from '@/features/auth/use-messages';
import type { Employee } from '@/features/employees/types';
import { useListParams } from '@/hooks/use-list-params';
import { Link } from '@/i18n/navigation';
import { http } from '@/lib/api-client';
import { applyApiError } from '@/lib/form-errors';
import { formatNumber } from '@/lib/format';
import type { Department } from './types';

const PAGE_SIZE = 20;
const KEYS = ['search', 'includeArchived'] as const;
const person = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

/** FR-DEP-01..03: departments, their managers and head counts. */
export function DepartmentList() {
  const t = useTranslations('departments');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(KEYS);
  const [editing, setEditing] = useState<Department | 'new' | null>(null);
  const [managing, setManaging] = useState<Department | null>(null);
  const [removing, setRemoving] = useState<Department | null>(null);
  const companyWide = scopeOf(user, 'department:read') === 'ALL';

  const query = useQuery({
    queryKey: ['departments', 'list', values, page],
    queryFn: () =>
      http.get<Department[]>('/departments', {
        params: { page, pageSize: PAGE_SIZE, search: values.search || undefined, includeArchived: values.includeArchived === 'true' ? 'true' : undefined },
      }),
    placeholderData: keepPreviousData,
  });

  const canEdit = can(user, 'department:update');
  const canDelete = can(user, 'department:delete');
  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: t('columns.name'),
      cell: (d) => (
        <span className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            {d.name}
            {d.archivedAt && <StatusBadge>{t('archivedBadge')}</StatusBadge>}
          </span>
          <span className="text-caption text-muted-foreground">{d.code}</span>
        </span>
      ),
    },
    { key: 'manager', header: t('columns.manager'), cell: (d) => (d.manager ? person(d.manager) : <span className="text-muted-foreground">{t('noManager')}</span>) },
    {
      key: 'employees',
      header: t('columns.employees'),
      numeric: true,
      cell: (d) =>
        can(user, 'employee:read') && d._count.employees > 0 ? (
          <Link href={`/employees?departmentId=${d.id}`} className="font-semibold text-deep-teal underline-offset-4 hover:underline" aria-label={`${t('viewEmployees')}: ${d.name}`}>
            {formatNumber(d._count.employees)}
          </Link>
        ) : (
          formatNumber(d._count.employees)
        ),
    },
    { key: 'positions', header: t('columns.positions'), numeric: true, cell: (d) => formatNumber(d._count.positions) },
    ...(canEdit || canDelete
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">{t('columns.actions')}</span>,
            align: 'end' as const,
            cell: (d: Department) => (d.archivedAt ? null : rowActions(d)),
          },
        ]
      : []),
  ];

  const rowActions = (d: Department) => (
      <span className="inline-flex gap-1">
        {canEdit && (
          <>
            <Button variant="ghost" size="icon" onClick={() => setManaging(d)} aria-label={t('manager.actionOf', { name: d.name })}>
              <UserCog aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setEditing(d)} aria-label={t('editOf', { name: d.name })}>
              <Pencil aria-hidden="true" />
            </Button>
          </>
        )}
        {canDelete && (
          <Button variant="ghost" size="icon" onClick={() => setRemoving(d)} aria-label={t('deleteOf', { name: d.name })} className="hover:enabled:bg-danger-soft hover:enabled:text-danger-text">
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </span>
  );

  const add = can(user, 'department:create') && (
    <Button onClick={() => setEditing('new')}>
      <Plus aria-hidden="true" />
      {t('add')}
    </Button>
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]}
        description={query.data?.meta ? t('summary', { count: formatNumber(query.data.meta.total) }) : undefined}
        action={add}
      />
      {query.isError && (
        <Alert className="mb-6">
          {t('loadError')} {errorMessage(query.error)}
        </Alert>
      )}
      <DataTable
        caption={t('tableCaption')}
        columns={columns}
        rows={query.data?.data}
        rowKey={(d) => d.id}
        loading={query.isPending}
        empty={values.search ? <EmptyState icon={SearchX} title={t('empty.filteredTitle')} /> : <EmptyState icon={Building2} title={t('empty.title')} description={t('empty.text')} action={add} />}
        toolbar={
          companyWide && (
            <>
              <SearchInput value={values.search} onChange={(v) => set({ search: v })} placeholder={t('searchPlaceholder')} label={t('searchLabel')} className="w-full sm:w-80" />
              <Checkbox label={t('includeArchived')} checked={values.includeArchived === 'true'} onChange={(e) => set({ includeArchived: e.target.checked ? 'true' : null })} className="self-center" />
            </>
          )
        }
        mobileItem={(d) => (
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{d.name}</p>
              <p className="text-caption text-muted-foreground">
                {d.code} · {d.manager ? person(d.manager) : t('noManager')}
              </p>
              <p className="text-caption text-muted-foreground tabular">
                {t('columns.employees')} {formatNumber(d._count.employees)} · {t('columns.positions')} {formatNumber(d._count.positions)}
              </p>
            </div>
            {!d.archivedAt && (canEdit || canDelete) && rowActions(d)}
          </div>
        )}
        footer={query.data?.meta && query.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />

      {editing && <DepartmentDialog key={editing === 'new' ? 'new' : editing.id} department={editing} onClose={() => setEditing(null)} />}
      {managing && <ManagerDialog key={managing.id} department={managing} onClose={() => setManaging(null)} />}
      <RemoveDepartment department={removing} onClose={() => setRemoving(null)} />
    </>
  );
}

const schema = z.object({
  code: z.string().trim().min(1, 'required').regex(/^[A-Za-z0-9_-]{2,20}$/, 'code'),
  name: z.string().trim().min(1, 'required').max(150),
  description: z.string().trim().max(2000),
});
type Values = z.infer<typeof schema>;

/** Mounted per department (keyed), so the form starts from that department's values. */
function DepartmentDialog({ department, onClose }: { department: Department | 'new'; onClose: () => void }) {
  const t = useTranslations('departments');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const existing = department !== 'new' ? department : null;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: existing ? { code: existing.code, name: existing.name, description: existing.description ?? '' } : { code: '', name: '', description: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const body = { ...v, code: v.code.toUpperCase() };
    try {
      if (existing) await http.put(`/departments/${existing.id}`, body);
      else await http.post('/departments', body);
      await qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success(existing ? t('form.saved') : t('form.created'));
      onClose();
    } catch (error) {
      if (!applyApiError(error, form.setError, ['code', 'name', 'description'], { duplicate: tc('fieldErrors.duplicate'), invalid: tc('fieldErrors.invalid') })) setFormError(errorMessage(error));
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing ? t('form.editTitle') : t('form.createTitle')}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {tc('cancel')}
          </Button>
          <Button type="submit" form="department-form" loading={isSubmitting}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <form id="department-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <FormField label={t('fields.code')} required hint={t('fields.codeHint')} error={fieldError(errors.code?.message, t('fields.code'))}>
          {(a) => <Input {...a} autoComplete="off" className="uppercase" {...form.register('code')} />}
        </FormField>
        <FormField label={t('fields.name')} required error={fieldError(errors.name?.message, t('fields.name'))}>
          {(a) => <Input {...a} autoComplete="off" {...form.register('name')} />}
        </FormField>
        <FormField label={t('fields.description')} error={fieldError(errors.description?.message, t('fields.description'))}>
          {(a) => <Textarea {...a} rows={3} {...form.register('description')} />}
        </FormField>
      </form>
    </Dialog>
  );
}

function ManagerDialog({ department, onClose }: { department: Department; onClose: () => void }) {
  const t = useTranslations('departments');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const [value, setValue] = useState(department.manager?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const candidates = useQuery({
    queryKey: ['employees', 'list', 'department-candidates', department.id],
    queryFn: async () =>
      (await http.get<Employee[]>('/employees', { params: { departmentId: department.id, pageSize: 100, sort: 'firstName:asc' } })).data.filter((e) => ['ACTIVE', 'PROBATION'].includes(e.employmentStatus)),
  });
  const mutation = useMutation({
    mutationFn: () => http.put(`/departments/${department.id}/manager`, { employeeId: value || null }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['departments'] });
      await qc.invalidateQueries({ queryKey: ['employees', 'detail'] });
      toast.success(t('manager.done'));
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const options = candidates.data ?? [];
  // Keep the current manager selectable even if they now sit in another department.
  const current = department.manager && !options.some((o) => o.id === department.manager!.id) ? department.manager : null;

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('manager.title', { name: department.name })}
      description={t('manager.note')}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={value === (department.manager?.id ?? '')}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <FormField label={t('fields.manager')} hint={!candidates.isPending && options.length === 0 ? t('manager.noCandidates') : t('fields.managerHint')}>
          {(a) => (
            <Select {...a} value={value} onChange={(e) => setValue(e.target.value)} disabled={candidates.isPending}>
              <option value="">{t('manager.none')}</option>
              {current && <option value={current.id}>{`${person(current)} (${current.employeeCode})`}</option>}
              {options.map((e) => (
                <option key={e.id} value={e.id}>
                  {`${person(e)} (${e.employeeCode}) · ${e.position.title}`}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>
    </Dialog>
  );
}

function RemoveDepartment({ department, onClose }: { department: Department | null; onClose: () => void }) {
  const t = useTranslations('departments');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => http.delete<{ result: 'archived' | 'deleted' }>(`/departments/${department!.id}`),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success(res.data.result === 'archived' ? t('remove.archived') : t('remove.deleted'));
      onClose();
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      onClose();
    },
  });
  return (
    <ConfirmDialog
      open={department !== null}
      onOpenChange={(o) => !o && onClose()}
      title={department ? t('remove.title', { name: department.name }) : ''}
      description={t('remove.description')}
      confirmLabel={t('remove.confirm')}
      loading={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  );
}
