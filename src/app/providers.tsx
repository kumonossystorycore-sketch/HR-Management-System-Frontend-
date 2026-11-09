'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/auth-provider';
import { ApiError } from '@/lib/api-client';

/** Data cache, session and toasts for the whole app. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Retry network blips, never permission or validation answers.
            retry: (count, error) => count < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          classNames: {
            toast: 'rounded-lg border border-border bg-card text-foreground shadow-md font-sans',
            title: 'text-body-sm font-semibold',
            description: 'text-label font-normal text-muted-foreground',
          },
        }}
      />
    </QueryClientProvider>
  );
}
