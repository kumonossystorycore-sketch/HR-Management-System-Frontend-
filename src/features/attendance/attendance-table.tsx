'use client';

import { CalendarSearch, PencilLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PersonCell } from '@/components/ui/person-cell';
import { formatDate, formatDuration, formatTime } from '@/lib/format';
import { ATTENDANCE_TONE, type AttendanceRecord } from './types';

const name = (r: AttendanceRecord) => `${r.employee.firstName} ${r.employee.lastName}`;

/** Status, plus "left early" and "corrected" where they apply; the reason is readable on hover and by screen readers. */
export function AttendanceStatusCell({ record }: { record: AttendanceRecord }) {
  const t = useTranslations('attendance');
  return (
    <span className="flex flex-wrap gap-1">
      <StatusBadge tone={ATTENDANCE_TONE[record.status]}>{t(`status.${record.status}`)}</StatusBadge>
      {record.isEarlyLeave && <StatusBadge tone="warning">{t('earlyLeave')}</StatusBadge>}
      {record.correctedAt && (
        <span title={record.correctionReason ? t('correctedReason', { reason: record.correctionReason }) : undefined}>
          <StatusBadge tone="teal">
            {t('corrected')}
            {record.correctionReason && <span className="sr-only">. {t('correctedReason', { reason: record.correctionReason })}</span>}
          </StatusBadge>
        </span>
      )}
    </span>
  );
}

/** Attendance rows for the team view (with the employee) or one person's history (without). */
export function AttendanceTable({
  rows,
  loading,
  showEmployee = true,
  onCorrect,
  toolbar,
  footer,
  emptyText,
}: {
  rows: AttendanceRecord[] | undefined;
  loading?: boolean;
  showEmployee?: boolean;
  onCorrect?: (record: AttendanceRecord) => void;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyText?: string;
}) {
  const t = useTranslations('attendance');
  const tc = useTranslations('common');
  const time = (v: string | null) => (v ? formatTime(v) : tc('none'));
  const columns: Column<AttendanceRecord>[] = [
    ...(showEmployee
      ? [
          { key: 'employee', header: t('columns.employee'), cell: (r: AttendanceRecord) => <PersonCell name={name(r)} meta={r.employee.employeeCode} /> },
          { key: 'department', header: t('columns.department'), cell: (r: AttendanceRecord) => r.employee.department.name },
        ]
      : []),
    { key: 'date', header: t('columns.date'), numeric: true, cell: (r) => formatDate(r.date) },
    { key: 'in', header: t('columns.checkIn'), numeric: true, cell: (r) => time(r.checkInAt) },
    { key: 'out', header: t('columns.checkOut'), numeric: true, cell: (r) => time(r.checkOutAt) },
    { key: 'worked', header: t('columns.worked'), numeric: true, cell: (r) => (r.workedMinutes != null ? formatDuration(r.workedMinutes) : tc('none')) },
    { key: 'status', header: t('columns.status'), cell: (r) => <AttendanceStatusCell record={r} /> },
    ...(onCorrect
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">{t('columns.actions')}</span>,
            align: 'end' as const,
            cell: (r: AttendanceRecord) => (
              <Button variant="ghost" size="icon" onClick={() => onCorrect(r)} aria-label={t('correct.actionOf', { name: name(r), date: formatDate(r.date) })}>
                <PencilLine aria-hidden="true" />
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      caption={t('tableCaption')}
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      loading={loading}
      toolbar={toolbar}
      footer={footer}
      empty={<EmptyState icon={CalendarSearch} title={emptyText ?? t('empty.title')} description={emptyText ? undefined : t('empty.text')} />}
      mobileItem={(r) => (
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            {showEmployee && <p className="truncate text-body-sm font-semibold">{name(r)}</p>}
            <p className={showEmployee ? 'text-caption text-muted-foreground tabular' : 'text-body-sm font-semibold tabular'}>{formatDate(r.date)}</p>
            <p className="text-caption text-muted-foreground tabular">
              {time(r.checkInAt)} – {time(r.checkOutAt)}
              {r.workedMinutes != null && ` · ${formatDuration(r.workedMinutes)}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <AttendanceStatusCell record={r} />
            {onCorrect && (
              <Button variant="secondary" size="sm" onClick={() => onCorrect(r)} aria-label={t('correct.actionOf', { name: name(r), date: formatDate(r.date) })}>
                {t('correct.action')}
              </Button>
            )}
          </div>
        </div>
      )}
    />
  );
}
