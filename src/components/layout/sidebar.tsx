'use client';

import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/auth-provider';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Avatar } from '../ui/avatar';
import { navFor } from './nav-config';
import { useDisplayName, useRoleLabel } from './use-user-labels';

/**
 * The deep-teal navigation column: logo on its white plate, module links built from the
 * user's permissions, and the signed-in user with a sign-out button.
 */
export function Sidebar({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const active = pathname.split('/')[1] ?? '';
  const name = useDisplayName();
  const role = useRoleLabel();

  return (
    <nav aria-label={tc('mainMenu')} className={cn('flex h-full w-sidebar flex-col bg-sidebar px-3 py-4 text-sidebar-foreground', className)}>
      <div className="mb-4 flex min-h-header items-center gap-3 rounded-lg bg-card px-3 py-2">
        <Image src="/logo/systory-logo.png" alt="SYSTORY" width={66} height={48} priority className="h-12 w-[66px]" />
        <span className="flex min-w-0 flex-col border-l border-border pl-3">
          <span className="text-base leading-6 font-bold tracking-wide text-deep-teal">{tc('product')}</span>
          <span className="text-caption leading-[18px] text-muted-foreground">{tc('tagline')}</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {navFor(user).map(({ section, items }) => (
          <div key={section} className="mt-4 first:mt-0">
            <p className="mb-1 px-3 text-caption font-medium text-sidebar-foreground">{t(`sections.${section}`)}</p>
            <ul className="flex flex-col gap-0.5">
              {items.map(({ key, href, icon: Icon }) => {
                const isActive = active === key;
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex h-control-md items-center gap-3 rounded-full px-3 text-body-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-white',
                        isActive ? 'bg-card font-semibold text-deep-teal' : 'text-sidebar-foreground hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{t(key)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {user && (
        <div className="mt-4 flex items-center gap-3 border-t border-white/15 px-2 pt-3">
          <Avatar name={name} employeeId={user.employee?.id} photoFileId={user.employee?.photoFileId} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body-sm leading-[22px] font-semibold text-white">{name}</span>
            <span className="truncate text-caption text-sidebar-foreground">{role}</span>
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label={tc('signOut')}
            className="inline-flex size-control-md items-center justify-center rounded-md text-sidebar-foreground hover:bg-white/10 hover:text-white focus-visible:outline-white"
          >
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}
