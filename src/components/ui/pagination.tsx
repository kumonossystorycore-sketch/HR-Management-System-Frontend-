'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

const pageList = (cur: number, last: number): Array<number | '…'> => {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  let lo = Math.max(2, cur - 1);
  let hi = Math.min(last - 1, cur + 1);
  if (cur <= 3) [lo, hi] = [2, 4];
  if (cur >= last - 2) [lo, hi] = [last - 3, last - 1];
  return [1, ...(lo > 2 ? ['…' as const] : []), ...Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), ...(hi < last - 1 ? ['…' as const] : []), last];
};

/** "Showing 1–20 of 248" and page buttons; on phones only previous/next. */
export function Pagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) {
  const t = useTranslations('common.pager');
  const last = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), last);
  const from = total ? (current - 1) * pageSize + 1 : 0;
  const to = Math.min(total, current * pageSize);
  const go = (p: number) => p >= 1 && p <= last && p !== current && onPageChange(p);
  const btn = 'inline-flex h-control-sm min-w-control-sm items-center justify-center rounded-md px-2 text-body-sm tabular';
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <span className="tabular" aria-live="polite">
        {t('range', { from: formatNumber(from), to: formatNumber(to), total: formatNumber(total) })}
      </span>
      <nav aria-label={t('nav')}>
        <ul className="flex items-center gap-1">
          <li>
            <button type="button" className={cn(btn, 'text-foreground hover:enabled:bg-teal-soft disabled:text-input')} disabled={current <= 1} onClick={() => go(current - 1)} aria-label={t('prev')}>
              <ChevronLeft className="size-[18px]" aria-hidden="true" />
            </button>
          </li>
          {pageList(current, last).map((p, i) => (
            <li key={`${p}-${i}`} className="hidden sm:block">
              {p === '…' ? (
                <span className="inline-flex min-w-6 justify-center" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  type="button"
                  className={cn(btn, p === current ? 'bg-deep-teal font-semibold text-primary-foreground' : 'text-foreground hover:bg-teal-soft hover:text-deep-teal')}
                  aria-current={p === current ? 'page' : undefined}
                  aria-label={t('page', { page: p })}
                  onClick={() => go(p)}
                >
                  {p}
                </button>
              )}
            </li>
          ))}
          <li>
            <button type="button" className={cn(btn, 'text-foreground hover:enabled:bg-teal-soft disabled:text-input')} disabled={current >= last} onClick={() => go(current + 1)} aria-label={t('next')}>
              <ChevronRight className="size-[18px]" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
