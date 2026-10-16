'use client'

import { FormEvent, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { combineDateAndTime } from '@/lib/pricing'
import { supabase } from '@/lib/supabase'
import type { AvailabilitySlot, Employee } from '@/lib/types'

export default function EmployeeAvailabilityPage() {
  const { user } = useAuth()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [slotDate, setSlotDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')
  const [message, setMessage] = useState<string | null>(null)

  async function load(empId: string) {
    const { data } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('employee_id', empId)
      .gte('slot_date', format(new Date(), 'yyyy-MM-dd'))
      .order('slot_date')
      .order('start_time')
    setSlots((data as AvailabilitySlot[]) || [])
  }

  useEffect(() => {
    async function init() {
      if (!user) return
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      const emp = data as Employee | null
      setEmployee(emp)
      if (emp) await load(emp.id)
    }
    void init()
  }, [user])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!employee || !user) return
    setMessage(null)
    const { error } = await supabase.from('availability_slots').insert({
      slot_date: slotDate,
      start_time: startTime,
      end_time: endTime,
      employee_id: employee.id,
      is_open: true,
      created_by: user.id,
    })
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Disponibilidade publicada. A admin ainda confirma os agendamentos.')
    await load(employee.id)
  }

  return (
    <AppShell title="Minha disponibilidade">
      {!employee ? (
        <EmptyState text="Perfil de funcionária não vinculado." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card>
            <form className="space-y-3" onSubmit={onSubmit}>
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
              {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
              <Button type="submit">Publicar</Button>
            </form>
          </Card>
          <div className="space-y-2">
            {slots.length === 0 ? (
              <EmptyState text="Nenhum horário publicado." />
            ) : (
              slots.map((s) => (
                <Card key={s.id}>
                  {format(combineDateAndTime(s.slot_date, s.start_time), "EEEE dd/MM · HH:mm", {
                    locale: ptBR,
                  })}
                  –{s.end_time.slice(0, 5)}
                  {!s.is_open ? ' · reservado' : ' · aberto'}
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
