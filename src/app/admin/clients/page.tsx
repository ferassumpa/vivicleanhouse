'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label, TextArea } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/lib/types'

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('full_name')
    setClients((data as Client[]) || [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.from('clients').insert({
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setFullName('')
    setEmail('')
    setPhone('')
    setNotes('')
    setMessage('Cliente cadastrado.')
    await load()
  }

  return (
    <AppShell title="Clientes">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">Novo cliente</h2>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <Label>Nome</Label>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Observações</Label>
              <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          {clients.length === 0 ? (
            <EmptyState text="Nenhum cliente cadastrado." />
          ) : (
            clients.map((c) => (
              <Card key={c.id}>
                <p className="font-medium">{c.full_name}</p>
                <p className="text-sm text-[var(--muted)]">
                  {[c.email, c.phone].filter(Boolean).join(' · ') || 'Sem contato'}
                </p>
                {c.notes && <p className="mt-1 text-sm">{c.notes}</p>}
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
