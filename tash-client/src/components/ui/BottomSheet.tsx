import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Optional sticky footer (e.g. confirm/cancel actions). */
  footer?: ReactNode
}

export function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        aria-label="Yopish"
        onClick={onClose}
        className="absolute inset-0 bg-graphite/70 backdrop-blur-sm animate-[fade_150ms_ease-out]"
      />
      <div
        className={cn(
          'relative max-h-[88vh] w-full overflow-hidden rounded-t-[20px]',
          'border-t border-hairline bg-slate pb-safe',
          'animate-[sheet_200ms_var(--ease-out-soft)]',
        )}
      >
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-stone/30" />
        </div>
        {title && (
          <h2 className="px-5 pt-2 pb-1 font-display text-lg text-bone">{title}</h2>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-3">{children}</div>
        {footer && <div className="border-t border-hairline px-5 py-3">{footer}</div>}
      </div>
      <style>{`
        @keyframes sheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>,
    document.body,
  )
}
