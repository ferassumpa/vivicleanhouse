'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import { Card, EmptyState, StatusBadge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { getCleaningPhotoUrl, supabase } from '@/lib/supabase'
import { formatBRL, type Cleaning, type Client } from '@/lib/types'

type Photo = { id: string; cleaning_id: string; kind: 'before' | 'after'; url: string | null }

export default function ClientHistoryPage() {
  const { user } = useAuth()
  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data: c } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!c) return

      const { data } = await supabase
        .from('cleanings')
        .select('*, properties(id,label,address), employees(id,full_name)')
        .eq('client_id', (c as Client).id)
        .in('status', ['done', 'cancelled'])
        .order('scheduled_start', { ascending: false })

      const list = (data as Cleaning[]) || []
      setCleanings(list)

      if (list.length) {
        const { data: photoRows } = await supabase
          .from('cleaning_photos')
          .select('id, cleaning_id, kind, storage_path')
          .in(
            'cleaning_id',
            list.map((x) => x.id)
          )
        const withUrls = await Promise.all(
          (photoRows || []).map(async (p) => ({
            id: p.id as string,
            cleaning_id: p.cleaning_id as string,
            kind: p.kind as 'before' | 'after',
            url: await getCleaningPhotoUrl(p.storage_path as string),
          }))
        )
        setPhotos(withUrls)
      }
    }
    void load()
  }, [user])

  return (
    <AppShell
      title="Histórico"
      subtitle="Faxinas concluídas ou canceladas, com fotos quando disponíveis."
    >
      {cleanings.length === 0 ? (
        <EmptyState text="Nenhuma faxina concluída ainda. As agendadas ficam em Minhas faxinas." />
      ) : (
        <div className="space-y-3">
          {cleanings.map((c) => {
            const jobPhotos = photos.filter((p) => p.cleaning_id === c.id)
            return (
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
                  <div className="text-right">
                    <StatusBadge status={c.status} />
                    <p className="mt-1 text-sm">{formatBRL(c.revenue_amount)}</p>
                  </div>
                </div>
                {jobPhotos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {jobPhotos.map((p) =>
                      p.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={p.id}
                          src={p.url}
                          alt={p.kind === 'before' ? 'Antes' : 'Depois'}
                          className="h-24 w-full rounded-xl object-cover"
                        />
                      ) : null
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
