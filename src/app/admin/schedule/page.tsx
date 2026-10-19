'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
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
import { deleteErrorMessage } from '@/lib/adminCrud'
import { combineDateAndTime, resolvePropertyPrice } from '@/lib/pricing'
import { supabase } from '@/lib/supabase'
import {
  formatBRL,
  formatCleaningWhen,
  type Cleaning,
  type CleaningStatus,
  type Client,
  type Employee,
  type Property,
} from '@/lib/types'

export default function AdminSchedulePage() {
  const { user, profile } = useAuth()
  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [assignMap, setAssignMap] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [day, setDay] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [employeeId, setEmployeeId] = useState('')
  const [status, setStatus] = useState<CleaningStatus>('confirmed')
  const [saving, setSaving] = useState(false)

  const clientProperties = useMemo(
    () => properties.filter((p) => p.client_id === clientId && p.active !== false),
    [properties, clientId]
  )

  async function ensureAdminAsEmployee(): Promise<string | null> {
    if (!user) return null
    const { data: existing } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) return existing.id as string

    const { data, error } = await supabase
      .from('employees')
      .insert({
        user_id: user.id,
        full_name: profile?.full_name || 'Admin',
        pay_per_cleaning: 0,
        active: true,
      })
      .select('id')
      .single()
    if (error) {
      setMessage(error.message)
      return null
    }
    return data.id as string
  }

  async function resolveEmployeeId(raw: string): Promise<string | null> {
    if (!raw) return null
    if (raw === '__admin__') return ensureAdminAsEmployee()
    return raw
  }

  async function load() {
    const [cleaningsRes, employeesRes, clientsRes, propsRes] = await Promise.all([
      supabase
        .from('cleanings')
        .select(
          '*, properties(id,label,address,building_id, buildings(id,name)), clients(id,full_name), employees(id,full_name)'
        )
        .order('scheduled_start', { ascending: false })
        .limit(80),
      supabase.from('employees').select('*').eq('active', true).order('full_name'),
      supabase.from('clients').select('*').order('full_name'),
      supabase.from('properties').select('*, clients(id,full_name)').order('label'),
    ])
    setCleanings((cleaningsRes.data as Cleaning[]) || [])
    setEmployees((employeesRes.data as Employee[]) || [])
    setClients((clientsRes.data as Client[]) || [])
    setProperties((propsRes.data as Property[]) || [])
    if (!clientId && clientsRes.data?.[0]) {
      setClientId(clientsRes.data[0].id)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (editingId) return
    const first = clientProperties[0]
    if (first) setPropertyId(first.id)
    else setPropertyId('')
  }, [clientId, clientProperties, editingId])

  function resetForm() {
    setEditingId(null)
    setDay(format(new Date(), 'yyyy-MM-dd'))
    setStartTime('09:00')
    setEmployeeId('')
    setStatus('confirmed')
    if (clients[0]) setClientId(clients[0].id)
  }

  function startEdit(c: Cleaning) {
    const start = new Date(c.scheduled_start)
    setEditingId(c.id)
    setClientId(c.client_id)
    setPropertyId(c.property_id)
    setDay(format(start, 'yyyy-MM-dd'))
    setStartTime(format(start, 'HH:mm'))
    setEmployeeId(c.employee_id || '')
    setStatus(c.status === 'cancelled' ? 'confirmed' : c.status)
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveCleaning(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const property = properties.find((p) => p.id === propertyId)
    const client = clients.find((c) => c.id === clientId)
    if (!property || !client) {
      setMessage('Selecione cliente e imóvel.')
      setSaving(false)
      return
    }

    const assignedEmployeeId = await resolveEmployeeId(employeeId)
    if (employeeId && !assignedEmployeeId) {
      setSaving(false)
      return
    }

    let pay = 0
    if (assignedEmployeeId) {
      const { data: empRow } = await supabase
        .from('employees')
        .select('pay_per_cleaning')
        .eq('id', assignedEmployeeId)
        .maybeSingle()
      pay = Number(empRow?.pay_per_cleaning || 0)
    }

    const quote = resolvePropertyPrice(property)
    const scheduledStart = combineDateAndTime(day, startTime)

    if (editingId) {
      const { error } = await supabase
        .from('cleanings')
        .update({
          property_id: property.id,
          client_id: client.id,
          employee_id: assignedEmployeeId,
          scheduled_start: scheduledStart,
          status,
          pricing_type: quote.pricing_type,
          unit_price: quote.unit_price,
          hours: quote.hours,
          revenue_amount: quote.revenue_amount,
          employee_pay_amount: pay,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)

      setSaving(false)
      if (error) {
        setMessage(error.message)
        return
      }
      setMessage('Faxina atualizada.')
      resetForm()
      await load()
      return
    }

    const { error } = await supabase.from('cleanings').insert({
      property_id: property.id,
      client_id: client.id,
      employee_id: assignedEmployeeId,
      scheduled_start: scheduledStart,
      status: assignedEmployeeId ? 'confirmed' : 'confirmed',
      pricing_type: quote.pricing_type,
      unit_price: quote.unit_price,
      hours: quote.hours,
      revenue_amount: quote.revenue_amount,
      employee_pay_amount: pay,
      notes: 'Agendada pela admin',
    })

    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(
      `Faxina agendada: ${format(new Date(scheduledStart), "EEEE dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
    )
    resetForm()
    await load()
  }

  async function confirmCleaning(cleaning: Cleaning) {
    const employeePick = assignMap[cleaning.id]
    if (!employeePick) {
      setMessage('Selecione quem vai fazer a faxina.')
      return
    }
    const assigned = await resolveEmployeeId(employeePick)
    if (!assigned) return

    const { data: empRow } = await supabase
      .from('employees')
      .select('pay_per_cleaning')
      .eq('id', assigned)
      .maybeSingle()

    const { error } = await supabase
      .from('cleanings')
      .update({
        status: 'confirmed',
        employee_id: assigned,
        employee_pay_amount: Number(empRow?.pay_per_cleaning || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleaning.id)

    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Solicitação aprovada e confirmada.')
    await load()
  }

  async function cancelCleaning(id: string) {
    if (!window.confirm('Cancelar esta faxina?')) return
    const { error } = await supabase
      .from('cleanings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Faxina cancelada.')
    if (editingId === id) resetForm()
    await load()
  }

  async function deleteCleaning(c: Cleaning) {
    if (
      !window.confirm(
        `Excluir permanentemente a faxina de "${c.properties?.label || 'imóvel'}" em ${formatCleaningWhen(c.scheduled_start)}?`
      )
    ) {
      return
    }
    const { error } = await supabase.from('cleanings').delete().eq('id', c.id)
    if (error) {
      setMessage(deleteErrorMessage(error, 'faxina'))
      return
    }
    setMessage('Faxina excluída.')
    if (editingId === c.id) resetForm()
    await load()
  }

  const pending = cleanings.filter((c) => c.status === 'requested')
  const upcoming = cleanings.filter((c) =>
    ['confirmed', 'in_progress'].includes(c.status)
  )
  const history = cleanings.filter((c) => ['done', 'cancelled'].includes(c.status))

  const executorOptions = (
    <>
      <option value="__admin__">Eu (admin) — faço a faxina</option>
      {employees.map((e) => (
        <option key={e.id} value={e.id}>
          {e.full_name}
          {e.user_id === user?.id ? ' (você)' : ''}
        </option>
      ))}
    </>
  )

  function CleaningActions({ c }: { c: Cleaning }) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={c.status} />
        <Button type="button" variant="secondary" onClick={() => startEdit(c)}>
          Editar
        </Button>
        {c.employee_id && ['confirmed', 'in_progress'].includes(c.status) && (
          <Link href={`/employee/jobs/${c.id}`}>
            <Button type="button" variant="secondary">
              Abrir
            </Button>
          </Link>
        )}
        {c.status !== 'cancelled' && (
          <Button type="button" variant="ghost" onClick={() => void cancelCleaning(c.id)}>
            Cancelar
          </Button>
        )}
        <Button type="button" variant="danger" onClick={() => void deleteCleaning(c)}>
          Excluir
        </Button>
      </div>
    )
  }

  return (
    <AppShell
      title="Agenda"
      subtitle="Só a admin agenda, edita e exclui faxinas. Faxineiras só executam (iniciar/concluir)."
    >
      {message && (
        <p className="mb-4 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">{message}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">
              {editingId ? 'Editar faxina' : 'Agendar faxina'}
            </h2>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar edição
              </Button>
            )}
          </div>
          <form className="space-y-3" onSubmit={saveCleaning}>
            <div>
              <Label>Cliente</Label>
              <Select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="" disabled>
                  Selecione
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Imóvel / studio</Label>
              <Select required value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="" disabled>
                  Selecione
                </option>
                {clientProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {!p.active ? ' (inativo)' : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Dia</Label>
              <Input type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
            <div>
              <Label>Hora de início</Label>
              <Input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label>Quem executa</Label>
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Definir depois</option>
                {executorOptions}
              </Select>
            </div>
            {editingId && (
              <div>
                <Label>Status</Label>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CleaningStatus)}
                >
                  <option value="requested">Pendente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="done">Concluída</option>
                  <option value="cancelled">Cancelada</option>
                </Select>
              </div>
            )}
            <Button type="submit" disabled={saving || !clientId || !propertyId}>
              {saving
                ? 'Salvando…'
                : editingId
                  ? 'Salvar alterações'
                  : 'Agendar faxina'}
            </Button>
          </form>
        </Card>

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Pendentes de aprovação</h2>
            {pending.length === 0 ? (
              <EmptyState text="Nenhuma solicitação de cliente aguardando." />
            ) : (
              <div className="space-y-2">
                {pending.map((c) => (
                  <Card key={c.id} className="space-y-3">
                    <div>
                      <p className="font-medium">
                        {c.properties?.label} · {c.clients?.full_name}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {formatCleaningWhen(c.scheduled_start)} · {formatBRL(c.revenue_amount)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[200px] flex-1">
                        <Label>Atribuir executora</Label>
                        <Select
                          value={assignMap[c.id] || ''}
                          onChange={(e) =>
                            setAssignMap((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                        >
                          <option value="">Selecione</option>
                          {executorOptions}
                        </Select>
                      </div>
                      <Button onClick={() => void confirmCleaning(c)}>Aprovar</Button>
                      <CleaningActions c={c} />
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
                  <Card key={c.id} className="space-y-3">
                    <div>
                      <p className="font-medium">{c.properties?.label}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {formatCleaningWhen(c.scheduled_start)}
                        {c.employees?.full_name ? ` · ${c.employees.full_name}` : ''}
                        {c.properties?.buildings?.name
                          ? ` · ${c.properties.buildings.name}`
                          : ''}
                      </p>
                    </div>
                    <CleaningActions c={c} />
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Histórico (concluídas / canceladas)</h2>
            {history.length === 0 ? (
              <EmptyState text="Sem histórico recente." />
            ) : (
              <div className="space-y-2">
                {history.slice(0, 20).map((c) => (
                  <Card key={c.id} className="space-y-3">
                    <div>
                      <p className="font-medium">
                        {c.properties?.label} · {c.clients?.full_name}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {formatCleaningWhen(c.scheduled_start)}
                        {c.employees?.full_name ? ` · ${c.employees.full_name}` : ''}
                      </p>
                    </div>
                    <CleaningActions c={c} />
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
