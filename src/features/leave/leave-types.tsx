'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ListChecks, Pencil, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useErrorMessage, useFieldError } from '@/features/auth/use-messages';
import { http } from '@/lib/api-client';
import { applyApiError } from '@/lib/form-errors';
import { formatNumber, localDay } from '@/lib/format';
import { typeName, type LeaveType } from './types';

/** FR-LEV-07/08 (HR): leave types and opening a new leave year. */
export function LeaveTypesPanel() {
  const t = useTranslations('leave');
  const tc = useTranslations('common');
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const [editing, setEditing] = useState<LeaveType | 'new' | null>(null);
  const [opening, setOpening] = useState(false);
  const query = useQuery({ queryKey: ['leave', 'types', 'all'], queryFn: async () => (await http.get<LeaveType[]>('/leave-types', { params: { includeInactive: 'true' } })).data });
  const yes = (v: boolean) => (v ? tc('yes') : tc('no'));

  const columns: Column<LeaveType>[] = [
    {
      key: 'name',
      header: t('types.name'),
      cell: (lt) => (
        <span className="flex flex-col">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            {typeName(lt, locale)}
            {!lt.isActive && <StatusBadge>{t('types.inactive')}</StatusBadge>}
          </span>
          <span className="text-caption text-muted-foreground">{lt.code}</span>
        </span>
      ),
    },
    { key: 'days', header: t('types.annualDays'), numeric: true, cell: (lt) => formatNumber(lt.annualDays) },
    { key: 'paid', header: t('types.paid'), cell: (lt) => yes(lt.isPaid) },
    { key: 'doc', header: t('types.requiresDocument'), cell: (lt) => yes(lt.requiresDocument) },
    { key: 'balance', header: t('types.deductsBalance'), cell: (lt) => yes(lt.deductsBalance) },
    {
      key: 'actions',
      header: <span className="sr-only">{t('columns.actions')}</span>,
      align: 'end',
      cell: (lt) => (
        <Button variant="ghost" size="icon" onClick={() => setEditing(lt)} aria-label={t('types.editOf', { name: typeName(lt, locale) })}>
          <Pencil aria-hidden="true" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => setOpening(true)}>
          <CalendarPlus aria-hidden="true" />
          {t('openYear.action')}
        </Button>
        <Button onClick={() => setEditing('new')}>
          <Plus aria-hidden="true" />
          {t('types.add')}
        </Button>
      </div>
      {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
      <DataTable
        caption={t('types.caption')}
        columns={columns}
        rows={query.data}
        rowKey={(lt) => lt.id}
        loading={query.isPending}
        empty={<EmptyState icon={ListChecks} title={t('types.caption')} />}
        mobileItem={(lt) => (
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{typeName(lt, locale)}</p>
              <p className="text-caption text-muted-foreground">
                {lt.code} · {t('balances.days', { count: formatNumber(lt.annualDays) })}
                {!lt.isActive && ` · ${t('types.inactive')}`}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditing(lt)} aria-label={t('types.editOf', { name: typeName(lt, locale) })}>
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        )}
      />
      {editing && <TypeDialog key={editing === 'new' ? 'new' : editing.id} type={editing} onClose={() => setEditing(null)} />}
      {opening && <OpenYearDialog onClose={() => setOpening(false)} />}
    </div>
  );
}

const schema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9_]{2,30}$/, 'code'),
  nameLo: z.string().trim().min(1, 'required').max(100),
  nameEn: z.string().trim().min(1, 'required').max(100),
  annualDays: z
    .string()
    .trim()
    .refine((v) => /^\d{1,3}(\.[05])?$/.test(v) && Number(v) <= 366, 'invalid'),
  isPaid: z.boolean(),
  requiresDocument: z.boolean(),
  deductsBalance: z.boolean(),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

