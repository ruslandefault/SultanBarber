import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'ghost' | 'destructive' | 'secondary'
type Size = 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium select-none ' +
  'transition-[transform,background-color,opacity] duration-150 ease-[var(--ease-out-soft)] ' +
  'active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 ' +
  'focus-visible:outline-brass focus-visible:outline-offset-2'

const variants: Record<Variant, string> = {
  primary: 'bg-brass text-graphite hover:brightness-105',
  secondary: 'bg-slate text-bone border border-hairline hover:border-stone/40',
  ghost: 'bg-transparent text-bone hover:bg-slate',
  destructive: 'bg-transparent text-clay border border-clay/40 hover:bg-clay/10',
}

const sizes: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
})

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  )
}
