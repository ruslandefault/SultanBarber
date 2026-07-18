import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  leading?: ReactNode
}

/** Full-round selectable tag/pill. Selected = brass. */
export function Chip({ selected = false, leading, className, children, ...props }: ChipProps) {
  const interactive = !props.disabled && !!props.onClick
  return (
    <button
      type="button"
      aria-pressed={interactive ? selected : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap',
        'border transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out-soft)]',
        interactive && 'active:scale-[0.97]',
        selected
          ? 'border-brass bg-brass/15 text-brass'
          : 'border-hairline bg-slate text-stone hover:text-bone',
        props.disabled && 'opacity-40 pointer-events-none',
        className,
      )}
      {...props}
    >
      {leading}
      {children}
    </button>
  )
}

/** Static, non-interactive tag. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-hairline bg-slate px-3 py-1 text-xs text-stone',
        className,
      )}
    >
      {children}
    </span>
  )
}
