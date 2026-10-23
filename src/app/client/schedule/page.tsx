'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Home,
  Sparkles,
} from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { DayCarousel } from '@/components/client/DayCarousel'
import { Button, Card, EmptyState, Label, Select } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { MIN_CLEANING_DURATION_MINUTES } from '@/lib/availability'
import { combineDateAndTime } from '@/lib/pricing'
import { supabase } from '@/lib/supabase'
import type { AvailabilitySlot, Client, Property } from '@/lib/types'

export default function ClientSchedulePage() {
  const { user } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [slotId, setSlotId] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [booked, setBooked] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoadError(null)
    const { data: c } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    const clientRow = c as Client | null
    setClient(clientRow)
    if (!clientRow) return

    const today = format(new Date(), 'yyyy-MM-dd')
    const [propsRes, slotsRes] = await Promise.all([
      supabase
        .from('properties')
        .select('*')
        .eq('client_id', clientRow.id)
        .eq('active', true)
        .order('label'),
      supabase
        .from('availability_slots')
        .select('*')
        .eq('is_open', true)
        .gte('slot_date', today)
        .order('slot_date')
        .order('start_time'),
    ])
    if (propsRes.error) setLoadError(propsRes.error.message)
    if (slotsRes.error) setLoadError(slotsRes.error.message)

    const props = (propsRes.data as Property[]) || []
    const slotList = (slotsRes.data as AvailabilitySlot[]) || []
    setProperties(props)
    setSlots(slotList)
    if (props[0]) setPropertyId((prev) => prev || props[0].id)
    if (slotList[0]) {
      setSelectedDate((prev) => prev || slotList[0].slot_date)
    } else {
      setSelectedDate(null)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === propertyId) || null,
    [properties, propertyId]
  )

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === slotId) || null,
    [slots, slotId]
  )

  const slotsByDate = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>()
    for (const s of slots) {
      const list = map.get(s.slot_date) || []
      list.push(s)
      map.set(s.slot_date, list)
    }
    return [...map.entries()]
  }, [slots])

  const carouselDates = useMemo(
    () => slotsByDate.map(([date, daySlots]) => ({ date, slotCount: daySlots.length })),
    [slotsByDate]
  )

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDate) return []
    return slots.filter((s) => s.slot_date === selectedDate)
  }, [slots, selectedDate])

  const step = !propertyId ? 1 : !slotId ? 2 : 3

  useEffect(() => {
    if (selectedDate && slotId) {
      const stillValid = slots.some((s) => s.id === slotId && s.slot_date === selectedDate)
      if (!stillValid) setSlotId('')
    }
  }, [selectedDate, slotId, slots])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!client || !selectedProperty || !selectedSlot) return
    setSaving(true)
    setMessage(null)
    setBooked(false)

    const { error } = await supabase.rpc('book_cleaning_request', {
      p_property_id: selectedProperty.id,
      p_slot_id: selectedSlot.id,
    })

    setSaving(false)
    if (error) {
      let msg = error.message
      if (msg.includes('Could not find the function') || error.code === 'PGRST202') {
        msg =
          'Agendamento ainda não está ativo no banco. Peça para rodar docs/sql/009_client_book_cleaning_rpc.sql no Supabase.'
      }
      setMessage(msg)
      if (msg.includes('disponível') || msg.includes('reservado')) await load()
      return
    }

    setBooked(true)
    setMessage(null)
    setSlotId('')
    await load()
  }

  return (
    <AppShell
      title="Agendar limpeza"
      subtitle="Escolha o imóvel, o dia e o horário — cada vaga reserva 2 horas de faxina."
    >
      {!client ? (
        <EmptyState text="Conta de cliente não vinculada." />
      ) : properties.length === 0 ? (
        <EmptyState text="Cadastre um imóvel antes de agendar." />
      ) : (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-gradient-to-br from-[var(--pink-soft)] via-white to-[var(--soft)] p-6 shadow-sm md:p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--pink)]/30 blur-2xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-[var(--pink-deep)]">
                  <Sparkles size={18} /> Vivi Clean house
                </p>
                <h2 className="mt-1 font-display text-2xl text-[var(--navy)] md:text-3xl">
                  Reserve sua próxima faxina
                </h2>
                <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
                  Horários liberados pela equipe. Após solicitar, acompanhe o status em{' '}
                  <Link href="/client/bookings" className="font-semibold text-[var(--pink-deep)] hover:underline">
                    Minhas faxinas
                  </Link>
                  .
                </p>
              </div>
              <div className="flex gap-2 rounded-2xl bg-white/80 px-4 py-3 text-center shadow-sm backdrop-blur">
                <div>
                  <p className="text-2xl font-display font-semibold text-[var(--navy)]">{slots.length}</p>
                  <p className="text-xs text-[var(--muted)]">vagas abertas</p>
                </div>
                <div className="mx-2 w-px bg-[var(--line)]" />
                <div>
                  <p className="text-2xl font-display font-semibold text-[var(--navy)]">
                    {carouselDates.length}
                  </p>
                  <p className="text-xs text-[var(--muted)]">dias</p>
                </div>
              </div>
            </div>

            <ol className="relative mt-6 flex flex-wrap gap-2 md:gap-4">
              {[
                { n: 1, label: 'Imóvel', icon: <Home size={16} /> },
                { n: 2, label: 'Dia e hora', icon: <CalendarDays size={16} /> },
                { n: 3, label: 'Confirmar', icon: <Check size={16} /> },
              ].map((s) => (
                <li
                  key={s.n}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    step >= s.n
                      ? 'bg-[var(--navy)] text-white'
                      : 'bg-white/70 text-[var(--muted)]'
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
                    {step > s.n ? <Check size={14} /> : s.n}
                  </span>
                  {s.icon}
                  {s.label}
                </li>
              ))}
            </ol>
          </div>

          <AnimatePresence>
            {booked && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900"
              >
                <p className="font-semibold">Solicitação enviada com sucesso!</p>
                <p className="mt-1 text-emerald-800">
                  A vaga foi reservada. A equipe confirma em breve — veja em Minhas faxinas.
                </p>
                <Link href="/client/bookings" className="mt-3 inline-block">
                  <Button variant="secondary" type="button">
                    Ver minhas faxinas <ChevronRight size={16} />
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <Home size={16} /> 1. Qual imóvel?
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {properties.map((p) => {
                    const active = p.id === propertyId
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPropertyId(p.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          active
                            ? 'border-[var(--pink-deep)] bg-white shadow-md ring-2 ring-[var(--pink-soft)]'
                            : 'border-[var(--line)] bg-white/90 hover:border-[var(--pink)]'
                        }`}
                      >
                        <p className="font-semibold text-[var(--navy)]">{p.label}</p>
                        {p.address && (
                          <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">{p.address}</p>
                        )}
                        {p.property_type && (
                          <p className="mt-2 text-xs capitalize text-[var(--muted)]">{p.property_type}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <CalendarDays size={16} /> 2. Escolha o dia
                </h3>
                {carouselDates.length === 0 ? (
                  <EmptyState text="Não há horários abertos no momento. A equipe ainda vai publicar a agenda." />
                ) : (
                  <>
                    <DayCarousel
                      dates={carouselDates}
                      selectedDate={selectedDate}
                      onSelectDate={(date) => {
                        setSelectedDate(date)
                        setSlotId('')
                      }}
                    />

                    <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                      <Clock size={16} /> Horários disponíveis
                    </h3>
                    {slotsForSelectedDay.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">Selecione um dia com vagas.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {slotsForSelectedDay.map((s) => {
                          const active = slotId === s.id
                          return (
                            <motion.button
                              key={s.id}
                              type="button"
                              layout
                              onClick={() => setSlotId(s.id)}
                              className={`rounded-2xl border p-4 text-left transition ${
                                active
                                  ? 'border-[var(--pink-deep)] bg-gradient-to-br from-white to-[var(--soft)] shadow-md ring-2 ring-[var(--pink-soft)]'
                                  : 'border-[var(--line)] bg-white hover:border-[var(--pink)]'
                              }`}
                            >
                              <p className="text-lg font-semibold text-[var(--navy)]">
                                {s.start_time.slice(0, 5)}
                                <span className="mx-1 font-normal text-[var(--muted)]">→</span>
                                {s.end_time.slice(0, 5)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {MIN_CLEANING_DURATION_MINUTES / 60} h de limpeza
                              </p>
                              {active && (
                                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-[var(--pink-deep)]">
                                  <Check size={14} /> Selecionado
                                </p>
                              )}
                            </motion.button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>

            <aside className="lg:sticky lg:top-6 lg:self-start">
              <Card className="border-[var(--line)] bg-white/95 p-0 shadow-lg">
                <div className="rounded-t-2xl bg-[var(--navy)] px-5 py-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Resumo</p>
                  <p className="font-display text-xl">Sua solicitação</p>
                </div>
                <form className="space-y-4 p-5" onSubmit={onSubmit}>
                  <div className="hidden">
                    <Label>Imóvel</Label>
                    <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase text-[var(--muted)]">Imóvel</dt>
                      <dd className="font-medium">{selectedProperty?.label || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-[var(--muted)]">Data e hora</dt>
                      <dd className="font-medium">
                        {selectedSlot
                          ? format(
                              combineDateAndTime(selectedSlot.slot_date, selectedSlot.start_time),
                              "EEEE, dd/MM · HH:mm",
                              { locale: ptBR }
                            )
                          : 'Selecione um horário'}
                      </dd>
                    </div>
                  </dl>

                  {(message || loadError) && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {message || loadError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full py-3"
                    disabled={saving || !slotId || !propertyId || slots.length === 0}
                  >
                    {saving ? 'Enviando…' : 'Solicitar faxina'}
                  </Button>
                  <p className="text-center text-xs text-[var(--muted)]">
                    Status inicial: aguardando confirmação da admin
                  </p>
                </form>
              </Card>
            </aside>
          </div>
        </div>
      )}
    </AppShell>
  )
}
