import { cn } from '@/lib/utils';

/** Loading placeholder in the shape of the content. Wrap a loading region in aria-busy="true". */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('block h-3.5 animate-pulse-soft rounded-sm bg-border', className)} />;
}
