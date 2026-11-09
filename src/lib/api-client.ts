import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

/** The API base, e.g. http://localhost:4000/api/v1 in development or /api/v1 behind one domain. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** The backend's error envelope, as a typed error the UI can translate by `code`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface Envelope<T> {
  success: true;
  data: T;
  meta?: { page: number; pageSize: number; total: number; [key: string]: unknown };
}

// ───────────── Access token: in memory only (Phase 1: never localStorage) ─────────────
let accessToken: string | null = null;
export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};

type Listener = () => void;
const sessionEndedListeners = new Set<Listener>();
/** Called when the session cannot be renewed (signed out elsewhere, expired, revoked). */
export const onSessionEnded = (listener: Listener) => {
  sessionEndedListeners.add(listener);
  return () => void sessionEndedListeners.delete(listener);
};

/** The cookie routes need this header (backend CSRF guard). */
const CSRF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' };

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    const body = error.response?.data as { error?: { code?: string; message?: string; details?: unknown } } | undefined;
    if (body?.error?.code) return new ApiError(error.response!.status, body.error.code, body.error.message ?? error.message, body.error.details);
    if (!error.response) return new ApiError(0, 'NETWORK_ERROR', error.message);
    return new ApiError(error.response.status, error.response.status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN', error.message);
  }
  return new ApiError(0, 'UNKNOWN', error instanceof Error ? error.message : String(error));
};

// ───────────── Refresh: one request at a time, shared by every caller ─────────────
let refreshing: Promise<string | null> | null = null;

const requestRefresh = async (attempt = 0): Promise<string | null> => {
  try {
    const res = await axios.post<Envelope<{ accessToken: string }>>(`${API_URL}/auth/refresh`, null, { withCredentials: true, headers: CSRF_HEADERS, timeout: 20_000 });
    accessToken = res.data.data.accessToken;
    return accessToken;
  } catch (error) {
    const e = toApiError(error);
    // Another tab rotated the cookie a moment ago: the browser now holds the new one.
    if (e.code === 'REFRESH_RACE' && attempt === 0) {
      await new Promise((r) => setTimeout(r, 250));
      return requestRefresh(1);
    }
    if (e.code === 'NETWORK_ERROR') throw e;
    accessToken = null;
    return null;
  }
};

/** Gets a new access token from the refresh cookie, or null when there is no live session. */
export const refreshSession = () => {
  refreshing ??= requestRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
};

// ───────────── The client every feature uses ─────────────
export const api = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 30_000 });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  return config;
});

/** A 401 on an ordinary call: renew once and replay. If renewal fails, the session is over. */
const RENEWABLE = new Set(['TOKEN_EXPIRED', 'UNAUTHENTICATED']);

api.interceptors.response.use(undefined, async (error: unknown) => {
  const e = toApiError(error);
  const config = (error as AxiosError).config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  const isAuthCall = config?.url?.startsWith('/auth/login') || config?.url?.startsWith('/auth/refresh');
  if (e.status === 401 && config && !config._retried && !isAuthCall) {
    if (RENEWABLE.has(e.code)) {
      config._retried = true;
      const token = await refreshSession().catch(() => null);
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
        return api.request(config);
      }
    }
    accessToken = null;
    sessionEndedListeners.forEach((l) => l());
  }
  throw e;
});

/** GET/POST/… that return the `data` of the envelope (and `meta` for lists). */
export const http = {
  get: async <T>(url: string, config?: AxiosRequestConfig) => (await api.get<Envelope<T>>(url, config)).data,
  post: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => (await api.post<Envelope<T>>(url, body, config)).data,
  put: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => (await api.put<Envelope<T>>(url, body, config)).data,
  patch: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => (await api.patch<Envelope<T>>(url, body, config)).data,
  delete: async <T>(url: string, config?: AxiosRequestConfig) => (await api.delete<Envelope<T>>(url, config)).data,
};

export const csrfHeaders = CSRF_HEADERS;
