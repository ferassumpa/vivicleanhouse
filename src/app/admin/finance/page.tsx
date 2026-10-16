'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import { Card, EmptyState, Input, Label, Select } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import {
  cleaningMargin,
  formatBRL,
  type Cleaning,
  type Property,
} from '@/lib/types'

type View = 'day' | 'month' | 'property' | 'cleaning'

export default function AdminFinancePage() {
  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [view, setView] = useState<View>('month')
  const [day, setDay] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [propertyId, setPropertyId] = useState('')

  useEffect(() => {
    async function load() {
      const from = startOfMonth(new Date(month + '-01')).toISOString()
      const to = endOfMonth(new Date(month + '-01')).toISOString()
      const [cleaningsRes, propsRes] = await Promise.all([
        supabase
          .from('cleanings')
          .select(
            '*, properties(id,label,address), clients(id,full_name), employees(id,full_name)'
          )
          .eq('status', 'done')
          .gte('scheduled_start', from)
          .lte('scheduled_start', to)
          .order('scheduled_start', { ascending: false }),
        supabase.from('properties').select('*, clients(id,full_name)').order('label'),
      ])
      setCleanings((cleaningsRes.data as Cleaning[]) || [])
      setProperties((propsRes.data as Property[]) || [])
    }
    void load()
  }, [month])

  const filtered = useMemo(() => {
    if (view === 'day') {
      return cleanings.filter((c) => c.scheduled_start.slice(0, 10) === day)
    }
    if (view === 'property' && propertyId) {
      return cleanings.filter((c) => c.property_id === propertyId)
    }
    return cleanings
  }, [cleanings, day, propertyId, view])

  const totals = filtered.reduce(
    (acc, c) => {
      acc.revenue += Number(c.revenue_amount)
      acc.pay += Number(c.employee_pay_amount)
      acc.materials += Number(c.materials_cost)
      acc.other += Number(c.other_costs)
      acc.margin += cleaningMargin(c)
      return acc
    },
    { revenue: 0, pay: 0, materials: 0, other: 0, margin: 0 }
  )

  const byProperty = useMemo(() => {
    const map = new Map<
      string,
      { label: string; revenue: number; margin: number; count: number }
    >()
    for (const c of cleanings) {
      const key = c.property_id
      const prev = map.get(key) || {
        label: c.properties?.label || 'Imóvel',
        revenue: 0,
        margin: 0,
        count: 0,
      }
      prev.revenue += Number(c.revenue_amount)
      prev.margin += cleaningMargin(c)
      prev.count += 1
      map.set(key, prev)
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [cleanings])

  return (
    <AppShell title="Finanças">
      <div className="mb-4 flex flex-wrap gap-3">
        <div>
          <Label>Visão</Label>
          <Select value={view} onChange={(e) => setView(e.target.value as View)}>
            <option value="month">Por mês</option>
            <option value="day">Por dia</option>
            <option value="property">Por imóvel</option>
            <option value="cleaning">Por faxina</option>
          </Select>
        </div>
        <div>
          <Label>Mês</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        {view === 'day' && (
          <div>
            <Label>Dia</Label>
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
        )}
        {view === 'property' && (
          <div className="min-w-[220px]">
            <Label>Imóvel</Label>
            <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Todos</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-xs text-[var(--muted)]">Receita</p>
          <p className="font-display text-xl">{formatBRL(totals.revenue)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)]">Pgt. funcionárias</p>
          <p className="font-display text-xl">{formatBRL(totals.pay)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)]">Materiais</p>
          <p className="font-display text-xl">{formatBRL(totals.materials)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)]">Outros custos</p>
          <p className="font-display text-xl">{formatBRL(totals.other)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)]">Margem</p>
          <p className="font-display text-xl">{formatBRL(totals.margin)}</p>
        </Card>
      </div>

      {(view === 'month' || view === 'property') && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Por imóvel</h2>
          {byProperty.length === 0 ? (
            <EmptyState text="Sem dados no período." />
          ) : (
            <div className="space-y-2">
              {byProperty.map((row) => (
                <Card key={row.label} className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="text-sm text-[var(--muted)]">{row.count} faxina(s)</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{formatBRL(row.revenue)}</p>
                    <p className="text-[var(--muted)]">Margem {formatBRL(row.margin)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Detalhe por faxina</h2>
        {filtered.length === 0 ? (
          <EmptyState text="Nenhuma faxina concluída neste filtro." />
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <Card key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.properties?.label}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {format(new Date(c.scheduled_start), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                      {c.employees?.full_name ? ` · ${c.employees.full_name}` : ''}
                    </p>
                  </div>
                  <p className="font-medium">{formatBRL(cleaningMargin(c))}</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-[var(--muted)] sm:grid-cols-4">
                  <span>Receita {formatBRL(c.revenue_amount)}</span>
                  <span>Func. {formatBRL(c.employee_pay_amount)}</span>
                  <span>Materiais {formatBRL(c.materials_cost)}</span>
                  <span>Outros {formatBRL(c.other_costs)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
