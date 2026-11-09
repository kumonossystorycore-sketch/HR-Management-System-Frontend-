'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX2, Download, LogIn, LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { useDisplayName } from '@/components/layout/use-user-labels';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/auth-provider';
import { can, scopeOf } from '@/features/auth/permissions';
import { useErrorMessage, useFieldError } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';
import { addDays, formatDate, formatDuration, formatMinutes, formatNumber, formatTime, localDay } from '@/lib/format';
import { useDepartmentOptions } from '@/lib/queries';
import { AttendanceStatusCell, AttendanceTable } from './attendance-table';
import { ATTENDANCE_STATUSES, ATTENDANCE_TONE, type AttendanceRecord, type AttendanceToday } from './types';

const PAGE_SIZE = 20;
const KEYS = ['view', 'search', 'from', 'to', 'departmentId', 'status'] as const;

/** FR-ATT-01..06: check in/out for oneself, and the records of one's team or the company. */
export function AttendanceView() {
  const t = useTranslations('attendance');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { values, set } = useListParams(KEYS);
  const mine = can(user, 'attendance:check_in');
  const readScope = scopeOf(user, 'attendance:read');
  const team = readScope === 'DEPARTMENT' || readScope === 'ALL';
  const view = team && (values.view === 'records' || !mine) ? 'records' : 'mine';

  return (
    <>
      <PageHeader title={t('title')} crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]} />
      {mine && team ? (
        <Tabs value={view} onValueChange={(v) => set({ view: v === 'mine' ? null : v, search: null, from: null, to: null, departmentId: null, status: null })}>
          <TabsList aria-label={t('title')}>
            <TabsTrigger value="mine">{t('tabs.mine')}</TabsTrigger>
            <TabsTrigger value="records">{t('tabs.records')}</TabsTrigger>
          </TabsList>
          <TabsContent value="mine">
            <MyAttendance />
          </TabsContent>
          <TabsContent value="records">
            <TeamRecords />
          </TabsContent>
        </Tabs>
      ) : view === 'records' ? (
        <TeamRecords />
      ) : (
        <MyAttendance />
      )}
    </>
  );
}

/** The ISO Monday of the week containing `day`. */
const mondayOf = (day: string) => {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay() || 7;
  return addDays(day, 1 - weekday);
};

const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Vientiane', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

function LiveClock() {
  const t = useTranslations('attendance.me');
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return (
    <p className="text-[40px] leading-[48px] font-semibold tabular text-foreground" aria-label={t('clockLabel')} role="timer" aria-live="off">
      {now ? clockFmt.format(now) : '--:--:--'}
    </p>
  );
}

