import type { ReactNode } from 'react';

/** The real root layout is app/[locale]/layout.tsx, which sets <html lang>. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
