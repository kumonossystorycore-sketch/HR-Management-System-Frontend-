'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/auth-provider';
import { can } from '@/features/auth/permissions';
import { useErrorMessage } from '@/features/auth/use-messages';
import { useListParams } from '@/hooks/use-list-params';
import { http } from '@/lib/api-client';
import { AuditLogPanel } from './audit-log';
import { LogoField, type LogoFile } from './logo-field';
import { HolidaysPanel } from './holidays';

/** GET /settings */
interface Settings {
  name: string;
  logoUrl: string | null;
  logoFile: LogoFile | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  workDays: number[];
  workStart: string;
  workEnd: string;
  breakMinutes: number;
  lateGraceMinutes: number;
  halfDayThresholdMinutes: number;
  currency: string;
  defaultLocale: 'lo' | 'en';
  leavePolicy: { annualDays: number; maxCarryOverDays: number; annualLeaveDuringProbation: boolean };
  payrollPolicy: { overtimeMultiplier: number; standardMonthlyHours: number; payOn?: string };
  notificationSettings: { inApp?: Partial<Record<NotificationKey, boolean>> } | null;
}

/** Every in-app notification the API sends, grouped by module (backend constants/notifications.ts). */
const NOTIFICATION_GROUPS = {
  leave: ['leave.requested', 'leave.approved', 'leave.rejected', 'leave.cancelled'],
  payroll: ['payroll.submitted', 'payroll.returned', 'payroll.payslipReady'],
  recruitment: ['recruitment.interviewAssigned'],
  performance: ['performance.cycleOpened', 'performance.assigned', 'performance.submitted', 'performance.acknowledged'],
} as const;
type NotificationKey = (typeof NOTIFICATION_GROUPS)[keyof typeof NOTIFICATION_GROUPS][number];

const KEYS = ['view', 'year', 'entity', 'action', 'from', 'to'] as const;
type View = 'company' | 'work' | 'policies' | 'notifications' | 'holidays' | 'audit';

