import type { Scope } from '@/features/auth/types';

/** GET /users */
export interface UserAccount {
  id: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  locale: 'lo' | 'en';
  lastLoginAt: string | null;
  createdAt: string;
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; department: { id: string; name: string } } | null;
  roles: Array<{ role: { id: string; name: string } }>;
}

/** GET /roles */
export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  grants: Array<{ key: string; module: string; scope: Scope }>;
}

/** GET /permissions */
export interface Permission {
  key: string;
  module: string;
  description: string;
}

/** Same list as the API: holding any of these is administrator power. */
export const PRIVILEGED = ['role:manage', 'user:manage', 'user:reset_password'];
export const SUPER_ADMIN = 'Super Admin';
/** Permission keys use ':'; message keys use '__'. */
export const permKey = (key: string) => key.replace(':', '__');

/** A strong random temporary password: letters and digits, never ambiguous characters. */
export const generatePassword = () => {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0]! % set.length]!;
  const chars = [pick(letters), pick(digits), ...Array.from({ length: 10 }, () => pick(all))];
  return chars.sort(() => crypto.getRandomValues(new Uint8Array(1))[0]! - 128).join('');
};
