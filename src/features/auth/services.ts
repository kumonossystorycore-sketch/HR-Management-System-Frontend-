import { api, csrfHeaders, http, tokenStore } from '@/lib/api-client';
import type { LoginResult, Profile } from './types';

/** Thin wrappers over the Phase 5 auth API. Tokens never leave memory; the refresh token stays in its httpOnly cookie. */
export const authApi = {
  async login(email: string, password: string) {
    const { data } = await http.post<LoginResult>('/auth/login', { email, password });
    tokenStore.set(data.accessToken);
    return data.user;
  },
  me: async () => (await http.get<Profile>('/auth/me')).data,
  async logout() {
    try {
      await api.post('/auth/logout', null, { headers: csrfHeaders });
    } finally {
      tokenStore.set(null);
    }
  },
  async logoutAll() {
    try {
      await api.post('/auth/logout-all');
    } finally {
      tokenStore.set(null);
    }
  },
  changePassword: async (currentPassword: string, newPassword: string) => (await http.put<Profile>('/auth/password', { currentPassword, newPassword })).data,
  updateLocale: async (locale: 'lo' | 'en') => (await http.patch<Profile>('/auth/me', { locale })).data,
  forgotPassword: (email: string) => http.post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => http.post<{ reset: boolean }>('/auth/reset-password', { token, newPassword }),
};
