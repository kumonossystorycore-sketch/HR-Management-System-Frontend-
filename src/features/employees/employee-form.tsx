'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/auth-provider';
import { can } from '@/features/auth/permissions';
import { useErrorMessage, useFieldError } from '@/features/auth/use-messages';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError, http } from '@/lib/api-client';
import { applyApiError } from '@/lib/form-errors';
import { localDay } from '@/lib/format';
import { useDepartmentOptions, usePositionOptions } from '@/lib/queries';
import { PhotoField } from './photo-field';
import { fullName, GENDERS, type EmployeeDetail } from './types';

const PHONE = /^\+?[\d\s-]{6,30}$/;
const MONEY = /^\d{1,13}(\.\d{1,2})?$/;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date');
const optional = (max: number) => z.string().trim().max(max);

/** Mirrors the API's createEmployeeBody, with messages as keys of the `validation` namespace. */
const schema = z
  .object({
    employeeCode: z.string().trim().refine((v) => v === '' || /^[A-Za-z0-9-]{3,20}$/.test(v), 'code'),
    firstName: z.string().trim().min(1, 'required').max(100),
    lastName: z.string().trim().min(1, 'required').max(100),
    gender: z.string().min(1, 'choose'),
    dateOfBirth: day,
    phone: z.string().trim().min(1, 'required').regex(PHONE, 'phone'),
    email: z.string().trim().min(1, 'required').pipe(z.email('email')),
    address: optional(2000),
    departmentId: z.string().min(1, 'choose'),
    positionId: z.string().min(1, 'choose'),
    hireDate: day,
    employmentStatus: z.enum(['PROBATION', 'ACTIVE']),
    basicSalary: z.string().trim(),
    emergencyContactName: optional(150),
    emergencyContactRelation: optional(50),
    emergencyContactPhone: z.string().trim().refine((v) => v === '' || PHONE.test(v), 'phone'),
    createAccount: z.boolean(),
    roleId: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.createAccount && !v.roleId) ctx.addIssue({ code: 'custom', path: ['roleId'], message: 'choose' });
  });
type Values = z.infer<typeof schema>;

const FIELDS = ['employeeCode', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'email', 'address', 'departmentId', 'positionId', 'hireDate', 'basicSalary', 'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone'] as const;

const toValues = (e?: EmployeeDetail): Values => ({
  employeeCode: e?.employeeCode ?? '',
  firstName: e?.firstName ?? '',
  lastName: e?.lastName ?? '',
  gender: e?.gender ?? '',
  dateOfBirth: e?.dateOfBirth.slice(0, 10) ?? '',
  phone: e?.phone ?? '',
  email: e?.email ?? '',
  address: e?.address ?? '',
  departmentId: e?.department.id ?? '',
  positionId: e?.position.id ?? '',
  hireDate: e?.hireDate.slice(0, 10) ?? localDay(),
  employmentStatus: e?.employmentStatus === 'ACTIVE' ? 'ACTIVE' : 'PROBATION',
  basicSalary: e?.basicSalary ?? '',
  emergencyContactName: e?.emergencyContactName ?? '',
  emergencyContactRelation: e?.emergencyContactRelation ?? '',
  emergencyContactPhone: e?.emergencyContactPhone ?? '',
  createAccount: false,
  roleId: '',
});

/** Create (no id) or edit an employee. */
export function EmployeeFormPage({ id }: { id?: string }) {
  const t = useTranslations('employees');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const errorMessage = useErrorMessage();
  const query = useQuery({ queryKey: ['employees', 'detail', id], queryFn: async () => (await http.get<EmployeeDetail>(`/employees/${id}`)).data, enabled: Boolean(id) });
  const title = id ? t('form.editTitle') : t('form.createTitle');
  const crumbs = [
    { label: tc('home'), href: '/dashboard' },
    { label: tn('employees'), href: '/employees' },
    ...(query.data ? [{ label: fullName(query.data), href: `/employees/${query.data.id}` }] : []),
    { label: title },
  ];
  return (
    <>
      <PageHeader title={title} crumbs={crumbs} />
      {id && query.isError && <Alert>{query.error instanceof ApiError && query.error.status === 404 ? t('detail.notFound') : errorMessage(query.error)}</Alert>}
      {id && query.isPending && <Skeleton className="h-96" />}
      {id && query.data?.archivedAt && <Alert tone="info">{t('detail.archivedNotice')}</Alert>}
      {(!id || (query.data && !query.data.archivedAt)) && <EmployeeForm employee={query.data} />}
    </>
  );
}

function Section({ title, children, description }: { title: string; children: ReactNode; description?: string }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </Card>
  );
}

