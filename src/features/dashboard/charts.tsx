'use client';

import { Table2, BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import type { DashboardData } from './types';

/**
 * FR-DSH-01 charts. Rules followed on every chart: thin marks, a 2px card-coloured gap between
 * stacked segments, a legend when there are two series or more, a hover tooltip, and a table
 * view of the same numbers (colour is never the only carrier of meaning).
 */

const QUERY = '(prefers-reduced-motion: reduce)';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
/** People who ask their system for less motion get bars drawn at once, not growing. */
const useMotion = () => {
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  return { isAnimationActive: !reduced, animationDuration: 500 };
};

const AXIS = { fontSize: 12, fill: 'var(--muted-foreground)' };
const GRID = 'var(--border)';
/** Series colours, fixed per entity (never per rank). Status colours are the reserved status palette. */
const STATUS_COLOR = {
  PRESENT: 'var(--color-success)',
  LATE: 'var(--color-warning)',
  HALF_DAY: 'var(--color-chart-5)',
  LEAVE: 'var(--color-info)',
  ABSENT: 'var(--color-danger)',
} as const;
const STATUS_ORDER = ['PRESENT', 'LATE', 'HALF_DAY', 'LEAVE', 'ABSENT'] as const;
const EMPLOYMENT_ORDER = ['PROBATION', 'ACTIVE', 'RESIGNED', 'TERMINATED'] as const;

/** A card with a chart and a switch to the same data as a table. */
function ChartCard({
  title,
  description,
  columns,
  rows,
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  columns: string[];
  rows: Array<Array<string | number>>;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations('dashboard.charts');
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();
  return (
    <Card className={className} aria-labelledby={titleId}>
      <CardHeader
        title={title}
        titleId={titleId}
        description={description}
        action={
          <Button variant="ghost" size="sm" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? <BarChart3 aria-hidden="true" /> : <Table2 aria-hidden="true" />}
            {asTable ? t('showChart') : t('showTable')}
          </Button>
        }
      />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-body-sm text-muted-foreground">{t('empty')}</p>
      ) : asTable ? (
        <div className="max-h-72 overflow-auto rounded-md border border-border">
          <table className="w-full text-body-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="bg-background text-left text-label text-muted-foreground">
                {columns.map((c) => (
                  <th key={c} scope="col" className="px-3 py-2">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r[0])} className="border-t border-border">
                  {r.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row" className="px-3 py-2 text-left font-normal">
                        {cell}
                      </th>
                    ) : (
                      <td key={i} className="px-3 py-2 tabular">
                        {typeof cell === 'number' ? formatNumber(cell) : cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72 w-full">{children}</div>
      )}
    </Card>
  );
}

interface TipEntry {
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  color?: string;
}
/** Hover tooltip: the category as a heading, then one coloured row per series. */
function Tip({ active, payload, label }: { active?: boolean; payload?: readonly TipEntry[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-body-sm shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      <ul className="flex flex-col gap-0.5">
        {payload.map((p) => (
          <li key={String(p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2.5 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
              {p.name}
            </span>
            <span className="font-semibold tabular">{formatNumber(Number(p.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const legend = {
  wrapperStyle: { fontSize: 12, paddingTop: 8 },
  iconType: 'square' as const,
  iconSize: 10,
};
const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Employee Statistics: head count by employment status. */
export function EmployeeStatusChart({ byStatus }: { byStatus: Record<string, number> }) {
  const t = useTranslations('dashboard.charts');
  const motion = useMotion();
  const data = EMPLOYMENT_ORDER.map((s) => ({
    key: s,
    label: t(`employmentStatus.${s}`),
    count: byStatus[s] ?? 0,
  }));
  const total = data.reduce((n, d) => n + d.count, 0);
  return (
    <ChartCard title={t('employeeStatus')} description={t('employeeStatusHint')} columns={[t('status'), t('count')]} rows={total ? data.map((d) => [d.label, d.count]) : []}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--secondary)' }} />
          <Bar {...motion} dataKey="count" name={t('count')} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Attendance Overview: one stacked bar per working day, one segment per status. */
export function AttendanceTrendChart({ trend }: { trend: NonNullable<DashboardData['charts']>['attendanceTrend'] }) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('dashboard.charts');
  const motion = useMotion();
  const label = (s: (typeof STATUS_ORDER)[number]) => t(`status.${s}`);
  const hasData = trend.some((d) => STATUS_ORDER.some((s) => d[s] > 0));
  const data = trend.map((d) => ({ ...d, day: shortDay(d.date) }));
  return (
    <ChartCard
      className="xl:col-span-2"
      title={tc('attendance')}
      description={tc('attendanceHint', { days: trend.length })}
      columns={[tc('date'), ...STATUS_ORDER.map(label)]}
      rows={hasData ? data.map((d) => [d.day, ...STATUS_ORDER.map((s) => d[s])]) : []}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--secondary)' }} />
          <Legend {...legend} />
          {STATUS_ORDER.map((s) => (
            <Bar {...motion} key={s} dataKey={s} name={label(s)} stackId="attendance" fill={STATUS_COLOR[s]} stroke="var(--card)" strokeWidth={2} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Employee Distribution by Department: horizontal bars, longest first. */
export function DepartmentChart({ rows, description }: { rows: NonNullable<DashboardData['headcount']>['byDepartment']; description: ReactNode }) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('dashboard.charts');
  const motion = useMotion();
  const data = rows.map((r) => ({ name: r.name, count: r.count }));
  const height = Math.max(240, data.length * 40 + 24);
  return (
    <ChartCard className="xl:col-span-2" title={t('byDepartment')} description={description} columns={[tc('department'), tc('count')]} rows={data.map((d) => [d.name, d.count])}>
      <div className="h-full overflow-y-auto">
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 20, left: 0 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={130} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
              <Tooltip content={<Tip />} cursor={{ fill: 'var(--secondary)' }} />
              <Bar {...motion} dataKey="count" name={tc('count')} fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}

/** Monthly Recruitment Statistics: applicants and hires for each of the last months. */
export function RecruitmentChart({ months, openVacancies }: { months: NonNullable<NonNullable<DashboardData['charts']>['recruitmentByMonth']>; openVacancies: number }) {
  const t = useTranslations('dashboard.charts');
  const motion = useMotion();
  const data = months.map((m) => ({
    ...m,
    label: `${m.month.slice(5, 7)}/${m.month.slice(0, 4)}`,
  }));
  const hasData = months.some((m) => m.applications > 0 || m.hires > 0);
  return (
    <ChartCard
      title={t('recruitment')}
      description={t('recruitmentHint', {
        months: months.length,
        open: openVacancies,
      })}
      columns={[t('month'), t('applications'), t('hires')]}
      rows={hasData ? data.map((m) => [m.label, m.applications, m.hires]) : []}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--secondary)' }} />
          <Legend {...legend} />
          <Bar {...motion} dataKey="applications" name={t('applications')} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar {...motion} dataKey="hires" name={t('hires')} fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
