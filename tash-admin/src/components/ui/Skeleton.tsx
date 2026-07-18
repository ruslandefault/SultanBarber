import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

export function Skeleton({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return <div className={cn('skeleton rounded-[8px]', className)} style={style} />
}
