'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label, TextArea } from '@/components/ui'
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
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('buildings').select('*').order('name')
    setBuildings((data as Building[]) || [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.from('buildings').insert({
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
    })
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setForm(emptyForm)
    setMessage('Prédio cadastrado.')
    await load()
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <AppShell
      title="Prédios"
      subtitle="Cadastre síndico, porteiro, zelador e regras de entrada. Studios ficam vinculados ao prédio."
    >
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">Novo prédio</h2>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <Label>Nome do prédio</Label>
              <Input required value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Síndico</Label>
                <Input value={form.syndic_name} onChange={(e) => set('syndic_name', e.target.value)} />
              </div>
              <div>
                <Label>Tel. síndico</Label>
                <Input value={form.syndic_phone} onChange={(e) => set('syndic_phone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Porteiro</Label>
                <Input value={form.doorman_name} onChange={(e) => set('doorman_name', e.target.value)} />
              </div>
              <div>
                <Label>Tel. porteiro</Label>
                <Input value={form.doorman_phone} onChange={(e) => set('doorman_phone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Zelador</Label>
                <Input value={form.caretaker_name} onChange={(e) => set('caretaker_name', e.target.value)} />
              </div>
              <div>
                <Label>Tel. zelador</Label>
                <Input value={form.caretaker_phone} onChange={(e) => set('caretaker_phone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Regras de entrada no prédio</Label>
              <TextArea
                rows={3}
                placeholder="Horários, cadastro na portaria, uso de elevador de serviço…"
                value={form.entry_rules}
                onChange={(e) => set('entry_rules', e.target.value)}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <TextArea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar prédio'}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          {buildings.length === 0 ? (
            <EmptyState text="Nenhum prédio cadastrado." />
          ) : (
            buildings.map((b) => (
              <Card key={b.id}>
                <p className="font-medium">{b.name}</p>
                {b.address && <p className="text-sm text-[var(--muted)]">{b.address}</p>}
                <div className="mt-2 grid gap-1 text-sm text-[var(--muted)] sm:grid-cols-3">
                  <span>Síndico: {b.syndic_name || '—'} {b.syndic_phone ? `(${b.syndic_phone})` : ''}</span>
                  <span>Porteiro: {b.doorman_name || '—'} {b.doorman_phone ? `(${b.doorman_phone})` : ''}</span>
                  <span>Zelador: {b.caretaker_name || '—'} {b.caretaker_phone ? `(${b.caretaker_phone})` : ''}</span>
                </div>
                {b.entry_rules && (
                  <p className="mt-2 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">
                    <strong>Entrada:</strong> {b.entry_rules}
                  </p>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
