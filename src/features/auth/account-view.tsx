'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LanguageSwitch } from '@/components/layout/language-switch';
import { PageHeader } from '@/components/layout/page-header';
import { useDisplayName } from '@/components/layout/use-user-labels';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { PhotoField } from '@/features/employees/photo-field';
import { SelfContactCard } from '@/features/employees/self-contact-form';
import { formatDateTime } from '@/lib/format';
import { useAuth } from './auth-provider';
import { ChangePasswordForm } from './change-password-form';
import { can } from './permissions';

/** My account: who I am, my language, my password and my sessions. */
export function AccountView() {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const tch = useTranslations('auth.change');
  const tr = useTranslations('common.roles');
  const { user, signOutEverywhere } = useAuth();
  const name = useDisplayName();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const rows: Array<[string, string]> = [
    [t('email'), user.email],
    [t('roles'), user.roles.map((r) => (tr.has(r as 'Employee') ? tr(r as 'Employee') : r)).join(', ')],
    ...(user.employee
      ? ([
          [t('employee'), user.employee.employeeCode],
          [t('department'), user.employee.department.name],
          [t('position'), user.employee.position.title],
        ] as Array<[string, string]>)
      : []),
    ...(user.lastLoginAt ? ([[t('lastLogin'), formatDateTime(user.lastLoginAt)]] as Array<[string, string]>) : []),
  ];

  return (
    <>
      <PageHeader title={t('title')} crumbs={[{ label: tc('home'), href: '/dashboard' }, { label: t('title') }]} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={t('profile')} />
          <div className="mb-5 flex flex-col gap-4">
            <p className="text-h2">{name}</p>
            {user.employee && can(user, 'employee:update_self') ? (
              <PhotoField employeeId={user.employee.id} photoFileId={user.employee.photoFileId} name={name} self />
            ) : (
              <Avatar name={name} employeeId={user.employee?.id} photoFileId={user.employee?.photoFileId} size="lg" />
            )}
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-label text-muted-foreground">{k}</dt>
                <dd className="text-body-sm break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {user.employee && can(user, 'employee:update_self') && <SelfContactCard />}

        <Card>
          <CardHeader title={tch('title')} description={tch('subtitle')} />
          <ChangePasswordForm />
        </Card>

        <Card>
          <CardHeader title={t('language')} description={t('languageHint')} />
          <LanguageSwitch />
        </Card>

        <Card>
          <CardHeader title={t('sessions')} description={t('sessionsHint')} />
          <Button
            variant="secondary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await signOutEverywhere();
            }}
          >
            <LogOut aria-hidden="true" />
            {tc('signOutEverywhere')}
          </Button>
        </Card>
      </div>
    </>
  );
}
