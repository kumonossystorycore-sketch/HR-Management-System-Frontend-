'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, CheckCheck, Download, FileDown, ListChecks, SearchX, Send, Undo2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { PersonCell } from '@/components/ui/person-cell';
import { SearchInput } from '@/components/ui/search-input';
import { useAuth } from '@/features/auth/auth-provider';
import { can } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';
import { formatMoney, formatNumber, formatPeriod } from '@/lib/format';
import { RowDialog } from './row-dialog';
import { PAYROLL_TONE, STEPS, type Payroll, type PayrollPeriod, type Step } from './types';

const PAGE_SIZE = 50;
const KEYS = ['periodYear', 'periodMonth', 'search', 'status'] as const;
const STEP_ICON = { submit: Send, return: Undo2, approve: CheckCheck, markPaid: Banknote } as const;

const name = (p: Payroll) => `${p.employee.firstName} ${p.employee.lastName}`;

/** One month: totals, the next workflow step for this user, and every employee's row. */
export function PeriodDetail({ year, month }: { year: number; month: number }) {
  const t = useTranslations('payroll');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(KEYS);
  const [step, setStep] = useState<Step | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const period = formatPeriod(year, month);

  const summary = useQuery({
    queryKey: ['payroll', 'periods', year],
    queryFn: async () => (await http.get<PayrollPeriod[]>('/payroll/periods', { params: { year } })).data,
    select: (list) => list.find((p) => p.periodMonth === month),
  });
  const rows = useQuery({
    queryKey: ['payroll', 'rows', year, month, values.search, page],
    queryFn: () => http.get<Payroll[]>('/payroll', { params: { periodYear: year, periodMonth: month, search: values.search || undefined, page, pageSize: PAGE_SIZE } }),
    placeholderData: keepPreviousData,
  });
  const s = summary.data;
  const currency = rows.data?.data[0]?.currency ?? 'LAK';
  const money = (v: string | number) => formatMoney(v, currency, locale);

  // Steps this user can take now: the period has rows in the step's starting status.
  const steps = (Object.keys(STEPS) as Step[]).filter((k) => (s?.byStatus[STEPS[k].from] ?? 0) > 0 && can(user, STEPS[k].permission));

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadFile(`/payroll/periods/${year}/${month}/export`, { lang: locale }, `payroll-${year}-${String(month).padStart(2, '0')}.csv`);
    } catch {
      toast.error(tc('feedback.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const pdf = (p: Payroll) =>
    downloadFile(`/payslips/${p.id}/pdf`, { lang: locale }, `payslip_${p.employee.employeeCode}_${year}-${String(month).padStart(2, '0')}.pdf`).catch((e) => toast.error(errorMessage(e)));

  const columns: Column<Payroll>[] = [
    { key: 'employee', header: t('columns.employee'), cell: (p) => <PersonCell name={name(p)} meta={`${p.employee.employeeCode} · ${p.employee.department.name}`} /> },
    { key: 'basic', header: t('columns.basic'), numeric: true, cell: (p) => formatNumber(p.basicSalary) },
    { key: 'allow', header: t('columns.allowances'), numeric: true, cell: (p) => formatNumber(p.totalAllowances) },
    { key: 'ot', header: t('columns.overtime'), numeric: true, cell: (p) => formatNumber(p.totalOvertime) },
    { key: 'ded', header: t('columns.deductions'), numeric: true, cell: (p) => (Number(p.totalDeductions) ? `−${formatNumber(p.totalDeductions)}` : '0') },
    { key: 'net', header: t('columns.net'), numeric: true, cell: (p) => <span className="font-semibold">{money(p.netSalary)}</span> },
    { key: 'status', header: t('columns.status'), cell: (p) => <StatusBadge tone={PAYROLL_TONE[p.status]}>{t(`status.${p.status}`)}</StatusBadge> },
    {
      key: 'actions',
      header: <span className="sr-only">{t('columns.actions')}</span>,
      align: 'end',
      cell: (p) => (
        <span className="inline-flex gap-1">
          {(p.status === 'APPROVED' || p.status === 'PAID') && can(user, 'payslip:read') && (
            <Button variant="ghost" size="icon" onClick={() => void pdf(p)} aria-label={t('detail.pdfOf', { name: name(p) })}>
              <FileDown aria-hidden="true" />
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setOpenRow(p.id)} aria-label={t('detail.editOf', { name: name(p) })}>
            <ListChecks aria-hidden="true" />
            {t('detail.edit')}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('period', { period })}
        crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title'), href: '/payroll' }, { label: period }]}
        description={s ? t('detail.summary', { count: formatNumber(s.employees), total: money(s.totalNet) }) : undefined}
        action={
          can(user, 'payroll:export') &&
          s && (
            <Button variant="secondary" onClick={() => void onExport()} loading={exporting}>
              <Download aria-hidden="true" />
              {t('detail.export')}
            </Button>
          )
        }
      />

      {s && (
        <Card className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {Object.entries(s.byStatus).map(([st, n]) => (
                <StatusBadge key={st} tone={PAYROLL_TONE[st as keyof typeof PAYROLL_TONE]}>
                  {t(`status.${st as 'DRAFT'}`)} · {n}
                </StatusBadge>
              ))}
            </div>
            {s.status !== 'MIXED' && <p className="text-body-sm text-muted-foreground">{t(`workflow.${s.status}`)}</p>}
            {(s.byStatus.DRAFT ?? 0) > 0 && can(user, 'payroll:manage') && <p className="text-caption text-muted-foreground">{t('detail.manualDeductions')}</p>}
          </div>
          {steps.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {steps.map((k) => {
                const Icon = STEP_ICON[k];
                return (
                  <Button key={k} variant={k === 'return' ? 'secondary' : 'primary'} onClick={() => setStep(k)}>
                    <Icon aria-hidden="true" />
                    {t(`steps.${k}.action`)}
                  </Button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {(rows.isError || summary.isError) && <Alert className="mb-6">{errorMessage(rows.error ?? summary.error)}</Alert>}
      <DataTable
        caption={t('detail.caption', { period })}
        columns={columns}
        rows={rows.data?.data}
        rowKey={(p) => p.id}
        loading={rows.isPending}
        empty={<EmptyState icon={SearchX} title={t('empty.rows')} />}
        toolbar={<SearchInput value={values.search} onChange={(v) => set({ search: v })} placeholder={t('detail.searchPlaceholder')} label={t('detail.searchLabel')} className="w-full sm:w-72" />}
        mobileItem={(p) => (
          <button type="button" onClick={() => setOpenRow(p.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-background" aria-label={t('detail.editOf', { name: name(p) })}>
            <PersonCell name={name(p)} meta={p.employee.employeeCode} />
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-semibold tabular">{money(p.netSalary)}</span>
              <StatusBadge tone={PAYROLL_TONE[p.status]}>{t(`status.${p.status}`)}</StatusBadge>
            </span>
          </button>
        )}
        footer={rows.data?.meta && rows.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={rows.data.meta.total} onPageChange={(n) => set({ page: n })} />}
      />

      {step && s && <StepDialog key={step} step={step} year={year} month={month} period={s} money={money} onClose={() => setStep(null)} />}
      {openRow && <RowDialog key={openRow} id={openRow} onClose={() => setOpenRow(null)} />}
    </>
  );
}

function StepDialog({ step, year, month, period, money, onClose }: { step: Step; year: number; month: number; period: PayrollPeriod; money: (v: string) => string; onClose: () => void }) {
  const t = useTranslations('payroll');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const label = formatPeriod(year, month);
  const count = period.byStatus[STEPS[step].from] ?? 0;
  const mutation = useMutation({
    mutationFn: async () => (await http.put<{ updated: number }>(`/payroll/periods/${year}/${month}/${STEPS[step].path}`)).data,
    onSuccess: async (res) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['payroll'] }), qc.invalidateQueries({ queryKey: ['dashboard'] })]);
      toast.success(t(`steps.${step}.done`, { count: formatNumber(res.updated) }));
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t(`steps.${step}.title`, { period: label })}
      description={t(`steps.${step}.description`, { count: formatNumber(count), total: money(period.totalNet) })}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button variant={step === 'return' ? 'secondary' : 'primary'} onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {t(`steps.${step}.action`)}
          </Button>
        </>
      }
    >
      {error && <Alert>{error}</Alert>}
    </Dialog>
  );
}
