'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Link2, Plus, UserRoundSearch } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { can } from '@/features/auth/permissions';
import { useErrorMessage, useFieldError } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { applyApiError } from '@/lib/form-errors';
import { formatDate, formatNumber } from '@/lib/format';
import { ApplicantDialog } from './applicant-dialog';
import { APPLICANT_STATUSES, APPLICANT_TONE, type Applicant, type Vacancy } from './types';
import { RECRUITMENT_KEYS } from './vacancies';

const PAGE_SIZE = 20;

export const useVacancyOptions = (onlyOpen = false) =>
  useQuery({
    queryKey: ['recruitment', 'vacancies', 'options', onlyOpen],
    queryFn: async () => (await http.get<Vacancy[]>('/vacancies', { params: { pageSize: 100, sort: 'title:asc', ...(onlyOpen ? { status: 'OPEN' } : {}) } })).data,
    staleTime: 60_000,
  });

/** FR-REC-02/03: applicants, filtered by vacancy and status. A row opens the applicant. */
export function ApplicantsPanel() {
  const t = useTranslations('recruitment');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(RECRUITMENT_KEYS);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const vacancies = useVacancyOptions();
  const filtered = Boolean(values.search || values.status || values.vacancyId);

  const query = useQuery({
    queryKey: ['recruitment', 'applicants', values.search, values.status, values.vacancyId, page],
    queryFn: () =>
      http.get<Applicant[]>('/applicants', {
        params: { page, pageSize: PAGE_SIZE, sort: 'createdAt:desc', search: values.search || undefined, status: values.status || undefined, vacancyId: values.vacancyId || undefined },
      }),
    placeholderData: keepPreviousData,
  });

  const open = (a: Applicant) => (
    <button type="button" onClick={() => setOpenId(a.id)} className="flex min-w-0 flex-col text-left" aria-label={t('applicants.openOf', { name: a.fullName })}>
      <span className="truncate font-semibold text-deep-teal underline-offset-4 hover:underline">{a.fullName}</span>
      <span className="truncate text-caption text-muted-foreground">{a.email}</span>
    </button>
  );

  const columns: Column<Applicant>[] = [
    { key: 'name', header: t('applicants.name'), cell: open },
    {
      key: 'vacancy',
      header: t('applicants.vacancy'),
      cell: (a) => (
        <span className="flex flex-col">
          <span>{a.vacancy.title}</span>
          <span className="text-caption text-muted-foreground">{a.vacancy.department.name}</span>
        </span>
      ),
    },
    { key: 'applied', header: t('applicants.applied'), numeric: true, cell: (a) => formatDate(a.createdAt) },
    { key: 'interviews', header: t('applicants.interviews'), numeric: true, cell: (a) => formatNumber(a._count.interviews) },
    {
      key: 'cv',
      header: t('applicants.cv'),
      cell: (a) =>
        a.cvFile ? <FileText className="size-4 text-deep-teal" aria-label={a.cvFile.originalName} /> : a.cvUrl ? <Link2 className="size-4 text-deep-teal" aria-label={t('applicant.cvLink')} /> : <span className="text-muted-foreground">{t('applicants.noCv')}</span>,
    },
    {
      key: 'status',
      header: t('applicants.status'),
      cell: (a) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge tone={APPLICANT_TONE[a.status]}>{t(`applicantStatus.${a.status}`)}</StatusBadge>
          {a.employee && <span className="text-caption text-muted-foreground">{t('applicants.hired', { code: a.employee.employeeCode })}</span>}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {can(user, 'recruitment:manage') && (
        <div className="flex justify-end">
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            {t('applicants.add')}
          </Button>
        </div>
      )}
      {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
      <DataTable
        caption={t('applicants.caption')}
        columns={columns}
        rows={query.data?.data}
        rowKey={(a) => a.id}
        loading={query.isPending}
        empty={<EmptyState icon={UserRoundSearch} title={filtered ? t('applicants.emptyFiltered') : t('applicants.empty')} />}
        toolbar={
          <>
            <SearchInput value={values.search} onChange={(v) => set({ search: v })} placeholder={t('applicants.searchPlaceholder')} label={t('applicants.searchLabel')} className="w-full sm:w-60" />
            <Select aria-label={t('applicants.vacancy')} value={values.vacancyId} onChange={(e) => set({ vacancyId: e.target.value })} className="w-full sm:w-64">
              <option value="">{t('applicants.allVacancies')}</option>
              {vacancies.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} · {v.department.name}
                </option>
              ))}
            </Select>
            <Select aria-label={t('applicants.status')} value={values.status} onChange={(e) => set({ status: e.target.value })} className="w-full sm:w-44">
              <option value="">{t('applicants.allStatuses')}</option>
              {APPLICANT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`applicantStatus.${s}`)}
                </option>
              ))}
            </Select>
          </>
        }
        mobileItem={(a) => (
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              {open(a)}
              <p className="text-caption text-muted-foreground">{a.vacancy.title}</p>
            </div>
            <StatusBadge tone={APPLICANT_TONE[a.status]}>{t(`applicantStatus.${a.status}`)}</StatusBadge>
          </div>
        )}
        footer={query.data?.meta && query.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
      {adding && <NewApplicantDialog defaultVacancyId={values.vacancyId} onCreated={(id) => setOpenId(id)} onClose={() => setAdding(false)} />}
      {openId && <ApplicantDialog key={openId} id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

const schema = z.object({
  vacancyId: z.string().min(1, 'choose'),
  fullName: z.string().trim().min(2, 'required').max(150),
  email: z.string().trim().min(1, 'required').pipe(z.email('email')),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?[\d\s-]{6,30}$/.test(v), 'phone'),
  cvUrl: z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'invalid'),
  notes: z.string().trim().max(5000),
});
type Values = z.infer<typeof schema>;

