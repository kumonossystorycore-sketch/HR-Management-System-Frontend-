import {
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  FileChartColumn,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { canAny, scopeOf } from '@/features/auth/permissions';
import type { Profile } from '@/features/auth/types';

export type ModuleKey =
  | 'dashboard'
  | 'employees'
  | 'departments'
  | 'positions'
  | 'recruitment'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'payslips'
  | 'performance'
  | 'reports'
  | 'users'
  | 'settings';

export interface NavItem {
  key: ModuleKey;
  href: `/${string}`;
  icon: LucideIcon;
  /** Shown when the user holds any of these permissions (the API enforces the same rules). */
  anyOf: string[];
  /**
   * Lists that are only useful beyond one's own record: an employee whose scope is OWN would
   * see just themselves, so the entry is hidden (their details are on My account).
   */
  listScope?: true;
}

/** The module icons are fixed by the design system (Iconography). */
export const NAV: Array<{ section: 'overview' | 'people' | 'work' | 'admin'; items: NavItem[] }> = [
  { section: 'overview', items: [{ key: 'dashboard', href: '/dashboard', icon: LayoutDashboard, anyOf: ['dashboard:read'] }] },
  {
    section: 'people',
    items: [
      { key: 'employees', href: '/employees', icon: Users, anyOf: ['employee:read'], listScope: true },
      { key: 'departments', href: '/departments', icon: Building2, anyOf: ['department:read'], listScope: true },
      { key: 'positions', href: '/positions', icon: Briefcase, anyOf: ['position:read'], listScope: true },
      { key: 'recruitment', href: '/recruitment', icon: UserPlus, anyOf: ['recruitment:read'] },
    ],
  },
  {
    section: 'work',
    items: [
      { key: 'attendance', href: '/attendance', icon: Clock, anyOf: ['attendance:read', 'attendance:check_in'] },
      { key: 'leave', href: '/leave', icon: CalendarDays, anyOf: ['leave:read', 'leave:create'] },
      { key: 'payroll', href: '/payroll', icon: Wallet, anyOf: ['payroll:read'] },
      { key: 'payslips', href: '/payslips', icon: Wallet, anyOf: ['payslip:read'] },
      { key: 'performance', href: '/performance', icon: Star, anyOf: ['performance:read'] },
    ],
  },
  {
    section: 'admin',
    items: [
      { key: 'reports', href: '/reports', icon: FileChartColumn, anyOf: ['report:read'] },
      { key: 'users', href: '/users', icon: ShieldCheck, anyOf: ['user:read'] },
      { key: 'settings', href: '/settings', icon: Settings, anyOf: ['setting:read'] },
    ],
  },
];

/**
 * The menu this user sees. Payroll staff get Payroll; everyone else with payslip access gets
 * their own Payslips instead, so nobody sees two wallet entries.
 */
export const isVisible = (user: Profile | null, it: NavItem) =>
  canAny(user, it.anyOf) &&
  !(it.key === 'payslips' && canAny(user, ['payroll:read'])) &&
  !(it.listScope && it.anyOf.every((key) => scopeOf(user, key) === 'OWN' || scopeOf(user, key) === null));

export const navFor = (user: Profile | null) =>
  NAV.map(({ section, items }) => ({ section, items: items.filter((it) => isVisible(user, it)) })).filter((s) => s.items.length > 0);

export const moduleOf = (key: string) => NAV.flatMap((s) => s.items).find((i) => i.key === key);
