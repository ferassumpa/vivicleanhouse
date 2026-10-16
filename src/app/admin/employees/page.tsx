'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatBRL, type Employee } from '@/lib/types'

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [pay, setPay] = useState('80')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('full_name')
    setEmployees((data as Employee[]) || [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.from('employees').insert({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      pay_per_cleaning: Number(pay) || 0,
      active: true,
    })
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setFullName('')
    setPhone('')
    setPay('80')
    setMessage('Funcionária cadastrada.')
    await load()
  }

  async function toggleActive(emp: Employee) {
    await supabase.from('employees').update({ active: !emp.active }).eq('id', emp.id)
    await load()
  }

  return (
    <AppShell title="Funcionárias">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">Nova funcionária</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Ela pode fazer várias faxinas no dia e ganha por faxina.
          </p>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <Label>Nome</Label>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Valor por faxina (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                value={pay}
                onChange={(e) => setPay(e.target.value)}
              />
            </div>
            {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          {employees.length === 0 ? (
            <EmptyState text="Nenhuma funcionária cadastrada." />
          ) : (
            employees.map((e) => (
              <Card key={e.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {e.full_name}{' '}
                    {!e.active && (
                      <span className="text-xs text-rose-600">(inativa)</span>
                    )}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {e.phone || 'Sem telefone'} · {formatBRL(e.pay_per_cleaning)} / faxina
                  </p>
                </div>
                <Button variant="secondary" onClick={() => void toggleActive(e)}>
                  {e.active ? 'Desativar' : 'Ativar'}
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
