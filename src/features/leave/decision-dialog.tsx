'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { useErrorMessage } from '@/features/auth/use-messages';
import { http } from '@/lib/api-client';
import { formatNumber } from '@/lib/format';
import { useDateRange, type LeaveAction } from './requests-table';
import { personName, typeName, type LeaveRequest } from './types';

/**
 * Approve, reject or cancel one request. Rejecting needs a reason (the employee sees it);
 * cancelling an approved request (HR only) gives the days back.
 */
export function DecisionDialog({ action, request, onClose }: { action: LeaveAction; request: LeaveRequest; onClose: () => void }) {
  const t = useTranslations('leave');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');
  const locale = useLocale();
  const range = useDateRange();
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const facts = { name: personName(request.employee), type: typeName(request.leaveType, locale), dates: range(request), days: formatNumber(request.days) };
  const copy = {
    approve: { title: t('approve.title', facts), description: t('approve.description', facts), label: t('approve.note'), confirm: t('approve.confirm'), done: t('approve.done') },
    reject: { title: t('reject.title', facts), description: t('reject.description', facts), label: t('reject.note'), confirm: t('reject.confirm'), done: t('reject.done') },
    cancel: { title: t('cancel.title'), description: t('cancel.description', facts), label: t('cancel.reason'), confirm: t('cancel.confirm'), done: t('cancel.done') },
  }[action];

  const mutation = useMutation({
    mutationFn: () => {
      const text = note.trim();
      const body = action === 'cancel' ? (text ? { reason: text } : {}) : text ? { decisionNote: text } : {};
      return http.put(`/leave-requests/${request.id}/${action}`, body);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['leave'] }),
        qc.invalidateQueries({ queryKey: ['leave-balances'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['attendance'] }),
      ]);
      toast.success(copy.done);
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const submit = () => {
    if (action === 'reject' && note.trim().length < 3) {
      setNoteError(tv('minReason'));
      return;
    }
    setNoteError(null);
    setError(null);
    mutation.mutate();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={copy.title}
      description={copy.description}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {action === 'cancel' ? t('cancel.keep') : tc('cancel')}
          </Button>
          <Button variant={action === 'approve' ? 'primary' : 'danger'} loading={mutation.isPending} onClick={submit}>
            {copy.confirm}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        {action === 'cancel' && request.status === 'APPROVED' && <Alert tone="info">{t('cancel.approvedNote')}</Alert>}
        <FormField label={copy.label} required={action === 'reject'} error={noteError ?? undefined}>
          {(a) => <Textarea {...a} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />}
        </FormField>
      </div>
    </Dialog>
  );
}
