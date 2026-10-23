'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label, Select } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import {
  MIN_CLEANING_DURATION_MINUTES,
  defaultEndTimeFromStart,
  filterNewSlots,
  generateSlotsForRange,
  slotKey,
  validateSlotDuration,
} from '@/lib/availability'
import { supabase } from '@/lib/supabase'
import type { AvailabilitySlot, Employee } from '@/lib/types'

export default function AdminAvailabilityPage() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dayStart, setDayStart] = useState('08:00')
  const [dayEnd, setDayEnd] = useState('18:00')
  const [bulkEmployeeId, setBulkEmployeeId] = useState('')

  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [manualStart, setManualStart] = useState('09:00')
  const [manualEnd, setManualEnd] = useState(defaultEndTimeFromStart('09:00'))
  const [manualEmployeeId, setManualEmployeeId] = useState('')

  const load = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const [slotsRes, empRes] = await Promise.all([
      supabase
        .from('availability_slots')
        .select('*')
        .gte('slot_date', today)
        .order('slot_date')
        .order('start_time')
        .limit(400),
      supabase.from('employees').select('*').eq('active', true).order('full_name'),
    ])
    setSlots((slotsRes.data as AvailabilitySlot[]) || [])
    setEmployees((empRes.data as Employee[]) || [])
    if (slotsRes.error) setMessage(slotsRes.error.message)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const slotsByDate = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>()
    for (const s of slots) {
      const list = map.get(s.slot_date) || []
      list.push(s)
      map.set(s.slot_date, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [slots])

  async function onGenerateBulk(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setMessage(null)

    if (timeToMin(dayEnd) - timeToMin(dayStart) < MIN_CLEANING_DURATION_MINUTES) {
      setMessage('O expediente precisa ter pelo menos 2 horas para gerar um bloco.')
      setBusy(false)
      return
    }

    const candidates = generateSlotsForRange(fromDate, toDate, dayStart, dayEnd)
    if (!candidates.length) {
      setMessage('Nenhum horário a gerar — confira as datas e o intervalo do dia.')
      setBusy(false)
      return
    }

    const { data: existing } = await supabase
      .from('availability_slots')
      .select('slot_date, start_time')
      .gte('slot_date', fromDate)
      .lte('slot_date', toDate)

    const toInsert = filterNewSlots(candidates, existing || []).map((s) => ({
      ...s,
      employee_id: bulkEmployeeId || null,
      is_open: true,
      created_by: user.id,
    }))

    if (!toInsert.length) {
      setMessage('Todos os horários desse período já existem na agenda.')
      setBusy(false)
      return
    }

    const { error } = await supabase.from('availability_slots').insert(toInsert)
    setBusy(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage(`${toInsert.length} horário(s) publicado(s). Os clientes já podem agendar.`)
    await load()
  }

  async function onManualAdd(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    const err = validateSlotDuration(manualStart, manualEnd)
    if (err) {
      setMessage(err)
      return
    }
    setBusy(true)
    setMessage(null)

    const dup = slots.find((s) => slotKey(s) === slotKey({ slot_date: manualDate, start_time: manualStart }))
    if (dup) {
      setMessage('Já existe um horário nesse dia e início.')
      setBusy(false)
      return
    }

    const { error } = await supabase.from('availability_slots').insert({
      slot_date: manualDate,
      start_time: manualStart,
      end_time: manualEnd,
      employee_id: manualEmployeeId || null,
      is_open: true,
      created_by: user.id,
    })
    setBusy(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Horário adicionado.')
    await load()
  }

  async function removeSlot(id: string) {
    if (!window.confirm('Remover este horário da agenda?')) return
    const { error } = await supabase.from('availability_slots').delete().eq('id', id)
    if (error) {
      setMessage(error.message)
      return
    }
    await load()
  }

  async function toggleOpen(slot: AvailabilitySlot) {
    if (!slot.is_open) {
      const { error } = await supabase
        .from('availability_slots')
        .update({ is_open: true })
        .eq('id', slot.id)
      if (error) setMessage(error.message)
      else await load()
      return
    }
    if (!window.confirm('Fechar este horário? Clientes deixam de vê-lo.')) return
    const { error } = await supabase
      .from('availability_slots')
      .update({ is_open: false })
      .eq('id', slot.id)
    if (error) setMessage(error.message)
    else await load()
  }

  return (
    <AppShell
      title="Disponibilidade"
      subtitle="Publique blocos de 2 horas. Só horários abertos aparecem para o cliente agendar."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Gerar agenda em lote</h2>
          <form className="space-y-3" onSubmit={onGenerateBulk}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>De</Label>
                <Input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label>Até</Label>
                <Input type="date" required value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Início do expediente</Label>
                <Input type="time" required value={dayStart} onChange={(e) => setDayStart(e.target.value)} />
              </div>
              <div>
                <Label>Fim do expediente</Label>
                <Input type="time" required value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} />
              </div>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Blocos de {MIN_CLEANING_DURATION_MINUTES / 60} h (ex.: 08:00–10:00, 10:00–12:00…).
            </p>
            <div>
              <Label>Funcionária (opcional)</Label>
              <Select value={bulkEmployeeId} onChange={(e) => setBulkEmployeeId(e.target.value)}>
                <option value="">Qualquer / definir na confirmação</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? 'Gerando…' : 'Publicar horários'}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">Um horário avulso</h2>
          <form className="space-y-3" onSubmit={onManualAdd}>
            <div>
              <Label>Data</Label>
              <Input type="date" required value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Início</Label>
                <Input
                  type="time"
                  required
                  value={manualStart}
                  onChange={(e) => {
                    const v = e.target.value
                    setManualStart(v)
                    setManualEnd(defaultEndTimeFromStart(v))
                  }}
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="time" required value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Funcionária (opcional)</Label>
              <Select value={manualEmployeeId} onChange={(e) => setManualEmployeeId(e.target.value)}>
                <option value="">Qualquer</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={busy}>
              Adicionar
            </Button>
          </form>
        </Card>
      </div>

      {message && <p className="mt-4 text-sm text-[var(--muted)]">{message}</p>}

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Calendário publicado</h2>
        {slotsByDate.length === 0 ? (
          <EmptyState text="Nenhum horário futuro. Gere a agenda acima para os clientes poderem agendar." />
        ) : (
          <div className="space-y-4">
            {slotsByDate.map(([date, daySlots]) => (
              <div key={date}>
                <h3 className="mb-2 font-medium capitalize">
                  {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {daySlots.map((s) => (
                    <Card key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="font-medium">
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {s.is_open ? 'Aberto para clientes' : 'Reservado / fechado'}
                          {s.employee_id ? ' · com faxineira' : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => void toggleOpen(s)}>
                          {s.is_open ? 'Fechar' : 'Reabrir'}
                        </Button>
                        {s.is_open && (
                          <Button type="button" variant="ghost" onClick={() => void removeSlot(s.id)}>
                            Excluir
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function timeToMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}
