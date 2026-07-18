import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  const interactive = Boolean(onClick)
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150',
        active
          ? 'border-brass bg-brass/15 text-[#9a7a2e]'
          : 'border-hairline-light bg-white text-stone',
        interactive && !active && 'hover:border-stone/50 hover:text-graphite',
        !interactive && 'cursor-default',
        className,
      )}
    >
      {children}
    </button>
  )
}
