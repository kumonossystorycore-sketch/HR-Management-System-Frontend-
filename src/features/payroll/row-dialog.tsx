'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-provider';
import { can } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { http } from '@/lib/api-client';
import { formatMoney, formatNumber, formatPeriod } from '@/lib/format';
import { ITEM_TYPES, PAYROLL_TONE, type Payroll, type PayrollItemType } from './types';

const MONEY = /^\d{1,13}(\.\d{1,2})?$/;
const HOURS = /^\d{1,4}(\.\d{1,2})?$/;

/** One employee's pay for the month. Editable only while DRAFT, by holders of payroll:manage. */
export function RowDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations('payroll');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['payroll', 'row', id], queryFn: async () => (await http.get<Payroll>(`/payroll/${id}`)).data });
  const p = query.data;
  const editable = p?.status === 'DRAFT' && can(user, 'payroll:manage');
  const money = (v: string | number) => formatMoney(v, p?.currency ?? 'LAK', locale);
  const [error, setError] = useState<string | null>(null);
  const [basic, setBasic] = useState<string | null>(null);
  const [item, setItem] = useState<{ type: PayrollItemType; label: string; amount: string; hours: string }>({ type: 'ALLOWANCE', label: '', amount: '', hours: '' });
  const [itemError, setItemError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const after = async (updated?: Payroll) => {
    if (updated) qc.setQueryData(['payroll', 'row', id], updated);
    await qc.invalidateQueries({ queryKey: ['payroll'], predicate: (q) => q.queryKey[1] !== 'row' });
    setError(null);
  };
  const run = useMutation({
    mutationFn: (fn: () => Promise<Payroll | undefined>) => fn(),
    onSuccess: async (updated) => {
      await after(updated);
      toast.success(t('row.saved'));
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const saveBasic = () => {
    if (basic === null || !MONEY.test(basic.trim())) return setError(tc('fieldErrors.invalid'));
    run.mutate(async () => {
      const res = (await http.put<Payroll>(`/payroll/${id}`, { basicSalary: basic.trim() })).data;
      setBasic(null);
      return res;
    });
  };

  const addItem = (e: FormEvent) => {
    e.preventDefault();
    setItemError(null);
    const amount = item.amount.trim();
    const hours = item.hours.trim();
    if (!item.label.trim()) return setItemError(t('row.label'));
    if (amount && !MONEY.test(amount)) return setItemError(tc('fieldErrors.invalid'));
    if (hours && (item.type !== 'OVERTIME' || !HOURS.test(hours) || Number(hours) <= 0)) return setItemError(tc('fieldErrors.invalid'));
    if (!amount && !(item.type === 'OVERTIME' && hours)) return setItemError(t('row.needAmount'));
    run.mutate(async () => {
      const res = (await http.post<Payroll>(`/payroll/${id}/items`, { type: item.type, label: item.label.trim(), ...(amount ? { amount } : {}), ...(hours ? { hours } : {}) })).data;
      setItem({ type: item.type, label: '', amount: '', hours: '' });
      return res;
    });
  };

  const removeRow = useMutation({
    mutationFn: () => http.delete(`/payroll/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['payroll'] });
      toast.success(t('row.removeRowDone'));
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const who = p ? `${p.employee.firstName} ${p.employee.lastName}` : '';
  const sign = (type: PayrollItemType) => (type === 'DEDUCTION' ? '−' : '+');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={p ? t('row.title', { name: who, period: formatPeriod(p.periodYear, p.periodMonth) }) : '…'} className="max-w-[640px]">
      {!p ? (
        query.isError ? <Alert>{errorMessage(query.error)}</Alert> : <Skeleton className="h-64" />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-body-sm text-muted-foreground">
              {p.employee.employeeCode} · {p.employee.position.title} · {p.employee.department.name}
            </p>
            <StatusBadge tone={PAYROLL_TONE[p.status]}>{t(`status.${p.status}`)}</StatusBadge>
          </div>
          {error && <Alert>{error}</Alert>}
          {!editable && p.status !== 'DRAFT' && <Alert tone="info">{t('row.locked')}</Alert>}

          {editable ? (
            <div className="flex flex-wrap items-end gap-2">
              <FormField label={t('row.basic')} hint={t('row.basicHint')} className="min-w-0 flex-1">
                {(a) => <Input {...a} inputMode="decimal" className="tabular" value={basic ?? String(Number(p.basicSalary))} onChange={(e) => setBasic(e.target.value)} />}
              </FormField>
              <Button variant="secondary" onClick={saveBasic} disabled={basic === null || run.isPending} className="mb-6">
                {t('row.saveBasic')}
              </Button>
            </div>
          ) : (
            <div className="flex justify-between gap-3 text-body-sm">
              <span>{t('row.basic')}</span>
              <span className="tabular">{money(p.basicSalary)}</span>
            </div>
          )}

          <section aria-labelledby={`items-${id}`} className="flex flex-col gap-2">
            <h3 id={`items-${id}`} className="text-label text-muted-foreground">
              {t('row.items')}
            </h3>
            {p.items.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{t('row.noItems')}</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {p.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-body-sm">{it.label}</span>
                      <span className="block text-caption text-muted-foreground">
                        {t(`itemType.${it.type}`)}
                        {it.hours && ` · ${t('row.hoursValue', { hours: formatNumber(it.hours) })}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className={`tabular text-body-sm ${it.type === 'DEDUCTION' ? 'text-danger-text' : ''}`}>
                        {sign(it.type)}
                        {formatNumber(it.amount)}
                      </span>
                      {editable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={run.isPending}
                          onClick={() => run.mutate(async () => (await http.delete<Payroll>(`/payroll/${id}/items/${it.id}`)).data)}
                          aria-label={t('row.removeOf', { label: it.label })}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {editable && (
            <form onSubmit={addItem} noValidate className="flex flex-col gap-3 rounded-md bg-background p-3">
              <p className="text-label">{t('row.addItem')}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label={t('row.type')}>
                  {(a) => (
                    <Select {...a} value={item.type} onChange={(e) => setItem({ ...item, type: e.target.value as PayrollItemType, hours: '' })}>
                      {ITEM_TYPES.map((x) => (
                        <option key={x} value={x}>
                          {t(`itemType.${x}`)}
                        </option>
                      ))}
                    </Select>
                  )}
                </FormField>
                <FormField label={t('row.label')}>
                  {(a) => <Input {...a} placeholder={t('row.labelPlaceholder')} maxLength={150} value={item.label} onChange={(e) => setItem({ ...item, label: e.target.value })} />}
                </FormField>
                <FormField label={t('row.amount')}>
                  {(a) => <Input {...a} inputMode="decimal" className="tabular" value={item.amount} onChange={(e) => setItem({ ...item, amount: e.target.value })} />}
                </FormField>
                {item.type === 'OVERTIME' && (
                  <FormField label={t('row.hours')}>
                    {(a) => <Input {...a} inputMode="decimal" className="tabular" value={item.hours} onChange={(e) => setItem({ ...item, hours: e.target.value })} />}
                  </FormField>
                )}
              </div>
              {item.type === 'OVERTIME' && <p className="text-caption text-muted-foreground">{t('row.hoursHint')}</p>}
              {itemError && (
                <p role="alert" className="text-caption text-danger-text">
                  {itemError}
                </p>
              )}
              <Button type="submit" variant="secondary" size="sm" className="self-start" loading={run.isPending}>
                <Plus aria-hidden="true" />
                {t('row.add')}
              </Button>
            </form>
          )}

          <dl className="flex flex-col gap-1 border-t border-border pt-3 text-body-sm">
            {(
              [
                [t('columns.allowances'), p.totalAllowances, '+'],
                [t('columns.overtime'), p.totalOvertime, '+'],
                [t('columns.deductions'), p.totalDeductions, '−'],
              ] as const
            ).map(([k, v, s]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="tabular">
                  {Number(v) ? s : ''}
                  {formatNumber(v)}
                </dd>
              </div>
            ))}
            <div className="mt-1 flex justify-between gap-3 text-h3">
              <dt>{t('row.net')}</dt>
              <dd className="tabular">{money(p.netSalary)}</dd>
            </div>
          </dl>

          {editable && (
            <div className="flex justify-start border-t border-border pt-3">
              {confirmRemove ? (
                <div className="flex flex-col gap-2">
                  <p className="text-body-sm">{t('row.removeRowTitle', { name: who, period: formatPeriod(p.periodYear, p.periodMonth) })}</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setConfirmRemove(false)}>
                      {tc('cancel')}
                    </Button>
                    <Button variant="danger" size="sm" loading={removeRow.isPending} onClick={() => removeRow.mutate()}>
                      {t('row.removeRow')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>
                  <Trash2 aria-hidden="true" />
                  {t('row.removeRow')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
