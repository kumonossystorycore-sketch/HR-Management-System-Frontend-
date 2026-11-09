'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Pencil, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { addDays, formatDateTime, formatTime, localDay } from '@/lib/format';
import { useEmployeeOptions } from '@/lib/queries';
import { RESULT_TONE, type Applicant, type Interview } from './types';
import { RECRUITMENT_KEYS } from './vacancies';

const PAGE_SIZE = 20;

/** FR-REC-04: interviews, upcoming first; interviewers record the result. */
export function InterviewsPanel() {
  const t = useTranslations('recruitment');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(RECRUITMENT_KEYS);
  const [recording, setRecording] = useState<Interview | null>(null);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [cancelling, setCancelling] = useState<Interview | null>(null);
  const upcoming = values.when !== 'all';
  const query = useQuery({
    queryKey: ['recruitment', 'interviews', upcoming, page],
    queryFn: () => http.get<Interview[]>('/interviews', { params: { page, pageSize: PAGE_SIZE, ...(upcoming ? { from: addDays(localDay(), -1) } : {}) } }),
    placeholderData: keepPreviousData,
  });
  const name = (iv: Interview) => (iv.interviewer ? `${iv.interviewer.firstName} ${iv.interviewer.lastName}` : t('interviews.noInterviewer'));
  // A recorded result is kept for the record: only a pending interview can be recorded, moved or cancelled.
  const recordButton = (iv: Interview) => {
    if (iv.result !== 'PENDING') return null;
    const canManage = can(user, 'recruitment:manage');
    const canRecord = can(user, 'interview:record');
    if (!canManage && !canRecord) return null;
    return (
      <span className="inline-flex items-center gap-1">
        {canRecord && (
          <Button variant="secondary" size="sm" onClick={() => setRecording(iv)} aria-label={t('interviews.recordOf', { name: iv.applicant.fullName })}>
            {t('interviews.record')}
          </Button>
        )}
        {canManage && (
          <>
            <Button variant="ghost" size="icon" onClick={() => setEditing(iv)} aria-label={t('interviews.editOf', { name: iv.applicant.fullName })}>
              <Pencil aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCancelling(iv)} aria-label={t('interviews.cancelOf', { name: iv.applicant.fullName })} className="hover:enabled:bg-danger-soft hover:enabled:text-danger-text">
              <XCircle aria-hidden="true" />
            </Button>
          </>
        )}
      </span>
    );
  };

  const columns: Column<Interview>[] = [
    { key: 'when', header: t('interviews.when'), cell: (iv) => <span className="tabular whitespace-nowrap">{formatDateTime(iv.scheduledAt)}</span> },
    {
      key: 'applicant',
      header: t('interviews.applicant'),
      cell: (iv) => (
        <span className="flex flex-col">
          <span className="font-semibold">{iv.applicant.fullName}</span>
          <span className="text-caption text-muted-foreground">{iv.applicant.vacancy.title}</span>
        </span>
      ),
    },
    { key: 'interviewer', header: t('interviews.interviewer'), cell: name },
    { key: 'location', header: t('interviews.location'), cell: (iv) => iv.location ?? '—' },
    { key: 'result', header: t('interviews.result'), cell: (iv) => <StatusBadge tone={RESULT_TONE[iv.result]}>{t(`result.${iv.result}`)}</StatusBadge> },
    { key: 'actions', header: <span className="sr-only">{t('vacancies.actions')}</span>, align: 'end', cell: recordButton },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Select aria-label={t('interviews.when')} value={upcoming ? '' : 'all'} onChange={(e) => set({ when: e.target.value })} className="w-full sm:w-48">
        <option value="">{t('interviews.upcoming')}</option>
        <option value="all">{t('interviews.all')}</option>
      </Select>
      {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
      <DataTable
        caption={t('interviews.caption')}
        columns={columns}
        rows={query.data?.data}
        rowKey={(iv) => iv.id}
        loading={query.isPending}
        empty={<EmptyState icon={CalendarClock} title={t('interviews.empty')} />}
        mobileItem={(iv) => (
          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{iv.applicant.fullName}</p>
                <p className="text-caption text-muted-foreground tabular">
                  {formatDateTime(iv.scheduledAt)} · {name(iv)}
                </p>
              </div>
              <StatusBadge tone={RESULT_TONE[iv.result]}>{t(`result.${iv.result}`)}</StatusBadge>
            </div>
            {recordButton(iv)}
          </div>
        )}
        footer={query.data?.meta && query.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
      {recording && <RecordResultDialog key={recording.id} interview={recording} onClose={() => setRecording(null)} />}
      {editing && <ScheduleDialog key={editing.id} applicant={editing.applicant} interview={editing} onClose={() => setEditing(null)} />}
      {cancelling && <CancelInterviewDialog interview={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}

/** Schedules an interview; with `interview` it moves a pending one (date, time, interviewer, place). */
export function ScheduleDialog({ applicant, interview, onClose }: { applicant: Pick<Applicant, 'id' | 'fullName'>; interview?: Interview; onClose: () => void }) {
  const t = useTranslations('recruitment');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const employees = useEmployeeOptions();
  const [date, setDate] = useState(interview ? localDay(interview.scheduledAt) : addDays(localDay(), 1));
  const [time, setTime] = useState(interview ? formatTime(interview.scheduledAt) : '09:00');
  const [interviewerId, setInterviewerId] = useState(interview?.interviewer?.id ?? '');
  const [location, setLocation] = useState(interview?.location ?? '');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => {
      const body = { scheduledAt: `${date}T${time}:00+07:00`, interviewerId: interviewerId || null, location: location.trim() };
      return interview ? http.put(`/interviews/${interview.id}`, body) : http.post('/interviews', { applicantId: applicant.id, ...body });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['recruitment'] });
      toast.success(interview ? t('scheduleForm.updated') : t('scheduleForm.saved'));
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={interview ? t('scheduleForm.editTitle', { name: applicant.fullName }) : t('scheduleForm.title', { name: applicant.fullName })}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!date || !time}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('scheduleForm.date')} required>
            {(a) => <Input {...a} type="date" min={interview ? undefined : localDay()} value={date} onChange={(e) => setDate(e.target.value)} />}
          </FormField>
          <FormField label={t('scheduleForm.time')} required>
            {(a) => <Input {...a} type="time" className="tabular" value={time} onChange={(e) => setTime(e.target.value)} />}
          </FormField>
        </div>
        <FormField label={t('scheduleForm.interviewer')} hint={t('scheduleForm.interviewerHint')}>
          {(a) => (
            <Select {...a} value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)}>
              <option value="">{t('interviews.noInterviewer')}</option>
              {employees.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} · {e.department.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={t('scheduleForm.location')}>
          {(a) => <Input {...a} maxLength={255} placeholder={t('scheduleForm.locationPlaceholder')} value={location} onChange={(e) => setLocation(e.target.value)} />}
        </FormField>
      </div>
    </Dialog>
  );
}

export function RecordResultDialog({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  const t = useTranslations('recruitment');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const [result, setResult] = useState<'PASSED' | 'FAILED' | 'NO_SHOW'>('PASSED');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => http.put(`/interviews/${interview.id}/result`, { result, ...(notes.trim() ? { notes: notes.trim() } : {}) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['recruitment'] });
      toast.success(t('interviews.recorded'));
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('interviews.recordTitle', { name: interview.applicant.fullName })}
      description={`${formatDateTime(interview.scheduledAt)} · ${interview.applicant.vacancy.title}`}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <FormField label={t('interviews.resultLabel')} required hint={t('interviews.resultHint')}>
          {(a) => (
            <Select {...a} value={result} onChange={(e) => setResult(e.target.value as typeof result)}>
              {(['PASSED', 'FAILED', 'NO_SHOW'] as const).map((r) => (
                <option key={r} value={r}>
                  {t(`result.${r}`)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={t('interviews.notes')}>{(a) => <Textarea {...a} rows={4} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />}</FormField>
      </div>
    </Dialog>
  );
}

function CancelInterviewDialog({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  const t = useTranslations('recruitment');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => http.delete(`/interviews/${interview.id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['recruitment'] });
      toast.success(t('interviews.cancelled'));
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
      title={t('interviews.cancelTitle', { name: interview.applicant.fullName })}
      description={t('interviews.cancelText', { when: formatDateTime(interview.scheduledAt) })}
      confirmLabel={t('interviews.cancel')}
      loading={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  );
}
