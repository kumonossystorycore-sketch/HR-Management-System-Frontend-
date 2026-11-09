'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/auth-provider';

/** The user's name from their employee record, or their e-mail for accounts without one. */
export const useDisplayName = () => {
  const { user } = useAuth();
  if (!user) return '';
  return user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email;
};

/** The first role, in the current language. */
export const useRoleLabel = () => {
  const { user } = useAuth();
  const t = useTranslations('common.roles');
  const role = user?.roles[0];
  if (!role) return '';
  return t.has(role as 'Employee') ? t(role as 'Employee') : role;
};
