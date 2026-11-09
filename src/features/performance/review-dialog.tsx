'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/auth-provider';
import { can } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { http } from '@/lib/api-client';
import { formatDate, formatNumber } from '@/lib/format';
import { useEmployeeOptions } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { CRITERIA, REVIEW_TONE, personName, type Criterion, type Review } from './types';

type Scores = Record<Criterion, number | null>;

/** Five buttons 1–5 that behave as one radio group (arrow keys move, the label says what each means). */
function ScoreInput({ criterion, value, onChange, disabled }: { criterion: Criterion; value: number | null; onChange: (v: number) => void; disabled?: boolean }) {
  const t = useTranslations('performance');
  const label = t(`criteria.${criterion}`);
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`score-${criterion}`} className="text-label">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={`score-${criterion}`} className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const checked = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${n} · ${t(`scale.${n as 1}`)}`}
              title={t(`scale.${n as 1}`)}
              tabIndex={checked || (value === null && n === 1) ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(n)}
              onKeyDown={(e) => {
                const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                const next = Math.min(5, Math.max(1, (value ?? (step > 0 ? 0 : 2)) + step));
                onChange(next);
                (e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role=radio]')[next - 1])?.focus();
              }}
              className={cn(
                'inline-flex size-control-md items-center justify-center rounded-md border text-body-sm font-semibold tabular transition-colors',
                checked ? 'border-deep-teal bg-deep-teal text-primary-foreground' : 'border-input bg-card text-foreground hover:enabled:border-deep-teal hover:enabled:bg-teal-soft',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {n}
            </button>
          );
        })}
        {value !== null && <span className="self-center text-caption text-muted-foreground">{t(`scale.${value as 1}`)}</span>}
      </div>
    </div>
  );
}

/**
 * One review. The reviewer scores and submits it; the employee reads and acknowledges it;
 * HR may change the reviewer or delete it while it is a draft.
 */
export function ReviewDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations('performance');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['performance', 'review', id], queryFn: async () => (await http.get<Review>(`/reviews/${id}`)).data });
  const r = query.data;
  const me = user?.employee?.id;
  const isReviewer = Boolean(r && r.reviewer.id === me);
  const editing = Boolean(r && r.status === 'DRAFT' && isReviewer && can(user, 'performance:review'));
  const canAcknowledge = Boolean(r && r.status === 'SUBMITTED' && r.employee.id === me && can(user, 'performance:acknowledge'));
  const hrDraft = Boolean(r && r.status === 'DRAFT' && can(user, 'performance:manage'));

  const [scores, setScores] = useState<Scores | null>(null);
  const [comments, setComments] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [reviewerId, setReviewerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const employees = useEmployeeOptions(hrDraft);

  const current: Scores | null = r ? (scores ?? (Object.fromEntries(CRITERIA.map((c) => [c, r[c]])) as Scores)) : null;
  const text = comments ?? r?.comments ?? '';

  const done = async (updated: Review | null, message: string) => {
    if (updated) qc.setQueryData(['performance', 'review', id], updated);
    await Promise.all([qc.invalidateQueries({ queryKey: ['performance'], predicate: (q) => q.queryKey[1] !== 'review' }), qc.invalidateQueries({ queryKey: ['dashboard'] })]);
    toast.success(message);
  };
  const mutate = useMutation({
    mutationFn: async (kind: 'save' | 'submit' | 'ack' | 'reviewer' | 'remove') => {
      if (kind === 'remove') {
        await http.delete(`/reviews/${id}`);
        return { kind, review: null };
      }
      if (kind === 'reviewer') return { kind, review: (await http.put<Review>(`/reviews/${id}`, { reviewerId })).data };
      if (kind === 'ack') return { kind, review: (await http.put<Review>(`/reviews/${id}/acknowledge`, feedback.trim() ? { employeeFeedback: feedback.trim() } : {})).data };
      // Save the draft first, so submitting always sends what is on screen.
      let review = (await http.put<Review>(`/reviews/${id}/scores`, { ...current, comments: text.trim() || null })).data;
      if (kind === 'submit') review = (await http.put<Review>(`/reviews/${id}/submit`)).data;
      return { kind, review };
    },
    onSuccess: async ({ kind, review }) => {
      setError(null);
      setConfirming(false);
      const message = { save: t('review.saved'), submit: t('review.submitted'), ack: t('review.acknowledged'), reviewer: t('review.reviewerSaved'), remove: t('review.removed') }[kind];
      await done(review, message);
      if (kind === 'submit' || kind === 'ack' || kind === 'remove') onClose();
      else {
        setScores(null);
        setComments(null);
      }
    },
    onError: (e) => {
      setConfirming(false);
      setError(errorMessage(e));
    },
  });

  const missing = current ? CRITERIA.filter((c) => current[c] === null) : [];
  const title = r ? t('review.title', { name: personName(r.employee) }) : '…';

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={r ? `${t('review.period', { start: formatDate(r.periodStart), end: formatDate(r.periodEnd) })} · ${t('review.reviewer', { name: personName(r.reviewer) })}` : undefined}
      className="max-w-[640px]"
    >
      {!r || !current ? (
        query.isError ? <Alert>{errorMessage(query.error)}</Alert> : <Skeleton className="h-80" />
      ) : (
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={REVIEW_TONE[r.status]}>{t(`status.${r.status}`)}</StatusBadge>
            {r.submittedAt && <span className="text-caption text-muted-foreground">{t('review.submittedOn', { date: formatDate(r.submittedAt) })}</span>}
            {r.acknowledgedAt && <span className="text-caption text-muted-foreground">· {t('review.acknowledgedOn', { date: formatDate(r.acknowledgedAt) })}</span>}
          </div>
          {error && <Alert>{error}</Alert>}

          {editing ? (
            <div className="flex flex-col gap-4">
              {CRITERIA.map((c) => (
                <ScoreInput key={c} criterion={c} value={current[c]} onChange={(v) => setScores({ ...current, [c]: v })} disabled={mutate.isPending} />
              ))}
              <FormField label={t('review.comments')} hint={t('review.commentsHint')}>
                {(a) => <Textarea {...a} rows={4} maxLength={5000} value={text} onChange={(e) => setComments(e.target.value)} />}
              </FormField>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <dl className="flex flex-col gap-2">
                {CRITERIA.map((c) => (
                  <div key={c} className="grid grid-cols-[1fr_auto] items-center gap-3 text-body-sm">
                    <dt>{t(`criteria.${c}`)}</dt>
                    <dd className="flex items-center gap-2">
                      <span className="flex gap-0.5" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={cn('h-2 w-5 rounded-full', r[c] !== null && n <= (r[c] ?? 0) ? 'bg-primary' : 'bg-border')} />
                        ))}
                      </span>
                      <span className="w-10 text-right font-semibold tabular">{r[c] ?? t('noScore')}</span>
                      <span className="sr-only">{r[c] !== null ? t(`scale.${r[c] as 1}`) : ''}</span>
                    </dd>
                  </div>
                ))}
                <div className="mt-1 grid grid-cols-[1fr_auto] gap-3 border-t border-border pt-2 text-h3">
                  <dt>{t('review.overall')}</dt>
                  <dd className="tabular">{r.overallScore ? t('outOf', { score: formatNumber(r.overallScore) }) : t('noScore')}</dd>
                </div>
              </dl>
              <section className="flex flex-col gap-1">
                <h3 className="text-label text-muted-foreground">{t('review.comments')}</h3>
                <p className="text-body-sm break-words whitespace-pre-line">{r.comments || t('review.noComments')}</p>
              </section>
              {r.employeeFeedback && (
                <section className="flex flex-col gap-1">
                  <h3 className="text-label text-muted-foreground">{t('review.feedback')}</h3>
                  <p className="text-body-sm break-words whitespace-pre-line">{r.employeeFeedback}</p>
                </section>
              )}
              {canAcknowledge && (
                <FormField label={t('review.feedback')} hint={t('review.feedbackHint')}>
                  {(a) => <Textarea {...a} rows={3} maxLength={5000} value={feedback} onChange={(e) => setFeedback(e.target.value)} />}
                </FormField>
              )}
            </div>
          )}

          {hrDraft && !isReviewer && (
            <div className="flex flex-wrap items-end gap-2 rounded-md bg-background p-3">
              <FormField label={t('review.changeReviewer')} className="min-w-0 flex-1">
                {(a) => (
                  <Select {...a} value={reviewerId} onChange={(e) => setReviewerId(e.target.value)}>
                    <option value="">—</option>
                    {employees.data
                      ?.filter((e) => e.id !== r.employee.id && e.id !== r.reviewer.id)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} · {e.department.name}
                        </option>
                      ))}
                  </Select>
                )}
              </FormField>
              <Button variant="secondary" disabled={!reviewerId || mutate.isPending} onClick={() => mutate.mutate('reviewer')}>
                {tc('save')}
              </Button>
            </div>
          )}

          {confirming ? (
            <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning-soft p-3">
              <p className="text-body-sm text-warning-text">{t('review.submitConfirm')}</p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirming(false)} disabled={mutate.isPending}>
                  {tc('cancel')}
                </Button>
                <Button loading={mutate.isPending} onClick={() => mutate.mutate('submit')}>
                  {t('review.submit')}
                </Button>
              </div>
            </div>
          ) : (
            (editing || canAcknowledge || hrDraft) && (
              <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
                {hrDraft ? (
                  <Button variant="ghost" onClick={() => mutate.mutate('remove')} disabled={mutate.isPending}>
                    {t('review.remove')}
                  </Button>
                ) : (
                  <span />
                )}
                <span className="flex flex-wrap gap-2">
                  {editing && (
                    <>
                      <Button variant="secondary" loading={mutate.isPending && mutate.variables === 'save'} onClick={() => mutate.mutate('save')}>
                        {t('review.saveDraft')}
                      </Button>
                      <Button
                        onClick={() => (missing.length ? setError(t('review.missing')) : (setError(null), setConfirming(true)))}
                        disabled={mutate.isPending}
                      >
                        {t('review.submit')}
                      </Button>
                    </>
                  )}
                  {canAcknowledge && (
                    <Button loading={mutate.isPending} onClick={() => mutate.mutate('ack')}>
                      {t('review.acknowledge')}
                    </Button>
                  )}
                </span>
              </div>
            )
          )}
        </div>
      )}
    </Dialog>
  );
}
