import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

/** Breadcrumb, then the h1 and the page's primary action on one row (design system: layout). */
export function PageHeader({ title, description, crumbs = [], action }: { title: string; description?: ReactNode; crumbs?: Array<{ label: string; href?: string }>; action?: ReactNode }) {
  const tc = useTranslations('common');
  return (
    <div className="mb-6 flex flex-col gap-1">
      {crumbs.length > 0 && (
        <nav aria-label={tc('breadcrumb')}>
          <ol className="flex flex-wrap items-center gap-1 text-label font-normal">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
                  {last || !c.href ? (
                    <span aria-current={last ? 'page' : undefined} className="font-medium text-foreground">
                      {c.label}
                    </span>
                  ) : (
                    <Link href={c.href} className="rounded-sm text-muted-foreground hover:text-deep-teal hover:underline hover:underline-offset-4">
                      {c.label}
                    </Link>
                  )}
                  {!last && <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h1 text-foreground">{title}</h1>
          {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
