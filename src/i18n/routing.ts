import { defineRouting } from 'next-intl/routing';

/** Lao first, English second (design system: content fundamentals). Every URL carries its locale: /lo/…, /en/… */
export const routing = defineRouting({
  locales: ['lo', 'en'],
  defaultLocale: 'lo',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];

/** Route params arrive as plain strings; this narrows them (unknown values fall back to Lao). */
export const asLocale = (value: string): Locale => ((routing.locales as readonly string[]).includes(value) ? (value as Locale) : routing.defaultLocale);
