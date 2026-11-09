'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarHeart, Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { ApiError, http } from '@/lib/api-client';
import { formatDate, localDay } from '@/lib/format';

interface Holiday {
  id: string;
  date: string;
  nameLo: string;
  nameEn: string;
}

const KEYS = ['view', 'year', 'entity', 'action', 'from', 'to'] as const;
const weekday = (iso: string) => new Date(iso).getUTCDay() || 7;

/** FR-SET-02: public holidays. They are not working days for attendance and leave. */
export function HolidaysPanel({ editable }: { editable: boolean }) {
  const t = useTranslations('settings');
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { values, set } = useListParams(KEYS);
  const thisYear = Number(localDay().slice(0, 4));
  const year = Number(values.year) || thisYear;
  const [editing, setEditing] = useState<Holiday | 'new' | null>(null);
  const [removing, setRemoving] = useState<Holiday | null>(null);
  const query = useQuery({ queryKey: ['holidays', year], queryFn: async () => (await http.get<Holiday[]>('/holidays', { params: { year } })).data });
  const name = (h: Holiday) => (locale === 'lo' ? h.nameLo : h.nameEn);

  const columns: Column<Holiday>[] = [
    { key: 'date', header: t('holidays.date'), numeric: true, cell: (h) => formatDate(h.date) },
    { key: 'day', header: t('holidays.weekday'), cell: (h) => t(`work.weekdays.${weekday(h.date) as 1}`) },
    { key: 'lo', header: t('holidays.nameLo'), cell: (h) => <span lang="lo">{h.nameLo}</span> },
    { key: 'en', header: t('holidays.nameEn'), cell: (h) => <span lang="en">{h.nameEn}</span> },
    ...(editable
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">{t('holidays.editTitle')}</span>,
            align: 'end' as const,
            cell: (h: Holiday) => (
              <span className="inline-flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditing(h)} aria-label={t('holidays.editOf', { name: name(h) })}>
                  <Pencil aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setRemoving(h)} aria-label={t('holidays.deleteOf', { name: name(h) })} className="hover:enabled:bg-danger-soft hover:enabled:text-danger-text">
                  <Trash2 aria-hidden="true" />
                </Button>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FormField label={t('holidays.year')} className="w-32">
          {(a) => (
            <Select {...a} value={year} onChange={(e) => set({ year: e.target.value })}>
              {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        {editable && (
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden="true" />
            {t('holidays.add')}
          </Button>
        )}
      </div>
      <p className="text-body-sm text-muted-foreground">{t('holidays.note')}</p>
      {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
      <DataTable
        caption={`${t('holidays.caption')} ${year}`}
        columns={columns}
        rows={query.data}
        rowKey={(h) => h.id}
        loading={query.isPending}
        empty={<EmptyState icon={CalendarHeart} title={t('holidays.empty')} />}
        mobileItem={(h) => (
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="min-w-0">
              <span className="block font-semibold">{name(h)}</span>
              <span className="block text-caption text-muted-foreground tabular">
                {formatDate(h.date)} · {t(`work.weekdays.${weekday(h.date) as 1}`)}
              </span>
            </span>
            {editable && (
              <Button variant="ghost" size="icon" onClick={() => setEditing(h)} aria-label={t('holidays.editOf', { name: name(h) })}>
                <Pencil aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      />
      {editing && <HolidayDialog key={editing === 'new' ? 'new' : editing.id} holiday={editing} defaultYear={year} onClose={() => setEditing(null)} />}
      {removing && <RemoveHoliday holiday={removing} name={name(removing)} onClose={() => setRemoving(null)} />}
    </div>
  );
}

function HolidayDialog({ holiday, defaultYear, onClose }: { holiday: Holiday | 'new'; defaultYear: number; onClose: () => void }) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const existing = holiday === 'new' ? null : holiday;
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? (defaultYear === Number(localDay().slice(0, 4)) ? localDay() : `${defaultYear}-01-01`));
  const [nameLo, setNameLo] = useState(existing?.nameLo ?? '');
  const [nameEn, setNameEn] = useState(existing?.nameEn ?? '');
  const [errors, setErrors] = useState<Partial<Record<'date' | 'nameLo' | 'nameEn', string>>>({});
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => {
      const body = { date, nameLo: nameLo.trim(), nameEn: nameEn.trim() };
      return existing ? http.put(`/holidays/${existing.id}`, body) : http.post('/holidays', body);
    },
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['holidays'] }), qc.invalidateQueries({ queryKey: ['attendance', 'today'] })]);
      toast.success(t('holidays.saved'));
      onClose();
    },
    onError: (e) => (e instanceof ApiError && e.code === 'DUPLICATE' ? setErrors({ date: tc('fieldErrors.duplicate') }) : setError(errorMessage(e))),
  });
  const submit = () => {
    const next: typeof errors = {};
    if (!date) next.date = tv('date');
    if (!nameLo.trim()) next.nameLo = tv('required', { field: t('holidays.nameLo') });
    if (!nameEn.trim()) next.nameEn = tv('required', { field: t('holidays.nameEn') });
    setErrors(next);
    setError(null);
    if (!Object.keys(next).length) mutation.mutate();
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing ? t('holidays.editTitle') : t('holidays.createTitle')}
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
        {error && <Alert>{error}</Alert>}
        <FormField label={t('holidays.date')} required error={errors.date} className="sm:max-w-56">
          {(a) => <Input {...a} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </FormField>
        <FormField label={t('holidays.nameLo')} required error={errors.nameLo}>
          {(a) => <Input {...a} lang="lo" maxLength={150} value={nameLo} onChange={(e) => setNameLo(e.target.value)} />}
        </FormField>
        <FormField label={t('holidays.nameEn')} required error={errors.nameEn}>
          {(a) => <Input {...a} lang="en" maxLength={150} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />}
        </FormField>
      </div>
    </Dialog>
  );
}

function RemoveHoliday({ holiday, name, onClose }: { holiday: Holiday; name: string; onClose: () => void }) {
  const t = useTranslations('settings');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => http.delete(`/holidays/${holiday.id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['holidays'] });
      toast.success(t('holidays.removed'));
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
      title={t('holidays.removeTitle', { name })}
      description={t('holidays.removeText')}
      confirmLabel={t('holidays.deleteOf', { name })}
      loading={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  );
}
