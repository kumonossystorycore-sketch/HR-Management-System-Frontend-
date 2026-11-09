import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Numbers and dates: right-aligned, tabular figures. */
  numeric?: boolean;
  align?: 'end';
  className?: string;
}

/**
 * DataTable: a card with optional toolbar and footer; the table scrolls sideways inside it.
 * On phones, `mobileItem` renders a compact list instead (Phase 2 employees design).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading,
  empty,
  toolbar,
  footer,
  mobileItem,
  className,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  caption: string;
  loading?: boolean;
  empty: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  mobileItem?: (row: T) => ReactNode;
  className?: string;
}) {
  const cellClass = (c: Column<T>) => cn('px-4', (c.numeric || c.align === 'end') && 'text-right', c.numeric && 'tabular whitespace-nowrap', c.className);
  const showRows = !loading && rows && rows.length > 0;
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card shadow-sm', className)}>
      {toolbar && <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">{toolbar}</div>}
      <div className={cn('@container overflow-x-auto', mobileItem && 'hidden sm:block')} role="region" aria-label={caption} tabIndex={0} aria-busy={loading || undefined}>
        <table className="w-full border-collapse text-body-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('sticky top-0 border-b border-border bg-background py-2.5 text-left text-label font-semibold whitespace-nowrap text-muted-foreground', cellClass(c))}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((c) => (
                    <td key={c.key} className="border-b border-border px-4 py-3.5">
                      <Skeleton />
                    </td>
                  ))}
                </tr>
              ))}
            {showRows &&
              rows.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-background [&:last-child>td]:border-b-0">
                  {columns.map((c) => (
                    <td key={c.key} className={cn('border-b border-border py-3 align-middle', cellClass(c))}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && rows && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length}>
                  {/* Kept in view when the table is wider than the screen and scrolls sideways. */}
                  <div className="sticky left-0 w-[100cqw]">{empty}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {mobileItem && (
        <ul className="divide-y divide-border sm:hidden" aria-label={caption} aria-busy={loading || undefined}>
          {loading && (
            <li className="p-4">
              <Skeleton className="mb-2 w-2/3" />
              <Skeleton className="w-1/2" />
            </li>
          )}
          {showRows && rows.map((row) => <li key={rowKey(row)}>{mobileItem(row)}</li>)}
          {!loading && rows && rows.length === 0 && <li>{empty}</li>}
        </ul>
      )}
      {footer && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-label font-normal text-muted-foreground">{footer}</div>}
    </div>
  );
}
