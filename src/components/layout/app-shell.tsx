'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../ui/sheet';
import { AppHeader } from './app-header';
import { Sidebar } from './sidebar';

/**
 * The app frame (design system: layout): Sidebar on the left from 1024px, a drawer below it;
 * AppHeader on top; content on `background`, at most 1440px wide.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const tc = useTranslations('common');
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <a href="#content" className="sr-only z-50 rounded-md bg-card px-4 py-2 text-deep-teal shadow-md focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        {tc('skipToContent')}
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden lg:block print:hidden">
        <Sidebar />
      </aside>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent>
          <SheetTitle className="sr-only">{tc('mainMenu')}</SheetTitle>
          <SheetDescription className="sr-only">{tc('mainMenu')}</SheetDescription>
          <Sidebar onNavigate={() => setDrawer(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-dvh flex-col lg:pl-sidebar print:pl-0">
        <AppHeader onMenu={() => setDrawer(true)} />
        <main id="content" tabIndex={-1} className="mx-auto w-full max-w-content flex-1 px-4 py-6 outline-none lg:px-8 lg:py-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
