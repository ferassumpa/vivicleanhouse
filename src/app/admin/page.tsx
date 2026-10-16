'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import { Card, EmptyState, StatusBadge } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import {
  cleaningMargin,
  formatBRL,
  type Cleaning,
} from '@/lib/types'

export default function AdminDashboardPage() {
  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const from = startOfMonth(new Date()).toISOString()
      const to = endOfMonth(new Date()).toISOString()
      const { data } = await supabase
        .from('cleanings')
        .select(
          '*, properties(id,label,address), clients(id,full_name), employees(id,full_name)'
        )
        .gte('scheduled_start', from)
        .lte('scheduled_start', to)
        .order('scheduled_start', { ascending: true })
      setCleanings((data as Cleaning[]) || [])
      setLoading(false)
    }
    void load()
  }, [])

  const today = useMemo(() => {
    const s = startOfDay(new Date()).toISOString()
    const e = endOfDay(new Date()).toISOString()
    return cleanings.filter(
      (c) => c.scheduled_start >= s && c.scheduled_start <= e && c.status !== 'cancelled'
    )
  }, [cleanings])

  const monthDone = cleanings.filter((c) => c.status === 'done')
  const revenue = monthDone.reduce((acc, c) => acc + Number(c.revenue_amount), 0)
  const costs = monthDone.reduce(
    (acc, c) =>
      acc +
      Number(c.employee_pay_amount) +
      Number(c.materials_cost) +
      Number(c.other_costs),
    0
  )
  const pending = cleanings.filter((c) => c.status === 'requested')

  return (
    <AppShell title="Painel">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-[var(--muted)]">Faxinas hoje</p>
          <p className="mt-1 font-display text-3xl">{today.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)]">Solicitações pendentes</p>
          <p className="mt-1 font-display text-3xl">{pending.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)]">Receita do mês</p>
          <p className="mt-1 font-display text-2xl">{formatBRL(revenue)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)]">Margem do mês</p>
          <p className="mt-1 font-display text-2xl">{formatBRL(revenue - costs)}</p>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Hoje</h2>
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Carregando…</p>
        ) : today.length === 0 ? (
          <EmptyState text="Nenhuma faxina para hoje." />
        ) : (
          <div className="space-y-2">
            {today.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{c.properties?.label || 'Imóvel'}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {format(new Date(c.scheduled_start), "HH:mm · EEEE", { locale: ptBR })}
                    {c.employees?.full_name ? ` · ${c.employees.full_name}` : ''}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Aguardando confirmação</h2>
        {pending.length === 0 ? (
          <EmptyState text="Nenhuma solicitação pendente." />
        ) : (
          <div className="space-y-2">
            {pending.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {c.properties?.label} · {c.clients?.full_name}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {format(new Date(c.scheduled_start), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {' · '}
                    {formatBRL(c.revenue_amount)}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </Card>
            ))}
            <p className="text-xs text-[var(--muted)]">
              Confirme e atribua a funcionária em Agenda.
            </p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Faxinas concluídas (mês)</h2>
        {monthDone.length === 0 ? (
          <EmptyState text="Ainda não há faxinas concluídas neste mês." />
        ) : (
          <div className="space-y-2">
            {monthDone.slice(-8).reverse().map((c) => (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{c.properties?.label}</p>
                  <p className="text-sm text-[var(--muted)]">
                    Margem {formatBRL(cleaningMargin(c))}
                  </p>
                </div>
                <p className="text-sm font-medium">{formatBRL(c.revenue_amount)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
