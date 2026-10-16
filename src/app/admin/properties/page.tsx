'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label, Select, TextArea } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatBRL, PRICING_LABELS, type Client, type PricingType, type Property } from '@/lib/types'

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [label, setLabel] = useState('')
  const [propertyType, setPropertyType] = useState('estudio')
  const [address, setAddress] = useState('')
  const [accessNotes, setAccessNotes] = useState('')
  const [pricingType, setPricingType] = useState<PricingType>('per_property')
  const [priceHourly, setPriceHourly] = useState('')
  const [pricePackage, setPricePackage] = useState('')
  const [priceFixed, setPriceFixed] = useState('')
  const [duration, setDuration] = useState('120')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    const [propsRes, clientsRes] = await Promise.all([
      supabase
        .from('properties')
        .select('*, clients(id,full_name)')
        .order('label'),
      supabase.from('clients').select('*').order('full_name'),
    ])
    setProperties((propsRes.data as Property[]) || [])
    setClients((clientsRes.data as Client[]) || [])
    if (!clientId && clientsRes.data?.[0]) {
      setClientId(clientsRes.data[0].id)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.from('properties').insert({
      client_id: clientId,
      label: label.trim(),
      property_type: propertyType,
      address: address.trim() || null,
      access_notes: accessNotes.trim() || null,
      default_pricing_type: pricingType,
      price_hourly: priceHourly ? Number(priceHourly) : null,
      price_package: pricePackage ? Number(pricePackage) : null,
      price_fixed: priceFixed ? Number(priceFixed) : null,
      estimated_duration_minutes: Number(duration) || 120,
      active: true,
    })
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setLabel('')
    setAddress('')
    setAccessNotes('')
    setPriceHourly('')
    setPricePackage('')
    setPriceFixed('')
    setMessage('Imóvel cadastrado.')
    await load()
  }

  return (
    <AppShell title="Imóveis">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">Novo imóvel</h2>
          <form className="space-y-3" onSubmit={onSubmit}>
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
              <Label>Nome / identificação</Label>
              <Input
                required
                placeholder="Estúdio 12"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                <option value="estudio">Estúdio</option>
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
              </Select>
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label>Acesso / senha / observações</Label>
              <TextArea rows={2} value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} />
            </div>
            <div>
              <Label>Precificação padrão</Label>
              <Select
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value as PricingType)}
              >
                <option value="per_property">Por imóvel</option>
                <option value="hourly">Por hora</option>
                <option value="package">Por pacote</option>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>R$/h</Label>
                <Input type="number" step="0.01" value={priceHourly} onChange={(e) => setPriceHourly(e.target.value)} />
              </div>
              <div>
                <Label>Pacote</Label>
                <Input type="number" step="0.01" value={pricePackage} onChange={(e) => setPricePackage(e.target.value)} />
              </div>
              <div>
                <Label>Fixo AP</Label>
                <Input type="number" step="0.01" value={priceFixed} onChange={(e) => setPriceFixed(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Duração estimada (min)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
            <Button type="submit" disabled={saving || !clientId}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          {properties.length === 0 ? (
            <EmptyState text="Nenhum imóvel cadastrado." />
          ) : (
            properties.map((p) => (
              <Card key={p.id}>
                <p className="font-medium">{p.label}</p>
                <p className="text-sm text-[var(--muted)]">
                  {p.clients?.full_name} · {p.property_type} ·{' '}
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
                {p.address && <p className="mt-1 text-sm text-[var(--muted)]">{p.address}</p>}
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
