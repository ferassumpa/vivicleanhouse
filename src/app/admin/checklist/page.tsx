'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label, Select } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import type { ChecklistItem, Property } from '@/lib/types'

export default function AdminChecklistPage() {
  const [defaults, setDefaults] = useState<ChecklistItem[]>([])
  const [custom, setCustom] = useState<ChecklistItem[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [defaultLabel, setDefaultLabel] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function loadDefaults() {
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .is('property_id', null)
      .order('sort_order')
    setDefaults((data as ChecklistItem[]) || [])
  }

  async function loadCustom(pid: string) {
    if (!pid) {
      setCustom([])
      return
    }
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('property_id', pid)
      .order('sort_order')
    setCustom((data as ChecklistItem[]) || [])
  }

  useEffect(() => {
    void loadDefaults()
    void supabase
      .from('properties')
      .select('*, clients(id,full_name)')
      .eq('active', true)
      .order('label')
      .then(({ data }) => {
        const list = (data as Property[]) || []
        setProperties(list)
        if (list[0]) {
          setPropertyId(list[0].id)
          void loadCustom(list[0].id)
        }
      })
  }, [])

  useEffect(() => {
    void loadCustom(propertyId)
  }, [propertyId])

  async function addDefault(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    const { error } = await supabase.from('checklist_items').insert({
      property_id: null,
      label: defaultLabel.trim(),
      sort_order: (defaults.length + 1) * 10,
      active: true,
    })
    if (error) {
      setMessage(error.message)
      return
    }
    setDefaultLabel('')
    await loadDefaults()
  }

  async function addCustom(e: FormEvent) {
    e.preventDefault()
    if (!propertyId) return
    setMessage(null)
    const { error } = await supabase.from('checklist_items').insert({
      property_id: propertyId,
      label: customLabel.trim(),
      sort_order: (custom.length + 1) * 10,
      active: true,
    })
    if (error) {
      setMessage(error.message)
      return
    }
    setCustomLabel('')
    setMessage('Item personalizado adicionado. Este imóvel usará o checklist próprio.')
    await loadCustom(propertyId)
  }

  async function removeItem(id: string) {
    await supabase.from('checklist_items').delete().eq('id', id)
    await loadDefaults()
    await loadCustom(propertyId)
  }

  return (
    <AppShell
      title="Checklist"
      subtitle="Defina o checklist padrão da empresa. Se um imóvel tiver itens próprios, eles substituem o padrão."
    >
      {message && (
        <p className="mb-4 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">{message}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Checklist padrão</h2>
          <form className="mb-4 flex gap-2" onSubmit={addDefault}>
            <Input
              required
              placeholder="Novo item"
              value={defaultLabel}
              onChange={(e) => setDefaultLabel(e.target.value)}
            />
            <Button type="submit">Add</Button>
          </form>
          {defaults.length === 0 ? (
            <EmptyState text="Nenhum item padrão." />
          ) : (
            <ul className="space-y-2">
              {defaults.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                >
                  <span>{item.label}</span>
                  <Button variant="ghost" type="button" onClick={() => void removeItem(item.id)}>
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Personalizar por imóvel</h2>
          <div className="mb-3">
            <Label>Imóvel</Label>
            <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} {p.clients?.full_name ? `· ${p.clients.full_name}` : ''}
                </option>
              ))}
            </Select>
          </div>
          <p className="mb-3 text-xs text-[var(--muted)]">
            {custom.length === 0
              ? 'Sem itens próprios — este imóvel usa o checklist padrão.'
              : 'Este imóvel usa o checklist personalizado abaixo.'}
          </p>
          <form className="mb-4 flex gap-2" onSubmit={addCustom}>
            <Input
              required
              placeholder="Item só deste imóvel"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
            />
            <Button type="submit" disabled={!propertyId}>
              Add
            </Button>
          </form>
          {custom.length === 0 ? (
            <EmptyState text="Nenhum item personalizado." />
          ) : (
            <ul className="space-y-2">
              {custom.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                >
                  <span>{item.label}</span>
                  <Button variant="ghost" type="button" onClick={() => void removeItem(item.id)}>
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
