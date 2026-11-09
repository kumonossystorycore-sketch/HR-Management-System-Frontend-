'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, onSessionEnded, refreshSession, tokenStore } from '@/lib/api-client';
import { authApi } from './services';
import type { Profile } from './types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  status: Status;
  user: Profile | null;
  /** Why the user is anonymous: shown on the sign-in page. */
  endedReason: 'session' | null;
  signIn: (email: string, password: string) => Promise<Profile>;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
  setUser: (user: Profile) => void;
  /** Starts the session from a new access token (after login elsewhere in the app). */
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Holds the signed-in user. On first load it asks the API for a new access token from the
 * refresh cookie, so a reload or a new tab stays signed in without storing any token in the
 * browser. When the API says the session is over, everything resets to signed out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<Profile | null>(null);
  const [endedReason, setEndedReason] = useState<'session' | null>(null);
  const started = useRef(false);

  const clear = useCallback(
    (reason: 'session' | null) => {
      tokenStore.set(null);
      setUserState(null);
      setStatus('anonymous');
      setEndedReason(reason);
      queryClient.clear();
    },
    [queryClient],
  );

  const reload = useCallback(async () => {
    try {
      const token = tokenStore.get() ?? (await refreshSession());
      if (!token) return clear(null);
      setUserState(await authApi.me());
      setStatus('authenticated');
      setEndedReason(null);
    } catch (error) {
      // Offline at start-up: stay "loading" would hang the screen, so show sign-in.
      if (!(error instanceof ApiError) || error.status !== 401) console.warn('Session restore failed', error);
      clear(null);
    }
  }, [clear]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void reload();
  }, [reload]);

  useEffect(() => onSessionEnded(() => clear('session')), [clear]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      endedReason,
      async signIn(email, password) {
        const profile = await authApi.login(email, password);
        queryClient.clear();
        setUserState(profile);
        setStatus('authenticated');
        setEndedReason(null);
        return profile;
      },
      async signOut() {
        await authApi.logout().catch(() => undefined);
        clear(null);
      },
      async signOutEverywhere() {
        await authApi.logoutAll().catch(() => undefined);
        clear(null);
      },
      setUser: (u) => setUserState(u),
      reload,
    }),
    [status, user, endedReason, queryClient, clear, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
