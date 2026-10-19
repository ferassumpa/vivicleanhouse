'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label } from '@/components/ui'
import { deleteErrorMessage } from '@/lib/adminCrud'
import { supabase } from '@/lib/supabase'
import { formatBRL, type Employee } from '@/lib/types'

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [pay, setPay] = useState('80')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [linkEmail, setLinkEmail] = useState<Record<string, string>>({})
  const [linkPassword, setLinkPassword] = useState<Record<string, string>>({})
  const [linkingId, setLinkingId] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('employees').select('*').order('full_name')
    setEmployees((data as Employee[]) || [])
  }

  useEffect(() => {
    void load()
  }, [])

  function resetForm() {
    setEditingId(null)
    setFullName('')
    setPhone('')
    setPay('80')
  }

  function startEdit(e: Employee) {
    setEditingId(e.id)
    setFullName(e.full_name)
    setPhone(e.phone || '')
    setPay(String(e.pay_per_cleaning ?? 0))
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const payload = {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      pay_per_cleaning: Number(pay) || 0,
    }
    const { error } = editingId
      ? await supabase.from('employees').update(payload).eq('id', editingId)
      : await supabase.from('employees').insert({ ...payload, active: true })
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage(editingId ? 'Funcionária atualizada.' : 'Funcionária cadastrada. Agora vincule o login dela abaixo.')
    resetForm()
    await load()
  }

  async function toggleActive(emp: Employee) {
    await supabase.from('employees').update({ active: !emp.active }).eq('id', emp.id)
    await load()
  }

  async function removeEmployee(emp: Employee) {
    if (!window.confirm(`Excluir a funcionária "${emp.full_name}"?`)) return
    const { error } = await supabase.from('employees').delete().eq('id', emp.id)
    if (error) {
      await supabase.from('employees').update({ active: false }).eq('id', emp.id)
      setMessage(
        deleteErrorMessage(error, 'funcionária') + ' Ela foi desativada em vez de excluída.'
      )
      await load()
      return
    }
    setMessage('Funcionária excluída.')
    if (editingId === emp.id) resetForm()
    await load()
  }

  async function linkLogin(emp: Employee) {
    setLinkingId(emp.id)
    setMessage(null)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setMessage('Faça login de novo como admin.')
      setLinkingId(null)
      return
    }

    const res = await fetch('/api/admin/employees/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        employeeId: emp.id,
        email: (linkEmail[emp.id] || '').trim(),
        password: (linkPassword[emp.id] || '').trim(),
        fullName: emp.full_name,
      }),
    })
    const json = await res.json()
    setLinkingId(null)
    if (!res.ok) {
      setMessage(json.error || 'Falha ao vincular login')
      return
    }
    setMessage(json.message || 'Login vinculado.')
    setLinkPassword((prev) => ({ ...prev, [emp.id]: '' }))
    await load()
  }

  return (
    <AppShell
      title="Funcionárias"
      subtitle="Cadastre a faxineira e vincule um e-mail de login. Se ela criar conta sozinha no site, vira cliente — aqui você marca como faxineira."
    >
      <Card className="mb-4 text-sm text-[var(--muted)]">
        <p className="font-semibold text-[var(--navy)]">Como cadastrar uma faxineira</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Cadastre o nome e o valor por faxina nesta tela.</li>
          <li>
            Em <strong>Vincular login</strong>, coloque o e-mail dela e uma senha temporária
            (se ainda não tiver conta).
          </li>
          <li>
            Ela entra com esse e-mail/senha e cai na agenda de faxinas — <strong>não</strong> use
            “Criar conta” do site (isso cria cliente).
          </li>
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">
              {editingId ? 'Editar funcionária' : 'Nova funcionária'}
            </h2>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
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
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </form>
        </Card>

        <div className="space-y-3">
          {employees.length === 0 ? (
            <EmptyState text="Nenhuma funcionária cadastrada." />
          ) : (
            employees.map((e) => (
              <Card key={e.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {e.full_name}{' '}
                      {!e.active && <span className="text-xs text-rose-600">(inativa)</span>}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {e.phone || 'Sem telefone'} · {formatBRL(e.pay_per_cleaning)} / faxina
                    </p>
                    <p className="mt-1 text-xs">
                      {e.user_id ? (
                        <span className="text-emerald-700">Login vinculado ✓</span>
                      ) : (
                        <span className="text-amber-700">Sem login — vincule o e-mail abaixo</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" type="button" onClick={() => startEdit(e)}>
                      Editar
                    </Button>
                    <Button variant="secondary" type="button" onClick={() => void toggleActive(e)}>
                      {e.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="danger" type="button" onClick={() => void removeEmployee(e)}>
                      Excluir
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[var(--soft)] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Vincular login de faxineira
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label>E-mail de login</Label>
                      <Input
                        type="email"
                        placeholder="faxineira@email.com"
                        value={linkEmail[e.id] || ''}
                        onChange={(ev) =>
                          setLinkEmail((prev) => ({ ...prev, [e.id]: ev.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Senha temporária (só se for conta nova)</Label>
                      <Input
                        type="password"
                        placeholder="mín. 6 caracteres"
                        value={linkPassword[e.id] || ''}
                        onChange={(ev) =>
                          setLinkPassword((prev) => ({ ...prev, [e.id]: ev.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <Button
                    className="mt-2"
                    type="button"
                    disabled={linkingId === e.id || !(linkEmail[e.id] || '').trim()}
                    onClick={() => void linkLogin(e)}
                  >
                    {linkingId === e.id ? 'Vinculando…' : 'Vincular / criar login'}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
