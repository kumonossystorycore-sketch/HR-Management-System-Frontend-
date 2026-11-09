import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** Locale-aware Link, router and redirect: `router.push('/dashboard')` stays in the current language. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