function EmployeeForm({ employee }: { employee?: EmployeeDetail }) {
  const t = useTranslations('employees');
  const tc = useTranslations('common');
  const tg = useTranslations('common.gender');
  const ts = useTranslations('common.employmentStatus');
  const tr = useTranslations('common.roles');
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const fieldError = useFieldError();
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(employee);
  // Salary: required when adding; when editing, only shown to those the API showed it to.
  const showSalary = !editing || employee?.basicSalary !== undefined;
  const canInvite = !editing && can(user, 'user:manage');

  const defaults = useMemo(() => toValues(employee), [employee]);
  const form = useForm<Values>({
    resolver: zodResolver(
      schema.superRefine((v, ctx) => {
        if (showSalary && !MONEY.test(v.basicSalary)) ctx.addIssue({ code: 'custom', path: ['basicSalary'], message: v.basicSalary ? 'money' : 'required' });
        if (editing && !v.employeeCode) ctx.addIssue({ code: 'custom', path: ['employeeCode'], message: 'required' });
      }),
    ),
    defaultValues: defaults,
  });
  const { errors, isSubmitting, dirtyFields } = form.formState;
  const departmentId = useWatch({ control: form.control, name: 'departmentId' });
  const createAccount = useWatch({ control: form.control, name: 'createAccount' });
  const departments = useDepartmentOptions();
  const positions = usePositionOptions(departmentId || undefined, Boolean(departmentId));
  const roles = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await http.get<Array<{ id: string; name: string }>>('/roles')).data,
    enabled: canInvite,
    staleTime: 5 * 60_000,
  });

  // Default the new account's role to Employee once roles arrive.
  useEffect(() => {
    if (roles.data && !form.getValues('roleId')) {
      const employeeRole = roles.data.find((r) => r.name === 'Employee');
      if (employeeRole) form.setValue('roleId', employeeRole.id);
    }
  }, [roles.data, form]);

  // A position belongs to one department: clear it when the department changes.
  useEffect(() => {
    const pos = form.getValues('positionId');
    if (pos && positions.data && !positions.data.some((p) => p.id === pos)) form.setValue('positionId', '');
  }, [positions.data, form]);

  const err = (name: keyof Values, label: string) => fieldError(errors[name]?.message, label);
  const L = (k: Parameters<typeof t>[0]) => t(k);

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const body: Record<string, unknown> = {
      firstName: v.firstName,
      lastName: v.lastName,
      gender: v.gender,
      dateOfBirth: v.dateOfBirth,
      phone: v.phone,
      email: v.email,
      address: v.address,
      departmentId: v.departmentId,
      positionId: v.positionId,
      hireDate: v.hireDate,
      emergencyContactName: v.emergencyContactName,
      emergencyContactRelation: v.emergencyContactRelation,
      emergencyContactPhone: v.emergencyContactPhone || null,
      ...(v.employeeCode ? { employeeCode: v.employeeCode.toUpperCase() } : {}),
      ...(showSalary ? { basicSalary: v.basicSalary } : {}),
    };
    try {
      if (employee) {
        // Send only what changed, so an edit never rewrites fields the user didn't touch.
        const changed = Object.fromEntries(Object.entries(body).filter(([k]) => dirtyFields[k as keyof Values]));
        if (Object.keys(changed).length > 0) await http.put(`/employees/${employee.id}`, changed);
        await qc.invalidateQueries({ queryKey: ['employees'] });
        toast.success(tc('feedback.saved'));
        router.push(`/employees/${employee.id}`);
        return;
      }
      const created = (await http.post<EmployeeDetail>('/employees', { ...body, employmentStatus: v.employmentStatus })).data;
      await qc.invalidateQueries({ queryKey: ['employees'] });
      if (v.createAccount) {
        try {
          // The account gets the company's default language; the person can switch it after signing in.
          await http.post('/users', { email: created.email, sendInvite: true, employeeId: created.id, roleIds: [v.roleId] });
          toast.success(t('form.createdInvite'));
        } catch (error) {
          toast.warning(t('form.accountFailed', { reason: errorMessage(error) }), { duration: 10_000 });
        }
      } else {
        toast.success(t('form.created'));
      }
      router.push(`/employees/${created.id}`);
    } catch (error) {
      const placed = applyApiError(error, form.setError, FIELDS, { duplicate: tc('fieldErrors.duplicate'), invalid: tc('fieldErrors.invalid') });
      if (!placed) setFormError(errorMessage(error));
    }
  });

  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError && <Alert>{formError}</Alert>}
      {errorCount > 0 && !formError && <Alert>{tc('feedback.formSummary', { count: errorCount })}</Alert>}

      <Section title={t('form.personal')}>
        {employee && (
          <div className="md:col-span-2">
            <PhotoField employeeId={employee.id} photoFileId={employee.photoFileId} name={fullName(employee)} />
          </div>
        )}
        <FormField label={L('fields.firstName')} required error={err('firstName', L('fields.firstName'))}>
          {(a) => <Input {...a} autoComplete="off" {...form.register('firstName')} />}
        </FormField>
        <FormField label={L('fields.lastName')} required error={err('lastName', L('fields.lastName'))}>
          {(a) => <Input {...a} autoComplete="off" {...form.register('lastName')} />}
        </FormField>
        <FormField label={L('fields.gender')} required error={err('gender', L('fields.gender'))}>
          {(a) => (
            <Select {...a} {...form.register('gender')}>
              <option value="">{t('form.selectPlaceholder')}</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {tg(g)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={L('fields.dateOfBirth')} required error={err('dateOfBirth', L('fields.dateOfBirth'))}>
          {(a) => <Input {...a} type="date" max={localDay()} {...form.register('dateOfBirth')} />}
        </FormField>
        <FormField label={L('fields.phone')} required error={err('phone', L('fields.phone'))}>
          {(a) => <Input {...a} type="tel" inputMode="tel" autoComplete="off" placeholder="+856 20 1234 5678" {...form.register('phone')} />}
        </FormField>
        <FormField label={L('fields.email')} required error={err('email', L('fields.email'))}>
          {(a) => <Input {...a} type="email" autoComplete="off" {...form.register('email')} />}
        </FormField>
        <FormField label={L('fields.address')} className="md:col-span-2" error={err('address', L('fields.address'))}>
          {(a) => <Textarea {...a} rows={2} {...form.register('address')} />}
        </FormField>
      </Section>

      <Section title={t('form.employment')}>
        <FormField label={L('fields.employeeCode')} required={editing} hint={editing ? undefined : t('fields.employeeCodeHint')} error={err('employeeCode', L('fields.employeeCode'))}>
          {(a) => <Input {...a} autoComplete="off" className="uppercase" placeholder={editing ? undefined : 'SYS-0000'} {...form.register('employeeCode')} />}
        </FormField>
        {!editing ? (
          <FormField label={L('fields.employmentStatus')} required hint={t('form.statusHint')}>
            {(a) => (
              <Select {...a} {...form.register('employmentStatus')}>
                <option value="PROBATION">{ts('PROBATION')}</option>
                <option value="ACTIVE">{ts('ACTIVE')}</option>
              </Select>
            )}
          </FormField>
        ) : (
          <div className="hidden md:block" />
        )}
        <FormField label={L('fields.department')} required error={err('departmentId', L('fields.department'))}>
          {(a) => (
            <Select {...a} {...form.register('departmentId')}>
              <option value="">{t('form.selectPlaceholder')}</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={L('fields.position')} required hint={departmentId ? undefined : t('fields.positionHint')} error={err('positionId', L('fields.position'))}>
          {(a) => (
            <Select {...a} disabled={!departmentId || positions.isPending} {...form.register('positionId')}>
              <option value="">{t('form.selectPlaceholder')}</option>
              {positions.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={L('fields.hireDate')} required error={err('hireDate', L('fields.hireDate'))}>
          {(a) => <Input {...a} type="date" {...form.register('hireDate')} />}
        </FormField>
        {showSalary && (
          <FormField label={L('fields.basicSalary')} required hint={t('fields.basicSalaryHint')} error={err('basicSalary', L('fields.basicSalary'))}>
            {(a) => <Input {...a} inputMode="decimal" autoComplete="off" className="tabular" placeholder="6000000" {...form.register('basicSalary')} />}
          </FormField>
        )}
      </Section>

      <Section title={t('form.emergency')}>
        <FormField label={L('fields.emergencyContactName')} error={err('emergencyContactName', L('fields.emergencyContactName'))}>
          {(a) => <Input {...a} autoComplete="off" {...form.register('emergencyContactName')} />}
        </FormField>
        <FormField label={L('fields.emergencyContactRelation')} error={err('emergencyContactRelation', L('fields.emergencyContactRelation'))}>
          {(a) => <Input {...a} autoComplete="off" {...form.register('emergencyContactRelation')} />}
        </FormField>
        <FormField label={L('fields.emergencyContactPhone')} error={err('emergencyContactPhone', L('fields.emergencyContactPhone'))}>
          {(a) => <Input {...a} type="tel" inputMode="tel" autoComplete="off" {...form.register('emergencyContactPhone')} />}
        </FormField>
      </Section>

      {canInvite && (
        <Card>
          <CardHeader title={t('form.account')} />
          <div className="flex flex-col gap-5">
            <Checkbox label={t('form.createAccount')} hint={t('form.createAccountHint')} {...form.register('createAccount')} />
            {createAccount && (
              <FormField label={L('fields.role')} required error={err('roleId', L('fields.role'))} className="md:max-w-sm">
                {(a) => (
                  <Select {...a} {...form.register('roleId')}>
                    <option value="">{t('form.selectPlaceholder')}</option>
                    {roles.data?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {tr.has(r.name as 'Employee') ? tr(r.name as 'Employee') : r.name}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            )}
          </div>
        </Card>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 -mb-6 flex justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:-mb-8 lg:px-8">
        <Button asChild variant="secondary">
          <Link href={employee ? `/employees/${employee.id}` : '/employees'}>{tc('cancel')}</Link>
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {editing ? tc('actions.saveChanges') : tc('save')}
        </Button>
      </div>
    </form>
  );
}
