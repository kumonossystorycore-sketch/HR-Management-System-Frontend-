'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * List filters live in the URL (?search=…&page=2), so a filtered list can be bookmarked,
 * shared and restored with Back. Changing any filter returns to page 1.
 */
export function useListParams<K extends string>(keys: readonly K[]) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const values = useMemo(() => Object.fromEntries(keys.map((k) => [k, search.get(k) ?? ''])) as Record<K, string>, [search, keys]);
  const page = Math.max(1, Number(search.get('page')) || 1);

  const set = useCallback(
    (patch: Partial<Record<K | 'page', string | number | null>>) => {
      const next = new URLSearchParams(search.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '' || v === undefined) next.delete(k);
        else next.set(k, String(v));
      }
      if (!('page' in patch)) next.delete('page');
      router.replace({ pathname, query: Object.fromEntries(next.entries()) }, { scroll: false });
    },
    [search, router, pathname],
  );

  return { values, page, set };
}
