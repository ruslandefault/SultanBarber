import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...rest }: Props) {
  return (
    <div
      className={cn(
        'rounded-[14px] bg-white border border-hairline-light shadow-[0_1px_2px_rgba(28,31,34,0.04)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-graphite">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-stone">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
