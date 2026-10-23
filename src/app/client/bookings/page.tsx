'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { format, isPast, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, StatusBadge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatBRL, type Cleaning, type CleaningStatus, type Client } from '@/lib/types'

const ACTIVE_STATUSES: CleaningStatus[] = ['requested', 'confirmed', 'in_progress']

const STATUS_HINT: Partial<Record<CleaningStatus, string>> = {
  requested: 'Aguardando confirmação da equipe',
  confirmed: 'Faxina confirmada — até lá!',
  in_progress: 'Limpeza em andamento agora',
}

export default function ClientBookingsPage() {
  const { user } = useAuth()
  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)
      const { data: c } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!c) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('cleanings')
        .select('*, properties(id,label,address), employees(id,full_name)')
        .eq('client_id', (c as Client).id)
        .in('status', ACTIVE_STATUSES)
        .order('scheduled_start', { ascending: true })

      setCleanings((data as Cleaning[]) || [])
      setLoading(false)
    }
    void load()
  }, [user])

  const { inProgress, pending, confirmed } = useMemo(() => ({
    inProgress: cleanings.filter((c) => c.status === 'in_progress'),
    pending: cleanings.filter((c) => c.status === 'requested'),
    confirmed: cleanings.filter((c) => c.status === 'confirmed'),
  }), [cleanings])

  return (
    <AppShell
      title="Minhas faxinas"
      subtitle="Solicitações pendentes e limpezas confirmadas — tudo que ainda vai acontecer."
    >
      {!loading && cleanings.length === 0 ? (
        <div className="space-y-4">
          <EmptyState text="Você não tem faxinas agendadas no momento." />
          <div className="flex justify-center">
            <Link href="/client/schedule">
              <Button>
                <CalendarClock size={18} />
                Agendar limpeza
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {inProgress.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--pink-deep)]">
                <Sparkles size={16} /> Em andamento
              </h2>
              <div className="space-y-3">
                {inProgress.map((c) => (
                  <BookingCard key={c.id} cleaning={c} highlight />
                ))}
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Aguardando confirmação ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((c) => (
                  <BookingCard key={c.id} cleaning={c} />
                ))}
              </div>
            </section>
          )}

          {confirmed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Confirmadas ({confirmed.length})
              </h2>
              <div className="space-y-3">
                {confirmed.map((c) => (
                  <BookingCard key={c.id} cleaning={c} />
                ))}
              </div>
            </section>
          )}

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)]/80 px-4 py-3 text-sm text-[var(--muted)]">
            Faxinas já concluídas ou canceladas ficam em{' '}
            <Link href="/client/history" className="font-semibold text-[var(--pink-deep)] underline-offset-2 hover:underline">
              Histórico
            </Link>
            .
          </div>
        </div>
      )}
    </AppShell>
  )
}

function BookingCard({ cleaning: c, highlight }: { cleaning: Cleaning; highlight?: boolean }) {
  const when = new Date(c.scheduled_start)
  const past = isPast(when) && !isToday(when) && c.status !== 'in_progress'

  return (
    <Card
      className={`overflow-hidden p-0 ${highlight ? 'border-[var(--pink-deep)] ring-2 ring-[var(--pink-soft)]' : ''}`}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="flex shrink-0 flex-col items-center justify-center border-b border-[var(--line)] bg-gradient-to-br from-[var(--pink-soft)] to-white px-6 py-4 sm:w-28 sm:border-b-0 sm:border-r">
          <span className="text-2xl font-display font-semibold text-[var(--navy)]">
            {format(when, 'dd')}
          </span>
          <span className="text-xs font-medium uppercase text-[var(--muted)]">
            {format(when, 'MMM', { locale: ptBR })}
          </span>
          <span className="mt-1 text-sm font-semibold text-[var(--pink-deep)]">
            {format(when, 'HH:mm')}
          </span>
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-[var(--navy)]">{c.properties?.label}</p>
            {c.properties?.address && (
              <p className="mt-0.5 text-sm text-[var(--muted)]">{c.properties.address}</p>
            )}
            <p className="mt-2 text-sm capitalize text-[var(--muted)]">
              {format(when, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            {c.employees?.full_name && (
              <p className="mt-1 text-sm">
                Faxineira: <span className="font-medium">{c.employees.full_name}</span>
              </p>
            )}
            <p className="mt-2 text-xs text-[var(--muted)]">{STATUS_HINT[c.status]}</p>
            {past && c.status === 'requested' && (
              <p className="mt-1 text-xs text-amber-700">Data passou — aguarde contato da equipe.</p>
            )}
          </div>
          <div className="text-right">
            <StatusBadge status={c.status} />
            <p className="mt-2 text-sm font-semibold">{formatBRL(c.revenue_amount)}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
