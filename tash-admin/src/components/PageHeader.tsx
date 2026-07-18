import type { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline-light bg-bone/80 px-4 py-4 backdrop-blur md:px-8">
      <div>
        <h1 className="font-display text-xl font-semibold text-graphite">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-xs text-stone">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
