'use client';

import { ChevronDown, LogOut, Menu, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/auth-provider';
import { useRouter } from '@/i18n/navigation';
import { Avatar } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { LanguageSwitch } from './language-switch';
import { NotificationsMenu } from './notifications-menu';
import { useDisplayName, useRoleLabel } from './use-user-labels';

/** Top bar: menu button (below 1024px), language switch, notifications and the user menu. */
export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const tc = useTranslations('common');
  const { user, signOut } = useAuth();
  const router = useRouter();
  const name = useDisplayName();
  const role = useRoleLabel();

  return (
    <header className="sticky top-0 z-30 print:hidden flex h-header items-center gap-2 border-b border-border bg-card px-4 lg:gap-4 lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label={tc('openMenu')}
        className="-ml-2 inline-flex size-control-md items-center justify-center rounded-md text-muted-foreground hover:bg-teal-soft hover:text-deep-teal lg:hidden"
      >
        <Menu className="size-[22px]" aria-hidden="true" />
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <LanguageSwitch />
        <NotificationsMenu />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md py-1 pr-1 pl-0 hover:bg-background sm:border-l sm:border-border sm:pl-3">
              <Avatar name={name} employeeId={user.employee?.id} photoFileId={user.employee?.photoFileId} />
              <span className="hidden flex-col text-left sm:flex">
                <span className="text-body-sm leading-[22px] font-semibold">{name}</span>
                <span className="text-caption leading-[18px] text-muted-foreground">{role}</span>
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
              <span className="sr-only sm:hidden">{name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <span className="block text-body-sm font-semibold">{name}</span>
                <span className="block truncate text-caption text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/account')}>
                <UserRound aria-hidden="true" />
                {tc('myAccount')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut aria-hidden="true" />
                {tc('signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
