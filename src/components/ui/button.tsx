import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

/** SYSTORY Button: primary (teal), secondary (outlined), ghost and danger, in sm/md/lg. */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent font-semibold transition-colors duration-150 ease-out active:enabled:translate-y-px disabled:cursor-not-allowed [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:enabled:bg-deep-teal disabled:bg-border disabled:text-muted-foreground',
        secondary: 'border-input bg-card text-foreground hover:enabled:border-deep-teal hover:enabled:bg-background disabled:bg-border disabled:text-muted-foreground',
        ghost: 'bg-transparent text-deep-teal hover:enabled:bg-teal-soft disabled:text-muted-foreground',
        danger: 'bg-destructive text-destructive-foreground hover:enabled:bg-danger-text disabled:bg-border disabled:text-muted-foreground',
        link: 'h-auto border-0 p-0 font-semibold text-deep-teal underline underline-offset-4 hover:text-primary',
      },
      size: {
        sm: 'h-control-sm px-3 text-body-sm [&_svg]:size-4',
        md: 'h-control-md px-4 text-[15px] leading-[22px] [&_svg]:size-[18px]',
        lg: 'h-control-lg px-6 text-base leading-6 [&_svg]:size-[18px]',
        icon: 'size-control-md p-0 text-muted-foreground hover:enabled:bg-teal-soft hover:enabled:text-deep-teal [&_svg]:size-5',
      },
    },
    compoundVariants: [{ variant: 'link', size: ['sm', 'md', 'lg'], className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

/** While `loading`, the button keeps its size, shows a spinner and refuses clicks. */
export function Button({ className, variant, size, asChild, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), loading && 'disabled:bg-primary disabled:text-primary-foreground disabled:opacity-85', className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...(!asChild && { type: props.type ?? 'button' })}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner />}
          {children}
        </>
      )}
    </Comp>
  );
}
