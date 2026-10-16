'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Label, Select } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data: c } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      const clientRow = c as Client | null
      setClient(clientRow)
      if (!clientRow) return

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
          .gte('slot_date', format(new Date(), 'yyyy-MM-dd'))
          .order('slot_date')
          .order('start_time'),
      ])
      const props = (propsRes.data as Property[]) || []
      setProperties(props)
      setSlots((slotsRes.data as AvailabilitySlot[]) || [])
      if (props[0]) setPropertyId(props[0].id)
    }
    void load()
  }, [user])

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === propertyId) || null,
    [properties, propertyId]
  )

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === slotId) || null,
    [slots, slotId]
  )

  const quote = selectedProperty ? resolvePropertyPrice(selectedProperty) : null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!client || !selectedProperty || !selectedSlot || !quote) return
    setSaving(true)
    setMessage(null)

    const scheduledStart = combineDateAndTime(
      selectedSlot.slot_date,
      selectedSlot.start_time
    )
    const scheduledEnd = combineDateAndTime(
      selectedSlot.slot_date,
      selectedSlot.end_time
    )

    const { error } = await supabase.from('cleanings').insert({
      property_id: selectedProperty.id,
      client_id: client.id,
      availability_slot_id: selectedSlot.id,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      status: 'requested',
      pricing_type: quote.pricing_type,
      unit_price: quote.unit_price,
      hours: quote.hours,
      revenue_amount: quote.revenue_amount,
      employee_pay_amount: 0,
      notes: 'Solicitação do cliente — aguardando confirmação da admin',
    })

    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(
      'Solicitação enviada! A admin precisa confirmar e atribuir a funcionária.'
    )
    setSlotId('')
  }

  return (
    <AppShell title="Agendar limpeza">
      {!client ? (
        <EmptyState text="Conta de cliente não vinculada." />
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
                      {format(combineDateAndTime(s.slot_date, s.start_time), "dd/MM HH:mm", {
                        locale: ptBR,
                      })}
                      –{s.end_time.slice(0, 5)}
                    </option>
                  ))}
                </Select>
              </div>
              {quote && (
                <p className="rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">
                  Valor estimado: <strong>{formatBRL(quote.revenue_amount)}</strong>
                </p>
              )}
              {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
              <Button type="submit" disabled={saving || !slotId || !propertyId}>
                {saving ? 'Enviando…' : 'Solicitar faxina'}
              </Button>
            </form>
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Calendário de vagas</h2>
            {slots.length === 0 ? (
              <EmptyState text="Não há horários abertos no momento." />
            ) : (
              <div className="space-y-2">
                {slots.map((s) => (
                  <Card
                    key={s.id}
                    className={`cursor-pointer ${slotId === s.id ? 'border-[var(--brand)]' : ''}`}
                    onClick={() => setSlotId(s.id)}
                  >
                    <p className="font-medium">
                      {format(combineDateAndTime(s.slot_date, s.start_time), "EEEE, dd/MM", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
