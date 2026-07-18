import { useEffect, useState } from 'react'
import type { PaymentMethod, Salon } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Toggle, ToggleRow } from '@/components/ui/Toggle'
import { Chip } from '@/components/ui/Chip'
import { Segmented } from '@/components/ui/Segmented'
import { Skeleton } from '@/components/ui/Skeleton'
import { IconUpload, IconMap } from '@/components/icons'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { weekdayName, formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'

const REMINDER_OPTIONS = [
  { hours: 48, label: '48 soat oldin' },
  { hours: 24, label: '24 soat oldin' },
  { hours: 3, label: '3 soat oldin' },
  { hours: 2, label: '2 soat oldin' },
  { hours: 1, label: '1 soat oldin' },
]

const PAY_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'payme', label: 'Payme' },
  { value: 'click', label: 'Click' },
  { value: 'cash', label: 'Naqd' },
]

export function Settings() {
  const { toast } = useToast()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void api.getSalon().then(setSalon)
  }, [])

  function patch(p: Partial<Salon>) {
    setSalon((prev) => (prev ? { ...prev, ...p } : prev))
  }

  async function saveAll() {
    if (!salon) return
    setSaving(true)
    try {
      await api.updateSalon(salon)
      toast('Saqlandi')
    } finally {
      setSaving(false)
    }
  }

  if (!salon) {
    return (
      <div>
        <PageHeader title="Sozlamalar" />
        <div className="flex flex-col gap-4 px-4 py-4 md:px-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const prepay = salon.prepayment

  return (
    <div>
      <PageHeader
        title="Sozlamalar"
        actions={
          <Button variant="brass" onClick={saveAll} disabled={saving}>
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
        }
      />

      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4 md:px-8">
        {/* 1. Salon profili */}
        <Card>
          <CardHeader title="Salon profili" subtitle="Mijozlar ko‘radigan ma’lumot" />
          <div className="flex flex-col gap-4 px-5 pb-5">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-brass font-display text-lg font-semibold text-graphite">
                SB
              </span>
              <Button variant="outline" onClick={() => toast('Rasm yuklash — tez orada')}>
                <IconUpload width={18} height={18} />
                Logo / cover yuklash
              </Button>
            </div>
            <Field label="Nom">
              <Input value={salon.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Manzil">
              <div className="flex gap-2">
                <Input
                  value={salon.address}
                  onChange={(e) => patch({ address: e.target.value })}
                />
                <Button variant="outline" onClick={() => toast('Xarita — tez orada')} aria-label="Xaritada belgilash">
                  <IconMap />
                </Button>
              </div>
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Telefon">
                <Input
                  value={salon.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  className="tabular"
                />
              </Field>
              <Field label="Instagram">
                <Input
                  value={salon.instagram}
                  onChange={(e) => patch({ instagram: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* 2. Ish vaqti */}
        <Card>
          <CardHeader title="Ish vaqti" subtitle="Har kun uchun ochilish va yopilish" />
          <div className="flex flex-col gap-1.5 px-5 pb-5">
            {salon.workingHours.map((w) => (
              <div
                key={w.weekday}
                className="flex items-center gap-3 rounded-[10px] bg-white px-3 py-2"
              >
                <span className="w-20 text-xs text-graphite">
                  {weekdayName(w.weekday)}
                </span>
                <Toggle
                  checked={w.open}
                  onChange={(v) =>
                    patch({
                      workingHours: salon.workingHours.map((x) =>
                        x.weekday === w.weekday ? { ...x, open: v } : x,
                      ),
                    })
                  }
                  ariaLabel={`${weekdayName(w.weekday)} ochiq`}
                />
                {w.open ? (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      type="time"
                      value={w.from}
                      onChange={(e) =>
                        patch({
                          workingHours: salon.workingHours.map((x) =>
                            x.weekday === w.weekday ? { ...x, from: e.target.value } : x,
                          ),
                        })
                      }
                      className="tabular w-full rounded-[8px] border border-hairline-light px-2 py-1 text-xs"
                    />
                    <span className="text-stone">–</span>
                    <input
                      type="time"
                      value={w.to}
                      onChange={(e) =>
                        patch({
                          workingHours: salon.workingHours.map((x) =>
                            x.weekday === w.weekday ? { ...x, to: e.target.value } : x,
                          ),
                        })
                      }
                      className="tabular w-full rounded-[8px] border border-hairline-light px-2 py-1 text-xs"
                    />
                  </div>
                ) : (
                  <span className="flex-1 text-2xs text-stone">Dam olish kuni</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* 3. Bildirishnomalar */}
        <Card>
          <CardHeader title="Bildirishnomalar" subtitle="Telegram orqali eslatmalar" />
          <div className="flex flex-col gap-3 px-5 pb-5">
            <ToggleRow
              title="Telegram eslatma"
              desc="Mijozga bandlov haqida eslatma yuboriladi."
              checked={salon.notifications.telegramReminder}
              onChange={(v) =>
                patch({
                  notifications: { ...salon.notifications, telegramReminder: v },
                })
              }
            />
            {salon.notifications.telegramReminder && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-graphite">
                  Qachon eslatilsin
                </p>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_OPTIONS.map((o) => {
                    const on = salon.notifications.reminderTimings.includes(o.hours)
                    return (
                      <Chip
                        key={o.hours}
                        active={on}
                        onClick={() =>
                          patch({
                            notifications: {
                              ...salon.notifications,
                              reminderTimings: on
                                ? salon.notifications.reminderTimings.filter(
                                    (h) => h !== o.hours,
                                  )
                                : [...salon.notifications.reminderTimings, o.hours],
                            },
                          })
                        }
                      >
                        {o.label}
                      </Chip>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="h-px bg-hairline-light" />
            <ToggleRow
              title="Tasdiqlash xabari"
              desc="Bandlov yaratilganda mijozga tasdiq xabari yuboriladi."
              checked={salon.notifications.confirmationMessage}
              onChange={(v) =>
                patch({
                  notifications: { ...salon.notifications, confirmationMessage: v },
                })
              }
            />
          </div>
        </Card>

        {/* 4. Oldindan to'lov */}
        <Card>
          <CardHeader title="Oldindan to‘lov" subtitle="Depozit talab qilish" />
          <div className="flex flex-col gap-3 px-5 pb-5">
            <ToggleRow
              title="Depozit talab qilinsin"
              desc="Bandlovni tasdiqlash uchun mijoz oldindan to‘laydi."
              checked={prepay.required}
              onChange={(v) => patch({ prepayment: { ...prepay, required: v } })}
            />
            {prepay.required && (
              <>
                <div className="grid grid-cols-[auto_1fr] items-end gap-3">
                  <Field label="Turi">
                    <Segmented
                      options={[
                        { value: 'percent', label: 'Foiz %' },
                        { value: 'amount', label: 'Summa' },
                      ]}
                      value={prepay.kind}
                      onChange={(k) => patch({ prepayment: { ...prepay, kind: k } })}
                      size="sm"
                    />
                  </Field>
                  <Field label={prepay.kind === 'percent' ? 'Foiz' : 'Summa (so‘m)'}>
                    <Input
                      inputMode="numeric"
                      value={String(prepay.value)}
                      onChange={(e) =>
                        patch({
                          prepayment: {
                            ...prepay,
                            value: Number(e.target.value.replace(/[^\d]/g, '')) || 0,
                          },
                        })
                      }
                      className="tabular"
                    />
                  </Field>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-graphite">
                    To‘lov usullari
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PAY_METHODS.map((m) => {
                      const on = prepay.methods.includes(m.value)
                      return (
                        <Chip
                          key={m.value}
                          active={on}
                          onClick={() =>
                            patch({
                              prepayment: {
                                ...prepay,
                                methods: on
                                  ? prepay.methods.filter((x) => x !== m.value)
                                  : [...prepay.methods, m.value],
                              },
                            })
                          }
                        >
                          {m.label}
                        </Chip>
                      )
                    })}
                  </div>
                </div>
                <p className="rounded-[10px] bg-brass/[0.08] px-3 py-2.5 text-2xs text-graphite">
                  Mijoz nimani ko‘radi:{' '}
                  <span className="font-medium">
                    {prepay.kind === 'percent'
                      ? `Bandlovni tasdiqlash uchun xizmat narxining ${prepay.value}% miqdorida oldindan to‘lov talab qilinadi.`
                      : `Bandlovni tasdiqlash uchun ${formatMoney(
                          prepay.value,
                        )} oldindan to‘lov talab qilinadi.`}
                  </span>
                </p>
              </>
            )}
          </div>
        </Card>

        {/* 5. Bekor qilish siyosati */}
        <Card>
          <CardHeader
            title="Bekor qilish siyosati"
            subtitle="Mijoz qancha vaqt oldin bekor qila oladi"
          />
          <div className="px-5 pb-5">
            <Field
              label="Necha soat oldin bekor qilish mumkin"
              hint={`Mijoz bandlovdan ${salon.cancellation.minHoursBefore} soat oldin bepul bekor qila oladi.`}
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={String(salon.cancellation.minHoursBefore)}
                  onChange={(e) =>
                    patch({
                      cancellation: {
                        minHoursBefore: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className={cn('tabular w-28')}
                />
                <span className="text-xs text-stone">soat</span>
              </div>
            </Field>
          </div>
        </Card>
      </div>
    </div>
  )
}
