import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { IconClose } from '@/components/icons'

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-graphite/40 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex h-full w-full max-w-[460px] flex-col bg-bone shadow-2xl animate-sheet-in"
      >
        <header className="flex items-start justify-between gap-3 border-b border-hairline-light bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-graphite">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-stone">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-[10px] p-1.5 text-stone hover:bg-graphite/5 hover:text-graphite"
          >
            <IconClose />
          </button>
        </header>

        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {footer && (
          <footer className="border-t border-hairline-light bg-white px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
