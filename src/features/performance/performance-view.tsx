'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus, RefreshCcw, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { Pagination } from '@/components/ui/pagination';
import { PersonCell } from '@/components/ui/person-cell';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/auth-provider';
import { can, scopeOf } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { formatDate, formatNumber, localDay } from '@/lib/format';
import { useDepartmentOptions, useEmployeeOptions } from '@/lib/queries';
import { ReviewDialog } from './review-dialog';
import { REVIEW_STATUSES, REVIEW_TONE, personName, type Review } from './types';

const PAGE_SIZE = 20;
// `mine` matches the links in notifications (/performance?mine=toReview).
const KEYS = ['mine', 'search', 'status', 'year', 'departmentId'] as const;
type View = 'aboutMe' | 'toReview' | 'all';

/** FR-PRF-01..04: reviews of me, reviews I write, and (managers, HR) everyone's. */
export function PerformanceView() {
  const t = useTranslations('performance');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { values, set } = useListParams(KEYS);
  const [openId, setOpenId] = useState<string | null>(null);
  const readScope = scopeOf(user, 'performance:read');
  const views: View[] = [
    ...(user?.employee && readScope ? (['aboutMe'] as const) : []),
    ...(can(user, 'performance:review') && user?.employee ? (['toReview'] as const) : []),
    ...(readScope === 'DEPARTMENT' || readScope === 'ALL' ? (['all'] as const) : []),
  ];
  const view: View = views.includes(values.mine as View) ? (values.mine as View) : (views[0] ?? 'aboutMe');

  return (
    <>
      <PageHeader title={t('title')} crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]} />
      {views.length > 1 ? (
        <Tabs value={view} onValueChange={(v) => set({ mine: v === views[0] ? null : v, search: null, status: null, year: null, departmentId: null })}>
          <TabsList aria-label={t('title')}>
            {views.map((v) => (
              <TabsTrigger key={v} value={v}>
                {t(`tabs.${v}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {views.map((v) => (
            <TabsContent key={v} value={v}>
              {v === view && <ReviewList view={v} onOpen={setOpenId} />}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <ReviewList view={view} onOpen={setOpenId} />
      )}
      {openId && <ReviewDialog key={openId} id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function ReviewList({ view, onOpen }: { view: View; onOpen: (id: string) => void }) {
  const t = useTranslations('performance');
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const { values, page, set } = useListParams(KEYS);
  const [dialog, setDialog] = useState<'cycle' | 'create' | null>(null);
  const companyWide = scopeOf(user, 'performance:read') === 'ALL';
  const departments = useDepartmentOptions(view === 'all' && companyWide);
  const thisYear = Number(localDay().slice(0, 4));

  const query = useQuery({
    queryKey: ['performance', view, values.search, values.status, values.year, values.departmentId, page],
    queryFn: () =>
      http.get<Review[]>('/reviews', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          sort: 'periodStart:desc',
          ...(view === 'all' ? {} : { mine: view }),
          ...(view === 'all'
            ? { search: values.search || undefined, status: values.status || undefined, year: values.year || undefined, departmentId: values.departmentId || undefined }
            : {}),
        },
      }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<Review>[] = [
    ...(view !== 'aboutMe'
      ? [{ key: 'employee', header: t('columns.employee'), cell: (r: Review) => <PersonCell name={personName(r.employee)} meta={r.employee.employeeCode} /> }]
      : []),
    ...(view !== 'toReview' ? [{ key: 'reviewer', header: t('columns.reviewer'), cell: (r: Review) => personName(r.reviewer) }] : []),
    { key: 'period', header: t('columns.period'), cell: (r) => <span className="tabular whitespace-nowrap">{`${formatDate(r.periodStart)} – ${formatDate(r.periodEnd)}`}</span> },
    { key: 'score', header: t('columns.score'), numeric: true, cell: (r) => (r.overallScore ? t('outOf', { score: formatNumber(r.overallScore) }) : t('noScore')) },
    { key: 'status', header: t('columns.status'), cell: (r) => <StatusBadge tone={REVIEW_TONE[r.status]}>{t(`status.${r.status}`)}</StatusBadge> },
    {
      key: 'actions',
      header: <span className="sr-only">{t('columns.actions')}</span>,
      align: 'end',
      cell: (r) => {
        const write = view === 'toReview' && r.status === 'DRAFT';
        return (
          <Button variant={write ? 'primary' : 'secondary'} size="sm" onClick={() => onOpen(r.id)} aria-label={write ? t('writeOf', { name: personName(r.employee) }) : t('openOf', { name: personName(r.employee) })}>
            {write ? t('write') : t('open')}
          </Button>
        );
      },
    },
  ];

  const empty =
    view === 'aboutMe' ? (
      <EmptyState icon={Star} title={t('empty.aboutMe')} description={t('empty.aboutMeText')} />
    ) : (
      <EmptyState icon={ClipboardCheck} title={view === 'toReview' ? t('empty.toReview') : t('empty.all')} />
    );

  return (
    <div className="flex flex-col gap-4">
      {view === 'all' && can(user, 'performance:manage') && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog('create')}>
            <Plus aria-hidden="true" />
            {t('create.action')}
          </Button>
          <Button onClick={() => setDialog('cycle')}>
            <RefreshCcw aria-hidden="true" />
            {t('cycle.action')}
          </Button>
        </div>
      )}
      {query.isError && <Alert>{`${t('loadError')} ${errorMessage(query.error)}`}</Alert>}
      <DataTable
        caption={`${t('caption')} · ${t(`tabs.${view}`)}`}
        columns={columns}
        rows={query.data?.data}
        rowKey={(r) => r.id}
        loading={query.isPending}
        empty={empty}
        toolbar={
          view === 'all' && (
            <>
              <SearchInput value={values.search} onChange={(v) => set({ search: v })} placeholder={t('filters.searchPlaceholder')} label={t('filters.searchLabel')} className="w-full sm:w-56" />
              <Select aria-label={t('filters.status')} value={values.status} onChange={(e) => set({ status: e.target.value })} className="w-full sm:w-40">
                <option value="">{t('filters.allStatuses')}</option>
                {REVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </Select>
              <Select aria-label={t('filters.year')} value={values.year} onChange={(e) => set({ year: e.target.value })} className="w-full sm:w-32">
                <option value="">{t('filters.allYears')}</option>
                {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
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
            </>
          )
        }
        mobileItem={(r) => (
          <button type="button" onClick={() => onOpen(r.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-background">
            <span className="min-w-0">
              <span className="block font-semibold">{view === 'aboutMe' ? personName(r.reviewer) : personName(r.employee)}</span>
              <span className="block text-caption text-muted-foreground tabular">
                {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                {r.overallScore && ` · ${t('outOf', { score: formatNumber(r.overallScore) })}`}
              </span>
            </span>
            <StatusBadge tone={REVIEW_TONE[r.status]}>{t(`status.${r.status}`)}</StatusBadge>
          </button>
        )}
        footer={query.data?.meta && query.data.meta.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={(p) => set({ page: p })} />}
      />
      {dialog === 'cycle' && <CycleDialog onClose={() => setDialog(null)} />}
      {dialog === 'create' && <CreateReviewDialog onClose={() => setDialog(null)} />}
    </div>
  );
}

/** Half-year default: January–June or July–December, whichever we are in. */
const defaultPeriod = () => {
  const today = localDay();
  const year = today.slice(0, 4);
  return Number(today.slice(5, 7)) <= 6 ? { start: `${year}-01-01`, end: `${year}-06-30` } : { start: `${year}-07-01`, end: `${year}-12-31` };
};

function CycleDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('performance');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const departments = useDepartmentOptions();
  const [period, setPeriod] = useState(defaultPeriod);
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () =>
      (
        await http.post<{ created: number; alreadyExisting: number; skipped: unknown[] }>('/reviews/cycle', {
          periodStart: period.start,
          periodEnd: period.end,
          ...(departmentId ? { departmentIds: [departmentId] } : {}),
        })
      ).data,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['performance'] });
      toast.success(t('cycle.done', { created: formatNumber(res.created), existing: formatNumber(res.alreadyExisting) }));
      if (res.skipped.length) toast.info(t('cycle.skipped', { count: res.skipped.length }), { duration: 10_000 });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('cycle.title')}
      description={t('cycle.description')}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!period.start || !period.end || period.start > period.end}>
            {t('cycle.confirm')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('cycle.start')} required>
            {(a) => <Input {...a} type="date" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} />}
          </FormField>
          <FormField label={t('cycle.end')} required>
            {(a) => <Input {...a} type="date" min={period.start} value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} />}
          </FormField>
        </div>
        <FormField label={t('cycle.department')}>
          {(a) => (
            <Select {...a} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">{t('cycle.allDepartments')}</option>
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

function CreateReviewDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('performance');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const employees = useEmployeeOptions();
  const [period, setPeriod] = useState(defaultPeriod);
  const [employeeId, setEmployeeId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const same = Boolean(employeeId && employeeId === reviewerId);
  const mutation = useMutation({
    mutationFn: () => http.post('/reviews', { employeeId, reviewerId, periodStart: period.start, periodEnd: period.end }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['performance'] });
      toast.success(t('create.done'));
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const options = employees.data?.map((e) => (
    <option key={e.id} value={e.id}>
      {e.firstName} {e.lastName} · {e.department.name}
    </option>
  ));
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('create.title')}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!employeeId || !reviewerId || same || period.start > period.end}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <FormField label={t('create.employee')} required>
          {(a) => (
            <Select {...a} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">—</option>
              {options}
            </Select>
          )}
        </FormField>
        <FormField label={t('create.reviewer')} required error={same ? t('create.sameperson') : undefined}>
          {(a) => (
            <Select {...a} value={reviewerId} onChange={(e) => setReviewerId(e.target.value)}>
              <option value="">—</option>
              {options}
            </Select>
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('create.start')} required>
            {(a) => <Input {...a} type="date" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} />}
          </FormField>
          <FormField label={t('create.end')} required>
            {(a) => <Input {...a} type="date" min={period.start} value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} />}
          </FormField>
        </div>
      </div>
    </Dialog>
  );
}
