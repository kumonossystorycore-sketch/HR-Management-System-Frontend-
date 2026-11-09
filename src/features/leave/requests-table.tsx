'use client';

import { Ban, CalendarDays, Check, FileText, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PersonCell } from '@/components/ui/person-cell';
import { useErrorMessage } from '@/features/auth/use-messages';
import { formatDate, formatNumber } from '@/lib/format';
import { openProtectedFile } from '@/lib/open-file';
import { LEAVE_TONE, personName, typeName, type LeaveRequest } from './types';

export type LeaveAction = 'approve' | 'reject' | 'cancel';

export const useDateRange = () => {
  const t = useTranslations('leave');
  return (r: { startDate: string; endDate: string }) =>
    r.startDate === r.endDate ? formatDate(r.startDate) : t('dateRange', { start: formatDate(r.startDate), end: formatDate(r.endDate) });
};

function DocumentLink({ r }: { r: LeaveRequest }) {
  const t = useTranslations('leave');
  const errorMessage = useErrorMessage();
  if (!r.documentFile) return <span className="text-muted-foreground">{t('noDocument')}</span>;
  const name = r.documentFile.originalName;
  return (
    <button
      type="button"
      className="inline-flex max-w-48 items-center gap-1.5 rounded-sm text-left font-medium text-deep-teal underline-offset-4 hover:underline"
      aria-label={t('openDocument', { name })}
      onClick={() => openProtectedFile(`/leave-requests/${r.id}/document`).catch((e) => toast.error(errorMessage(e)))}
    >
      <FileText className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{name}</span>
    </button>
  );
}

function StatusCell({ r }: { r: LeaveRequest }) {
  const t = useTranslations('leave');
  const decider = r.decidedBy?.employee ? personName(r.decidedBy.employee) : r.decidedBy?.email;
  return (
    <span className="flex flex-col items-start gap-1">
      <StatusBadge tone={LEAVE_TONE[r.status]}>{t(`status.${r.status}`)}</StatusBadge>
      {(r.status === 'APPROVED' || r.status === 'REJECTED') && decider && <span className="text-caption text-muted-foreground">{t('decidedBy', { name: decider })}</span>}
      {r.decisionNote && <span className="max-w-56 text-caption break-words text-muted-foreground">“{r.decisionNote}”</span>}
    </span>
  );
}

/**
 * Leave requests as a table (cards on phones). `showEmployee` adds who asked; `actionsFor`
 * says which buttons a row gets — the API checks each action again.
 */
export function LeaveRequestsTable({
  rows,
  loading,
  caption,
  showEmployee = true,
  actionsFor,
  onAction,
  toolbar,
  footer,
  emptyText,
}: {
  rows: LeaveRequest[] | undefined;
  loading?: boolean;
  caption: string;
  showEmployee?: boolean;
  actionsFor: (r: LeaveRequest) => LeaveAction[];
  onAction: (action: LeaveAction, r: LeaveRequest) => void;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyText: string;
}) {
  const t = useTranslations('leave');
  const locale = useLocale();
  const range = useDateRange();

  const buttons = (r: LeaveRequest, compact = false) => {
    const actions = actionsFor(r);
    if (!actions.length) return null;
    const who = personName(r.employee);
    return (
      <span className="inline-flex flex-wrap justify-end gap-2">
        {actions.includes('reject') && (
          <Button variant="secondary" size="sm" onClick={() => onAction('reject', r)} aria-label={t('reject.actionOf', { name: who })}>
            <X aria-hidden="true" />
            {t('reject.action')}
          </Button>
        )}
        {actions.includes('approve') && (
          <Button size="sm" onClick={() => onAction('approve', r)} aria-label={t('approve.actionOf', { name: who })}>
            <Check aria-hidden="true" />
            {t('approve.action')}
          </Button>
        )}
        {actions.includes('cancel') && (
          <Button variant={compact ? 'secondary' : 'ghost'} size="sm" onClick={() => onAction('cancel', r)} aria-label={t('cancel.actionOf', { dates: range(r) })}>
            <Ban aria-hidden="true" />
            {t('cancel.action')}
          </Button>
        )}
      </span>
    );
  };

  const columns: Column<LeaveRequest>[] = [
    ...(showEmployee
      ? [
          {
            key: 'employee',
            header: t('columns.employee'),
            cell: (r: LeaveRequest) => <PersonCell name={personName(r.employee)} meta={`${r.employee.employeeCode} · ${r.employee.department.name}`} />,
          },
        ]
      : []),
    {
      key: 'type',
      header: t('columns.type'),
      cell: (r) => (
        <span className="flex flex-col">
          <span>{typeName(r.leaveType, locale)}</span>
          {!r.leaveType.isPaid && <span className="text-caption text-muted-foreground">{t('unpaid')}</span>}
        </span>
      ),
    },
    { key: 'dates', header: t('columns.dates'), cell: (r) => <span className="tabular whitespace-nowrap">{range(r)}</span> },
    { key: 'days', header: t('columns.days'), numeric: true, cell: (r) => formatNumber(r.days) },
    { key: 'reason', header: t('columns.reason'), cell: (r) => <span className="line-clamp-2 max-w-64 break-words">{r.reason}</span> },
    { key: 'document', header: t('columns.document'), cell: (r) => <DocumentLink r={r} /> },
    { key: 'status', header: t('columns.status'), cell: (r) => <StatusCell r={r} /> },
    { key: 'actions', header: <span className="sr-only">{t('columns.actions')}</span>, align: 'end', cell: (r) => buttons(r) },
  ];

  return (
    <DataTable
      caption={caption}
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      loading={loading}
      toolbar={toolbar}
      footer={footer}
      empty={<EmptyState icon={CalendarDays} title={emptyText} />}
      mobileItem={(r) => (
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {showEmployee && <p className="truncate font-semibold">{personName(r.employee)}</p>}
              <p className={showEmployee ? 'text-body-sm' : 'font-semibold'}>
                {typeName(r.leaveType, locale)} · {t('balances.days', { count: formatNumber(r.days) })}
              </p>
              <p className="text-caption text-muted-foreground tabular">{range(r)}</p>
            </div>
            <StatusBadge tone={LEAVE_TONE[r.status]}>{t(`status.${r.status}`)}</StatusBadge>
          </div>
          <p className="text-body-sm break-words text-muted-foreground">{r.reason}</p>
          {r.documentFile && <DocumentLink r={r} />}
          {buttons(r, true)}
        </div>
      )}
    />
  );
}
