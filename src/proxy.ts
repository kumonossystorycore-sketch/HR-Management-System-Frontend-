import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Next.js 16 "proxy" (formerly middleware): sends / to /lo (or the browser's language) and
 * keeps every page under its locale. Sign-in is checked in the browser and, for real, by
 * the API on every request: the access token lives only in memory.
 */
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and files with an extension (logo, fonts).
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
