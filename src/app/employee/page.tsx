'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import { Card, EmptyState, StatusBadge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatBRL, type Cleaning, type Employee } from '@/lib/types'

export default function EmployeeHomePage() {
  const { user } = useAuth()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [jobs, setJobs] = useState<Cleaning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      setEmployee((emp as Employee) || null)
      if (!emp) {
        setLoading(false)
        return
      }

      const from = startOfDay(new Date()).toISOString()
      const to = endOfDay(new Date(Date.now() + 7 * 86400000)).toISOString()
      const { data } = await supabase
        .from('cleanings')
        .select('*, properties(id,label,address), clients(id,full_name)')
        .eq('employee_id', emp.id)
        .in('status', ['confirmed', 'in_progress', 'done'])
        .gte('scheduled_start', from)
        .lte('scheduled_start', to)
        .order('scheduled_start', { ascending: true })

      setJobs((data as Cleaning[]) || [])
      setLoading(false)
    }
    void load()
  }, [user])

  const todayJobs = jobs.filter(
    (j) => j.scheduled_start.slice(0, 10) === format(new Date(), 'yyyy-MM-dd')
  )

  return (
    <AppShell title="Minhas faxinas">
      {!employee && !loading && (
        <Card className="mb-4">
          <p className="text-sm">
            Seu login ainda não está vinculado a uma funcionária. Peça à admin para
            preencher o <code>user_id</code> no cadastro.
          </p>
        </Card>
      )}

      {employee && (
        <p className="mb-4 text-sm text-[var(--muted)]">
          Você ganha {formatBRL(employee.pay_per_cleaning)} por faxina e pode fazer
          várias no mesmo dia.
        </p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Hoje</h2>
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Carregando…</p>
        ) : todayJobs.length === 0 ? (
          <EmptyState text="Nenhuma faxina para hoje." />
        ) : (
          <div className="space-y-2">
            {todayJobs.map((j) => (
              <Link key={j.id} href={`/employee/jobs/${j.id}`}>
                <Card className="mb-2 flex flex-wrap items-center justify-between gap-3 transition hover:border-[var(--brand)]">
                  <div>
                    <p className="font-medium">{j.properties?.label}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {format(new Date(j.scheduled_start), 'HH:mm', { locale: ptBR })}
                      {j.properties?.address ? ` · ${j.properties.address}` : ''}
                      {' · '}
                      {formatBRL(j.employee_pay_amount)}
                    </p>
                  </div>
                  <StatusBadge status={j.status} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Próximos dias</h2>
        {jobs.filter((j) => !todayJobs.includes(j)).length === 0 ? (
          <EmptyState text="Sem faxinas nos próximos dias." />
        ) : (
          <div className="space-y-2">
            {jobs
              .filter((j) => !todayJobs.includes(j))
              .map((j) => (
                <Link key={j.id} href={`/employee/jobs/${j.id}`}>
                  <Card className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{j.properties?.label}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {format(new Date(j.scheduled_start), "EEEE dd/MM HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <StatusBadge status={j.status} />
                  </Card>
                </Link>
              ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
