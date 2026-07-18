import { useEffect, useMemo, useState } from 'react'
import type {
  AppointmentView,
  Client,
  Master,
  PaymentMethod,
  Service,
} from '@/types'
import type { AppointmentStatus } from '@/types'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, Input, Label, Textarea } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { Avatar } from '@/components/ui/Avatar'
import { IconSearch, IconCheck, IconPlus } from '@/components/icons'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import {
  combineDateTime,
  formatDuration,
  formatMoney,
  formatTime,
  minutesOfDay,
  pad,
  toYmd,
} from '@/lib/format'
import { cn } from '@/lib/cn'

export interface SheetPrefill {
  masterId?: string
  start?: string // ISO
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clients: Client[]
  masters: Master[]
  services: Service[]
  editing?: AppointmentView | null
  prefill?: SheetPrefill | null
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'booked', label: 'Band qilindi' },
  { value: 'confirmed', label: 'Tasdiqlandi' },
  { value: 'completed', label: 'Bajarildi' },
  { value: 'no_show', label: 'Kelmadi' },
]

const PAY_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Naqd' },
  { value: 'payme', label: 'Payme' },
  { value: 'click', label: 'Click' },
]

export function AppointmentSheet({
  open,
  onClose,
  onSaved,
  clients,
  masters,
  services,
  editing,
  prefill,
}: Props) {
  const { toast } = useToast()

  // --- client selection ---
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientQuery, setClientQuery] = useState('')
  const [newClient, setNewClient] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  // --- booking fields ---
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [masterId, setMasterId] = useState('')
  const [dateYmd, setDateYmd] = useState(toYmd(new Date()))
  const [startHHMM, setStartHHMM] = useState('10:00')
  const [status, setStatus] = useState<AppointmentStatus>('booked')
  const [note, setNote] = useState('')

  // --- payment ---
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')

  const [slotError, setSlotError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // initialize on open
  useEffect(() => {
    if (!open) return
    setSlotError(null)
    setFormError(null)
    setNewClient(false)
    setClientQuery('')
    setNewName('')
    setNewPhone('')
    if (editing) {
      setClientId(editing.clientId)
      setServiceIds([...editing.serviceIds])
      setMasterId(editing.masterId)
      const d = new Date(editing.start)
      setDateYmd(toYmd(d))
      setStartHHMM(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
      setStatus(editing.status === 'cancelled' ? 'booked' : editing.status)
      setNote(editing.note)
      setPayAmount(editing.payment ? String(editing.payment.amount) : '')
      setPayMethod(editing.payment?.method ?? 'cash')
    } else {
      setClientId(null)
      setServiceIds([])
      setStatus('booked')
      setNote('')
      setPayAmount('')
      setPayMethod('cash')
      const pm = prefill?.masterId ?? masters[0]?.id ?? ''
      setMasterId(pm)
      if (prefill?.start) {
        const d = new Date(prefill.start)
        setDateYmd(toYmd(d))
        setStartHHMM(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
      } else {
        setDateYmd(toYmd(new Date()))
        setStartHHMM('10:00')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const selectedServices = useMemo(
    () => services.filter((s) => serviceIds.includes(s.id)),
    [services, serviceIds],
  )
  const totalDuration = selectedServices.reduce((s, x) => s + x.durationMin, 0)
  const totalPrice = selectedServices.reduce((s, x) => s + x.price, 0)

  const startIso = combineDateTime(dateYmd, startHHMM)
  const endMinutes = minutesOfDay(startIso) + totalDuration
  const endLabel = `${pad(Math.floor(endMinutes / 60) % 24)}:${pad(
    endMinutes % 60,
  )}`

  const master = masters.find((m) => m.id === masterId)
  // services this master performs are surfaced first
  const availableServices = useMemo(() => {
    return [...services]
      .filter((s) => s.active || serviceIds.includes(s.id))
      .sort((a, b) => {
        const am = master?.serviceIds.includes(a.id) ? 0 : 1
        const bm = master?.serviceIds.includes(b.id) ? 0 : 1
        return am - bm
      })
  }, [services, master, serviceIds])

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    if (!q) return clients.slice(0, 6)
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')),
      )
      .slice(0, 8)
  }, [clients, clientQuery])

  const selectedClient = clients.find((c) => c.id === clientId) ?? null

  function toggleService(id: string) {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function handleSave() {
    setFormError(null)
    setSlotError(null)

    // validate client
    let finalClientId = clientId
    if (newClient) {
      if (!newName.trim() || !newPhone.trim()) {
        setFormError('Yangi mijoz uchun ism va telefon kiriting.')
        return
      }
    } else if (!finalClientId) {
      setFormError('Mijozni tanlang yoki yangi mijoz qo‘shing.')
      return
    }
    if (serviceIds.length === 0) {
      setFormError('Kamida bitta xizmat tanlang.')
      return
    }
    if (!masterId) {
      setFormError('Ustani tanlang.')
      return
    }

    setSaving(true)
    try {
      // double-booking check
      const free = await api.isSlotFree(
        masterId,
        startIso,
        totalDuration,
        editing?.id,
      )
      if (!free) {
        setSlotError('Bu vaqt band')
        setSaving(false)
        return
      }

      if (newClient) {
        const created = await api.saveClient({
          name: newName.trim(),
          phone: newPhone.trim(),
          birthday: null,
          note: '',
          tagIds: [],
        })
        finalClientId = created.id
      }

      const payment =
        status === 'completed' && payAmount.trim()
          ? { amount: Number(payAmount.replace(/\s/g, '')) || 0, method: payMethod }
          : null

      await api.saveAppointment({
        id: editing?.id,
        clientId: finalClientId!,
        masterId,
        serviceIds,
        start: startIso,
        durationMin: totalDuration,
        status,
        note,
        payment,
      })
      toast('Saqlandi')
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (!editing) return
    if (!window.confirm('Bandlovni bekor qilasizmi?')) return
    setSaving(true)
    try {
      await api.cancelAppointment(editing.id)
      toast('Bekor qilindi')
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Bandlovni tahrirlash' : 'Yangi bandlov'}
      subtitle={
        totalDuration > 0
          ? `${formatTime(startIso)}–${endLabel} · ${formatDuration(totalDuration)}`
          : 'Mijoz, xizmat va vaqtni tanlang'
      }
      footer={
        <div className="flex flex-col gap-2">
          {slotError && (
            <p className="text-center text-xs font-medium text-clay">
              {slotError}
            </p>
          )}
          <div className="flex gap-2">
            {editing && (
              <Button variant="ghost" onClick={handleCancel} className="text-clay">
                Bekor qilish
              </Button>
            )}
            <Button
              variant="brass"
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saqlanmoqda…' : 'Saqlash'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* ---------- Client ---------- */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label>Mijoz</Label>
            <button
              type="button"
              onClick={() => {
                setNewClient((v) => !v)
                setClientId(null)
              }}
              className="inline-flex items-center gap-1 text-2xs font-medium text-brass hover:underline"
            >
              <IconPlus width={14} height={14} />
              {newClient ? 'Ro‘yxatdan tanlash' : 'Yangi mijoz'}
            </button>
          </div>

          {newClient ? (
            <div className="grid grid-cols-1 gap-2">
              <Input
                placeholder="Ism familiya"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="+998 90 000 00 00"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                inputMode="tel"
              />
            </div>
          ) : selectedClient ? (
            <button
              type="button"
              onClick={() => setClientId(null)}
              className="flex w-full items-center gap-3 rounded-[10px] border border-brass bg-brass/5 px-3 py-2.5 text-left"
            >
              <Avatar name={selectedClient.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-graphite">
                  {selectedClient.name}
                </p>
                <p className="tabular truncate text-2xs text-stone">
                  {selectedClient.phone}
                </p>
              </div>
              <span className="text-2xs text-brass">O‘zgartirish</span>
            </button>
          ) : (
            <div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone">
                  <IconSearch width={18} height={18} />
                </span>
                <Input
                  className="pl-10"
                  placeholder="Ism yoki telefon bo‘yicha qidiring"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                />
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {filteredClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setClientId(c.id)}
                    className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 text-left hover:bg-graphite/5"
                  >
                    <Avatar name={c.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-graphite">
                        {c.name}
                      </p>
                      <p className="tabular truncate text-2xs text-stone">
                        {c.phone}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredClients.length === 0 && (
                  <p className="px-2 py-2 text-2xs text-stone">
                    Topilmadi. “Yangi mijoz” tugmasini bosing.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ---------- Services ---------- */}
        <div>
          <Label>Xizmatlar</Label>
          <div className="flex flex-col gap-1.5">
            {availableServices.map((s) => {
              const active = serviceIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-[10px] border px-3 py-2 text-left transition-colors',
                    active
                      ? 'border-brass bg-brass/10'
                      : 'border-hairline-light bg-white hover:border-stone/40',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border',
                      active
                        ? 'border-brass bg-brass text-graphite'
                        : 'border-stone/40',
                    )}
                  >
                    {active && <IconCheck width={14} height={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-graphite">
                      {s.name}
                    </span>
                    <span className="tabular block text-2xs text-stone">
                      {formatDuration(s.durationMin)}
                    </span>
                  </span>
                  <span className="tabular text-xs font-bold text-graphite">
                    {formatMoney(s.price)}
                  </span>
                </button>
              )
            })}
          </div>
          {serviceIds.length > 0 && (
            <div className="mt-2 flex items-center justify-between rounded-[10px] bg-graphite/[0.04] px-3 py-2">
              <span className="text-xs text-stone">
                Jami · {formatDuration(totalDuration)}
              </span>
              <span className="tabular text-base font-bold text-graphite">
                {formatMoney(totalPrice)}
              </span>
            </div>
          )}
        </div>

        {/* ---------- Master ---------- */}
        <Field label="Usta">
          <div className="flex flex-wrap gap-2">
            {masters.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMasterId(m.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  masterId === m.id
                    ? 'border-brass bg-brass/10 text-graphite'
                    : 'border-hairline-light text-stone hover:text-graphite',
                )}
              >
                <Avatar name={m.name} color={m.color} size="sm" className="h-6 w-6 text-[9px]" />
                {m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </Field>

        {/* ---------- Date & time ---------- */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sana">
            <Input
              type="date"
              value={dateYmd}
              onChange={(e) => setDateYmd(e.target.value)}
            />
          </Field>
          <Field label="Boshlanish" hint={totalDuration > 0 ? `Tugash: ${endLabel}` : undefined}>
            <Input
              type="time"
              step={900}
              value={startHHMM}
              onChange={(e) => setStartHHMM(e.target.value)}
              invalid={Boolean(slotError)}
            />
          </Field>
        </div>

        {/* ---------- Status ---------- */}
        <Field label="Holat">
          <Segmented
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            size="sm"
            className="flex-wrap"
          />
        </Field>

        {/* ---------- Payment (only when completed) ---------- */}
        {status === 'completed' && (
          <div className="rounded-[10px] border border-sage/30 bg-sage/[0.06] p-3">
            <Label>To‘lov</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder={String(totalPrice)}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                className="tabular"
              />
              <Segmented
                options={PAY_OPTIONS}
                value={payMethod}
                onChange={setPayMethod}
                size="sm"
              />
            </div>
            <p className="mt-1 text-2xs text-stone">
              Summani kiritmasangiz, to‘lov qayd etilmaydi.
            </p>
          </div>
        )}

        {/* ---------- Note ---------- */}
        <Field label="Izoh">
          <Textarea
            placeholder="Qo‘shimcha izoh (ixtiyoriy)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {formError && (
          <p className="text-xs font-medium text-clay">{formError}</p>
        )}

        {/* Drag-to-move hook lives in the Journal grid — see TODO there. */}
      </div>
    </Sheet>
  )
}
