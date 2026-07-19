import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Category, Master, MasterSchedule, Service } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { Avatar } from '@/components/ui/Avatar'
import { Toggle } from '@/components/ui/Toggle'
import { Sheet } from '@/components/ui/Sheet'
import { Field, Input, Label } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { IconPlus, IconCheck, IconUpload } from '@/components/icons'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/http'
import { formatMoney, formatDuration, weekdayName } from '@/lib/format'
import { cn } from '@/lib/cn'

type Tab = 'services' | 'masters'

export function Catalog({ tab }: { tab: Tab }) {
  const navigate = useNavigate()
  return (
    <div>
      <PageHeader
        title="Xizmatlar va ustalar"
        subtitle="Katalog va jamoa boshqaruvi"
        actions={
          <Segmented
            options={[
              { value: 'services', label: 'Xizmatlar' },
              { value: 'masters', label: 'Ustalar' },
            ]}
            value={tab}
            onChange={(v) =>
              navigate(v === 'services' ? '/xizmatlar' : '/ustalar')
            }
          />
        }
      />
      {tab === 'services' ? <ServicesTab /> : <MastersTab />}
    </div>
  )
}

// ============================================================
// SERVICES
// ============================================================
function ServicesTab() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [editing, setEditing] = useState<Service | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const [c, s] = await Promise.all([api.getCategories(), api.getServices()])
    setCategories(c)
    setServices(s)
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])

  const grouped = useMemo(() => {
    return categories.map((cat) => ({
      cat,
      items: services
        .filter((s) => s.categoryId === cat.id)
        .sort((a, b) => a.order - b.order),
    }))
  }, [categories, services])

  async function toggle(s: Service) {
    await api.toggleService(s.id, !s.active)
    setServices((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)),
    )
    toast('Saqlandi')
  }

  // local reorder within a category (cosmetic in mock)
  function reorder(catId: string, index: number, dir: -1 | 1) {
    const list = services
      .filter((s) => s.categoryId === catId)
      .sort((a, b) => a.order - b.order)
    const target = index + dir
    if (target < 0 || target >= list.length) return
    const a = list[index]
    const b = list[target]
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === a.id) return { ...s, order: b.order }
        if (s.id === b.id) return { ...s, order: a.order }
        return s
      }),
    )
  }

  return (
    <div className="px-4 py-4 md:px-8">
      <div className="mb-4 flex justify-end">
        <Button variant="brass" onClick={() => setCreating(true)}>
          <IconPlus width={18} height={18} />
          Yangi xizmat
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(({ cat, items }) => (
            <div key={cat.id}>
              <h3 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-stone">
                {cat.name}
              </h3>
              <Card className="overflow-hidden">
                <ul>
                  {items.map((s, i) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 border-b border-hairline-light px-4 py-3 last:border-0"
                    >
                      <div className="flex flex-col">
                        <button
                          type="button"
                          aria-label="Yuqoriga"
                          disabled={i === 0}
                          onClick={() => reorder(cat.id, i, -1)}
                          className="text-stone hover:text-graphite disabled:opacity-30"
                        >
                          <ChevronUp />
                        </button>
                        <button
                          type="button"
                          aria-label="Pastga"
                          disabled={i === items.length - 1}
                          onClick={() => reorder(cat.id, i, 1)}
                          className="text-stone hover:text-graphite disabled:opacity-30"
                        >
                          <ChevronDown />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'truncate text-base font-medium',
                              s.active ? 'text-graphite' : 'text-stone line-through',
                            )}
                          >
                            {s.name}
                          </p>
                          <p className="tabular text-2xs text-stone">
                            {formatDuration(s.durationMin)}
                          </p>
                        </div>
                        <span className="tabular text-xs font-bold text-graphite">
                          {formatMoney(s.price)}
                        </span>
                      </button>
                      <Toggle
                        checked={s.active}
                        onChange={() => toggle(s)}
                        ariaLabel={`${s.name} faol`}
                      />
                    </li>
                  ))}
                  {items.length === 0 && (
                    <li className="px-4 py-4 text-xs text-stone">
                      Bu kategoriyada xizmat yo‘q.
                    </li>
                  )}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}

      <ServiceSheet
        open={creating || Boolean(editing)}
        service={editing}
        categories={categories}
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

