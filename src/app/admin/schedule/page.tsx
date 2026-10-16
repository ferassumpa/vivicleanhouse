'use client'

import { FormEvent, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Select,
  StatusBadge,
} from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { combineDateAndTime } from '@/lib/pricing'
import { supabase } from '@/lib/supabase'
import {
  formatBRL,
  type AvailabilitySlot,
  type Cleaning,
  type Employee,
} from '@/lib/types'

export default function AdminSchedulePage() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [slotDate, setSlotDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')
  const [slotEmployee, setSlotEmployee] = useState('')
  const [assignMap, setAssignMap] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    const [slotsRes, cleaningsRes, employeesRes] = await Promise.all([
      supabase
        .from('availability_slots')
        .select('*')
        .gte('slot_date', format(new Date(), 'yyyy-MM-dd'))
        .order('slot_date')
        .order('start_time'),
      supabase
        .from('cleanings')
        .select(
          '*, properties(id,label,address), clients(id,full_name), employees(id,full_name)'
        )
        .neq('status', 'cancelled')
        .order('scheduled_start', { ascending: true }),
      supabase.from('employees').select('*').eq('active', true).order('full_name'),
    ])
    setSlots((slotsRes.data as AvailabilitySlot[]) || [])
    setCleanings((cleaningsRes.data as Cleaning[]) || [])
    setEmployees((employeesRes.data as Employee[]) || [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function createSlot(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    const { error } = await supabase.from('availability_slots').insert({
      slot_date: slotDate,
      start_time: startTime,
      end_time: endTime,
      employee_id: slotEmployee || null,
      is_open: true,
      created_by: user?.id ?? null,
    })
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Horário disponível criado.')
    await load()
  }

  async function confirmCleaning(cleaning: Cleaning) {
    const employeeId = assignMap[cleaning.id]
    if (!employeeId) {
      setMessage('Selecione a funcionária antes de confirmar.')
      return
    }
    const emp = employees.find((e) => e.id === employeeId)
    const { error } = await supabase
      .from('cleanings')
      .update({
        status: 'confirmed',
        employee_id: employeeId,
        employee_pay_amount: Number(emp?.pay_per_cleaning || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleaning.id)

    if (error) {
      setMessage(error.message)
      return
    }

    if (cleaning.availability_slot_id) {
      await supabase
        .from('availability_slots')
        .update({ is_open: false, employee_id: employeeId })
        .eq('id', cleaning.availability_slot_id)
    }

    setMessage('Faxina confirmada.')
    await load()
  }

  async function cancelCleaning(id: string) {
    await supabase
      .from('cleanings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
    await load()
  }

  const pending = cleanings.filter((c) => c.status === 'requested')
  const upcoming = cleanings.filter((c) =>
    ['confirmed', 'in_progress'].includes(c.status)
  )

  return (
    <AppShell title="Agenda">
      {message && (
        <p className="mb-4 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">{message}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">Abrir disponibilidade</h2>
          <form className="space-y-3" onSubmit={createSlot}>
            <div>
              <Label>Data</Label>
              <Input type="date" required value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Início</Label>
                <Input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Funcionária (opcional)</Label>
              <Select value={slotEmployee} onChange={(e) => setSlotEmployee(e.target.value)}>
                <option value="">Qualquer</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Publicar horário</Button>
          </form>

          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold">Próximos slots</h3>
            {slots.length === 0 ? (
              <EmptyState text="Nenhum horário aberto." />
            ) : (
              slots.slice(0, 8).map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                >
                  {format(combineDateAndTime(s.slot_date, s.start_time), "dd/MM · HH:mm", {
                    locale: ptBR,
                  })}
                  –{s.end_time.slice(0, 5)}
                  {!s.is_open && ' · ocupado'}
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Confirmar solicitações</h2>
            {pending.length === 0 ? (
              <EmptyState text="Nada pendente." />
            ) : (
              <div className="space-y-2">
                {pending.map((c) => (
                  <Card key={c.id} className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {c.properties?.label} · {c.clients?.full_name}
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                          {format(new Date(c.scheduled_start), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}{' '}
                          · {formatBRL(c.revenue_amount)}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[200px] flex-1">
                        <Label>Atribuir funcionária</Label>
                        <Select
                          value={assignMap[c.id] || ''}
                          onChange={(e) =>
                            setAssignMap((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                        >
                          <option value="">Selecione</option>
                          {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.full_name} ({formatBRL(e.pay_per_cleaning)}/faxina)
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Button onClick={() => void confirmCleaning(c)}>Confirmar</Button>
                      <Button variant="ghost" onClick={() => void cancelCleaning(c.id)}>
                        Cancelar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Confirmadas / em andamento</h2>
            {upcoming.length === 0 ? (
              <EmptyState text="Nenhuma faxina confirmada." />
            ) : (
              <div className="space-y-2">
                {upcoming.map((c) => (
                  <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{c.properties?.label}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {format(new Date(c.scheduled_start), "dd/MM HH:mm", { locale: ptBR })}
                        {c.employees?.full_name ? ` · ${c.employees.full_name}` : ''}
                        {' · paga '}
                        {formatBRL(c.employee_pay_amount)}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  )
}
