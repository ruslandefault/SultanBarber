import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, mediaUrl } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { formatSoum } from '@/lib/format'
import { useBackButton, useMainButton } from '@/telegram/hooks'
import { Skeleton } from '@/components/ui'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading, error } = useAsync(() => api.getProducts(), [])

  const product = useMemo(() => data?.find((p) => p.id === id), [data, id])

  const goBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/products')
  }, [navigate])
  useBackButton(goBack)
  useMainButton(null)

  if (loading) {
    return (
      <div>
        <Skeleton className="h-[58vh] min-h-[320px] w-full rounded-none" />
        <div className="px-5 pt-6">
          <Skeleton className="mb-3 h-7 w-2/3" />
          <Skeleton className="mb-4 h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <ProductBagIcon className="size-12 text-stone" />
        <p className="mt-4 text-sm text-stone">
          {error ? 'Mahsulotni yuklab bo‘lmadi' : 'Mahsulot topilmadi'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="mt-5 rounded-full border border-hairline px-5 py-2 text-sm text-bone active:scale-[0.97]"
        >
          Mahsulotlarga qaytish
        </button>
      </div>
    )
  }

  const url = product.imageUrl ? mediaUrl(product.imageUrl) : ''

  return (
    <div className="pb-10">
      {/* ── Hero: full-bleed image ────────────────────────────────
          A blurred copy fills any letterbox gaps so tall/wide/square
          images all look intentional; the real image is `object-contain`
          so it is never harshly cropped. A soft gradient melts the hero
          into the page below (no crude hard edge). */}
      <div className="relative h-[58vh] min-h-[320px] max-h-[560px] w-full overflow-hidden bg-graphite">
        {url ? (
          <>
            <img
              src={url}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
            />
            <img
              src={url}
              alt={product.title}
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-slate to-graphite">
            <ProductBagIcon className="size-16 text-stone/70" />
          </div>
        )}

        {/* floating back button (also works outside Telegram) */}
        <button
          type="button"
          onClick={goBack}
          aria-label="Orqaga"
          className="absolute left-4 top-4 z-30 flex size-9 items-center justify-center rounded-full bg-graphite/55 text-bone backdrop-blur active:scale-95"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* bottom blend */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-graphite via-graphite/70 to-transparent" />
      </div>

      {/* ── Content card, pulled up over the hero ─────────────────── */}
      <div className="relative z-30 -mt-6 rounded-t-[26px] bg-graphite px-5 pt-6">
        <p className="text-xs uppercase tracking-[0.15em] text-stone">Mahsulot</p>

        <h1 className="mt-1.5 font-display text-2xl leading-snug text-bone">
          {product.title}
        </h1>

        <div className="mt-3 inline-flex items-center rounded-full bg-brass/12 px-3.5 py-1.5">
          <span className="font-mono text-base font-medium text-brass">
            {formatSoum(product.priceSoum)}
          </span>
        </div>

        {product.description && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone">
              Tavsif
            </p>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-bone/85">
              {product.description}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductBagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6 8h12l-.8 11.2A1.5 1.5 0 0 1 15.7 20.6H8.3a1.5 1.5 0 0 1-1.5-1.4L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" strokeLinecap="round" />
    </svg>
  )
}
