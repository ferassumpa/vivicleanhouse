'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { format, startOfDay } from 'date-fns'
import { AppShell } from '@/components/AppShell'
import { Card, EmptyState, StatusBadge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCleaningWhen, type Cleaning, type Employee } from '@/lib/types'

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
      const { data } = await supabase
        .from('cleanings')
        .select(
          '*, properties(id,label,address, buildings(id,name)), clients(id,full_name)'
        )
        .eq('employee_id', emp.id)
        .in('status', ['confirmed', 'in_progress', 'done'])
        .gte('scheduled_start', from)
        .order('scheduled_start', { ascending: true })

      setJobs((data as Cleaning[]) || [])
      setLoading(false)
    }
    void load()
  }, [user])

  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const todayJobs = jobs.filter((j) => j.scheduled_start.slice(0, 10) === todayKey)

  return (
    <AppShell
      title="Minha agenda"
      subtitle="Veja dia, hora e endereço das faxinas. Valores financeiros não aparecem nesta conta."
    >
      {!employee && !loading && (
        <Card className="mb-4">
          <p className="text-sm">
            Seu login ainda não está vinculado a uma funcionária. Peça à admin para
            cadastrar você em Funcionárias e vincular o e-mail.
          </p>
        </Card>
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
                <Card className="mb-2 flex flex-wrap items-center justify-between gap-3 transition hover:border-[var(--pink-deep)]">
                  <div>
                    <p className="font-medium">{j.properties?.label}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {formatCleaningWhen(j.scheduled_start)}
                      {j.properties?.buildings?.name
                        ? ` · ${j.properties.buildings.name}`
                        : ''}
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
        <h2 className="mb-3 text-lg font-semibold">Próximas</h2>
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
                        {formatCleaningWhen(j.scheduled_start)}
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
