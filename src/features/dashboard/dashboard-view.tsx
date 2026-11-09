'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarDays, Clock, Star, UserCheck, UserMinus, UserX, Users, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/page-header';
import { useDisplayName } from '@/components/layout/use-user-labels';
import { Alert } from '@/components/ui/alert';
import { StatusBadge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useErrorMessage } from '@/features/auth/use-messages';
import { Link } from '@/i18n/navigation';
import { http } from '@/lib/api-client';
import { formatDate, formatMoney, formatNumber, formatPeriod, formatTime } from '@/lib/format';
import { AttendanceTrendChart, DepartmentChart, EmployeeStatusChart, RecruitmentChart } from './charts';
import type { DashboardData } from './types';

const STATUS_TONE: Record<string, BadgeTone> = {
  PRESENT: 'success',
  LATE: 'warning',
  HALF_DAY: 'warning',
  ABSENT: 'danger',
  LEAVE: 'info',
  DRAFT: 'neutral',
  PENDING: 'warning',
  APPROVED: 'success',
  PAID: 'success',
  MIXED: 'neutral',
};

/** FR-DSH-01: the home screen, shaped by the caller's scope (own, department or company). */
export function DashboardView() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const locale = useLocale();
  const name = useDisplayName();
  const errorMessage = useErrorMessage();
  const query = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await http.get<DashboardData>('/dashboard')).data, refetchInterval: 5 * 60_000 });
  const d = query.data;
  const status = (s: string) => (t.has(`status.${s}` as 'status.PRESENT') ? t(`status.${s}` as 'status.PRESENT') : s);
  const typeName = (lt: { nameLo: string; nameEn: string }) => (locale === 'lo' ? lt.nameLo : lt.nameEn);
  const inactive = (d?.headcount?.byStatus.RESIGNED ?? 0) + (d?.headcount?.byStatus.TERMINATED ?? 0);

  return (
    <>
      <PageHeader title={t('title')} description={d ? `${t('greeting', { name })} · ${t('today', { date: formatDate(`${d.date}T00:00:00+07:00`) })} · ${t(`scope.${d.scope}`)}` : undefined} />

      {query.isError && (
        <Alert className="mb-6">
          {t('loadError')} {errorMessage(query.error)}{' '}
          <button type="button" onClick={() => void query.refetch()} className="font-semibold underline underline-offset-4">
            {tc('retry')}
          </button>
        </Alert>
      )}

      {query.isPending && <DashboardSkeleton />}

      {d && (
        <div className="flex flex-col gap-8">
          {d.scope !== 'OWN' && d.headcount && d.attendanceToday && d.leave && (
            <section aria-label={t(`scope.${d.scope}`)} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t('stats.total')} value={formatNumber(inactive + d.headcount.current)} unit={t('stats.people')} icon={Users} hint={t('stats.totalHint', { active: d.headcount.current, inactive })} />
                <StatCard label={t('stats.active')} value={formatNumber(d.headcount.current)} unit={t('stats.people')} icon={UserCheck} hint={t('stats.headcountHint', { count: d.headcount.newHiresThisMonth })} />
                <StatCard label={t('stats.inactive')} value={formatNumber(inactive)} unit={t('stats.people')} icon={UserMinus} hint={t('stats.inactiveHint')} />
                <StatCard label={t('stats.departments')} value={formatNumber(d.headcount.departments)} icon={Building2} />
                <StatCard
                  label={t('stats.present')}
                  value={formatNumber((d.attendanceToday.byStatus.PRESENT ?? 0) + (d.attendanceToday.byStatus.LATE ?? 0) + (d.attendanceToday.byStatus.HALF_DAY ?? 0))}
                  unit={t('stats.people')}
                  icon={Clock}
                  hint={d.attendanceToday.isWorkingDay ? t('stats.presentHint', { late: d.attendanceToday.byStatus.LATE ?? 0, missing: d.attendanceToday.notCheckedIn }) : t('stats.notWorkingDay')}
                />
                <StatCard label={t('stats.absent')} value={formatNumber(d.attendanceToday.byStatus.ABSENT ?? 0)} unit={t('stats.people')} icon={UserX} hint={d.attendanceToday.isWorkingDay ? t('stats.absentHint', { missing: d.attendanceToday.notCheckedIn }) : t('stats.notWorkingDay')} />
                <StatCard label={t('stats.onLeave')} value={formatNumber(d.leave.onLeaveToday.length)} unit={t('stats.people')} icon={CalendarDays} />
                <StatCard label={t('stats.pendingLeave')} value={formatNumber(d.leave.pendingRequests)} icon={CalendarDays} />
              </div>

              {d.charts && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  <AttendanceTrendChart trend={d.charts.attendanceTrend} />
                  <EmployeeStatusChart byStatus={d.headcount.byStatus} />
                  {d.headcount.byDepartment.length > 0 && <DepartmentChart rows={d.headcount.byDepartment} description={t('byDepartmentHint', { count: d.headcount.byDepartment.length, total: d.headcount.current })} />}
                  {d.charts.recruitmentByMonth && <RecruitmentChart months={d.charts.recruitmentByMonth} openVacancies={d.recruitment?.openVacancies ?? 0} />}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card>
                  <CardHeader title={t('onLeaveToday')} />
                  {d.leave.onLeaveToday.length === 0 ? (
                    <p className="text-body-sm text-muted-foreground">{t('onLeaveEmpty')}</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {d.leave.onLeaveToday.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                          <span className="min-w-0">
                            <span className="block truncate text-body-sm font-semibold">
                              {r.employee.firstName} {r.employee.lastName}
                            </span>
                            <span className="block text-caption text-muted-foreground">
                              {typeName(r.leaveType)} · {t('until', { date: formatDate(r.endDate) })}
                            </span>
                          </span>
                          <StatusBadge tone="info">{status('LEAVE')}</StatusBadge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                {d.payroll && (
                  <Card>
                    <CardHeader title={t('payroll')} description={t('payrollHint', { period: formatPeriod(d.payroll.periodYear, d.payroll.periodMonth), count: d.payroll.employees })} />
                    <p className="text-stat tabular">{formatMoney(d.payroll.totalNet, d.payroll.currency, locale)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(d.payroll.byStatus).map(([s, n]) => (
                        <StatusBadge key={s} tone={STATUS_TONE[s]}>
                          {status(s)} · {n}
                        </StatusBadge>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </section>
          )}

          {d.me ? <MyCards me={d.me} status={status} /> : d.scope === 'OWN' && <Alert tone="info">{t('me.noEmployee')}</Alert>}
        </div>
      )}
    </>
  );

}

/** The caller's own cards: today's attendance, leave left, latest payslip, reviews. */
function MyCards({ me, status }: { me: NonNullable<DashboardData['me']>; status: (s: string) => string }) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const typeName = (lt: { nameLo: string; nameEn: string }) => (locale === 'lo' ? lt.nameLo : lt.nameEn);
  const a = me.attendanceToday;
  return (
    <section aria-labelledby="me-title" className="flex flex-col gap-4">
      <h2 id="me-title" className="text-h2">
        {t('me.title')}
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader title={t('me.attendance')} />
          {a ? (
            <div className="flex flex-col items-start gap-2">
              <StatusBadge tone={STATUS_TONE[a.status]}>{status(a.status)}</StatusBadge>
              <p className="text-body-sm tabular text-muted-foreground">
                {a.checkInAt && t('me.checkedIn', { time: formatTime(a.checkInAt) })}
                {a.checkOutAt && ` · ${t('me.checkedOut', { time: formatTime(a.checkOutAt) })}`}
              </p>
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">{t('me.notCheckedIn')}</p>
          )}
        </Card>

        <Card>
          <CardHeader title={t('me.leaveBalances')} />
          {me.leaveBalances.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t('me.noBalances')}</p>
          ) : (
            <dl className="flex flex-col gap-1">
              {me.leaveBalances.map((b) => (
                <div key={b.leaveType.code} className="flex justify-between gap-3 text-body-sm">
                  <dt className="text-muted-foreground">{typeName(b.leaveType)}</dt>
                  <dd className="font-semibold tabular">{t('me.days', { count: formatNumber(b.remainingDays) })}</dd>
                </div>
              ))}
            </dl>
          )}
          {me.pendingLeaveRequests > 0 && (
            <p className="mt-3 text-caption text-muted-foreground">
              {t('me.pendingRequests')}: <span className="font-semibold text-foreground">{me.pendingLeaveRequests}</span>
            </p>
          )}
        </Card>

        <Card>
          <CardHeader title={t('me.latestPayslip')} />
          {me.latestPayslip ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-caption text-muted-foreground">{formatPeriod(me.latestPayslip.periodYear, me.latestPayslip.periodMonth)}</p>
              <p className="text-h2 tabular">{formatMoney(me.latestPayslip.netSalary, me.latestPayslip.currency, locale)}</p>
              <StatusBadge tone={STATUS_TONE[me.latestPayslip.status]}>{status(me.latestPayslip.status)}</StatusBadge>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <Wallet className="size-4" aria-hidden="true" />
              {t('me.noPayslip')}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={t('me.reviewsToAcknowledge')} />
          <p className="text-stat tabular">{me.reviewsToAcknowledge}</p>
          {me.reviewsToWrite > 0 && (
            <Button asChild variant="link" size="sm" className="mt-2">
              <Link href="/performance?mine=toReview">
                <Star aria-hidden="true" />
                {t('me.reviewsToWrite')}: {me.reviewsToWrite}
              </Link>
            </Button>
          )}
        </Card>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
            <Skeleton className="w-1/2" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="w-2/3" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-4 w-1/4" />
        <Skeleton className="mb-2" />
        <Skeleton className="mb-2" />
        <Skeleton />
      </div>
    </div>
  );
}