function ServiceSheet({
  open,
  service,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean
  service: Service | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [duration, setDuration] = useState('30')
  const [price, setPrice] = useState('')
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (service) {
      setName(service.name)
      setCategoryId(service.categoryId)
      setDuration(String(service.durationMin))
      setPrice(String(service.price))
      setActive(service.active)
    } else {
      setName('')
      setCategoryId(categories[0]?.id ?? '')
      setDuration('30')
      setPrice('')
      setActive(true)
    }
  }, [open, service, categories])

  async function save() {
    if (!name.trim()) return setError('Xizmat nomini kiriting.')
    if (!price.trim() || Number(price) <= 0) return setError('Narxni kiriting.')
    setSaving(true)
    try {
      await api.saveService({
        id: service?.id,
        name: name.trim(),
        categoryId,
        durationMin: Number(duration) || 30,
        price: Number(price) || 0,
        active,
      })
      toast('Saqlandi')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={service ? 'Xizmatni tahrirlash' : 'Yangi xizmat'}
      footer={
        <Button variant="brass" className="w-full" onClick={save} disabled={saving}>
          {saving ? 'Saqlanmoqda…' : 'Saqlash'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nom" error={error ?? undefined}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Klassik soch olish"
          />
        </Field>
        <Field label="Kategoriya">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  categoryId === c.id
                    ? 'border-brass bg-brass/10 text-graphite'
                    : 'border-hairline-light text-stone',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Davomiyligi (daqiqa)">
            <Input
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="tabular"
            />
          </Field>
          <Field label="Narx (so‘m)">
            <Input
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="80000"
              className="tabular"
            />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-[10px] bg-white px-3.5 py-3">
          <Label>Faol</Label>
          <Toggle checked={active} onChange={setActive} ariaLabel="Faol" />
        </div>
      </div>
    </Sheet>
  )
}

// ============================================================
// MASTERS
// ============================================================
function MastersTab() {
  const [loading, setLoading] = useState(true)
  const [masters, setMasters] = useState<Master[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [editing, setEditing] = useState<Master | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const [m, s] = await Promise.all([api.getMasters(), api.getServices()])
    setMasters(m)
    setServices(s)
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="px-4 py-4 md:px-8">
      <div className="mb-4 flex justify-end">
        <Button variant="brass" onClick={() => setCreating(true)}>
          <IconPlus width={18} height={18} />
          Yangi usta
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {masters.map((m) => {
            const workDays = m.schedule.filter((d) => d.works).length
            return (
              <Card key={m.id} className={cn('p-4', !m.isActive && 'opacity-60')}>
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} color={m.color} src={mediaUrl(m.avatarUrl)} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-graphite">
                      {m.name}
                    </p>
                    <p className="truncate text-xs text-stone">{m.specialty}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="rounded-[10px] px-2.5 py-1.5 text-xs font-medium text-brass hover:bg-brass/10"
                    aria-label="Tahrirlash"
                  >
                    Tahrirlash
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {!m.isActive && (
                    <span className="rounded-full bg-clay/10 px-2.5 py-0.5 text-2xs font-medium text-clay">
                      Nofaol
                    </span>
                  )}
                  <span className="rounded-full bg-graphite/[0.05] px-2.5 py-0.5 text-2xs text-stone">
                    {workDays} ish kuni
                  </span>
                  <span className="rounded-full bg-graphite/[0.05] px-2.5 py-0.5 text-2xs text-stone">
                    {m.serviceIds.length} ta xizmat
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <MasterSheet
        open={creating || Boolean(editing)}
        master={editing}
        services={services}
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

const DEFAULT_SCHEDULE: MasterSchedule[] = Array.from({ length: 7 }, (_, w) => ({
  weekday: w,
  works: w !== 6,
  from: '09:00',
  to: '21:00',
}))

function MasterSheet({
  open,
  master,
  services,
  onClose,
  onSaved,
}: {
  open: boolean
  master: Master | null
  services: Service[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const [schedule, setSchedule] = useState<MasterSchedule[]>(DEFAULT_SCHEDULE)
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (master) {
      setName(master.name)
      setSpecialty(master.specialty)
      setAvatarUrl(master.avatarUrl)
      setSchedule(master.schedule.map((d) => ({ ...d })))
      setServiceIds([...master.serviceIds])
    } else {
      setName('')
      setSpecialty('')
      setAvatarUrl(null)
      setSchedule(DEFAULT_SCHEDULE.map((d) => ({ ...d })))
      setServiceIds([])
    }
  }, [open, master])

  async function uploadPhoto(file: File | undefined) {
    if (!file) return
    setUploadingPhoto(true)
    try {
      setAvatarUrl(await api.uploadImage(file))
    } catch {
      setError('Rasm yuklab bo‘lmadi.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function setDay(weekday: number, patch: Partial<MasterSchedule>) {
    setSchedule((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)),
    )
  }

  async function save() {
    if (!name.trim()) return setError('Usta ismini kiriting.')
    setSaving(true)
    try {
      await api.saveMaster({
        id: master?.id,
        name: name.trim(),
        specialty: specialty.trim() || 'Barber',
        avatarUrl,
        color: master?.color ?? '#C9A24B',
        schedule,
        serviceIds,
      })
      toast('Saqlandi')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive() {
    if (!master) return
    setSaving(true)
    try {
      await api.setMasterActive(master.id, !master.isActive)
      toast(master.isActive ? 'Nofaol qilindi' : 'Faollashtirildi')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!master) return
    if (
      !window.confirm(
        `"${master.name}" ustasini butunlay o‘chirasizmi? Bu amalni ortga qaytarib bo‘lmaydi.`,
      )
    )
      return
    setSaving(true)
    try {
      await api.deleteMaster(master.id)
      toast('O‘chirildi')
      onSaved()
    } catch {
      toast('O‘chirib bo‘lmadi — bu ustada bandlovlar bor. O‘rniga “Nofaol qilish”dan foydalaning.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={master ? 'Ustani tahrirlash' : 'Yangi usta'}
      footer={
        <div className="flex flex-col gap-2">
          <Button variant="brass" className="w-full" onClick={save} disabled={saving}>
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
          {master && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={toggleActive} disabled={saving}>
                {master.isActive ? 'Nofaol qilish' : 'Faollashtirish'}
              </Button>
              <Button variant="ghost" className="text-clay" onClick={remove} disabled={saving}>
                O‘chirish
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Photo (circular, like a Telegram account) */}
        <div className="flex items-center gap-4">
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => uploadPhoto(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-graphite/[0.06]"
          >
            {avatarUrl ? (
              <img src={mediaUrl(avatarUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-stone">
                <IconUpload width={22} height={22} />
              </span>
            )}
            {uploadingPhoto && (
              <span className="absolute inset-0 flex items-center justify-center bg-graphite/50 text-2xs text-bone">
                …
              </span>
            )}
          </button>
          <div className="flex flex-col gap-1">
            <Button variant="outline" onClick={() => photoRef.current?.click()}>
              <IconUpload width={16} height={16} />
              Rasm yuklash
            </Button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="text-2xs text-clay hover:underline"
              >
                Rasmni olib tashlash
              </button>
            )}
          </div>
        </div>

        <Field label="Ism familiya" error={error ?? undefined}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Mutaxassislik">
          <Input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Masalan: Katta usta"
          />
        </Field>

        <div>
          <Label>Ish vaqti</Label>
          <div className="flex flex-col gap-1.5">
            {schedule.map((d) => (
              <div
                key={d.weekday}
                className="flex items-center gap-2 rounded-[10px] bg-white px-3 py-2"
              >
                <span className="w-20 text-xs text-graphite">
                  {weekdayName(d.weekday)}
                </span>
                <Toggle
                  checked={d.works}
                  onChange={(v) => setDay(d.weekday, { works: v })}
                  ariaLabel={`${weekdayName(d.weekday)} ishlaydi`}
                />
                {d.works ? (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      type="time"
                      value={d.from}
                      onChange={(e) => setDay(d.weekday, { from: e.target.value })}
                      className="tabular w-full rounded-[8px] border border-hairline-light px-2 py-1 text-xs"
                    />
                    <span className="text-stone">–</span>
                    <input
                      type="time"
                      value={d.to}
                      onChange={(e) => setDay(d.weekday, { to: e.target.value })}
                      className="tabular w-full rounded-[8px] border border-hairline-light px-2 py-1 text-xs"
                    />
                  </div>
                ) : (
                  <span className="flex-1 text-2xs text-stone">Dam olish</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Qaysi xizmatlarni bajaradi</Label>
          <div className="flex flex-col gap-1.5">
            {services
              .filter((s) => s.active)
              .map((s) => {
                const on = serviceIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setServiceIds((prev) =>
                        on ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                      )
                    }
                    className={cn(
                      'flex items-center gap-3 rounded-[10px] border px-3 py-2 text-left transition-colors',
                      on
                        ? 'border-brass bg-brass/10'
                        : 'border-hairline-light bg-white',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-[6px] border',
                        on ? 'border-brass bg-brass text-graphite' : 'border-stone/40',
                      )}
                    >
                      {on && <IconCheck width={14} height={14} />}
                    </span>
                    <span className="flex-1 text-xs text-graphite">{s.name}</span>
                  </button>
                )
              })}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

// tiny chevrons for reorder
function ChevronUp() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 15l6-6 6 6" />
    </svg>
  )
}
function ChevronDown() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
