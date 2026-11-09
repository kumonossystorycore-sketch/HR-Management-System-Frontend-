import type { ReactNode } from 'react';
import { Avatar } from './avatar';

/** Avatar, name and a meta line (code, position…). */
export function PersonCell({ name, meta, employeeId, photoFileId }: { name: string; meta?: ReactNode; employeeId?: string; photoFileId?: string | null }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={name} employeeId={employeeId} photoFileId={photoFileId} />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{name}</span>
        {meta && <span className="block truncate text-caption text-muted-foreground">{meta}</span>}
      </span>
    </span>
  );
}
