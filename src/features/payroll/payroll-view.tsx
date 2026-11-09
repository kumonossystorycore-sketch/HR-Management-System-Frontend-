'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Plus, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/auth-provider';
import { can } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { Link } from '@/i18n/navigation';
import { http } from '@/lib/api-client';
import { formatMoney, formatNumber, formatPeriod, localDay } from '@/lib/format';
import { useDepartmentOptions } from '@/lib/queries';
import { PeriodDetail } from './period-detail';
import { PAYROLL_TONE, type PayrollPeriod } from './types';

const KEYS = ['periodYear', 'periodMonth', 'search', 'status'] as const;

/** FR-PAY-01..06: payroll periods, and one period's rows when ?periodYear=&periodMonth= are set. */
export function PayrollView() {
  const { values } = useListParams(KEYS);
  const year = Number(values.periodYear);
  const month = Number(values.periodMonth);
  if (year >= 2000 && month >= 1 && month <= 12) return <PeriodDetail year={year} month={month} />;
  return <PeriodList />;
}

const periodHref = (p: { periodYear: number; periodMonth: number }) => `/payroll?periodYear=${p.periodYear}&periodMonth=${p.periodMonth}`;

function PeriodList() {
  const t = useTranslations('payroll');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const [generating, setGenerating] = useState(false);
  const query = useQuery({ queryKey: ['payroll', 'periods'], queryFn: async () => (await http.get<PayrollPeriod[]>('/payroll/periods')).data });

  const columns: Column<PayrollPeriod>[] = [
    {
      key: 'period',
      header: t('columns.period'),
      cell: (p) => (
        <Link href={periodHref(p)} className="font-semibold tabular text-deep-teal underline-offset-4 hover:underline" aria-label={t('openOf', { period: formatPeriod(p.periodYear, p.periodMonth) })}>
          {formatPeriod(p.periodYear, p.periodMonth)}
        </Link>
      ),
    },
    { key: 'employees', header: t('columns.employees'), numeric: true, cell: (p) => formatNumber(p.employees) },
    { key: 'total', header: t('columns.totalNet'), numeric: true, cell: (p) => formatMoney(p.totalNet, 'LAK', locale) },
    {
      key: 'status',
      header: t('columns.status'),
      cell: (p) => (
        <span className="flex flex-wrap gap-1">
          {p.status === 'MIXED' ? (
            Object.entries(p.byStatus).map(([s, n]) => (
              <StatusBadge key={s} tone={PAYROLL_TONE[s as keyof typeof PAYROLL_TONE]}>
                {t(`status.${s as 'DRAFT'}`)} · {n}
              </StatusBadge>
            ))
          ) : (
            <StatusBadge tone={PAYROLL_TONE[p.status]}>{t(`status.${p.status}`)}</StatusBadge>
          )}
        </span>
      ),
    },
    {
      key: 'open',
      header: <span className="sr-only">{t('columns.actions')}</span>,
      align: 'end',
      cell: (p) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={periodHref(p)} aria-label={t('openOf', { period: formatPeriod(p.periodYear, p.periodMonth) })}>
            {t('open')}
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      ),
    },
  ];

  const add = can(user, 'payroll:manage') && (
    <Button onClick={() => setGenerating(true)}>
      <Plus aria-hidden="true" />
      {t('generate.action')}
    </Button>
  );

  return (
    <>
      <PageHeader title={t('title')} crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]} action={add} />
      {query.isError && <Alert className="mb-6">{`${t('loadError')} ${errorMessage(query.error)}`}</Alert>}
      <DataTable
        caption={t('periodsCaption')}
        columns={columns}
        rows={query.data}
        rowKey={(p) => `${p.periodYear}-${p.periodMonth}`}
        loading={query.isPending}
        empty={<EmptyState icon={Wallet} title={t('empty.periods')} description={t('empty.periodsText')} action={add} />}
        mobileItem={(p) => (
          <Link href={periodHref(p)} className="flex items-center justify-between gap-3 p-4 hover:bg-background">
            <span className="min-w-0">
              <span className="block font-semibold tabular">{formatPeriod(p.periodYear, p.periodMonth)}</span>
              <span className="block text-caption text-muted-foreground tabular">
                {t('people', { count: formatNumber(p.employees) })} · {formatMoney(p.totalNet, 'LAK', locale)}
              </span>
            </span>
            <StatusBadge tone={PAYROLL_TONE[p.status]}>{t(`status.${p.status}`)}</StatusBadge>
          </Link>
        )}
      />
      {generating && <GenerateDialog onClose={() => setGenerating(false)} />}
    </>
  );
}

function GenerateDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('payroll');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const { set } = useListParams(KEYS);
  const departments = useDepartmentOptions();
  const today = localDay();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () =>
      (await http.post<{ created: number; skipped: number }>('/payroll', { periodYear: year, periodMonth: month, ...(departmentId ? { departmentIds: [departmentId] } : {}) })).data,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['payroll'] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(t('generate.done', { created: formatNumber(res.created), skipped: formatNumber(res.skipped) }));
      onClose();
      set({ periodYear: year, periodMonth: month });
    },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('generate.title')}
      description={t('generate.description')}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {t('generate.confirm')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('generate.month')}>
            {(a) => (
              <Select {...a} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label={t('generate.year')}>
            {(a) => <Input {...a} type="number" className="tabular" min={2000} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />}
          </FormField>
        </div>
        <FormField label={t('generate.departments')}>
          {(a) => (
            <Select {...a} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">{t('generate.allDepartments')}</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>
    </Dialog>
  );
}