function MyAttendance() {
  const t = useTranslations('attendance');
  const tm = useTranslations('attendance.me');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const name = useDisplayName();
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const today = useQuery({ queryKey: ['attendance', 'today'], queryFn: async () => (await http.get<AttendanceToday>('/attendance/me/today')).data, refetchOnWindowFocus: true });
  const day = today.data?.date;
  const employeeId = user?.employee?.id;
  const week = useQuery({
    queryKey: ['attendance', 'week', employeeId, day],
    queryFn: async () => (await http.get<AttendanceRecord[]>('/attendance', { params: { employeeId, from: mondayOf(day!), to: day, sort: 'date:asc', pageSize: 7 } })).data,
    enabled: Boolean(day && employeeId),
  });

  const punch = useMutation({
    mutationFn: async (kind: 'check-in' | 'check-out') => ({ kind, record: (await http.post<AttendanceRecord>(`/attendance/${kind}`)).data }),
    onSuccess: async ({ kind, record }) => {
      const at = kind === 'check-in' ? record.checkInAt : record.checkOutAt;
      toast.success(kind === 'check-in' ? tm('checkedInToast', { time: at ? formatTime(at) : '' }) : tm('checkedOutToast', { time: at ? formatTime(at) : '' }));
      await qc.invalidateQueries({ queryKey: ['attendance'] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: async (err) => {
      toast.error(errorMessage(err));
      await qc.invalidateQueries({ queryKey: ['attendance', 'today'] });
    },
  });

  if (!user?.employee) return <Alert tone="info">{tm('noEmployee')}</Alert>;
  if (today.isError)
    return (
      <Alert>
        {tm('loadError')} {errorMessage(today.error)}{' '}
        <button type="button" onClick={() => void today.refetch()} className="font-semibold underline underline-offset-4">
          {tc('retry')}
        </button>
      </Alert>
    );
  if (!today.data) return <Skeleton className="h-72" />;

  const d = today.data;
  const r = d.record;
  const onLeave = r?.status === 'LEAVE';
  const done = Boolean(r?.checkOutAt);
  const statusTone = !r ? 'neutral' : done ? 'teal' : ATTENDANCE_TONE[r.status];
  const statusLabel = !r ? t('status.NOT_CHECKED_IN') : done ? t('status.DONE') : t(`status.${r.status}`);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <div className="flex flex-col gap-1">
          <p className="text-body-sm text-muted-foreground">
            {tm('greeting', { name })} · {formatDate(`${d.date}T00:00:00Z`)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-h2">{tm('today')}</h2>
            <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <LiveClock />
            <p className="text-body-sm text-muted-foreground tabular">{tm('workHours', { start: formatMinutes(d.workStart), end: formatMinutes(d.workEnd), break: d.breakMinutes })}</p>
            {r && !onLeave && (
              <p className="mt-2 text-body-sm tabular">
                {r.checkInAt && tm('checkedInAt', { time: formatTime(r.checkInAt) })}
                {r.checkOutAt && ` · ${tm('checkedOutAt', { time: formatTime(r.checkOutAt) })}`}
                {r.workedMinutes != null && ` · ${tm('worked', { duration: formatDuration(r.workedMinutes) })}`}
              </p>
            )}
          </div>
          {!onLeave && !done && (
            <Button size="lg" className="w-full md:w-auto md:min-w-56" loading={punch.isPending} onClick={() => punch.mutate(r ? 'check-out' : 'check-in')}>
              {r ? <LogOut aria-hidden="true" /> : <LogIn aria-hidden="true" />}
              {r ? tm('checkOut') : tm('checkIn')}
            </Button>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-2">
          {onLeave && <Alert tone="info">{tm('onLeave')}</Alert>}
          {done && <Alert tone="success">{tm('doneToday')}</Alert>}
          {!d.isWorkingDay && !r && <Alert tone="info">{tm('notWorkingDay')}</Alert>}
          <p className="text-caption text-muted-foreground">{tm('serverNote')}</p>
        </div>
      </Card>

      <Card>
        <CardHeader title={tm('week')} />
        {week.isPending ? (
          <Skeleton className="h-32" />
        ) : !week.data?.length ? (
          <p className="text-body-sm text-muted-foreground">{tm('weekEmpty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {week.data.map((w) => (
              <li key={w.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block text-body-sm font-semibold tabular">{formatDate(w.date)}</span>
                  <span className="block text-caption text-muted-foreground tabular">
                    {w.checkInAt ? formatTime(w.checkInAt) : tc('none')} – {w.checkOutAt ? formatTime(w.checkOutAt) : tc('none')}
                    {w.workedMinutes != null && ` · ${formatDuration(w.workedMinutes)}`}
                  </span>
                </span>
                <AttendanceStatusCell record={w} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function TeamRecords() {
  const t = useTranslations('attendance');
  const locale = useLocale();
  const tc = useTranslations('common');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(KEYS);
  const today = localDay();
  const from = values.from || `${today.slice(0, 8)}01`;
  const to = values.to || today;
  const companyWide = scopeOf(user, 'attendance:read') === 'ALL';
  const departments = useDepartmentOptions(companyWide);
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);
  const [absencesOpen, setAbsencesOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const badRange = from > to;

  const query = useQuery({
    queryKey: ['attendance', 'list', values.search, from, to, values.departmentId, values.status, page],
    queryFn: () =>
      http.get<AttendanceRecord[]>('/attendance', {
        params: { from, to, page, pageSize: PAGE_SIZE, sort: 'date:desc', search: values.search || undefined, departmentId: values.departmentId || undefined, status: values.status || undefined },
      }),
    placeholderData: keepPreviousData,
    enabled: !badRange,
  });

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadFile('/attendance/export', { from, to, departmentId: values.departmentId || undefined, lang: locale }, `attendance-${from}-${to}.csv`);
    } catch {
      toast.error(tc('feedback.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {(can(user, 'attendance:export') || can(user, 'attendance:correct')) && (
        <div className="flex flex-wrap justify-end gap-2">
          {can(user, 'attendance:correct') && (
            <Button variant="secondary" onClick={() => setAbsencesOpen(true)}>
              <CalendarX2 aria-hidden="true" />
              {t('absences.action')}
            </Button>
          )}
          {can(user, 'attendance:export') && (
            <Button variant="secondary" onClick={() => void onExport()} loading={exporting} disabled={badRange}>
              <Download aria-hidden="true" />
              {t('export')}
            </Button>
          )}
        </div>
      )}
      {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
      <AttendanceTable
        rows={badRange ? [] : query.data?.data}
        loading={!badRange && query.isPending}
        onCorrect={can(user, 'attendance:correct') ? setCorrecting : undefined}
        toolbar={
          <>
            <SearchInput value={values.search} onChange={(v) => set({ search: v })} placeholder={t('filters.searchPlaceholder')} label={t('filters.search')} className="w-full sm:w-64" />
            <FormField label={t('filters.from')} className="w-full sm:w-44">
              {(a) => <Input {...a} type="date" value={from} max={today} onChange={(e) => set({ from: e.target.value })} />}
            </FormField>
            <FormField label={t('filters.to')} className="w-full sm:w-44" error={badRange ? tc('fieldErrors.invalid') : undefined}>
              {(a) => <Input {...a} type="date" value={to} onChange={(e) => set({ to: e.target.value })} />}
            </FormField>
            {companyWide && (
              <FormField label={t('filters.department')} className="w-full sm:w-52">
                {(a) => (
                  <Select {...a} value={values.departmentId} onChange={(e) => set({ departmentId: e.target.value })}>
                    <option value="">{t('filters.allDepartments')}</option>
                    {departments.data?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            )}
            <FormField label={t('filters.status')} className="w-full sm:w-44">
              {(a) => (
                <Select {...a} value={values.status} onChange={(e) => set({ status: e.target.value })}>
                  <option value="">{t('filters.allStatuses')}</option>
                  {ATTENDANCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`status.${s}`)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </>
        }
        footer={query.data?.meta && !badRange && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
      {correcting && <CorrectionDialog key={correcting.id} record={correcting} onClose={() => setCorrecting(null)} />}
      {absencesOpen && <AbsencesDialog onClose={() => setAbsencesOpen(false)} />}
    </div>
  );
}

const hhmm = z.string().regex(/^$|^\d{2}:\d{2}$/, 'invalid');
const correctionSchema = z.object({
  checkIn: hhmm,
  checkOut: hhmm,
  status: z.string(),
  note: z.string().trim().max(500),
  reason: z.string().trim().min(3, 'minReason').max(500),
});
type CorrectionValues = z.infer<typeof correctionSchema>;

/** "08:05" on the record's day → an ISO instant in Vientiane time (+07:00). */
const atLocal = (date: string, time: string) => (time ? `${date.slice(0, 10)}T${time}:00+07:00` : null);
const toHhmm = (iso: string | null) => (iso ? formatTime(iso) : '');

/** Mounted per record (keyed), so the form starts from that record's times. */
function CorrectionDialog({ record, onClose }: { record: AttendanceRecord; onClose: () => void }) {
  const t = useTranslations('attendance');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CorrectionValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: { checkIn: toHhmm(record.checkInAt), checkOut: toHhmm(record.checkOutAt), status: '', note: record.note ?? '', reason: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const body: Record<string, unknown> = { correctionReason: v.reason };
    if (v.checkIn !== toHhmm(record.checkInAt)) body.checkInAt = atLocal(record.date, v.checkIn);
    if (v.checkOut !== toHhmm(record.checkOutAt)) body.checkOutAt = atLocal(record.date, v.checkOut);
    if (v.status) body.status = v.status;
    if (v.note !== (record.note ?? '')) body.note = v.note || null;
    if (Object.keys(body).length === 1) {
      setFormError(t('correct.nothing'));
      return;
    }
    try {
      await http.put(`/attendance/${record.id}`, body);
      await qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(t('correct.done'));
      onClose();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  const who = `${record.employee.firstName} ${record.employee.lastName}`;
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('correct.title')}
      description={t('correct.description', { name: who, date: formatDate(record.date) })}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {tc('cancel')}
          </Button>
          <Button type="submit" form="correction-form" loading={isSubmitting}>
            {t('correct.submit')}
          </Button>
        </>
      }
    >
      <form id="correction-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('correct.checkIn')} error={fieldError(errors.checkIn?.message, t('correct.checkIn'))}>
            {(a) => <Input {...a} type="time" className="tabular" {...form.register('checkIn')} />}
          </FormField>
          <FormField label={t('correct.checkOut')} error={fieldError(errors.checkOut?.message, t('correct.checkOut'))}>
            {(a) => <Input {...a} type="time" className="tabular" {...form.register('checkOut')} />}
          </FormField>
        </div>
        <FormField label={t('correct.status')}>
          {(a) => (
            <Select {...a} {...form.register('status')}>
              <option value="">{t('correct.keepStatus')}</option>
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={t('correct.note')}>{(a) => <Input {...a} {...form.register('note')} />}</FormField>
        <FormField label={t('correct.reason')} required hint={t('correct.reasonHint')} error={fieldError(errors.reason?.message, t('correct.reason'))}>
          {(a) => <Textarea {...a} rows={2} {...form.register('reason')} />}
        </FormField>
      </form>
    </Dialog>
  );
}

function AbsencesDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('attendance');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const today = localDay();
  const [date, setDate] = useState(addDays(today, -1));
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await http.post<{ date: string; skipped: boolean; created: number }>('/attendance/mark-absences', { date })).data,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['attendance'] });
      if (res.skipped) toast.info(t('absences.skipped'));
      else toast.success(t('absences.done', { count: formatNumber(res.created) }));
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('absences.title')}
      description={t('absences.description')}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!date || date >= today}>
            {t('absences.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <FormField label={t('absences.date')} required>
          {(a) => <Input {...a} type="date" value={date} max={addDays(today, -1)} onChange={(e) => setDate(e.target.value)} />}
        </FormField>
      </div>
    </Dialog>
  );
}
