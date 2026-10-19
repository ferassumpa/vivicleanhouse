'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { format, startOfDay } from 'date-fns'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, StatusBadge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCleaningWhen, type Cleaning, type Employee } from '@/lib/types'

export default function EmployeeHomePage() {
  const { user, profile, role } = useAuth()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [jobs, setJobs] = useState<Cleaning[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  async function ensureEmployeeRow(): Promise<Employee | null> {
    if (!user) return null

    const { data: existing } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) return existing as Employee

    // Admin que executa faxinas: cria o vínculo automaticamente
    if (role === 'admin') {
      const { data: created, error } = await supabase
        .from('employees')
        .insert({
          user_id: user.id,
          full_name: profile?.full_name || 'Admin',
          pay_per_cleaning: 0,
          active: true,
        })
        .select('*')
        .single()
      if (error) {
        // Pode já existir por race; tenta de novo
        const { data: again } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        return (again as Employee) || null
      }
      return created as Employee
    }

    return null
  }

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)
      const emp = await ensureEmployeeRow()
      setEmployee(emp)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, profile?.full_name])

  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const todayJobs = jobs.filter((j) => j.scheduled_start.slice(0, 10) === todayKey)
  const upcoming = jobs.filter((j) => !todayJobs.includes(j))

  return (
    <AppShell
      title="Minhas faxinas"
      subtitle={
        role === 'admin'
          ? 'Faxinas atribuídas a você. Na Agenda, escolha “Eu (admin)” ao agendar/aprovar.'
          : 'Veja dia, hora e endereço. Valores financeiros não aparecem nesta conta.'
      }
    >
      {message && (
        <p className="mb-4 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">{message}</p>
      )}

      {!employee && !loading && (
        <Card className="mb-4 space-y-2">
          <p className="text-sm">
            Seu login ainda não está vinculado como executora de faxinas.
          </p>
          {role === 'admin' ? (
            <Button
              type="button"
              onClick={async () => {
                const emp = await ensureEmployeeRow()
                if (!emp) {
                  setMessage('Não foi possível criar seu perfil de execução. Tente de novo.')
                  return
                }
                setEmployee(emp)
                setMessage('Perfil de execução criado. Agora atribua faxinas a “Eu (admin)” na Agenda.')
                window.location.reload()
              }}
            >
              Ativar execução de faxinas para mim
            </Button>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Peça à admin para cadastrar você em Funcionárias e vincular seu e-mail de login.
            </p>
          )}
        </Card>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Hoje — toque para abrir</h2>
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Carregando…</p>
        ) : todayJobs.length === 0 ? (
          <EmptyState text="Nenhuma faxina sua para hoje. Confira se a Agenda atribuiu a faxina a você." />
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
                  <div className="flex items-center gap-2">
                    <StatusBadge status={j.status} />
                    <span className="text-xs font-semibold text-[var(--pink-deep)]">Abrir →</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Próximas</h2>
        {upcoming.length === 0 ? (
          <EmptyState text="Sem faxinas nos próximos dias." />
        ) : (
          <div className="space-y-2">
            {upcoming.map((j) => (
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
