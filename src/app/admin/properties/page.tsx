'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label, Select, TextArea } from '@/components/ui'
import { deleteErrorMessage } from '@/lib/adminCrud'
import { supabase } from '@/lib/supabase'
import {
  formatBRL,
  PRICING_LABELS,
  type Building,
  type Client,
  type PricingType,
  type Property,
  type ServicePackage,
} from '@/lib/types'

const empty = {
  clientId: '',
  buildingId: '',
  packageId: '',
  label: '',
  propertyType: 'estudio',
  address: '',
  accessNotes: '',
  pricingType: 'per_property' as PricingType,
  priceHourly: '',
  pricePackage: '',
  priceFixed: '',
  duration: '120',
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const needsBuilding = form.propertyType === 'estudio' || form.propertyType === 'apartamento'

  async function load() {
    const [propsRes, clientsRes, buildingsRes] = await Promise.all([
      supabase
        .from('properties')
        .select('*, clients(id,full_name), buildings(id,name)')
        .order('label'),
      supabase.from('clients').select('*').order('full_name'),
      supabase.from('buildings').select('*').order('name'),
    ])
    setProperties((propsRes.data as Property[]) || [])
    setClients((clientsRes.data as Client[]) || [])
    setBuildings((buildingsRes.data as Building[]) || [])
    if (!form.clientId && clientsRes.data?.[0]) {
      setForm((f) => ({ ...f, clientId: clientsRes.data![0].id }))
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetForm() {
    setEditingId(null)
    setForm({
      ...empty,
      clientId: clients[0]?.id || '',
    })
  }

  function startEdit(p: Property) {
    setEditingId(p.id)
    setForm({
      clientId: p.client_id,
      buildingId: p.building_id || '',
      label: p.label,
      propertyType: p.property_type,
      address: p.address || '',
      accessNotes: p.access_notes || '',
      pricingType: p.default_pricing_type,
      priceHourly: p.price_hourly != null ? String(p.price_hourly) : '',
      pricePackage: p.price_package != null ? String(p.price_package) : '',
      priceFixed: p.price_fixed != null ? String(p.price_fixed) : '',
      duration: String(p.estimated_duration_minutes || 120),
    })
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (needsBuilding && !form.buildingId) {
      setMessage('Selecione o prédio para estúdio/apartamento.')
      setSaving(false)
      return
    }

    const payload = {
      client_id: form.clientId,
      building_id: needsBuilding ? form.buildingId : null,
      label: form.label.trim(),
      property_type: form.propertyType,
      address: form.address.trim() || null,
      access_notes: form.accessNotes.trim() || null,
      default_pricing_type: form.pricingType,
      price_hourly: form.priceHourly ? Number(form.priceHourly) : null,
      price_package: form.pricePackage ? Number(form.pricePackage) : null,
      price_fixed: form.priceFixed ? Number(form.priceFixed) : null,
      estimated_duration_minutes: Number(form.duration) || 120,
      active: true,
    }

    const { error } = editingId
      ? await supabase.from('properties').update(payload).eq('id', editingId)
      : await supabase.from('properties').insert(payload)

    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage(editingId ? 'Imóvel atualizado.' : 'Imóvel cadastrado.')
    resetForm()
    await load()
  }

  async function removeProperty(p: Property) {
    if (!window.confirm(`Excluir o imóvel "${p.label}"?`)) return
    setMessage(null)
    const { error } = await supabase.from('properties').delete().eq('id', p.id)
    if (error) {
      // Soft delete se houver faxinas vinculadas
      const { error: softErr } = await supabase
        .from('properties')
        .update({ active: false })
        .eq('id', p.id)
      if (softErr) {
        setMessage(deleteErrorMessage(error, 'imóvel'))
        return
      }
      setMessage(
        `Não foi possível excluir de vez (há faxinas ligadas). O imóvel "${p.label}" foi desativado.`
      )
    } else {
      setMessage('Imóvel excluído.')
      if (editingId === p.id) resetForm()
    }
    await load()
  }

  async function reactivate(p: Property) {
    await supabase.from('properties').update({ active: true }).eq('id', p.id)
    setMessage('Imóvel reativado.')
    await load()
  }

  return (
    <AppShell
      title="Imóveis"
      subtitle="Studios/apartamentos ligados a um prédio. Você pode editar, excluir ou desativar."
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">{editingId ? 'Editar imóvel' : 'Novo imóvel'}</h2>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <Label>Cliente</Label>
              <Select
                required
                value={form.clientId}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              >
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
              <Label>Tipo</Label>
              <Select
                value={form.propertyType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    propertyType: e.target.value,
                    buildingId: e.target.value === 'casa' ? '' : f.buildingId,
                  }))
                }
              >
                <option value="estudio">Estúdio</option>
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
              </Select>
            </div>
            {needsBuilding && (
              <div>
                <Label>Prédio</Label>
                <Select
                  required
                  value={form.buildingId}
                  onChange={(e) => setForm((f) => ({ ...f, buildingId: e.target.value }))}
                >
                  <option value="">Selecione o prédio</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Nome / identificação</Label>
              <Input
                required
                placeholder="Estúdio 12"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <Label>Acesso do imóvel</Label>
              <TextArea
                rows={2}
                value={form.accessNotes}
                onChange={(e) => setForm((f) => ({ ...f, accessNotes: e.target.value }))}
              />
            </div>
            <div>
              <Label>Precificação padrão</Label>
              <Select
                value={form.pricingType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pricingType: e.target.value as PricingType }))
                }
              >
                <option value="per_property">Por imóvel</option>
                <option value="hourly">Por hora</option>
                <option value="package">Por pacote</option>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>R$/h</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.priceHourly}
                  onChange={(e) => setForm((f) => ({ ...f, priceHourly: e.target.value }))}
                />
              </div>
              <div>
                <Label>Pacote</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.pricePackage}
                  onChange={(e) => setForm((f) => ({ ...f, pricePackage: e.target.value }))}
                />
              </div>
              <div>
                <Label>Fixo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.priceFixed}
                  onChange={(e) => setForm((f) => ({ ...f, priceFixed: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Duração estimada (min)</Label>
              <Input
                type="number"
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              />
            </div>
            {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
            <Button type="submit" disabled={saving || !form.clientId}>
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          {properties.length === 0 ? (
            <EmptyState text="Nenhum imóvel cadastrado." />
          ) : (
            properties.map((p) => (
              <Card key={p.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {p.label}{' '}
                      {!p.active && (
                        <span className="text-xs text-rose-600">(desativado)</span>
                      )}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {p.clients?.full_name} · {p.property_type}
                      {p.buildings?.name
                        ? ` · Prédio ${p.buildings.name}`
                        : p.property_type === 'casa'
                          ? ' · Casa'
                          : ''}
                      {' · '}
                      {PRICING_LABELS[p.default_pricing_type]}
                    </p>
                    <p className="mt-1 text-sm">
                      {[
                        p.price_fixed != null ? `Fixo ${formatBRL(p.price_fixed)}` : null,
                        p.price_hourly != null ? `${formatBRL(p.price_hourly)}/h` : null,
                        p.price_package != null ? `Pacote ${formatBRL(p.price_package)}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" type="button" onClick={() => startEdit(p)}>
                      Editar
                    </Button>
                    {!p.active ? (
                      <Button variant="secondary" type="button" onClick={() => void reactivate(p)}>
                        Reativar
                      </Button>
                    ) : (
                      <Button variant="danger" type="button" onClick={() => void removeProperty(p)}>
                        Excluir
                      </Button>
                    )}
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