function NewApplicantDialog({ defaultVacancyId, onCreated, onClose }: { defaultVacancyId: string; onCreated: (id: string) => void; onClose: () => void }) {
  const t = useTranslations('recruitment');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const qc = useQueryClient();
  const vacancies = useVacancyOptions(true);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { vacancyId: defaultVacancyId, fullName: '', email: '', phone: '', cvUrl: '', notes: '' } });
  const { errors, isSubmitting } = form.formState;
  const err = (k: keyof Values, label: string) => (errors[k]?.message === 'invalid' ? tc('fieldErrors.invalid') : fieldError(errors[k]?.message, label));

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      const created = (await http.post<Applicant>('/applicants', { ...v, phone: v.phone || null, cvUrl: v.cvUrl || null })).data;
      await qc.invalidateQueries({ queryKey: ['recruitment'] });
      toast.success(t('applicantForm.saved'));
      onClose();
      onCreated(created.id);
    } catch (error) {
      if (!applyApiError(error, form.setError, ['email', 'fullName', 'phone', 'cvUrl'], { duplicate: tc('fieldErrors.duplicate'), invalid: tc('fieldErrors.invalid') })) setFormError(errorMessage(error));
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('applicantForm.createTitle')}
      className="max-w-[560px]"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {tc('cancel')}
          </Button>
          <Button type="submit" form="applicant-form" loading={isSubmitting}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <form id="applicant-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <FormField label={t('applicantForm.vacancy')} required hint={t('applicantForm.onlyOpen')} error={err('vacancyId', t('applicantForm.vacancy'))}>
          {(a) => (
            <Select {...a} {...form.register('vacancyId')}>
              <option value="">—</option>
              {vacancies.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} · {v.department.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={t('applicantForm.fullName')} required error={err('fullName', t('applicantForm.fullName'))}>
          {(a) => <Input {...a} autoComplete="off" {...form.register('fullName')} />}
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('applicantForm.email')} required error={err('email', t('applicantForm.email'))}>
            {(a) => <Input {...a} type="email" autoComplete="off" {...form.register('email')} />}
          </FormField>
          <FormField label={t('applicantForm.phone')} error={err('phone', t('applicantForm.phone'))}>
            {(a) => <Input {...a} type="tel" autoComplete="off" {...form.register('phone')} />}
          </FormField>
        </div>
        <FormField label={t('applicantForm.cvUrl')} hint={t('applicantForm.cvUrlHint')} error={err('cvUrl', t('applicantForm.cvUrl'))}>
          {(a) => <Input {...a} type="url" inputMode="url" placeholder="https://" {...form.register('cvUrl')} />}
        </FormField>
        <FormField label={t('applicantForm.notes')}>{(a) => <Textarea {...a} rows={3} {...form.register('notes')} />}</FormField>
      </form>
    </Dialog>
  );
}
