import { monogram } from '@/lib/format'
import { cn } from '@/lib/cn'

export function Avatar({
  name,
  color,
  src,
  size = 'md',
  className,
}: {
  name: string
  color?: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dim =
    size === 'sm' ? 'h-8 w-8 text-2xs' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-xs'
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn('shrink-0 rounded-full object-cover', dim, className)}
      />
    )
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none',
        dim,
        className,
      )}
      style={{ background: color ?? '#26292E' }}
    >
      {monogram(name)}
    </span>
  )
}
