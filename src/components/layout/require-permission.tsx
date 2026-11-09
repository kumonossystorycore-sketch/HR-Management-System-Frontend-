'use client';

import { ShieldX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/features/auth/auth-provider';
import { canAny } from '@/features/auth/permissions';
import { Link } from '@/i18n/navigation';

/**
 * Shows the page only to users holding one of `anyOf`; others get a plain explanation instead
 * of a broken screen. A convenience only: the API refuses the data either way.
 */
export function RequirePermission({ anyOf, children }: { anyOf: string[]; children: ReactNode }) {
  const tc = useTranslations('common');
  const { user } = useAuth();
  if (!user) return null;
  if (!canAny(user, anyOf)) {
    return (
      <EmptyState
        icon={ShieldX}
        title={tc('forbiddenTitle')}
        description={tc('forbiddenText')}
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">{tc('goHome')}</Link>
          </Button>
        }
      />
    );
  }
  return children;
}