function TypeDialog({ type, onClose }: { type: LeaveType | 'new'; onClose: () => void }) {
  const t = useTranslations('leave');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const qc = useQueryClient();
  const existing = type === 'new' ? null : type;
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? { code: existing.code, nameLo: existing.nameLo, nameEn: existing.nameEn, annualDays: String(Number(existing.annualDays)), isPaid: existing.isPaid, requiresDocument: existing.requiresDocument, deductsBalance: existing.deductsBalance, isActive: existing.isActive }
      : { code: '', nameLo: '', nameEn: '', annualDays: '0', isPaid: true, requiresDocument: false, deductsBalance: true, isActive: true },
  });
  const { errors, isSubmitting } = form.formState;
  const err = (k: keyof Values, label: string) => (errors[k]?.message === 'invalid' ? tc('fieldErrors.invalid') : fieldError(errors[k]?.message, label));

  const onSubmit = form.handleSubmit(async ({ code, annualDays, ...rest }) => {
    setFormError(null);
    try {
      const body = { ...rest, annualDays: Number(annualDays) };
      if (existing) await http.put(`/leave-types/${existing.id}`, body);
      else await http.post('/leave-types', { ...body, code: code.toUpperCase() });
      await qc.invalidateQueries({ queryKey: ['leave', 'types'] });
      toast.success(t('types.saved'));
      onClose();
    } catch (error) {
      if (!applyApiError(error, form.setError, ['code', 'nameLo', 'nameEn', 'annualDays'], { duplicate: tc('fieldErrors.duplicate'), invalid: tc('fieldErrors.invalid') })) setFormError(errorMessage(error));
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing ? t('types.editTitle') : t('types.createTitle')}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {tc('cancel')}
          </Button>
          <Button type="submit" form="leave-type-form" loading={isSubmitting}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <form id="leave-type-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <FormField label={t('types.code')} required hint={existing ? t('types.codeLocked') : t('types.codeHint')} error={err('code', t('types.code'))}>
          {(a) => <Input {...a} className="uppercase" autoComplete="off" disabled={Boolean(existing)} {...form.register('code')} />}
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('types.nameLo')} required error={err('nameLo', t('types.nameLo'))}>
            {(a) => <Input {...a} lang="lo" {...form.register('nameLo')} />}
          </FormField>
          <FormField label={t('types.nameEn')} required error={err('nameEn', t('types.nameEn'))}>
            {(a) => <Input {...a} lang="en" {...form.register('nameEn')} />}
          </FormField>
        </div>
        <FormField label={t('types.annualDays')} required hint={t('types.daysHint')} error={err('annualDays', t('types.annualDays'))} className="sm:max-w-48">
          {(a) => <Input {...a} inputMode="decimal" className="tabular" {...form.register('annualDays')} />}
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Checkbox label={t('types.paid')} {...form.register('isPaid')} />
          <Checkbox label={t('types.requiresDocument')} {...form.register('requiresDocument')} />
          <Checkbox label={t('types.deductsBalance')} {...form.register('deductsBalance')} />
          <Checkbox label={t('types.active')} {...form.register('isActive')} />
        </div>
      </form>
    </Dialog>
  );
}

function OpenYearDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('leave');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const thisYear = Number(localDay().slice(0, 4));
  const [year, setYear] = useState(thisYear + (Number(localDay().slice(5, 7)) >= 11 ? 1 : 0));
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await http.post<{ year: number; created: number }>('/leave-balances/open-year', { year })).data,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['leave-balances'] });
      toast.success(t('openYear.done', { year: res.year, created: formatNumber(res.created) }));
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('openYear.title', { year })}
      description={t('openYear.description', { year })}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {t('openYear.confirm')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <FormField label={t('openYear.year')} className="max-w-40">
          {(a) => (
            <Input {...a} type="number" min={thisYear - 1} max={thisYear + 1} className="tabular" value={year} onChange={(e) => setYear(Number(e.target.value) || thisYear)} />
          )}
        </FormField>
      </div>
    </Dialog>
  );
}
