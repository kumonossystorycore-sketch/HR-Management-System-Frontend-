'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { formatDateTime, formatNumber } from '@/lib/format';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; email: string } | null;
}

const PAGE_SIZE = 50;
const KEYS = ['view', 'year', 'entity', 'action', 'from', 'to'] as const;
const ENTITIES = [
  'Employee', 'Department', 'Position', 'Attendance', 'LeaveRequest', 'LeaveType', 'LeaveBalance', 'Payroll', 'PayrollItem', 'PayrollPeriod',
  'JobVacancy', 'Applicant', 'Interview', 'PerformanceReview', 'User', 'Role', 'CompanySetting', 'Holiday', 'Auth',
];

const show = (v: unknown) => (v === undefined ? '—' : v === null ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Fields that differ between the before and after snapshots (top level only). */
const diff = (before: unknown, after: unknown) => {
  const b = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>;
  const a = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => !['updatedAt', 'createdAt'].includes(k));
  return keys.filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k])).map((k) => ({ key: k, before: b[k], after: a[k] }));
};

/** NFR-SEC-08: who changed what and when. Read-only; passwords and tokens are never logged. */
export function AuditLogPanel() {
  const t = useTranslations('settings');
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(KEYS);
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const badRange = Boolean(values.from && values.to && values.from > values.to);
  const actionName = (a: string) => (t.has(`audit.actions.${a}` as 'audit.actions.CREATE') ? t(`audit.actions.${a}` as 'audit.actions.CREATE') : a);
  const entityName = (e: string) => (t.has(`audit.entities.${e}` as 'audit.entities.User') ? t(`audit.entities.${e}` as 'audit.entities.User') : e);
  const query = useQuery({
    queryKey: ['audit', values.entity, values.action, values.from, values.to, page],
    queryFn: () =>
      http.get<AuditEntry[]>('/audit-logs', {
        params: { page, pageSize: PAGE_SIZE, entity: values.entity || undefined, action: values.action ? values.action.toUpperCase() : undefined, from: values.from || undefined, to: values.to || undefined },
      }),
    placeholderData: keepPreviousData,
    enabled: !badRange,
  });

  const columns: Column<AuditEntry>[] = [
    { key: 'when', header: t('audit.when'), cell: (e) => <span className="tabular whitespace-nowrap">{formatDateTime(e.createdAt)}</span> },
    { key: 'user', header: t('audit.user'), cell: (e) => <span className="break-all">{e.user?.email ?? t('audit.system')}</span> },
    {
      key: 'action',
      header: t('audit.action'),
      cell: (e) => (
        <span className="flex flex-col">
          <span>{actionName(e.action)}</span>
          <code className="text-caption text-muted-foreground">{e.action}</code>
        </span>
      ),
    },
    {
      key: 'entity',
      header: t('audit.entity'),
      cell: (e) => (
        <span className="flex flex-col">
          <span>{entityName(e.entity)}</span>
          {e.entityId && <code className="max-w-48 truncate text-caption text-muted-foreground">{e.entityId}</code>}
        </span>
      ),
    },
    {
      key: 'details',
      header: <span className="sr-only">{t('audit.details')}</span>,
      align: 'end',
      cell: (e) =>
        Boolean(e.before || e.after) ? (
          <Button variant="secondary" size="sm" onClick={() => setOpen(e)} aria-label={t('audit.showOf', { action: actionName(e.action), entity: entityName(e.entity) })}>
            {t('audit.show')}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted-foreground">{t('audit.note')}</p>
      {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
      <DataTable
        caption={t('audit.caption')}
        columns={columns}
        rows={badRange ? [] : query.data?.data}
        rowKey={(e) => e.id}
        loading={!badRange && query.isPending}
        empty={<EmptyState icon={History} title={t('audit.empty')} />}
        toolbar={
          <>
            <FormField label={t('audit.entityFilter')} className="w-full sm:w-52">
              {(a) => (
                <Select {...a} value={values.entity} onChange={(e) => set({ entity: e.target.value })}>
                  <option value="">{t('audit.allEntities')}</option>
                  {ENTITIES.map((x) => (
                    <option key={x} value={x}>
                      {entityName(x)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <div className="flex w-full flex-col gap-1 sm:w-48">
              <span className="text-label">{t('audit.actionFilter')}</span>
              <SearchInput value={values.action} onChange={(v) => set({ action: v })} placeholder={t('audit.actionPlaceholder')} label={t('audit.actionFilter')} />
            </div>
            <FormField label={t('audit.from')} className="w-full sm:w-44">
              {(a) => <Input {...a} type="date" value={values.from} onChange={(e) => set({ from: e.target.value })} />}
            </FormField>
            <FormField label={t('audit.to')} className="w-full sm:w-44">
              {(a) => <Input {...a} type="date" value={values.to} onChange={(e) => set({ to: e.target.value })} />}
            </FormField>
          </>
        }
        mobileItem={(e) => (
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-body-sm font-semibold">
                {actionName(e.action)} · {entityName(e.entity)}
              </p>
              <p className="text-caption break-all text-muted-foreground">
                {formatDateTime(e.createdAt)} · {e.user?.email ?? t('audit.system')}
              </p>
            </div>
            {Boolean(e.before || e.after) && (
              <Button variant="secondary" size="sm" onClick={() => setOpen(e)}>
                {t('audit.show')}
              </Button>
            )}
          </div>
        )}
        footer={query.data?.meta && !badRange && query.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
      {open && <AuditDialog entry={open} title={`${actionName(open.action)} · ${entityName(open.entity)}`} onClose={() => setOpen(null)} />}
    </div>
  );
}

function AuditDialog({ entry: e, title, onClose }: { entry: AuditEntry; title: string; onClose: () => void }) {
  const t = useTranslations('settings');
  const changes = e.before && e.after ? diff(e.before, e.after) : null;
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={`${formatDateTime(e.createdAt)} · ${e.user?.email ?? t('audit.system')}${e.ip ? ` · ${t('audit.ip')} ${e.ip}` : ''}`}
      className="max-w-[720px]"
    >
      <div className="flex flex-col gap-4 pb-2">
        {changes ? (
          changes.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t('audit.noDiff')}</p>
          ) : (
            <>
              <p className="text-caption text-muted-foreground">{t('audit.changed', { count: formatNumber(changes.length) })}</p>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="bg-background text-left text-label text-muted-foreground">
                      <th scope="col" className="px-3 py-2">
                        {t('audit.field')}
                      </th>
                      <th scope="col" className="px-3 py-2">
                        {t('audit.before')}
                      </th>
                      <th scope="col" className="px-3 py-2">
                        {t('audit.after')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c) => (
                      <tr key={c.key} className="border-t border-border align-top">
                        <th scope="row" className="px-3 py-2 text-left font-mono text-caption font-normal">
                          {c.key}
                        </th>
                        <td className="max-w-64 px-3 py-2 font-mono text-caption break-all text-danger-text">{show(c.before)}</td>
                        <td className="max-w-64 px-3 py-2 font-mono text-caption break-all text-success-text">{show(c.after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          <pre className="max-h-96 overflow-auto rounded-md bg-background p-3 font-mono text-caption break-all whitespace-pre-wrap">{JSON.stringify(e.after ?? e.before, null, 2)}</pre>
        )}
      </div>
    </Dialog>
  );
}
