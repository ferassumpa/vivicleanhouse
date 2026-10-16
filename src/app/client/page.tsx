'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatBRL, PRICING_LABELS, type Client, type Property } from '@/lib/types'

export default function ClientHomePage() {
  const { user } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data: c } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      setClient((c as Client) || null)
      if (!c) return
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('client_id', c.id)
        .eq('active', true)
        .order('label')
      setProperties((data as Property[]) || [])
    }
    void load()
  }, [user])

  return (
    <AppShell title="Meus imóveis">
      {!client && (
        <Card className="mb-4">
          <p className="text-sm">
            Seu login ainda não está vinculado a um cliente. Peça à admin para
            associar seu usuário.
          </p>
        </Card>
      )}

      <div className="mb-4">
        <Link href="/client/schedule">
          <Button>Agendar limpeza</Button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <EmptyState text="Nenhum imóvel vinculado à sua conta." />
      ) : (
        <div className="space-y-2">
          {properties.map((p) => (
            <Card key={p.id}>
              <p className="font-medium">{p.label}</p>
              <p className="text-sm text-[var(--muted)]">
                {p.property_type} · {PRICING_LABELS[p.default_pricing_type]}
              </p>
              {p.address && <p className="mt-1 text-sm">{p.address}</p>}
              <p className="mt-1 text-sm">
                {p.default_pricing_type === 'hourly' && p.price_hourly != null
                  ? `${formatBRL(p.price_hourly)}/h`
                  : p.default_pricing_type === 'package' && p.price_package != null
                    ? formatBRL(p.price_package)
                    : p.price_fixed != null
                      ? formatBRL(p.price_fixed)
                      : 'Preço a combinar'}
              </p>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}
