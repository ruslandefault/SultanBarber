import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

/** Elevated surface on dark = slate + hairline (not heavy shadow). */
export function Card({ interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[14px] border border-hairline bg-slate',
        interactive &&
          'cursor-pointer transition-[border-color,transform] duration-150 ease-[var(--ease-out-soft)] hover:border-stone/30 active:scale-[0.99]',
        className,
      )}
      {...props}
    />
  )
}
