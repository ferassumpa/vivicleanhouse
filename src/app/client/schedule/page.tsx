'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Label, Select } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { MIN_CLEANING_DURATION_MINUTES } from '@/lib/availability'
import { combineDateAndTime, resolvePropertyPrice } from '@/lib/pricing'
import { supabase } from '@/lib/supabase'
import {
  formatBRL,
  type AvailabilitySlot,
  type Client,
  type Property,
} from '@/lib/types'

export default function ClientSchedulePage() {
  const { user } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [slotId, setSlotId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    setProperties(props)
    setSlots((slotsRes.data as AvailabilitySlot[]) || [])
    if (props[0]) setPropertyId((prev) => prev || props[0].id)
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

  const quote = selectedProperty ? resolvePropertyPrice(selectedProperty) : null

  const slotsByDate = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>()
    for (const s of slots) {
      const list = map.get(s.slot_date) || []
      list.push(s)
      map.set(s.slot_date, list)
    }
    return [...map.entries()]
  }, [slots])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!client || !selectedProperty || !selectedSlot || !quote) return
    setSaving(true)
    setMessage(null)

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

    setMessage(
      'Solicitação enviada! A vaga foi reservada até a admin confirmar a faxina.'
    )
    setSlotId('')
    await load()
  }

  return (
    <AppShell title="Agendar limpeza">
      {!client ? (
        <EmptyState text="Conta de cliente não vinculada." />
      ) : properties.length === 0 ? (
        <EmptyState text="Cadastre um imóvel antes de agendar." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card>
            <form className="space-y-3" onSubmit={onSubmit}>
              <div>
                <Label>Imóvel</Label>
                <Select
                  required
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Horário disponível</Label>
                <Select required value={slotId} onChange={(e) => setSlotId(e.target.value)}>
                  <option value="">Selecione</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {format(combineDateAndTime(s.slot_date, s.start_time), "dd/MM (EEE) HH:mm", {
                        locale: ptBR,
                      })}
                      – {s.end_time.slice(0, 5)} ({MIN_CLEANING_DURATION_MINUTES / 60} h)
                    </option>
                  ))}
                </Select>
              </div>
              {quote && (
                <p className="rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">
                  Valor estimado: <strong>{formatBRL(quote.revenue_amount)}</strong>
                </p>
              )}
              {(message || loadError) && (
                <p className="text-sm text-[var(--muted)]">{message || loadError}</p>
              )}
              <Button type="submit" disabled={saving || !slotId || !propertyId || slots.length === 0}>
                {saving ? 'Enviando…' : 'Solicitar faxina'}
              </Button>
            </form>
          </Card>

          <div>
            <h2 className="mb-1 text-lg font-semibold">Horários abertos</h2>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Cada vaga reserva {MIN_CLEANING_DURATION_MINUTES / 60} horas de limpeza. Toque em um horário
              para selecionar.
            </p>
            {slots.length === 0 ? (
              <EmptyState text="Não há horários abertos no momento. A equipe ainda vai publicar a agenda — tente de novo em breve." />
            ) : (
              <div className="space-y-5">
                {slotsByDate.map(([date, daySlots]) => (
                  <div key={date}>
                    <h3 className="mb-2 font-medium capitalize">
                      {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {daySlots.map((s) => (
                        <Card
                          key={s.id}
                          className={`cursor-pointer transition-colors ${
                            slotId === s.id ? 'border-[var(--pink-deep)] ring-1 ring-[var(--pink-deep)]' : ''
                          }`}
                          onClick={() => setSlotId(s.id)}
                        >
                          <p className="font-medium">
                            {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                          </p>
                          <p className="text-sm text-[var(--muted)]">
                            Duração mínima {MIN_CLEANING_DURATION_MINUTES / 60} h
                          </p>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
