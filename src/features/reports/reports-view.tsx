'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, FileText, Printer, TableProperties } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/auth-provider';
import { can, scopeOf } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';
import { addDays, formatDate, formatNumber, localDay } from '@/lib/format';
import { useDepartmentOptions } from '@/lib/queries';

type ReportName = 'headcount' | 'attendance' | 'leave' | 'payroll';
type Value = string | number | null;
interface Report {
  key: string;
  title: { lo: string; en: string };
  columns: Array<{ key: string; lo: string; en: string; type?: 'money' | 'code' }>;
  rows: Array<Record<string, Value>>;
}

const KEYS = ['report', 'departmentId', 'from', 'to', 'year'] as const;

/** FR-REP-01/02: the four reports on screen, with the same data as Excel or CSV. */
export function ReportsView() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { values, set } = useListParams(KEYS);
  const reports: ReportName[] = ['headcount', 'attendance', 'leave', ...(can(user, 'payroll:read') ? (['payroll'] as const) : [])];
  const report: ReportName = reports.includes(values.report as ReportName) ? (values.report as ReportName) : 'headcount';
  return (
    <>
      <PageHeader title={t('title')} crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]} />
      <Tabs value={report} onValueChange={(v) => set({ report: v === 'headcount' ? null : v, from: null, to: null, year: null })}>
        <TabsList aria-label={t('title')} className="print:hidden">
          {reports.map((r) => (
            <TabsTrigger key={r} value={r}>
              {t(`tabs.${r}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {reports.map((r) => (
          <TabsContent key={r} value={r}>
            {r === report && <ReportPanel name={r} />}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

function ReportPanel({ name }: { name: ReportName }) {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, set } = useListParams(KEYS);
  const [exporting, setExporting] = useState<'xlsx' | 'csv' | null>(null);
  const companyWide = scopeOf(user, 'report:read') === 'ALL';
  const departments = useDepartmentOptions(companyWide);
  const today = localDay();
  const thisYear = Number(today.slice(0, 4));
  const from = values.from || `${today.slice(0, 8)}01`;
  const to = values.to || today;
  const year = values.year || String(thisYear);
  const tooLong = name === 'attendance' && (from > to || (Date.parse(to) - Date.parse(from)) / 86_400_000 > 366);

  const params = {
    departmentId: values.departmentId || undefined,
    ...(name === 'attendance' ? { from, to } : {}),
    ...(name === 'leave' || name === 'payroll' ? { year } : {}),
  };
  const query = useQuery({
    queryKey: ['reports', name, params],
    queryFn: async () => (await http.get<Report>(`/reports/${name}`, { params })).data,
    placeholderData: keepPreviousData,
    enabled: !tooLong,
  });
  const r = query.data?.key === name ? query.data : undefined;

  const onExport = async (format: 'xlsx' | 'csv') => {
    setExporting(format);
    try {
      await downloadFile(`/reports/${name}/export`, { ...params, format, lang: locale }, `${name}.${format}`);
    } catch {
      toast.error(tc('feedback.exportFailed'));
    } finally {
      setExporting(null);
    }
  };

  const label = (c: Report['columns'][number]) => (locale === 'lo' ? c.lo : c.en);
  const isNumber = (key: string) => Boolean(r?.rows.length) && r!.rows.every((row) => row[key] === null || typeof row[key] === 'number' || (typeof row[key] === 'string' && r!.columns.find((c) => c.key === key)?.type === 'money'));
  // Stored codes (status, gender) are shown by name, like the exported files.
  const code = (v: Value) => (typeof v === 'string' && t.has(`codes.${v}` as 'codes.ACTIVE') ? t(`codes.${v}` as 'codes.ACTIVE') : v);
  const cell = (v: Value, type?: 'money' | 'code') => (v === null || v === '' ? tc('none') : type === 'code' ? code(v) : typeof v === 'number' || type === 'money' ? formatNumber(v) : v);
  const columns: Column<Record<string, Value> & { __key: string }>[] =
    r?.columns.map((c) => {
      const numeric = isNumber(c.key);
      return { key: c.key, header: label(c), numeric, cell: (row) => cell(row[c.key] ?? null, c.type) };
    }) ?? [];
  // A total row for every numeric column, except identifiers like years and months.
  const totals = r && r.rows.length > 1 ? r.columns.filter((c) => isNumber(c.key) && !/year|month/i.test(c.key)) : [];
  const rows = r?.rows.map((row, i) => ({ ...row, __key: String(i) }));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted-foreground print:hidden">{t(`descriptions.${name}`)}</p>
      {/* Printed pages show what the screen filters chose, because the filter controls themselves are hidden. */}
      <div className="hidden print:block">
        <h2 className="text-h2">{r ? (locale === 'lo' ? r.title.lo : r.title.en) : t(`tabs.${name}`)}</h2>
        <p className="text-body-sm">
          {[
            companyWide ? (departments.data?.find((d) => d.id === values.departmentId)?.name ?? t('printAll')) : null,
            name === 'attendance' ? t('printPeriod', { from: formatDate(`${from}T00:00:00+07:00`), to: formatDate(`${to}T00:00:00+07:00`) }) : null,
            name === 'leave' || name === 'payroll' ? t('printYear', { year }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="text-caption">{t('printedOn', { date: formatDate(new Date()) })}</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          {companyWide && (
            <FormField label={t('filters.department')} className="w-full sm:w-52">
              {(a) => (
                <Select {...a} value={values.departmentId} onChange={(e) => set({ departmentId: e.target.value })}>
                  <option value="">{t('filters.allDepartments')}</option>
                  {departments.data?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          )}
          {name === 'attendance' && (
            <>
              <FormField label={t('filters.from')} className="w-full sm:w-44">
                {(a) => <Input {...a} type="date" value={from} max={to} onChange={(e) => set({ from: e.target.value })} />}
              </FormField>
              <FormField label={t('filters.to')} className="w-full sm:w-44" error={tooLong ? t('rangeTooLong') : undefined}>
                {(a) => <Input {...a} type="date" value={to} min={from} max={addDays(from, 366)} onChange={(e) => set({ to: e.target.value })} />}
              </FormField>
            </>
          )}
          {(name === 'leave' || name === 'payroll') && (
            <FormField label={t('filters.year')} className="w-full sm:w-32">
              {(a) => (
                <Select {...a} value={year} onChange={(e) => set({ year: e.target.value })}>
                  {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2, thisYear - 3].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()} disabled={tooLong || !r?.rows.length} aria-label={t('print')}>
            <Printer aria-hidden="true" />
            {t('print')}
          </Button>
          {can(user, 'report:export') && (
            <>
              <Button variant="secondary" onClick={() => void onExport('xlsx')} loading={exporting === 'xlsx'} disabled={tooLong || Boolean(exporting)} aria-label={t('exportLabel', { format: 'Excel' })}>
                <FileSpreadsheet aria-hidden="true" />
                {t('exportExcel')}
              </Button>
              <Button variant="secondary" onClick={() => void onExport('csv')} loading={exporting === 'csv'} disabled={tooLong || Boolean(exporting)} aria-label={t('exportLabel', { format: 'CSV' })}>
                <FileText aria-hidden="true" />
                {t('exportCsv')}
              </Button>
            </>
          )}
        </div>
      </div>
      {query.isError && <Alert>{`${t('loadError')} ${errorMessage(query.error)}`}</Alert>}
      <DataTable
        caption={r ? (locale === 'lo' ? r.title.lo : r.title.en) : t(`tabs.${name}`)}
        columns={columns.length ? columns : [{ key: 'x', header: '', cell: () => null }]}
        rows={tooLong ? [] : rows}
        rowKey={(row) => row.__key}
        loading={!tooLong && (query.isPending || (query.isFetching && !r))}
        empty={<EmptyState icon={TableProperties} title={t('empty')} />}
        footer={
          r &&
          rows &&
          rows.length > 0 && (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <span>{t('rows', { count: formatNumber(rows.length) })}</span>
              {totals.length > 0 && (
                <dl className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <span className="font-semibold text-foreground">{t('total')}</span>
                  {totals.map((c) => (
                    <div key={c.key} className="flex gap-1.5">
                      <dt>{label(c)}:</dt>
                      <dd className="font-semibold text-foreground tabular">{formatNumber(r.rows.reduce((s, row) => s + Number(row[c.key] ?? 0), 0))}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )
        }
      />
    </div>
  );
}
