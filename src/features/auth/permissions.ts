import type { Profile, Scope } from './types';

/**
 * What the signed-in user may do, for showing or hiding menus and buttons. This is a
 * convenience only: the API checks every permission again (Master Prompt: never rely on
 * hidden buttons for security).
 */
export const scopeOf = (user: Profile | null, key: string): Scope | null => user?.permissions.find((p) => p.key === key)?.scope ?? null;
export const can = (user: Profile | null, key: string) => scopeOf(user, key) !== null;
export const canAny = (user: Profile | null, keys: string[]) => keys.some((k) => can(user, k));
