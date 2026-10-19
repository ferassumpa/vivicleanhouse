'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label, TextArea } from '@/components/ui'
import { deleteErrorMessage } from '@/lib/adminCrud'
import { supabase } from '@/lib/supabase'
import type { Building } from '@/lib/types'

const emptyForm = {
  name: '',
  address: '',
  syndic_name: '',
  syndic_phone: '',
  doorman_name: '',
  doorman_phone: '',
  caretaker_name: '',
  caretaker_phone: '',
  entry_rules: '',
  notes: '',
}

export default function AdminBuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('buildings').select('*').order('name')
    setBuildings((data as Building[]) || [])
  }

  useEffect(() => {
    void load()
  }, [])

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function startEdit(b: Building) {
    setEditingId(b.id)
    setForm({
      name: b.name,
      address: b.address || '',
      syndic_name: b.syndic_name || '',
      syndic_phone: b.syndic_phone || '',
      doorman_name: b.doorman_name || '',
      doorman_phone: b.doorman_phone || '',
      caretaker_name: b.caretaker_name || '',
      caretaker_phone: b.caretaker_phone || '',
      entry_rules: b.entry_rules || '',
      notes: b.notes || '',
    })
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      syndic_name: form.syndic_name.trim() || null,
      syndic_phone: form.syndic_phone.trim() || null,
      doorman_name: form.doorman_name.trim() || null,
      doorman_phone: form.doorman_phone.trim() || null,
      caretaker_name: form.caretaker_name.trim() || null,
      caretaker_phone: form.caretaker_phone.trim() || null,
      entry_rules: form.entry_rules.trim() || null,
      notes: form.notes.trim() || null,
    }
    const { error } = editingId
      ? await supabase.from('buildings').update(payload).eq('id', editingId)
      : await supabase.from('buildings').insert(payload)
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage(editingId ? 'Prédio atualizado.' : 'Prédio cadastrado.')
    resetForm()
    await load()
  }

  async function removeBuilding(b: Building) {
    if (!window.confirm(`Excluir o prédio "${b.name}"? Imóveis vinculados ficarão sem prédio.`)) {
      return
    }
    const { error } = await supabase.from('buildings').delete().eq('id', b.id)
    if (error) {
      setMessage(deleteErrorMessage(error, 'prédio'))
      return
    }
    setMessage('Prédio excluído.')
    if (editingId === b.id) resetForm()
    await load()
  }

  return (
    <AppShell
      title="Prédios"
      subtitle="Cadastre, edite ou exclua. Studios ficam vinculados ao prédio."
    >
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">{editingId ? 'Editar prédio' : 'Novo prédio'}</h2>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <Label>Nome do prédio</Label>
              <Input required value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => setField('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Síndico</Label>
                <Input value={form.syndic_name} onChange={(e) => setField('syndic_name', e.target.value)} />
              </div>
              <div>
                <Label>Tel. síndico</Label>
                <Input value={form.syndic_phone} onChange={(e) => setField('syndic_phone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Porteiro</Label>
                <Input value={form.doorman_name} onChange={(e) => setField('doorman_name', e.target.value)} />
              </div>
              <div>
                <Label>Tel. porteiro</Label>
                <Input value={form.doorman_phone} onChange={(e) => setField('doorman_phone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Zelador</Label>
                <Input value={form.caretaker_name} onChange={(e) => setField('caretaker_name', e.target.value)} />
              </div>
              <div>
                <Label>Tel. zelador</Label>
                <Input value={form.caretaker_phone} onChange={(e) => setField('caretaker_phone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Regras de entrada no prédio</Label>
              <TextArea
                rows={3}
                value={form.entry_rules}
                onChange={(e) => setField('entry_rules', e.target.value)}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <TextArea rows={2} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </div>
            {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          {buildings.length === 0 ? (
            <EmptyState text="Nenhum prédio cadastrado." />
          ) : (
            buildings.map((b) => (
              <Card key={b.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    {b.address && <p className="text-sm text-[var(--muted)]">{b.address}</p>}
                    <div className="mt-2 grid gap-1 text-sm text-[var(--muted)] sm:grid-cols-3">
                      <span>
                        Síndico: {b.syndic_name || '—'}{' '}
                        {b.syndic_phone ? `(${b.syndic_phone})` : ''}
                      </span>
                      <span>
                        Porteiro: {b.doorman_name || '—'}{' '}
                        {b.doorman_phone ? `(${b.doorman_phone})` : ''}
                      </span>
                      <span>
                        Zelador: {b.caretaker_name || '—'}{' '}
                        {b.caretaker_phone ? `(${b.caretaker_phone})` : ''}
                      </span>
                    </div>
                    {b.entry_rules && (
                      <p className="mt-2 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">
                        <strong>Entrada:</strong> {b.entry_rules}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" type="button" onClick={() => startEdit(b)}>
                      Editar
                    </Button>
                    <Button variant="danger" type="button" onClick={() => void removeBuilding(b)}>
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
