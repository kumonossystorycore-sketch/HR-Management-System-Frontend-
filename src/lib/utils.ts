import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names and lets later Tailwind classes override earlier ones (shadcn/ui convention). */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** "Somsack Phommavong" → "SP"; works for Lao names too (first letter of the first two words). */
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => Array.from(w)[0] ?? '')
    .join('')
    .toUpperCase();
