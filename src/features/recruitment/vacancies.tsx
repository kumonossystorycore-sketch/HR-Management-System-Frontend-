'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, BriefcaseBusiness, Lock, LockOpen, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/auth-provider';
import { can } from '@/features/auth/permissions';
import { useErrorMessage, useFieldError } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { formatDate, formatNumber, localDay } from '@/lib/format';
import { useDepartmentOptions, usePositionOptions } from '@/lib/queries';
import { VACANCY_TONE, type Vacancy } from './types';

const PAGE_SIZE = 20;
export const RECRUITMENT_KEYS = ['view', 'search', 'status', 'vacancyId', 'when'] as const;

/** FR-REC-01: vacancies. Opening one starts the applicant pipeline. */
export function VacanciesPanel() {
  const t = useTranslations('recruitment');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const { values, page, set } = useListParams(RECRUITMENT_KEYS);
  const [editing, setEditing] = useState<Vacancy | 'new' | null>(null);
  const [removing, setRemoving] = useState<Vacancy | null>(null);
  const manage = can(user, 'recruitment:manage');

  const query = useQuery({
    queryKey: ['recruitment', 'vacancies', values.status, page],
    queryFn: () => http.get<Vacancy[]>('/vacancies', { params: { page, pageSize: PAGE_SIZE, sort: 'createdAt:desc', status: values.status || undefined } }),
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (v: Vacancy) => http.put(`/vacancies/${v.id}`, { status: v.status === 'OPEN' ? 'CLOSED' : 'OPEN' }),
    onSuccess: async (_, v) => {
      await qc.invalidateQueries({ queryKey: ['recruitment'] });
      toast.success(v.status === 'OPEN' ? t('vacancies.closed') : t('vacancies.reopened'));
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const actions = (v: Vacancy) =>
    manage && !v.archivedAt ? (
      <span className="inline-flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(v)}
          aria-label={v.status === 'OPEN' ? t('vacancies.closeOf', { title: v.title }) : t('vacancies.reopenOf', { title: v.title })}
        >
          {v.status === 'OPEN' ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setEditing(v)} aria-label={t('vacancies.editOf', { title: v.title })}>
          <Pencil aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setRemoving(v)} aria-label={t('vacancies.deleteOf', { title: v.title })} className="hover:enabled:bg-danger-soft hover:enabled:text-danger-text">
          <Trash2 aria-hidden="true" />
        </Button>
      </span>
    ) : null;

  const columns: Column<Vacancy>[] = [
    {
      key: 'title',
      header: t('vacancies.title'),
      cell: (v) => (
        <span className="flex flex-col">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            {v.title}
            {v.archivedAt && <StatusBadge>{t('vacancies.archivedBadge')}</StatusBadge>}
          </span>
          <span className="text-caption text-muted-foreground">
            {v.department.name} · {v.position.title}
          </span>
        </span>
      ),
    },
    { key: 'openings', header: t('vacancies.openings'), numeric: true, cell: (v) => formatNumber(v.openings) },
    {
      key: 'applicants',
      header: t('vacancies.applicants'),
      numeric: true,
      cell: (v) => (
        <button
          type="button"
          className="font-semibold text-deep-teal underline-offset-4 hover:underline"
          onClick={() => set({ view: 'applicants', vacancyId: v.id, status: null, search: null })}
          aria-label={t('vacancies.viewApplicants', { title: v.title })}
        >
          {formatNumber(v._count.applicants)}
        </button>
      ),
    },
    { key: 'closes', header: t('vacancies.closesAt'), numeric: true, cell: (v) => (v.closesAt ? formatDate(v.closesAt) : <span className="text-muted-foreground">{t('vacancies.noDeadline')}</span>) },
    { key: 'status', header: t('vacancies.status'), cell: (v) => <StatusBadge tone={VACANCY_TONE[v.status]}>{t(`vacancyStatus.${v.status}`)}</StatusBadge> },
    ...(manage ? [{ key: 'actions', header: <span className="sr-only">{t('vacancies.actions')}</span>, align: 'end' as const, cell: actions }] : []),
  ];

  const add = manage && (
    <Button onClick={() => setEditing('new')}>
      <Plus aria-hidden="true" />
      {t('vacancies.add')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select aria-label={t('vacancies.status')} value={values.status} onChange={(e) => set({ status: e.target.value })} className="w-full sm:w-44">
          <option value="">{t('vacancies.allStatuses')}</option>
          <option value="OPEN">{t('vacancyStatus.OPEN')}</option>
          <option value="CLOSED">{t('vacancyStatus.CLOSED')}</option>
        </Select>
        {add}
      </div>
      {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
      <DataTable
        caption={t('vacancies.caption')}
        columns={columns}
        rows={query.data?.data}
        rowKey={(v) => v.id}
        loading={query.isPending}
        empty={<EmptyState icon={BriefcaseBusiness} title={t('vacancies.empty')} description={t('vacancies.emptyText')} action={add} />}
        mobileItem={(v) => (
          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{v.title}</p>
                <p className="text-caption text-muted-foreground">
                  {v.department.name} · {v.position.title}
                </p>
              </div>
              <StatusBadge tone={VACANCY_TONE[v.status]}>{t(`vacancyStatus.${v.status}`)}</StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button variant="secondary" size="sm" onClick={() => set({ view: 'applicants', vacancyId: v.id, status: null, search: null })}>
                <Users aria-hidden="true" />
                {t('vacancies.applicants')} · {formatNumber(v._count.applicants)}
              </Button>
              {actions(v)}
            </div>
          </div>
        )}
        footer={query.data?.meta && query.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
      {editing && <VacancyDialog key={editing === 'new' ? 'new' : editing.id} vacancy={editing} onClose={() => setEditing(null)} />}
      {removing && <RemoveVacancy vacancy={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}

const schema = z.object({
  title: z.string().trim().min(2, 'required').max(150),
  departmentId: z.string().min(1, 'choose'),
  positionId: z.string().min(1, 'choose'),
  openings: z.string().regex(/^\d{1,3}$/, 'invalid'),
  closesAt: z.string(),
  description: z.string().trim().max(10_000),
});
type Values = z.infer<typeof schema>;

function VacancyDialog({ vacancy, onClose }: { vacancy: Vacancy | 'new'; onClose: () => void }) {
  const t = useTranslations('recruitment');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const qc = useQueryClient();
  const existing = vacancy === 'new' ? null : vacancy;
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? { title: existing.title, departmentId: existing.department.id, positionId: existing.position.id, openings: String(existing.openings), closesAt: existing.closesAt?.slice(0, 10) ?? '', description: existing.description ?? '' }
      : { title: '', departmentId: '', positionId: '', openings: '1', closesAt: '', description: '' },
  });
  const { errors, isSubmitting } = form.formState;
  const departmentId = useWatch({ control: form.control, name: 'departmentId' });
  const departments = useDepartmentOptions();
  const positions = usePositionOptions(departmentId || undefined, Boolean(departmentId));
  useEffect(() => {
    const pos = form.getValues('positionId');
    if (pos && positions.data && !positions.data.some((p) => p.id === pos)) form.setValue('positionId', '');
  }, [positions.data, form]);
  const err = (k: keyof Values, label: string) => (errors[k]?.message === 'invalid' ? tc('fieldErrors.invalid') : fieldError(errors[k]?.message, label));

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const body = { title: v.title, departmentId: v.departmentId, positionId: v.positionId, openings: Number(v.openings), closesAt: v.closesAt || null, description: v.description };
    try {
      if (existing) await http.put(`/vacancies/${existing.id}`, body);
      else await http.post('/vacancies', body);
      await Promise.all([qc.invalidateQueries({ queryKey: ['recruitment'] }), qc.invalidateQueries({ queryKey: ['dashboard'] })]);
      toast.success(t('vacancyForm.saved'));
      onClose();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing ? t('vacancyForm.editTitle') : t('vacancyForm.createTitle')}
      className="max-w-[560px]"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {tc('cancel')}
          </Button>
          <Button type="submit" form="vacancy-form" loading={isSubmitting}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <form id="vacancy-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <FormField label={t('vacancyForm.title')} required error={err('title', t('vacancyForm.title'))}>
          {(a) => <Input {...a} placeholder={t('vacancyForm.titlePlaceholder')} {...form.register('title')} />}
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('vacancyForm.department')} required error={err('departmentId', t('vacancyForm.department'))}>
            {(a) => (
              <Select {...a} {...form.register('departmentId')}>
                <option value="">—</option>
                {departments.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label={t('vacancyForm.position')} required hint={departmentId ? undefined : t('vacancyForm.positionHint')} error={err('positionId', t('vacancyForm.position'))}>
            {(a) => (
              <Select {...a} disabled={!departmentId} {...form.register('positionId')}>
                <option value="">—</option>
                {positions.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label={t('vacancyForm.openings')} required error={err('openings', t('vacancyForm.openings'))}>
            {(a) => <Input {...a} type="number" min={1} max={500} className="tabular" {...form.register('openings')} />}
          </FormField>
          <FormField label={t('vacancyForm.closesAt')} hint={t('vacancyForm.closesAtHint')}>
            {(a) => <Input {...a} type="date" min={localDay()} {...form.register('closesAt')} />}
          </FormField>
        </div>
        <FormField label={t('vacancyForm.description')}>{(a) => <Textarea {...a} rows={5} {...form.register('description')} />}</FormField>
      </form>
    </Dialog>
  );
}

function RemoveVacancy({ vacancy, onClose }: { vacancy: Vacancy; onClose: () => void }) {
  const t = useTranslations('recruitment');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => (await http.delete<{ archived: boolean }>(`/vacancies/${vacancy.id}`)).data,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['recruitment'] });
      toast.success(res.archived ? t('removeVacancy.archived') : t('removeVacancy.deleted'), res.archived ? { icon: <Archive className="size-4" aria-hidden="true" /> } : undefined);
      onClose();
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      onClose();
    },
  });
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('removeVacancy.title', { title: vacancy.title })}
      description={t('removeVacancy.description')}
      confirmLabel={t('removeVacancy.confirm')}
      loading={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  );
}
