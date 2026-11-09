'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Pencil, Plus, SearchX, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { PersonCell } from '@/components/ui/person-cell';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/auth-provider';
import { can, scopeOf } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { Link } from '@/i18n/navigation';
import { http } from '@/lib/api-client';
import { downloadFile } from '@/lib/download';
import { formatDate, formatNumber } from '@/lib/format';
import { useDepartmentOptions } from '@/lib/queries';
import { EMPLOYMENT_STATUSES, fullName, STATUS_TONE, type Employee } from './types';

const PAGE_SIZE = 20;
const KEYS = ['search', 'departmentId', 'employmentStatus', 'includeArchived'] as const;

/** FR-EMP-01: the employee list, with search and filters kept in the URL. */
export function EmployeeList() {
  const t = useTranslations('employees');
  const tc = useTranslations('common');
  const ts = useTranslations('common.employmentStatus');
  const locale = useLocale();
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(KEYS);
  const [exporting, setExporting] = useState(false);

  const companyWide = scopeOf(user, 'employee:read') === 'ALL';
  const departments = useDepartmentOptions(companyWide);
  const filtered = Boolean(values.search || values.departmentId || values.employmentStatus);

  const query = useQuery({
    queryKey: ['employees', 'list', values, page],
    queryFn: () =>
      http.get<Employee[]>('/employees', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          sort: 'employeeCode:asc',
          search: values.search || undefined,
          departmentId: values.departmentId || undefined,
          employmentStatus: values.employmentStatus || undefined,
          includeArchived: values.includeArchived === 'true' ? 'true' : undefined,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const counts = (query.data?.meta?.statusCounts ?? {}) as Partial<Record<string, number>>;
  const active = (counts.ACTIVE ?? 0) + (counts.PROBATION ?? 0);
  const inactive = (counts.RESIGNED ?? 0) + (counts.TERMINATED ?? 0);

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadFile('/employees/export', { format: 'xlsx', lang: locale, departmentId: values.departmentId || undefined, employmentStatus: values.employmentStatus || undefined }, 'employees.xlsx');
    } catch {
      toast.error(tc('feedback.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<Employee>[] = [
    {
      key: 'employee',
      header: t('columns.employee'),
      cell: (e) => (
        <Link href={`/employees/${e.id}`} className="block rounded-md hover:[&_.font-semibold]:text-deep-teal hover:[&_.font-semibold]:underline">
          <PersonCell name={fullName(e)} meta={e.employeeCode} employeeId={e.id} photoFileId={e.photoFileId} />
        </Link>
      ),
    },
    { key: 'department', header: t('columns.department'), cell: (e) => e.department.name },
    { key: 'position', header: t('columns.position'), cell: (e) => e.position.title },
    { key: 'hireDate', header: t('columns.hireDate'), numeric: true, cell: (e) => formatDate(e.hireDate) },
    {
      key: 'status',
      header: t('columns.status'),
      cell: (e) => (
        <span className="flex flex-wrap gap-1">
          <StatusBadge tone={STATUS_TONE[e.employmentStatus]}>{ts(e.employmentStatus)}</StatusBadge>
          {e.archivedAt && <StatusBadge>{t('archivedBadge')}</StatusBadge>}
        </span>
      ),
    },
    ...(can(user, 'employee:update')
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">{t('columns.actions')}</span>,
            align: 'end' as const,
            cell: (e: Employee) =>
              e.archivedAt ? null : (
                <Button asChild variant="ghost" size="icon" aria-label={t('editOf', { name: fullName(e) })}>
                  <Link href={`/employees/${e.id}/edit`}>
                    <Pencil aria-hidden="true" />
                  </Link>
                </Button>
              ),
          },
        ]
      : []),
  ];

  const empty = filtered ? (
    <EmptyState
      icon={SearchX}
      title={t('empty.filteredTitle')}
      description={t('empty.filteredText')}
      action={
        <Button variant="secondary" onClick={() => set({ search: null, departmentId: null, employmentStatus: null })}>
          {t('empty.clear')}
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Users}
      title={t('empty.title')}
      description={t('empty.text')}
      action={
        can(user, 'employee:create') && (
          <Button asChild>
            <Link href="/employees/new">
              <Plus aria-hidden="true" />
              {t('add')}
            </Link>
          </Button>
        )
      }
    />
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]}
        description={query.data ? t('summary', { total: formatNumber(active + inactive), active: formatNumber(active), inactive: formatNumber(inactive) }) : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            {can(user, 'employee:export') && (
              <Button variant="secondary" onClick={() => void onExport()} loading={exporting}>
                <Download aria-hidden="true" />
                {t('export')}
              </Button>
            )}
            {can(user, 'employee:create') && (
              <Button asChild>
                <Link href="/employees/new">
                  <Plus aria-hidden="true" />
                  {t('add')}
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {query.isError && (
        <Alert className="mb-6">
          {t('loadError')} {errorMessage(query.error)}{' '}
          <button type="button" onClick={() => void query.refetch()} className="font-semibold underline underline-offset-4">
            {tc('retry')}
          </button>
        </Alert>
      )}

      <DataTable
        caption={t('tableCaption')}
        columns={columns}
        rows={query.data?.data}
        rowKey={(e) => e.id}
        loading={query.isPending}
        empty={empty}
        toolbar={
          <>
            <SearchInput value={values.search} onChange={(v) => set({ search: v })} placeholder={t('searchPlaceholder')} label={t('searchLabel')} className="w-full sm:w-80" />
            {companyWide && (
              <Select aria-label={t('filters.department')} value={values.departmentId} onChange={(e) => set({ departmentId: e.target.value })} className="w-full sm:w-52">
                <option value="">{t('filters.allDepartments')}</option>
                {departments.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
            <Select aria-label={t('filters.status')} value={values.employmentStatus} onChange={(e) => set({ employmentStatus: e.target.value })} className="w-full sm:w-44">
              <option value="">{t('filters.allStatuses')}</option>
              {EMPLOYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ts(s)}
                </option>
              ))}
            </Select>
            {companyWide && (
              <Checkbox
                label={t('filters.includeArchived')}
                checked={values.includeArchived === 'true'}
                onChange={(e) => set({ includeArchived: e.target.checked ? 'true' : null })}
                className="self-center"
              />
            )}
          </>
        }
        mobileItem={(e) => (
          <Link href={`/employees/${e.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-background">
            <PersonCell name={fullName(e)} meta={`${e.employeeCode} · ${e.position.title}`} employeeId={e.id} photoFileId={e.photoFileId} />
            <StatusBadge tone={e.archivedAt ? 'neutral' : STATUS_TONE[e.employmentStatus]}>{e.archivedAt ? t('archivedBadge') : ts(e.employmentStatus)}</StatusBadge>
          </Link>
        )}
        footer={query.data?.meta && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
    </>
  );
}
