'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label, TextArea } from '@/components/ui'
import { deleteErrorMessage } from '@/lib/adminCrud'
import { supabase } from '@/lib/supabase'
import { formatBRL, type ServicePackage } from '@/lib/types'

const emptyForm = {
  name: '',
  description: '',
  price: '',
  duration_minutes: '120',
  cleanings_count: '4',
  is_monthly: true,
  includes_laundry: false,
  includes_dishes: false,
  includes_ironing: false,
  extras: '',
}

function packageHighlights(p: ServicePackage) {
  const bits: string[] = []
  bits.push(`${p.cleanings_count} faxina${p.cleanings_count === 1 ? '' : 's'}`)
  if (p.is_monthly) bits.push('mensal')
  if (p.includes_laundry) bits.push('lavagem de roupa')
  if (p.includes_dishes) bits.push('lavagem de louça')
  if (p.includes_ironing) bits.push('passar roupas')
  return bits.join(' · ')
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    const { data, error } = await supabase
      .from('service_packages')
      .select('*')
      .order('name')
    if (error) {
      setMessage(
        error.message.includes('cleanings_count') || error.message.includes('column')
          ? 'Rode o SQL docs/sql/005_service_packages.sql no Supabase para habilitar os pacotes.'
          : error.message
      )
      setPackages([])
      return
    }
    setPackages((data as ServicePackage[]) || [])
  }

  useEffect(() => {
    void load()
  }, [])

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function startEdit(p: ServicePackage) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price ?? ''),
      duration_minutes: String(p.duration_minutes ?? 120),
      cleanings_count: String(p.cleanings_count ?? 1),
      is_monthly: !!p.is_monthly,
      includes_laundry: !!p.includes_laundry,
      includes_dishes: !!p.includes_dishes,
      includes_ironing: !!p.includes_ironing,
      extras: p.extras || '',
    })
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      duration_minutes: Number(form.duration_minutes) || 120,
      cleanings_count: Math.max(1, Number(form.cleanings_count) || 1),
      is_monthly: form.is_monthly,
      includes_laundry: form.includes_laundry,
      includes_dishes: form.includes_dishes,
      includes_ironing: form.includes_ironing,
      extras: form.extras.trim() || null,
      active: true,
    }

    const { error } = editingId
      ? await supabase.from('service_packages').update(payload).eq('id', editingId)
      : await supabase.from('service_packages').insert(payload)

    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage(editingId ? 'Pacote atualizado.' : 'Pacote criado.')
    resetForm()
    await load()
  }

  async function toggleActive(p: ServicePackage) {
    await supabase.from('service_packages').update({ active: !p.active }).eq('id', p.id)
    await load()
  }

  async function removePackage(p: ServicePackage) {
    if (!window.confirm(`Excluir o pacote "${p.name}"?`)) return
    const { error } = await supabase.from('service_packages').delete().eq('id', p.id)
    if (error) {
      await supabase.from('service_packages').update({ active: false }).eq('id', p.id)
      setMessage(deleteErrorMessage(error, 'pacote') + ' Ele foi desativado.')
      await load()
      return
    }
    setMessage('Pacote excluído.')
    if (editingId === p.id) resetForm()
    await load()
  }

  return (
    <AppShell
      title="Pacotes"
      subtitle="Defina pacotes com quantidade de faxinas, se é mensal e o que inclui (roupa, louça, passar)."
    >
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">{editingId ? 'Editar pacote' : 'Novo pacote'}</h2>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>

          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <Label>Nome do pacote</Label>
              <Input
                required
                placeholder="Ex.: Mensal 4 faxinas"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <TextArea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div>
                <Label>Duração média (min)</Label>
                <Input
                  type="number"
                  min="30"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Faxinas no pacote</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={form.cleanings_count}
                  onChange={(e) => setForm((f) => ({ ...f, cleanings_count: e.target.value }))}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_monthly}
                    onChange={(e) => setForm((f) => ({ ...f, is_monthly: e.target.checked }))}
                    className="h-4 w-4 accent-[var(--pink-deep)]"
                  />
                  Pacote mensal
                </label>
              </div>
            </div>

            <div>
              <Label>Inclusões</Label>
              <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 py-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.includes_laundry}
                    onChange={(e) => setForm((f) => ({ ...f, includes_laundry: e.target.checked }))}
                    className="h-4 w-4 accent-[var(--pink-deep)]"
                  />
                  Lavagem de roupa
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.includes_dishes}
                    onChange={(e) => setForm((f) => ({ ...f, includes_dishes: e.target.checked }))}
                    className="h-4 w-4 accent-[var(--pink-deep)]"
                  />
                  Lavagem de louça
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.includes_ironing}
                    onChange={(e) => setForm((f) => ({ ...f, includes_ironing: e.target.checked }))}
                    className="h-4 w-4 accent-[var(--pink-deep)]"
                  />
                  Passar roupas
                </label>
              </div>
            </div>

            <div>
              <Label>Outros itens / observações</Label>
              <TextArea
                rows={2}
                placeholder="Ex.: troca de roupa de cama, organização de armário…"
                value={form.extras}
                onChange={(e) => setForm((f) => ({ ...f, extras: e.target.value }))}
              />
            </div>

            {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar pacote'}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          {packages.length === 0 ? (
            <EmptyState text="Nenhum pacote cadastrado." />
          ) : (
            packages.map((p) => (
              <Card key={p.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {p.name}{' '}
                      {!p.active && (
                        <span className="text-xs text-rose-600">(inativo)</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--pink-deep)]">
                      {formatBRL(p.price)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{packageHighlights(p)}</p>
                    {p.description && <p className="mt-1 text-sm">{p.description}</p>}
                    {p.extras && (
                      <p className="mt-1 text-xs text-[var(--muted)]">Extras: {p.extras}</p>
                    )}
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Duração média: {p.duration_minutes} min
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" type="button" onClick={() => startEdit(p)}>
                      Editar
                    </Button>
                    <Button variant="secondary" type="button" onClick={() => void toggleActive(p)}>
                      {p.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="danger" type="button" onClick={() => void removePackage(p)}>
                      Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
