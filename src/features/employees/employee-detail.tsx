'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Pencil, RefreshCw, Trash2, UserX } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttendanceTable } from '@/features/attendance/attendance-table';
import type { AttendanceRecord } from '@/features/attendance/types';
import { useAuth } from '@/features/auth/auth-provider';
import { can } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError, http } from '@/lib/api-client';
import { addDays, formatDate, formatDateTime, formatMoney, formatNumber, localDay } from '@/lib/format';
import { EMPLOYMENT_STATUSES, fullName, STATUS_TONE, type EmployeeDetail as Detail, type EmploymentStatus, type LeaveBalance } from './types';

/** FR-EMP-02: one employee's page — header card, then tabs. */
export function EmployeeDetail({ id }: { id: string }) {
  const t = useTranslations('employees');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const ts = useTranslations('common.employmentStatus');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const query = useQuery({ queryKey: ['employees', 'detail', id], queryFn: async () => (await http.get<Detail>(`/employees/${id}`)).data, retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2 });
  const [statusOpen, setStatusOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const e = query.data;
  const crumbs = [{ label: tc('home'), href: '/dashboard' }, { label: tn('employees'), href: '/employees' }, { label: e ? fullName(e) : '…' }];

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <>
        <PageHeader title={tn('employees')} crumbs={crumbs.slice(0, 2)} />
        <Alert>
          {notFound ? t('detail.notFound') : errorMessage(query.error)}{' '}
          <Link href="/employees" className="font-semibold underline underline-offset-4">
            {tc('back')}
          </Link>
        </Alert>
      </>
    );
  }
  if (!e) return <DetailSkeleton />;

  const editable = !e.archivedAt;
  const showAttendance = can(user, 'attendance:read');

  return (
    <>
      <PageHeader title={fullName(e)} crumbs={crumbs} />
      {e.archivedAt && (
        <Alert tone="info" className="mb-6">
          {t('detail.archivedNotice')}
        </Alert>
      )}

      <Card className="mb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={fullName(e)} employeeId={e.id} photoFileId={e.photoFileId} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-h2">{fullName(e)}</h2>
                <StatusBadge tone={STATUS_TONE[e.employmentStatus]}>{ts(e.employmentStatus)}</StatusBadge>
                {e.archivedAt && <StatusBadge>{t('archivedBadge')}</StatusBadge>}
              </div>
              <p className="text-body-sm text-muted-foreground">
                {e.employeeCode} · {e.position.title} · {e.department.name}
              </p>
              <p className="text-caption text-muted-foreground">
                {t('detail.hiredOn', { date: formatDate(e.hireDate) })}
                {e.department.manager && e.department.manager.id !== e.id && ` · ${t('detail.manager', { name: fullName(e.department.manager) })}`}
              </p>
            </div>
          </div>
          {editable && (
            <div className="flex flex-wrap gap-2">
              {can(user, 'employee:delete') && (
                <Button variant="secondary" onClick={() => setRemoveOpen(true)}>
                  <Trash2 aria-hidden="true" />
                  {t('remove.action')}
                </Button>
              )}
              {can(user, 'employee:update') && (
                <>
                  <Button variant="secondary" onClick={() => setStatusOpen(true)}>
                    <RefreshCw aria-hidden="true" />
                    {t('status.change')}
                  </Button>
                  <Button asChild>
                    <Link href={`/employees/${e.id}/edit`}>
                      <Pencil aria-hidden="true" />
                      {tc('actions.edit')}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList aria-label={fullName(e)}>
          <TabsTrigger value="overview">{t('detail.tabs.overview')}</TabsTrigger>
          {showAttendance && <TabsTrigger value="attendance">{t('detail.tabs.attendance')}</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview">
          <Overview e={e} />
        </TabsContent>
        {showAttendance && (
          <TabsContent value="attendance">
            <RecentAttendance employeeId={e.id} />
          </TabsContent>
        )}
      </Tabs>

      {editable && <StatusDialog employee={e} open={statusOpen} onOpenChange={setStatusOpen} />}
      {editable && <RemoveDialog employee={e} open={removeOpen} onOpenChange={setRemoveOpen} />}
    </>
  );
}

function Facts({ rows }: { rows: Array<[string, ReactNode]> }) {
  const tc = useTranslations('common');
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-label text-muted-foreground">{k}</dt>
          <dd className="text-body-sm break-words">{v === null || v === undefined || v === '' ? tc('none') : v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Overview({ e }: { e: Detail }) {
  const t = useTranslations('employees');
  const tg = useTranslations('common.gender');
  const tr = useTranslations('common.roles');
  const locale = useLocale();
  const { user } = useAuth();
  const year = Number(localDay().slice(0, 4));
  const balances = useQuery({
    queryKey: ['leave-balances', e.id, year],
    queryFn: async () => (await http.get<LeaveBalance[]>('/leave-balances', { params: { employeeId: e.id, year } })).data,
    enabled: can(user, 'leave_balance:read'),
  });
  const role = (r: string) => (tr.has(r as 'Employee') ? tr(r as 'Employee') : r);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title={t('detail.personal')} />
        <Facts
          rows={[
            [t('fields.gender'), tg(e.gender)],
            [t('fields.dateOfBirth'), formatDate(e.dateOfBirth)],
            [t('fields.phone'), <a key="p" href={`tel:${e.phone.replace(/[\s-]/g, '')}`} className="tabular hover:text-deep-teal hover:underline">{e.phone}</a>],
            [t('fields.email'), <a key="m" href={`mailto:${e.email}`} className="hover:text-deep-teal hover:underline">{e.email}</a>],
            [t('fields.address'), e.address],
          ]}
        />
      </Card>
      <Card>
        <CardHeader title={t('detail.employment')} />
        <Facts
          rows={[
            [t('fields.employeeCode'), e.employeeCode],
            [t('fields.department'), e.department.name],
            [t('fields.position'), e.position.title],
            [t('fields.hireDate'), formatDate(e.hireDate)],
            ...(e.basicSalary !== undefined ? ([[t('fields.basicSalary'), <span key="s" className="tabular">{formatMoney(e.basicSalary, 'LAK', locale)}</span>]] as Array<[string, ReactNode]>) : []),
          ]}
        />
      </Card>
      {can(user, 'leave_balance:read') && (
        <Card>
          <CardHeader title={t('detail.leave', { year })} />
          {balances.isPending ? (
            <Skeleton />
          ) : !balances.data?.length ? (
            <p className="text-body-sm text-muted-foreground">{t('detail.noLeave')}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {balances.data.map((b) => {
                const total = Number(b.entitledDays) + Number(b.carriedDays);
                const left = Number(b.remainingDays);
                return (
                  <li key={b.id} className="flex flex-col gap-1.5">
                    <div className="flex justify-between gap-3 text-body-sm">
                      <span>{locale === 'lo' ? b.leaveType.nameLo : b.leaveType.nameEn}</span>
                      <span className="font-semibold tabular">{t('detail.daysLeft', { left: formatNumber(left), total: formatNumber(total) })}</span>
                    </div>
                    <span className="h-2 rounded-full bg-background" aria-hidden="true">
                      <span className="block h-2 rounded-full bg-primary" style={{ width: `${total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
      <Card>
        <CardHeader title={t('detail.emergency')} />
        <Facts
          rows={[
            [t('fields.emergencyContactName'), e.emergencyContactName],
            [t('fields.emergencyContactRelation'), e.emergencyContactRelation],
            [t('fields.emergencyContactPhone'), e.emergencyContactPhone],
          ]}
        />
      </Card>
      <Card>
        <CardHeader title={t('detail.account')} />
        {e.user ? (
          <Facts
            rows={[
              [t('fields.accountEmail'), e.user.email],
              [t('fields.role'), e.user.roles.map((r) => role(r.role.name)).join(', ')],
              [
                t('columns.status'),
                <StatusBadge key="a" tone={e.user.isActive ? 'success' : 'neutral'}>
                  {e.user.isActive ? t('detail.accountActive') : t('detail.accountDisabled')}
                </StatusBadge>,
              ],
              [t('fields.lastLogin'), e.user.lastLoginAt ? formatDateTime(e.user.lastLoginAt) : t('detail.neverSignedIn')],
            ]}
          />
        ) : (
          <EmptyState icon={UserX} title={t('detail.noAccount')} className="py-6" />
        )}
      </Card>
    </div>
  );
}

function RecentAttendance({ employeeId }: { employeeId: string }) {
  const t = useTranslations('employees');
  const to = localDay();
  const from = addDays(to, -29);
  const query = useQuery({
    queryKey: ['attendance', 'employee', employeeId, from, to],
    queryFn: async () => (await http.get<AttendanceRecord[]>('/attendance', { params: { employeeId, from, to, pageSize: 31, sort: 'date:desc' } })).data,
  });
  return (
    <section aria-label={t('detail.attendanceRecent')} className="flex flex-col gap-3">
      <p className="text-body-sm text-muted-foreground">
        {t('detail.attendanceRecent')} · {formatDate(`${from}T00:00:00Z`)} – {formatDate(`${to}T00:00:00Z`)}
      </p>
      <AttendanceTable rows={query.data} loading={query.isPending} showEmployee={false} emptyText={t('detail.attendanceEmpty')} />
    </section>
  );
}

function StatusDialog({ employee, open, onOpenChange }: { employee: Detail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations('employees');
  const tc = useTranslations('common');
  const ts = useTranslations('common.employmentStatus');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const [value, setValue] = useState<EmploymentStatus>(employee.employmentStatus);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => http.put<Detail>(`/employees/${employee.id}/status`, { employmentStatus: value }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(t('status.done'));
      onOpenChange(false);
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const change = (o: boolean) => {
    if (o) {
      setValue(employee.employmentStatus);
      setError(null);
    }
    onOpenChange(o);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={change}
      title={t('status.title', { name: fullName(employee) })}
      description={t('status.description')}
      actions={
        <>
          <Button variant="secondary" onClick={() => change(false)} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={value === employee.employmentStatus}>
            {t('status.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <FormField label={t('status.new')}>
          {(a) => (
            <Select {...a} value={value} onChange={(ev) => setValue(ev.target.value as EmploymentStatus)}>
              {EMPLOYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ts(s)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>
    </Dialog>
  );
}

function RemoveDialog({ employee, open, onOpenChange }: { employee: Detail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations('employees');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: () => http.delete<{ id: string; result: 'archived' | 'deleted' }>(`/employees/${employee.id}`),
    onSuccess: async (res) => {
      onOpenChange(false);
      if (res.data.result === 'archived') {
        toast.success(t('remove.archived'), { icon: <Archive className="size-4" aria-hidden="true" /> });
        await qc.invalidateQueries({ queryKey: ['employees'] });
      } else {
        toast.success(t('remove.deleted'));
        qc.removeQueries({ queryKey: ['employees', 'detail', employee.id] });
        await qc.invalidateQueries({ queryKey: ['employees', 'list'] });
        router.replace('/employees');
      }
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('remove.title', { name: fullName(employee) })}
      description={t('remove.description')}
      confirmLabel={t('remove.confirm')}
      loading={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-1/3" />
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-6">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="w-1/3" />
          <Skeleton className="w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
            <Skeleton className="w-1/4" />
            <Skeleton />
            <Skeleton />
            <Skeleton className="w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
