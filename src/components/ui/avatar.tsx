'use client';

import { useEmployeePhoto } from '@/lib/photos';
import { cn, initialsOf } from '@/lib/utils';

const DIMS = { sm: 'size-7 text-[11px]', md: 'size-9 text-label', lg: 'size-18 text-2xl' };

/**
 * Profile photo, or initials on teal-soft when there is none (or while it loads).
 * Pass `employeeId` and `photoFileId` for a stored photo, or `src` for a local preview.
 */
export function Avatar({
  name,
  employeeId,
  photoFileId,
  src,
  size = 'md',
  className,
}: {
  name: string;
  employeeId?: string | null;
  photoFileId?: string | null;
  src?: string | null;
  size?: keyof typeof DIMS;
  className?: string;
}) {
  const stored = useEmployeePhoto(employeeId, photoFileId);
  const url = src ?? stored;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- a blob URL from the API, not something the image optimizer can fetch
    return <img src={url} alt="" className={cn('shrink-0 rounded-full object-cover', DIMS[size], className)} />;
  }
  return (
    <span aria-hidden="true" className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-teal-soft font-semibold leading-none text-deep-teal', DIMS[size], className)}>
      {initialsOf(name)}
    </span>
  );
}
