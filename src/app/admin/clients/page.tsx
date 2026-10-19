'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Input, Label, TextArea } from '@/components/ui'
import { deleteErrorMessage } from '@/lib/adminCrud'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/lib/types'

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('clients').select('*').order('full_name')
    setClients((data as Client[]) || [])
  }

  useEffect(() => {
    void load()
  }, [])

  function resetForm() {
    setEditingId(null)
    setFullName('')
    setEmail('')
    setPhone('')
    setNotes('')
  }

  function startEdit(c: Client) {
    setEditingId(c.id)
    setFullName(c.full_name)
    setEmail(c.email || '')
    setPhone(c.phone || '')
    setNotes(c.notes || '')
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const payload = {
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    }
    const { error } = editingId
      ? await supabase.from('clients').update(payload).eq('id', editingId)
      : await supabase.from('clients').insert(payload)
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage(editingId ? 'Cliente atualizado.' : 'Cliente cadastrado.')
    resetForm()
    await load()
  }

  async function removeClient(c: Client) {
    if (!window.confirm(`Excluir o cliente "${c.full_name}"? Imóveis dele também serão removidos se não houver faxinas bloqueando.`)) {
      return
    }
    const { error } = await supabase.from('clients').delete().eq('id', c.id)
    if (error) {
      setMessage(deleteErrorMessage(error, 'cliente'))
      return
    }
    setMessage('Cliente excluído.')
    if (editingId === c.id) resetForm()
    await load()
  }

  return (
    <AppShell title="Clientes" subtitle="Cadastre, edite ou exclua clientes.">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">{editingId ? 'Editar cliente' : 'Novo cliente'}</h2>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
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
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          {clients.length === 0 ? (
            <EmptyState text="Nenhum cliente cadastrado." />
          ) : (
            clients.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{c.full_name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {[c.email, c.phone].filter(Boolean).join(' · ') || 'Sem contato'}
                  </p>
                  {c.notes && <p className="mt-1 text-sm">{c.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" type="button" onClick={() => startEdit(c)}>
                    Editar
                  </Button>
                  <Button variant="danger" type="button" onClick={() => void removeClient(c)}>
                    Excluir
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
