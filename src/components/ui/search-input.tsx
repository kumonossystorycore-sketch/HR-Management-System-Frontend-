'use client';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

/** Search box that reports its value after typing pauses (300 ms), so lists don't refetch on every key. */
export function SearchInput({ value, onChange, placeholder, label, className }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; className?: string }) {
  const [text, setText] = useState(value);
  // Follow the URL when it changes from outside (Back button, "clear filters").
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  useEffect(() => {
    if (text === value) return;
    const id = setTimeout(() => onChange(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text, value, onChange]);
  return (
    <div className={cn('relative min-w-0', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={label} className="pl-10" />
    </div>
  );
}
