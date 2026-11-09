'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Paperclip, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useErrorMessage, useFieldError } from '@/features/auth/use-messages';
import { http } from '@/lib/api-client';
import { formatNumber, localDay } from '@/lib/format';
import { formatBytes, uploadFile } from '@/lib/upload';
import { typeName, type LeaveBalance, type LeaveRequest, type LeaveType, type StoredFileSummary } from './types';

const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const DOC_MAX = 5 * 1024 * 1024;

const schema = z
  .object({
    leaveTypeId: z.string().min(1, 'choose'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date'),
    reason: z.string().trim().min(3, 'minReason').max(2000),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, { path: ['endDate'], message: 'endBeforeStart' });
type Values = z.infer<typeof schema>;

/** FR-LEV-02/03: an employee asks for leave, with a document when the type needs one. */
export function RequestLeaveDialog({ types, balances, onClose }: { types: LeaveType[]; balances: LeaveBalance[]; onClose: () => void }) {
  const t = useTranslations('leave');
  const tc = useTranslations('common');
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [doc, setDoc] = useState<StoredFileSummary | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const today = localDay();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { leaveTypeId: '', startDate: today, endDate: today, reason: '' } });
  const { errors, isSubmitting } = form.formState;
  const typeId = useWatch({ control: form.control, name: 'leaveTypeId' });
  const startDate = useWatch({ control: form.control, name: 'startDate' });
  const type = types.find((x) => x.id === typeId);
  const balanceOf = (id: string) => balances.find((b) => b.leaveType.id === id);

  const err = (name: keyof Values, label: string) => {
    const m = errors[name]?.message;
    return m === 'endBeforeStart' ? t('request.endBeforeStart') : fieldError(m, label);
  };

  const pick = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    setDocError(null);
    if (!DOC_TYPES.includes(file.type)) return setDocError(t('request.wrongType'));
    if (file.size > DOC_MAX) return setDocError(t('request.tooLarge'));
    setUploading(true);
    try {
      setDoc(await uploadFile<StoredFileSummary>('post', '/leave-requests/documents', file));
    } catch (error) {
      setDocError(errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    if (type?.requiresDocument && !doc) {
      setDocError(t('request.documentRequired'));
      return;
    }
    try {
      const created = (await http.post<LeaveRequest>('/leave-requests', { ...v, documentFileId: doc?.id ?? null })).data;
      await Promise.all([qc.invalidateQueries({ queryKey: ['leave'] }), qc.invalidateQueries({ queryKey: ['dashboard'] })]);
      toast.success(t('request.sent', { days: formatNumber(created.days) }));
      onClose();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('request.title')}
      description={t('request.daysNote')}
      className="max-w-[560px]"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {tc('cancel')}
          </Button>
          <Button type="submit" form="leave-request-form" loading={isSubmitting} disabled={uploading}>
            {t('request.submit')}
          </Button>
        </>
      }
    >
      <form id="leave-request-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <FormField label={t('request.type')} required error={err('leaveTypeId', t('request.type'))}>
          {(a) => (
            <Select {...a} {...form.register('leaveTypeId')}>
              <option value="">—</option>
              {types.map((lt) => {
                const b = balanceOf(lt.id);
                return (
                  <option key={lt.id} value={lt.id}>
                    {typeName(lt, locale)}
                    {lt.deductsBalance && b ? ` · ${t('request.remaining', { days: formatNumber(b.remainingDays) })}` : ''}
                  </option>
                );
              })}
            </Select>
          )}
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('request.start')} required error={err('startDate', t('request.start'))}>
            {(a) => <Input {...a} type="date" {...form.register('startDate')} />}
          </FormField>
          <FormField label={t('request.end')} required error={err('endDate', t('request.end'))}>
            {(a) => <Input {...a} type="date" min={startDate || undefined} {...form.register('endDate')} />}
          </FormField>
        </div>
        <FormField label={t('request.reason')} required hint={t('request.reasonHint')} error={err('reason', t('request.reason'))}>
          {(a) => <Textarea {...a} rows={3} maxLength={2000} {...form.register('reason')} />}
        </FormField>

        <div className="flex flex-col gap-2">
          <span className="text-label text-foreground" id="leave-doc-label">
            {t('request.document')}
            {type?.requiresDocument && (
              <span className="text-brand-burgundy" aria-hidden="true">
                {' '}
                *
              </span>
            )}
          </span>
          {doc ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-body-sm">
                <FileText className="size-4 shrink-0 text-deep-teal" aria-hidden="true" />
                <span className="truncate">{doc.originalName}</span>
                <span className="shrink-0 text-caption text-muted-foreground">{formatBytes(doc.size)}</span>
              </span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setDoc(null)} aria-label={t('request.removeFile')}>
                <X aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" className="self-start" loading={uploading} onClick={() => fileInput.current?.click()} aria-describedby="leave-doc-hint">
              <Paperclip aria-hidden="true" />
              {uploading ? t('request.uploading') : t('request.chooseFile')}
            </Button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={DOC_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-labelledby="leave-doc-label"
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          {docError ? (
            <p role="alert" className="text-caption text-danger-text">
              {docError}
            </p>
          ) : (
            <p id="leave-doc-hint" className="text-caption text-muted-foreground">
              {type?.requiresDocument ? t('request.documentRequired') : t('request.documentHint')}
            </p>
          )}
        </div>
      </form>
    </Dialog>
  );
}
