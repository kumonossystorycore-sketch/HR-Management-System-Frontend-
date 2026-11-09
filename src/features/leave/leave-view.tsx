'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/auth-provider';
import { can, scopeOf } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';
import { formatNumber, localDay } from '@/lib/format';
import { useDepartmentOptions } from '@/lib/queries';
import { DecisionDialog } from './decision-dialog';
import { LeaveTypesPanel } from './leave-types';
import { RequestLeaveDialog } from './request-dialog';
import { LeaveRequestsTable, type LeaveAction } from './requests-table';
import { LEAVE_STATUSES, typeName, type LeaveBalance, type LeaveRequest, type LeaveType } from './types';

const PAGE_SIZE = 20;
const KEYS = ['view', 'search', 'status', 'leaveTypeId', 'departmentId', 'from', 'to'] as const;
type View = 'mine' | 'approvals' | 'records' | 'types';

const useLeaveTypes = () => useQuery({ queryKey: ['leave', 'types'], queryFn: async () => (await http.get<LeaveType[]>('/leave-types')).data, staleTime: 5 * 60_000 });

/** FR-LEV-01..08: my leave, requests to approve, all requests and (HR) leave types. */
export function LeaveView() {
  const t = useTranslations('leave');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { values, set } = useListParams(KEYS);
  const [decision, setDecision] = useState<{ action: LeaveAction; request: LeaveRequest } | null>(null);

  const readScope = scopeOf(user, 'leave:read');
  const views: View[] = [
    ...(can(user, 'leave:create') && user?.employee ? (['mine'] as const) : []),
    ...(can(user, 'leave:approve') ? (['approvals'] as const) : []),
    ...(readScope === 'DEPARTMENT' || readScope === 'ALL' ? (['records'] as const) : []),
    ...(can(user, 'leave_type:manage') ? (['types'] as const) : []),
  ];
  const view: View = views.includes(values.view as View) ? (values.view as View) : (views[0] ?? 'mine');

  /** What each row allows; the API decides again. Nobody decides their own request. */
  const actionsFor = (r: LeaveRequest): LeaveAction[] => {
    const own = r.employee.id === user?.employee?.id;
    const out: LeaveAction[] = [];
    if (r.status === 'PENDING' && !own && can(user, 'leave:approve')) out.push('reject', 'approve');
    const cancelScope = scopeOf(user, 'leave:cancel');
    if ((r.status === 'PENDING' && own && cancelScope) || ((r.status === 'PENDING' || r.status === 'APPROVED') && !own && cancelScope === 'ALL')) out.push('cancel');
    return out;
  };
  const onAction = (action: LeaveAction, request: LeaveRequest) => setDecision({ action, request });

  const panels: Record<View, React.ReactNode> = {
    mine: <MyLeave actionsFor={actionsFor} onAction={onAction} />,
    approvals: <Approvals actionsFor={actionsFor} onAction={onAction} />,
    records: <AllRequests actionsFor={actionsFor} onAction={onAction} />,
    types: <LeaveTypesPanel />,
  };

  return (
    <>
      <PageHeader title={t('title')} crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]} />
      {views.length > 1 ? (
        <Tabs value={view} onValueChange={(v) => set({ view: v === views[0] ? null : v, search: null, status: null, leaveTypeId: null, departmentId: null, from: null, to: null })}>
          <TabsList aria-label={t('title')}>
            {views.map((v) => (
              <TabsTrigger key={v} value={v}>
                {t(`tabs.${v}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {views.map((v) => (
            <TabsContent key={v} value={v}>
              {v === view && panels[v]}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        panels[view]
      )}
      {decision && <DecisionDialog key={`${decision.action}-${decision.request.id}`} action={decision.action} request={decision.request} onClose={() => setDecision(null)} />}
    </>
  );
}

interface PanelProps {
  actionsFor: (r: LeaveRequest) => LeaveAction[];
  onAction: (a: LeaveAction, r: LeaveRequest) => void;
}

function MyLeave({ actionsFor, onAction }: PanelProps) {
  const t = useTranslations('leave');
  const locale = useLocale();
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { page, set } = useListParams(KEYS);
  const [asking, setAsking] = useState(false);
  const year = Number(localDay().slice(0, 4));
  const types = useLeaveTypes();
  const balances = useQuery({
    queryKey: ['leave-balances', 'me', year],
    queryFn: async () => (await http.get<LeaveBalance[]>('/leave-balances/me', { params: { year } })).data,
    enabled: can(user, 'leave_balance:read'),
  });
  const mine = useQuery({
    queryKey: ['leave', 'mine', user?.employee?.id, page],
    queryFn: () => http.get<LeaveRequest[]>('/leave-requests', { params: { employeeId: user?.employee?.id, page, pageSize: PAGE_SIZE, sort: 'startDate:desc' } }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="balances-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="balances-title" className="text-h3">
            {t('balances.title', { year })}
          </h2>
          <Button onClick={() => setAsking(true)} disabled={!types.data}>
            <Plus aria-hidden="true" />
            {t('request.action')}
          </Button>
        </div>
        {balances.isPending ? (
          <Skeleton className="h-28" />
        ) : !balances.data?.length ? (
          <Alert tone="info">{t('balances.none')}</Alert>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {balances.data.map((b) => {
              const total = Number(b.entitledDays) + Number(b.carriedDays);
              const left = Number(b.remainingDays);
              return (
                <li key={b.id}>
                  <Card className="flex h-full flex-col gap-2 p-5">
                    <p className="text-body-sm text-muted-foreground">{typeName(b.leaveType, locale)}</p>
                    <p className="flex items-baseline gap-2">
                      <span className="text-stat tabular">{formatNumber(left)}</span>
                      <span className="text-body-sm text-muted-foreground">{t('balances.of', { total: formatNumber(total) })}</span>
                    </p>
                    <span className="h-2 rounded-full bg-background" aria-hidden="true">
                      <span className="block h-2 rounded-full bg-primary" style={{ width: `${total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0}%` }} />
                    </span>
                    <p className="text-caption text-muted-foreground tabular">
                      {t('balances.used', { used: formatNumber(b.usedDays) })}
                      {Number(b.carriedDays) > 0 && ` · ${t('balances.carried', { carried: formatNumber(b.carriedDays) })}`}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {mine.isError && <Alert>{errorMessage(mine.error)}</Alert>}
      <LeaveRequestsTable
        caption={t('myCaption')}
        rows={mine.data?.data}
        loading={mine.isPending}
        showEmployee={false}
        actionsFor={actionsFor}
        onAction={onAction}
        emptyText={t('empty.mine')}
        footer={mine.data?.meta && mine.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={mine.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
      {asking && types.data && <RequestLeaveDialog types={types.data} balances={balances.data ?? []} onClose={() => setAsking(false)} />}
    </div>
  );
}

function Approvals({ actionsFor, onAction }: PanelProps) {
  const t = useTranslations('leave');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { page, set } = useListParams(KEYS);
  const query = useQuery({
    queryKey: ['leave', 'approvals', page],
    queryFn: () => http.get<LeaveRequest[]>('/leave-requests', { params: { status: 'PENDING', page, pageSize: PAGE_SIZE, sort: 'startDate:asc' } }),
    placeholderData: keepPreviousData,
  });
  // Your own pending request is listed under My leave, not here: nobody approves their own.
  const rows = query.data?.data.filter((r) => r.employee.id !== user?.employee?.id);
  return (
    <>
      {query.isError && <Alert className="mb-4">{errorMessage(query.error)}</Alert>}
      <LeaveRequestsTable
        caption={t('approvalsCaption')}
        rows={rows}
        loading={query.isPending}
        actionsFor={actionsFor}
        onAction={onAction}
        emptyText={t('empty.approvals')}
        footer={query.data?.meta && query.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
    </>
  );
}

function AllRequests({ actionsFor, onAction }: PanelProps) {
  const t = useTranslations('leave');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(KEYS);
  const [exporting, setExporting] = useState(false);
  const types = useLeaveTypes();
  const companyWide = scopeOf(user, 'leave:read') === 'ALL';
  const departments = useDepartmentOptions(companyWide);
  const badRange = Boolean(values.from && values.to && values.from > values.to);

  const query = useQuery({
    queryKey: ['leave', 'records', values, page],
    queryFn: () =>
      http.get<LeaveRequest[]>('/leave-requests', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          sort: 'startDate:desc',
          search: values.search || undefined,
          status: values.status || undefined,
          leaveTypeId: values.leaveTypeId || undefined,
          departmentId: values.departmentId || undefined,
          from: values.from || undefined,
          to: values.to || undefined,
        },
      }),
    placeholderData: keepPreviousData,
    enabled: !badRange,
  });

  const onExport = async () => {
    if (!values.from || !values.to) return void toast.info(t('exportNeedsDates'));
    setExporting(true);
    try {
      const params = { from: values.from, to: values.to, status: values.status || undefined, leaveTypeId: values.leaveTypeId || undefined, departmentId: values.departmentId || undefined, lang: locale };
      await downloadFile('/leave-requests/export', params, `leave-${values.from}-${values.to}.csv`);
    } catch {
      toast.error(tc('feedback.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {can(user, 'leave:export') && (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => void onExport()} loading={exporting} disabled={badRange}>
            <Download aria-hidden="true" />
            {t('export')}
          </Button>
        </div>
      )}
      {query.isError && <Alert>{errorMessage(query.error)}</Alert>}
      <LeaveRequestsTable
        caption={t('tableCaption')}
        rows={badRange ? [] : query.data?.data}
        loading={!badRange && query.isPending}
        actionsFor={actionsFor}
        onAction={onAction}
        emptyText={t('empty.records')}
        toolbar={
          <>
            <SearchInput value={values.search} onChange={(v) => set({ search: v })} placeholder={t('filters.searchPlaceholder')} label={t('filters.search')} className="w-full sm:w-56" />
            <Select aria-label={t('filters.status')} value={values.status} onChange={(e) => set({ status: e.target.value })} className="w-full sm:w-40">
              <option value="">{t('filters.allStatuses')}</option>
              {LEAVE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </Select>
            <Select aria-label={t('filters.type')} value={values.leaveTypeId} onChange={(e) => set({ leaveTypeId: e.target.value })} className="w-full sm:w-44">
              <option value="">{t('filters.allTypes')}</option>
              {types.data?.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {typeName(lt, locale)}
                </option>
              ))}
            </Select>
            {companyWide && (
              <Select aria-label={t('filters.department')} value={values.departmentId} onChange={(e) => set({ departmentId: e.target.value })} className="w-full sm:w-48">
                <option value="">{t('filters.allDepartments')}</option>
                {departments.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
            <FormField label={t('filters.from')} className="w-full sm:w-40">
              {(a) => <Input {...a} type="date" value={values.from} onChange={(e) => set({ from: e.target.value })} />}
            </FormField>
            <FormField label={t('filters.to')} className="w-full sm:w-40" error={badRange ? tc('fieldErrors.invalid') : undefined}>
              {(a) => <Input {...a} type="date" value={values.to} onChange={(e) => set({ to: e.target.value })} />}
            </FormField>
          </>
        }
        footer={query.data?.meta && !badRange && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
    </div>
  );
}
