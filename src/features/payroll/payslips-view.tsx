'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, FileDown, Lock, Wallet } from 'lucide-react';
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
import { Pagination } from '@/components/ui/pagination';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';
import { formatDate, formatMoney, formatNumber, formatPeriod } from '@/lib/format';
import { PAYROLL_TONE, type Payroll } from './types';

const PAGE_SIZE = 24;

/** FR-PAY-07: an employee's own released payslips (approved or paid), with the PDF. */
export function PayslipsView() {
  const t = useTranslations('payroll');
  const tc = useTranslations('common');
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { page, set } = useListParams([] as const);
  const [viewing, setViewing] = useState<Payroll | null>(null);
  const query = useQuery({
    queryKey: ['payslips', 'mine', page],
    queryFn: () => http.get<Payroll[]>('/payslips/me', { params: { page, pageSize: PAGE_SIZE } }),
    placeholderData: keepPreviousData,
  });

  const pdf = (p: Payroll) =>
    downloadFile(`/payslips/${p.id}/pdf`, { lang: locale }, `payslip_${p.employee.employeeCode}_${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}.pdf`).catch((e) => toast.error(errorMessage(e)));

  const columns: Column<Payroll>[] = [
    { key: 'period', header: t('columns.period'), cell: (p) => <span className="font-semibold tabular">{formatPeriod(p.periodYear, p.periodMonth)}</span> },
    { key: 'net', header: t('columns.net'), numeric: true, cell: (p) => <span className="font-semibold">{formatMoney(p.netSalary, p.currency, locale)}</span> },
    {
      key: 'status',
      header: t('columns.status'),
      cell: (p) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge tone={PAYROLL_TONE[p.status]}>{t(`status.${p.status}`)}</StatusBadge>
          {p.paidAt && <span className="text-caption text-muted-foreground tabular">{t('payslips.paidOn', { date: formatDate(p.paidAt) })}</span>}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('columns.actions')}</span>,
      align: 'end',
      cell: (p) => {
        const period = formatPeriod(p.periodYear, p.periodMonth);
        return (
          <span className="inline-flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setViewing(p)} aria-label={t('payslips.viewOf', { period })}>
              <Eye aria-hidden="true" />
              {t('payslips.view')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void pdf(p)} aria-label={t('payslips.downloadOf', { period })}>
              <FileDown aria-hidden="true" />
              PDF
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title={t('payslips.title')} crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('payslips.title') }]} />
      <p className="mb-4 flex items-center gap-2 text-caption text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" />
        {t('payslips.private')}
      </p>
      {query.isError && <Alert className="mb-4">{errorMessage(query.error)}</Alert>}
      <DataTable
        caption={t('payslips.caption')}
        columns={columns}
        rows={query.data?.data}
        rowKey={(p) => p.id}
        loading={query.isPending}
        empty={<EmptyState icon={Wallet} title={t('payslips.empty')} description={t('payslips.emptyText')} />}
        mobileItem={(p) => (
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="min-w-0">
              <span className="block font-semibold tabular">{formatPeriod(p.periodYear, p.periodMonth)}</span>
              <span className="block text-body-sm tabular">{formatMoney(p.netSalary, p.currency, locale)}</span>
            </span>
            <span className="flex shrink-0 gap-2">
              <Button variant="secondary" size="sm" onClick={() => setViewing(p)} aria-label={t('payslips.viewOf', { period: formatPeriod(p.periodYear, p.periodMonth) })}>
                {t('payslips.view')}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void pdf(p)} aria-label={t('payslips.downloadOf', { period: formatPeriod(p.periodYear, p.periodMonth) })}>
                <FileDown aria-hidden="true" />
              </Button>
            </span>
          </div>
        )}
        footer={query.data?.meta && query.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(n) => set({ page: n })} />}
      />
      {viewing && <PayslipDialog payslip={viewing} onDownload={() => void pdf(viewing)} onClose={() => setViewing(null)} />}
    </>
  );
}

function PayslipDialog({ payslip: p, onDownload, onClose }: { payslip: Payroll; onDownload: () => void; onClose: () => void }) {
  const t = useTranslations('payroll');
  const tc = useTranslations('common');
  const locale = useLocale();
  const money = (v: string) => formatMoney(v, p.currency, locale);
  const earnings = p.items.filter((i) => i.type !== 'DEDUCTION');
  const deductions = p.items.filter((i) => i.type === 'DEDUCTION');
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('payslips.detailTitle', { period: formatPeriod(p.periodYear, p.periodMonth) })}
      description={`${p.employee.firstName} ${p.employee.lastName} · ${p.employee.employeeCode} · ${p.employee.position.title}`}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tc('close')}
          </Button>
          <Button onClick={onDownload}>
            <FileDown aria-hidden="true" />
            {t('payslips.download')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-body-sm">
        <section aria-label={t('payslips.earnings')} className="flex flex-col gap-1">
          <h3 className="text-label text-muted-foreground">{t('payslips.earnings')}</h3>
          <div className="flex justify-between gap-3">
            <span>{t('row.basic')}</span>
            <span className="tabular">{formatNumber(p.basicSalary)}</span>
          </div>
          {earnings.map((i) => (
            <div key={i.id} className="flex justify-between gap-3">
              <span>
                {i.label}
                {i.hours && <span className="text-muted-foreground"> · {t('row.hoursValue', { hours: formatNumber(i.hours) })}</span>}
              </span>
              <span className="tabular">{formatNumber(i.amount)}</span>
            </div>
          ))}
        </section>
        {deductions.length > 0 && (
          <section aria-label={t('payslips.deductions')} className="flex flex-col gap-1">
            <h3 className="text-label text-muted-foreground">{t('payslips.deductions')}</h3>
            {deductions.map((i) => (
              <div key={i.id} className="flex justify-between gap-3">
                <span>{i.label}</span>
                <span className="tabular text-danger-text">−{formatNumber(i.amount)}</span>
              </div>
            ))}
          </section>
        )}
        <div className="flex justify-between gap-3 border-t border-border pt-3 text-h3">
          <span>{t('row.net')}</span>
          <span className="tabular">{money(p.netSalary)}</span>
        </div>
      </div>
    </Dialog>
  );
}