/** FR-SET-01..03: company details, working time, policies, holidays and (Super Admin) the audit log. */
export function SettingsView() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { values, set } = useListParams(KEYS);
  const views: View[] = ['company', 'work', 'policies', 'notifications', 'holidays', ...(can(user, 'audit:read') ? (['audit'] as const) : [])];
  const view: View = views.includes(values.view as View) ? (values.view as View) : 'company';
  const editable = can(user, 'setting:update');
  const settings = useQuery({ queryKey: ['settings'], queryFn: async () => (await http.get<Settings>('/settings')).data });

  const panel = (v: View) => {
    if (v === 'holidays') return <HolidaysPanel editable={editable} />;
    if (v === 'audit') return <AuditLogPanel />;
    if (!settings.data) return settings.isError ? <Alert>{t('loadError')}</Alert> : <Skeleton className="h-96" />;
    return <SettingsForm key={`${v}-${settings.dataUpdatedAt}`} view={v} settings={settings.data} editable={editable} />;
  };

  return (
    <>
      <PageHeader title={t('title')} crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]} />
      {!editable && (
        <Alert tone="info" className="mb-4">
          {t('readOnly')}
        </Alert>
      )}
      <Tabs value={view} onValueChange={(v) => set({ view: v === 'company' ? null : v, year: null, entity: null, action: null, from: null, to: null })}>
        <TabsList aria-label={t('title')}>
          {views.map((v) => (
            <TabsTrigger key={v} value={v}>
              {t(`tabs.${v}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {views.map((v) => (
          <TabsContent key={v} value={v}>
            {v === view && panel(v)}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      {title && <h2 className="text-h3">{title}</h2>}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

/** One tab of the settings form. Only the fields of that tab are sent. */
function SettingsForm({ view, settings, editable }: { view: 'company' | 'work' | 'policies' | 'notifications'; settings: Settings; editable: boolean }) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const errorMessage = useErrorMessage();
  const qc = useQueryClient();
  const [s, setS] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const patch = (p: Partial<Settings>) => setS((x) => ({ ...x, ...p }));
  const num = (v: string) => (v === '' ? Number.NaN : Number(v));
  const shown = (n: number) => (Number.isNaN(n) ? '' : n);

  const body = (): Record<string, unknown> | null => {
    const bad = new Set<string>();
    const check = (key: string, ok: boolean) => !ok && bad.add(key);
    if (view === 'company') {
      check('name', s.name.trim().length >= 2);
      check('email', !s.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email));
      check('phone', !s.phone || /^\+?[\d\s-]{6,30}$/.test(s.phone));
    }
    if (view === 'work') {
      check('workDays', s.workDays.length > 0);
      check('workEnd', s.workStart < s.workEnd);
      check('breakMinutes', Number.isInteger(s.breakMinutes) && s.breakMinutes >= 0 && s.breakMinutes <= 240);
      check('lateGraceMinutes', Number.isInteger(s.lateGraceMinutes) && s.lateGraceMinutes >= 0 && s.lateGraceMinutes <= 120);
      check('halfDayThresholdMinutes', Number.isInteger(s.halfDayThresholdMinutes) && s.halfDayThresholdMinutes >= 30 && s.halfDayThresholdMinutes <= 720);
    }
    if (view === 'policies') {
      check('annualDays', s.leavePolicy.annualDays >= 0 && s.leavePolicy.annualDays <= 366);
      check('maxCarryOverDays', s.leavePolicy.maxCarryOverDays >= 0 && s.leavePolicy.maxCarryOverDays <= 366);
      check('overtimeMultiplier', s.payrollPolicy.overtimeMultiplier >= 1 && s.payrollPolicy.overtimeMultiplier <= 5);
      check('standardMonthlyHours', s.payrollPolicy.standardMonthlyHours >= 1 && s.payrollPolicy.standardMonthlyHours <= 744);
      check('currency', /^[A-Za-z]{3}$/.test(s.currency));
    }
    setInvalid(bad);
    if (bad.size) return null;
    if (view === 'company') return { name: s.name.trim(), address: s.address ?? '', phone: s.phone || null, email: s.email || null };
    if (view === 'notifications') return { notificationSettings: { inApp: Object.fromEntries(Object.values(NOTIFICATION_GROUPS).flat().map((k) => [k, isOn(k)])) } };
    if (view === 'work')
      return { workDays: [...s.workDays].sort(), workStart: s.workStart, workEnd: s.workEnd, breakMinutes: s.breakMinutes, lateGraceMinutes: s.lateGraceMinutes, halfDayThresholdMinutes: s.halfDayThresholdMinutes };
    return { leavePolicy: s.leavePolicy, payrollPolicy: s.payrollPolicy, currency: s.currency.toUpperCase(), defaultLocale: s.defaultLocale };
  };

  const mutation = useMutation({
    mutationFn: (b: Record<string, unknown>) => http.put<Settings>('/settings', b),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['settings'] });
      await qc.invalidateQueries({ queryKey: ['attendance', 'today'] });
      toast.success(t('saved'));
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const err = (key: string) => (invalid.has(key) ? tc('fieldErrors.invalid') : undefined);
  const isOn = (k: NotificationKey) => s.notificationSettings?.inApp?.[k] !== false;
  const toggle = (k: NotificationKey, on: boolean) => patch({ notificationSettings: { inApp: { ...s.notificationSettings?.inApp, [k]: on } } });
  const save = () => {
    setError(null);
    const b = body();
    if (b) mutation.mutate(b);
  };

  return (
    <Card className="flex flex-col gap-6">
      {view === 'company' && <LogoField logoFile={settings.logoFile} editable={editable} />}
      <fieldset disabled={!editable || mutation.isPending} className="flex flex-col gap-6">
        {error && <Alert>{error}</Alert>}
        {view === 'company' && (
          <Section>
            <p className="text-body-sm text-muted-foreground md:col-span-2">{t('company.hint')}</p>
            <FormField label={t('company.name')} required error={err('name')} className="md:col-span-2">
              {(a) => <Input {...a} value={s.name} onChange={(e) => patch({ name: e.target.value })} />}
            </FormField>
            <FormField label={t('company.address')} className="md:col-span-2">
              {(a) => <Textarea {...a} rows={2} value={s.address ?? ''} onChange={(e) => patch({ address: e.target.value })} />}
            </FormField>
            <FormField label={t('company.phone')} error={err('phone')}>
              {(a) => <Input {...a} type="tel" value={s.phone ?? ''} onChange={(e) => patch({ phone: e.target.value })} />}
            </FormField>
            <FormField label={t('company.email')} error={err('email')}>
              {(a) => <Input {...a} type="email" value={s.email ?? ''} onChange={(e) => patch({ email: e.target.value })} />}
            </FormField>
          </Section>
        )}
        {view === 'notifications' && (
          <div className="flex flex-col gap-6">
            <p className="text-body-sm text-muted-foreground">{t('notifications.hint')}</p>
            {(Object.keys(NOTIFICATION_GROUPS) as Array<keyof typeof NOTIFICATION_GROUPS>).map((group) => (
              <fieldset key={group} className="flex flex-col gap-3">
                <legend className="mb-2 text-h3">{t(`notifications.groups.${group}`)}</legend>
                {NOTIFICATION_GROUPS[group].map((k) => (
                  <Checkbox key={k} label={t(`notifications.events.${k}`)} hint={t(`notifications.to.${k}`)} checked={isOn(k)} onChange={(e) => toggle(k, e.target.checked)} />
                ))}
              </fieldset>
            ))}
          </div>
        )}
        {view === 'work' && (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-label">{t('work.days')}</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <Checkbox
                    key={d}
                    label={t(`work.weekdays.${d as 1}`)}
                    checked={s.workDays.includes(d)}
                    onChange={(e) => patch({ workDays: e.target.checked ? [...s.workDays, d] : s.workDays.filter((x) => x !== d) })}
                  />
                ))}
              </div>
              {invalid.has('workDays') && <p className="text-caption text-danger-text">{tc('fieldErrors.invalid')}</p>}
            </fieldset>
            <Section>
              <FormField label={t('work.start')} required>
                {(a) => <Input {...a} type="time" className="tabular" value={s.workStart} onChange={(e) => patch({ workStart: e.target.value })} />}
              </FormField>
              <FormField label={t('work.end')} required error={err('workEnd')}>
                {(a) => <Input {...a} type="time" className="tabular" value={s.workEnd} onChange={(e) => patch({ workEnd: e.target.value })} />}
              </FormField>
              <FormField label={t('work.break')} error={err('breakMinutes')}>
                {(a) => <Input {...a} type="number" min={0} max={240} className="tabular" value={shown(s.breakMinutes)} onChange={(e) => patch({ breakMinutes: num(e.target.value) })} />}
              </FormField>
              <FormField label={t('work.grace')} hint={t('work.graceHint')} error={err('lateGraceMinutes')}>
                {(a) => <Input {...a} type="number" min={0} max={120} className="tabular" value={shown(s.lateGraceMinutes)} onChange={(e) => patch({ lateGraceMinutes: num(e.target.value) })} />}
              </FormField>
              <FormField label={t('work.halfDay')} error={err('halfDayThresholdMinutes')}>
                {(a) => (
                  <Input {...a} type="number" min={30} max={720} className="tabular" value={shown(s.halfDayThresholdMinutes)} onChange={(e) => patch({ halfDayThresholdMinutes: num(e.target.value) })} />
                )}
              </FormField>
            </Section>
            <p className="text-caption text-muted-foreground">{t('work.note')}</p>
          </>
        )}
        {view === 'policies' && (
          <>
            <Section title={t('policies.leave')}>
              <FormField label={t('policies.annualDays')} error={err('annualDays')}>
                {(a) => (
                  <Input {...a} type="number" min={0} max={366} step={0.5} className="tabular" value={shown(s.leavePolicy.annualDays)} onChange={(e) => patch({ leavePolicy: { ...s.leavePolicy, annualDays: num(e.target.value) } })} />
                )}
              </FormField>
              <FormField label={t('policies.maxCarry')} error={err('maxCarryOverDays')}>
                {(a) => (
                  <Input
                    {...a}
                    type="number"
                    min={0}
                    max={366}
                    step={0.5}
                    className="tabular"
                    value={shown(s.leavePolicy.maxCarryOverDays)}
                    onChange={(e) => patch({ leavePolicy: { ...s.leavePolicy, maxCarryOverDays: num(e.target.value) } })}
                  />
                )}
              </FormField>
              <Checkbox
                className="md:col-span-2"
                label={t('policies.probation')}
                checked={s.leavePolicy.annualLeaveDuringProbation}
                onChange={(e) => patch({ leavePolicy: { ...s.leavePolicy, annualLeaveDuringProbation: e.target.checked } })}
              />
            </Section>
            <Section title={t('policies.payroll')}>
              <FormField label={t('policies.overtime')} hint={t('policies.overtimeHint')} error={err('overtimeMultiplier')}>
                {(a) => (
                  <Input
                    {...a}
                    type="number"
                    min={1}
                    max={5}
                    step={0.25}
                    className="tabular"
                    value={shown(s.payrollPolicy.overtimeMultiplier)}
                    onChange={(e) => patch({ payrollPolicy: { ...s.payrollPolicy, overtimeMultiplier: num(e.target.value) } })}
                  />
                )}
              </FormField>
              <FormField label={t('policies.monthlyHours')} hint={t('policies.monthlyHoursHint')} error={err('standardMonthlyHours')}>
                {(a) => (
                  <Input
                    {...a}
                    type="number"
                    min={1}
                    max={744}
                    className="tabular"
                    value={shown(s.payrollPolicy.standardMonthlyHours)}
                    onChange={(e) => patch({ payrollPolicy: { ...s.payrollPolicy, standardMonthlyHours: num(e.target.value) } })}
                  />
                )}
              </FormField>
              <FormField label={t('policies.payOn')} hint={t('policies.payOnHint')}>
                {(a) => <Input {...a} maxLength={30} value={s.payrollPolicy.payOn ?? ''} onChange={(e) => patch({ payrollPolicy: { ...s.payrollPolicy, payOn: e.target.value } })} />}
              </FormField>
            </Section>
            <Section title={t('policies.general')}>
              <FormField label={t('policies.currency')} hint={t('policies.currencyHint')} error={err('currency')}>
                {(a) => <Input {...a} maxLength={3} className="uppercase" value={s.currency} onChange={(e) => patch({ currency: e.target.value })} />}
              </FormField>
              <FormField label={t('policies.locale')} hint={t('policies.localeHint')}>
                {(a) => (
                  <Select {...a} value={s.defaultLocale} onChange={(e) => patch({ defaultLocale: e.target.value as 'lo' | 'en' })}>
                    <option value="lo">{tc('languageLo')}</option>
                    <option value="en">{tc('languageEn')}</option>
                  </Select>
                )}
              </FormField>
            </Section>
          </>
        )}
        {editable && (
          <div className="flex justify-end border-t border-border pt-4">
            <Button onClick={save} loading={mutation.isPending}>
              {t('save')}
            </Button>
          </div>
        )}
      </fieldset>
    </Card>
  );
}
