import { useEffect, useRef, useState } from 'react'
import type { Product } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Toggle } from '@/components/ui/Toggle'
import { Sheet } from '@/components/ui/Sheet'
import { Field, Input, Label, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { IconPlus, IconUpload, IconBag } from '@/components/icons'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/http'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'

export function Products() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    setProducts(await api.getProducts())
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])

  async function toggle(p: Product) {
    await api.toggleProduct(p.id, !p.active)
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
    toast('Saqlandi')
  }

  return (
    <div>
      <PageHeader
        title="Mahsulotlar"
        subtitle="Sotiladigan mahsulotlar katalogi"
        actions={
          <Button variant="brass" onClick={() => setCreating(true)}>
            <IconPlus width={18} height={18} />
            <span className="hidden sm:inline">Yangi mahsulot</span>
          </Button>
        }
      />

      <div className="px-4 py-4 md:px-8">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState onAdd={() => setCreating(true)} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Card key={p.id} className={cn('overflow-hidden', !p.active && 'opacity-60')}>
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="block w-full text-left"
                >
                  <div className="aspect-[4/3] w-full bg-graphite/[0.05]">
                    {p.imageUrl ? (
                      <img
                        src={mediaUrl(p.imageUrl)}
                        alt={p.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-stone">
                        <IconBag width={40} height={40} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-base font-medium text-graphite">{p.title}</p>
                    {p.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone">{p.description}</p>
                    )}
                    <p className="tabular mt-1.5 text-sm font-bold text-graphite">
                      {formatMoney(p.price)}
                    </p>
                  </div>
                </button>
                <div className="flex items-center justify-between border-t border-hairline-light px-3 py-2">
                  <span className="text-2xs text-stone">{p.active ? 'Faol' : 'Nofaol'}</span>
                  <Toggle checked={p.active} onChange={() => toggle(p)} ariaLabel="Faol" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ProductSheet
        open={creating || Boolean(editing)}
        product={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSaved={() => {
          setCreating(false)
          setEditing(null)
          void load()
        }}
      />
    </div>
  )
}

function ProductSheet({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean
  product: Product | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (product) {
      setTitle(product.title)
      setDescription(product.description)
      setPrice(String(product.price))
      setImageUrl(product.imageUrl)
    } else {
      setTitle('')
      setDescription('')
      setPrice('')
      setImageUrl(null)
    }
  }, [open, product])

  async function pickImage(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await api.uploadImage(file)
      setImageUrl(url)
    } catch {
      setError('Rasm yuklab bo‘lmadi. Faqat jpg/png/webp, 8 MB gacha.')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!title.trim()) return setError('Mahsulot sarlavhasini kiriting.')
    if (!price.trim() || Number(price) < 0) return setError('Narxni kiriting.')
    setSaving(true)
    try {
      await api.saveProduct({
        id: product?.id,
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        imageUrl,
        order: product?.order ?? 0,
      })
      toast('Saqlandi')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!product) return
    if (!window.confirm(`"${product.title}" mahsulotini o‘chirasizmi?`)) return
    setSaving(true)
    try {
      await api.deleteProduct(product.id)
      toast('O‘chirildi')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
      footer={
        <div className="flex flex-col gap-2">
          <Button variant="brass" className="w-full" onClick={save} disabled={saving || uploading}>
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
          {product && (
            <Button variant="ghost" className="text-clay" onClick={remove} disabled={saving}>
              O‘chirish
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Image */}
        <div>
          <Label>Rasm</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[12px] border border-dashed border-hairline-light bg-graphite/[0.03] hover:border-brass/50"
          >
            {imageUrl ? (
              <img src={mediaUrl(imageUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-stone">
                <IconUpload width={26} height={26} />
                <span className="text-xs">Rasm yuklash</span>
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-graphite/40 text-xs text-bone">
                Yuklanmoqda…
              </span>
            )}
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="mt-1.5 text-2xs text-clay hover:underline"
            >
              Rasmni olib tashlash
            </button>
          )}
        </div>

        <Field label="Sarlavha" error={error ?? undefined}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Soch uchun pomada"
          />
        </Field>
        <Field label="Izoh">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mahsulot haqida qisqa izoh"
          />
        </Field>
        <Field label="Narx (so‘m)">
          <Input
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="85000"
            className="tabular"
          />
        </Field>
      </div>
    </Sheet>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-graphite/[0.05] text-stone">
        <IconBag width={26} height={26} />
      </span>
      <p className="text-base font-medium text-graphite">Hali mahsulot yo‘q</p>
      <p className="text-xs text-stone">Birinchi mahsulotni qo‘shing — mijozlar uni Telegramda ko‘radi.</p>
      <Button variant="brass" onClick={onAdd}>
        <IconPlus width={18} height={18} />
        Yangi mahsulot
      </Button>
    </div>
  )
}
