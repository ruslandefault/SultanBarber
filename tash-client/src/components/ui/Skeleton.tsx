import { cn } from '@/lib/cn'

/** Shimmer placeholder — slate base with a subtle pulse. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[10px] bg-slate', className)} />
}
