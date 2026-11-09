'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
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
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { applyApiError } from '@/lib/form-errors';
import { formatNumber } from '@/lib/format';
import { useDepartmentOptions } from '@/lib/queries';
import type { Position } from './types';

const PAGE_SIZE = 20;
const KEYS = ['search', 'departmentId', 'includeArchived'] as const;

/** FR-POS-01..03: positions, each belonging to one department. */
export function PositionList() {
  const t = useTranslations('positions');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(KEYS);
  const [editing, setEditing] = useState<Position | 'new' | null>(null);
  const [removing, setRemoving] = useState<Position | null>(null);
  const companyWide = scopeOf(user, 'position:read') === 'ALL';
  const departments = useDepartmentOptions(can(user, 'department:read'));

  const query = useQuery({
    queryKey: ['positions', 'list', values, page],
    queryFn: () =>
      http.get<Position[]>('/positions', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          search: values.search || undefined,
          departmentId: values.departmentId || undefined,
          includeArchived: values.includeArchived === 'true' ? 'true' : undefined,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const canEdit = can(user, 'position:update');
  const canDelete = can(user, 'position:delete');
  const rowActions = (p: Position) => (
    <span className="inline-flex gap-1">
      {canEdit && (
        <Button variant="ghost" size="icon" onClick={() => setEditing(p)} aria-label={t('editOf', { name: p.title })}>
          <Pencil aria-hidden="true" />
        </Button>
      )}
      {canDelete && (
        <Button variant="ghost" size="icon" onClick={() => setRemoving(p)} aria-label={t('deleteOf', { name: p.title })} className="hover:enabled:bg-danger-soft hover:enabled:text-danger-text">
          <Trash2 aria-hidden="true" />
        </Button>
      )}
    </span>
  );
  const columns: Column<Position>[] = [
    {
      key: 'title',
      header: t('columns.title'),
      cell: (p) => (
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          {p.title}
          {p.archivedAt && <StatusBadge>{t('archivedBadge')}</StatusBadge>}
        </span>
      ),
    },
    { key: 'department', header: t('columns.department'), cell: (p) => p.department.name },
    { key: 'employees', header: t('columns.employees'), numeric: true, cell: (p) => formatNumber(p._count.employees) },
    ...(canEdit || canDelete ? [{ key: 'actions', header: <span className="sr-only">{t('columns.actions')}</span>, align: 'end' as const, cell: (p: Position) => (p.archivedAt ? null : rowActions(p)) }] : []),
  ];
  const filtered = Boolean(values.search || values.departmentId);
  const add = can(user, 'position:create') && (
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
        rowKey={(p) => p.id}
        loading={query.isPending}
        empty={filtered ? <EmptyState icon={SearchX} title={t('empty.filteredTitle')} /> : <EmptyState icon={Briefcase} title={t('empty.title')} description={t('empty.text')} action={add} />}
        toolbar={
          <>
            <SearchInput value={values.search} onChange={(v) => set({ search: v })} placeholder={t('searchPlaceholder')} label={t('searchLabel')} className="w-full sm:w-72" />
            {companyWide && departments.data && (
              <Select aria-label={t('filters.department')} value={values.departmentId} onChange={(e) => set({ departmentId: e.target.value })} className="w-full sm:w-52">
                <option value="">{t('filters.allDepartments')}</option>
                {departments.data.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
            {companyWide && can(user, 'position:update') && (
              <Checkbox label={t('includeArchived')} checked={values.includeArchived === 'true'} onChange={(e) => set({ includeArchived: e.target.checked ? 'true' : null })} className="self-center" />
            )}
          </>
        }
        mobileItem={(p) => (
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{p.title}</p>
              <p className="text-caption text-muted-foreground">
                {p.department.name} · {t('columns.employees')} {formatNumber(p._count.employees)}
              </p>
            </div>
            {!p.archivedAt && (canEdit || canDelete) && rowActions(p)}
          </div>
        )}
        footer={query.data?.meta && query.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
      {editing && <PositionDialog key={editing === 'new' ? 'new' : editing.id} position={editing} defaultDepartmentId={values.departmentId} onClose={() => setEditing(null)} />}
      <RemovePosition position={removing} onClose={() => setRemoving(null)} />
    </>
  );
}

const schema = z.object({
  departmentId: z.string().min(1, 'choose'),
  title: z.string().trim().min(1, 'required').max(150),
  description: z.string().trim().max(2000),
});
type Values = z.infer<typeof schema>;

/** Mounted per position (keyed), so the form starts from that position's values. */
function PositionDialog({ position, defaultDepartmentId, onClose }: { position: Position | 'new'; defaultDepartmentId: string; onClose: () => void }) {
  const t = useTranslations('positions');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const qc = useQueryClient();
  const departments = useDepartmentOptions();
  const [formError, setFormError] = useState<string | null>(null);
  const existing = position !== 'new' ? position : null;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: existing ? { departmentId: existing.department.id, title: existing.title, description: existing.description ?? '' } : { departmentId: defaultDepartmentId, title: '', description: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      if (existing) await http.put(`/positions/${existing.id}`, { title: v.title, description: v.description });
      else await http.post('/positions', v);
      await qc.invalidateQueries({ queryKey: ['positions'] });
      await qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success(existing ? t('form.saved') : t('form.created'));
      onClose();
    } catch (error) {
      if (!applyApiError(error, form.setError, ['departmentId', 'title', 'description'], { duplicate: tc('fieldErrors.duplicate'), invalid: tc('fieldErrors.invalid') })) setFormError(errorMessage(error));
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
          <Button type="submit" form="position-form" loading={isSubmitting}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <form id="position-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <FormField label={t('fields.department')} required hint={existing ? t('fields.departmentLocked') : undefined} error={fieldError(errors.departmentId?.message, t('fields.department'))}>
          {(a) => (
            <Select {...a} disabled={Boolean(existing)} {...form.register('departmentId')}>
              <option value="">—</option>
              {existing && !departments.data?.some((d) => d.id === existing.department.id) && <option value={existing.department.id}>{existing.department.name}</option>}
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={t('fields.title')} required error={fieldError(errors.title?.message, t('fields.title'))}>
          {(a) => <Input {...a} autoComplete="off" {...form.register('title')} />}
        </FormField>
        <FormField label={t('fields.description')} error={fieldError(errors.description?.message, t('fields.description'))}>
          {(a) => <Textarea {...a} rows={3} {...form.register('description')} />}
        </FormField>
      </form>
    </Dialog>
  );
}

function RemovePosition({ position, onClose }: { position: Position | null; onClose: () => void }) {
  const t = useTranslations('positions');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => http.delete<{ result: 'archived' | 'deleted' }>(`/positions/${position!.id}`),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['positions'] });
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
      open={position !== null}
      onOpenChange={(o) => !o && onClose()}
      title={position ? t('remove.title', { name: position.title }) : ''}
      description={t('remove.description')}
      confirmLabel={t('remove.confirm')}
      loading={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  );
}
