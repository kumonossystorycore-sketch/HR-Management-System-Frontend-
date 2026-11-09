'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ExternalLink, FileText, Paperclip, Trash2, UserCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-provider';
import { can } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { Link } from '@/i18n/navigation';
import { http } from '@/lib/api-client';
import { formatDate, formatDateTime } from '@/lib/format';
import { openProtectedFile } from '@/lib/open-file';
import { formatBytes, uploadFile } from '@/lib/upload';
import { HireDialog } from './hire-dialog';
import { RecordResultDialog, ScheduleDialog } from './interview-dialogs';
import { APPLICANT_TONE, NEXT_STATUS, RESULT_TONE, type Applicant, type ApplicantStatus, type Interview } from './types';

const CV_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const CV_MAX = 5 * 1024 * 1024;

/** One applicant: contact, CV, status, interviews and hiring. */
export function ApplicantDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations('recruitment');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<ApplicantStatus | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'schedule' | 'hire' | 'remove' | { record: Interview } | null>(null);
  const query = useQuery({ queryKey: ['recruitment', 'applicant', id], queryFn: async () => (await http.get<Applicant>(`/applicants/${id}`)).data });
  const interviews = useQuery({ queryKey: ['recruitment', 'interviews', 'applicant', id], queryFn: async () => (await http.get<Interview[]>('/interviews', { params: { applicantId: id, pageSize: 50 } })).data });
  const a = query.data;
  const manage = can(user, 'recruitment:manage');
  const hired = Boolean(a?.employee);

  const refresh = async (updated?: Applicant) => {
    if (updated) qc.setQueryData(['recruitment', 'applicant', id], updated);
    await qc.invalidateQueries({ queryKey: ['recruitment'], predicate: (q) => q.queryKey[1] !== 'applicant' });
  };
  const run = async (fn: () => Promise<Applicant | undefined>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await refresh(await fn());
      toast.success(done);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = () =>
    next &&
    run(async () => {
      const res = (await http.put<Applicant>(`/applicants/${id}/status`, { status: next, ...(note.trim() ? { note: note.trim() } : {}) })).data;
      setNext('');
      setNote('');
      return res;
    }, t('applicant.statusChanged'));

  const pickCv = (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    if (!CV_TYPES.includes(file.type)) return setError(t('applicant.cvWrongType'));
    if (file.size > CV_MAX) return setError(t('applicant.cvTooLarge'));
    void run(() => uploadFile<Applicant>('put', `/applicants/${id}/cv`, file), t('applicant.cvSaved'));
  };

  const remove = useMutation({
    mutationFn: () => http.delete(`/applicants/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['recruitment'] });
      toast.success(t('applicant.removed'));
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (dialog === 'schedule' && a) return <ScheduleDialog applicant={a} onClose={() => setDialog(null)} />;
  if (dialog === 'hire' && a) return <HireDialog applicant={a} onClose={() => setDialog(null)} />;
  if (dialog && typeof dialog === 'object') return <RecordResultDialog interview={dialog.record} onClose={() => setDialog(null)} />;

  const canSchedule = manage && a && !hired && a.status !== 'ACCEPTED' && a.status !== 'REJECTED';
  const canHire = a && !hired && a.status === 'ACCEPTED' && can(user, 'recruitment:convert');
  const recordFor = (iv: Interview) => iv.result === 'PENDING' && can(user, 'interview:record');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={a ? a.fullName : '…'} description={a ? `${a.vacancy.title} · ${a.vacancy.department.name}` : undefined} className="max-w-[640px]">
      {!a ? (
        query.isError ? <Alert>{errorMessage(query.error)}</Alert> : <Skeleton className="h-72" />
      ) : dialog === 'remove' ? (
        <div className="flex flex-col gap-4">
          <p className="text-body-sm">{t('applicant.removeText')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              {tc('cancel')}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              {t('applicant.remove')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={APPLICANT_TONE[a.status]}>{t(`applicantStatus.${a.status}`)}</StatusBadge>
            <span className="text-caption text-muted-foreground">{t('applicant.appliedOn', { date: formatDate(a.createdAt) })}</span>
          </div>
          {error && <Alert>{error}</Alert>}
          {hired && a.employee && (
            <Alert tone="success">
              {t('applicant.hiredAs', { code: a.employee.employeeCode })}{' '}
              {can(user, 'employee:read') && (
                <Link href={`/employees/${a.employee.id}`} className="font-semibold underline underline-offset-4">
                  {t('applicant.viewEmployee')}
                </Link>
              )}
            </Alert>
          )}

          <section aria-label={t('applicant.contact')} className="grid grid-cols-1 gap-x-6 gap-y-2 text-body-sm sm:grid-cols-[max-content_1fr]">
            <span className="text-label text-muted-foreground">{t('applicantForm.email')}</span>
            <a href={`mailto:${a.email}`} className="break-all hover:text-deep-teal hover:underline">
              {a.email}
            </a>
            <span className="text-label text-muted-foreground">{t('applicantForm.phone')}</span>
            <span className="tabular">{a.phone ?? tc('none')}</span>
            {a.notes && (
              <>
                <span className="text-label text-muted-foreground">{t('applicant.notes')}</span>
                <span className="break-words whitespace-pre-line">{a.notes}</span>
              </>
            )}
          </section>

          <section aria-labelledby={`cv-${id}`} className="flex flex-col gap-2">
            <h3 id={`cv-${id}`} className="text-label text-muted-foreground">
              {t('applicant.cv')}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {a.cvFile ? (
                <button
                  type="button"
                  className="inline-flex max-w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-body-sm hover:border-deep-teal"
                  aria-label={t('applicant.openCv', { name: a.cvFile.originalName })}
                  onClick={() => openProtectedFile(`/applicants/${id}/cv`).catch((e) => setError(errorMessage(e)))}
                >
                  <FileText className="size-4 shrink-0 text-deep-teal" aria-hidden="true" />
                  <span className="truncate">{a.cvFile.originalName}</span>
                  <span className="shrink-0 text-caption text-muted-foreground">{formatBytes(a.cvFile.size)}</span>
                </button>
              ) : (
                !a.cvUrl && <span className="text-body-sm text-muted-foreground">{t('applicant.noCv')}</span>
              )}
              {a.cvUrl && (
                <a href={a.cvUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-body-sm font-medium text-deep-teal underline-offset-4 hover:underline">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  {t('applicant.cvLink')}
                </a>
              )}
            </div>
            {manage && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" loading={busy} onClick={() => fileInput.current?.click()}>
                    <Paperclip aria-hidden="true" />
                    {a.cvFile ? t('applicant.cvReplace') : t('applicant.cvUpload')}
                  </Button>
                  {a.cvFile && (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(async () => (await http.delete<Applicant>(`/applicants/${id}/cv`)).data, t('applicant.cvRemoved'))}>
                      <Trash2 aria-hidden="true" />
                      {t('applicant.cvRemove')}
                    </Button>
                  )}
                </div>
                <p className="text-caption text-muted-foreground">{t('applicant.cvHint')}</p>
                <input ref={fileInput} type="file" accept={CV_TYPES.join(',')} className="sr-only" tabIndex={-1} aria-labelledby={`cv-${id}`} onChange={(e) => pickCv(e.target.files?.[0])} />
              </>
            )}
          </section>

          {manage && !hired && NEXT_STATUS[a.status].length > 0 && (
            <section aria-label={t('applicant.status')} className="flex flex-col gap-3 rounded-md bg-background p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label={t('applicant.moveTo')}>
                  {(f) => (
                    <Select {...f} value={next} onChange={(e) => setNext(e.target.value as ApplicantStatus)}>
                      <option value="">—</option>
                      {NEXT_STATUS[a.status].map((s) => (
                        <option key={s} value={s}>
                          {t(`applicantStatus.${s}`)}
                        </option>
                      ))}
                    </Select>
                  )}
                </FormField>
                <FormField label={t('applicant.statusNote')}>{(f) => <Input {...f} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />}</FormField>
              </div>
              <Button size="sm" className="self-start" disabled={!next || busy} onClick={() => void changeStatus()}>
                {tc('save')}
              </Button>
            </section>
          )}

          <section aria-labelledby={`iv-${id}`} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`iv-${id}`} className="text-label text-muted-foreground">
                {t('applicant.interviews')}
              </h3>
              {canSchedule && (
                <Button variant="secondary" size="sm" onClick={() => setDialog('schedule')}>
                  <CalendarPlus aria-hidden="true" />
                  {t('applicant.schedule')}
                </Button>
              )}
            </div>
            {!interviews.data?.length ? (
              <p className="text-body-sm text-muted-foreground">{t('applicant.noInterviews')}</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {interviews.data.map((iv) => (
                  <li key={iv.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 text-body-sm">
                      <span className="block tabular font-medium">{formatDateTime(iv.scheduledAt)}</span>
                      <span className="block text-caption text-muted-foreground">
                        {iv.interviewer ? `${iv.interviewer.firstName} ${iv.interviewer.lastName}` : t('interviews.noInterviewer')}
                        {iv.location && ` · ${iv.location}`}
                      </span>
                      {iv.notes && <span className="block text-caption break-words">“{iv.notes}”</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge tone={RESULT_TONE[iv.result]}>{t(`result.${iv.result}`)}</StatusBadge>
                      {recordFor(iv) && (
                        <Button variant="secondary" size="sm" onClick={() => setDialog({ record: iv })}>
                          {t('interviews.record')}
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(canHire || (manage && !hired)) && (
            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
              {manage && !hired ? (
                <Button variant="ghost" size="sm" onClick={() => setDialog('remove')}>
                  <Trash2 aria-hidden="true" />
                  {t('applicant.remove')}
                </Button>
              ) : (
                <span />
              )}
              {canHire && (
                <Button onClick={() => setDialog('hire')}>
                  <UserCheck aria-hidden="true" />
                  {t('applicant.hire')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
