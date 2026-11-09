import { notFound } from 'next/navigation';

/**
 * Every module has its own folder next to this one, and those always win. Anything else under
 * a locale (/lo/no-such-page, /lo/leave/no-such-page) lands here and gets the app's own
 * not-found page in the current language, instead of Next's bare fallback.
 */
export default function UnknownPage() {
  notFound();
}
