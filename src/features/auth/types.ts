export type Scope = 'OWN' | 'DEPARTMENT' | 'ALL';

/** GET /auth/me and the `user` of POST /auth/login. */
export interface Profile {
  id: string;
  email: string;
  locale: 'lo' | 'en';
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    photoFileId: string | null;
    department: { id: string; name: string };
    position: { id: string; title: string };
  } | null;
  roles: string[];
  permissions: Array<{ key: string; scope: Scope }>;
}

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: Profile;
}
