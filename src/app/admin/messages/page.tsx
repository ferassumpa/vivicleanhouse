'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button, Card, EmptyState, Label, TextArea } from '@/components/ui'
import { supabase } from '@/lib/supabase'

type Template = {
  id: string
  key: string
  title: string
  body: string
  active: boolean
}

const HINT =
  'Variáveis: {cliente} {imovel} {hora} {endereco} {predio}. Pode usar emoji (ex.: 😊). Se aparecer “?”, rode o SQL 007 ou cole a carinha de novo e salve.'

export default function AdminMessagesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [bodies, setBodies] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  async function load() {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .order('key')
    if (error) {
      setMessage(
        error.message.includes('notification_templates') || error.message.includes('relation')
          ? 'Rode o SQL docs/sql/006_whatsapp_templates.sql no Supabase.'
          : error.message
      )
      return
    }
    const list = (data as Template[]) || []
    setTemplates(list)
    const map: Record<string, string> = {}
    for (const t of list) map[t.key] = t.body
    setBodies(map)
  }

  useEffect(() => {
    void load()
  }, [])

  async function save(t: Template, e: FormEvent) {
    e.preventDefault()
    setSavingKey(t.key)
    setMessage(null)
    const { error } = await supabase
      .from('notification_templates')
      .update({
        body: (bodies[t.key] || '').trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', t.id)
    setSavingKey(null)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage(`Modelo "${t.title}" salvo.`)
    await load()
  }

  return (
    <AppShell title="Mensagens WhatsApp" subtitle={HINT}>
      {message && (
        <p className="mb-4 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">{message}</p>
      )}

      {templates.length === 0 ? (
        <EmptyState text="Nenhum modelo encontrado. Rode o SQL 006 no Supabase." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <form className="space-y-3" onSubmit={(e) => void save(t, e)}>
                <div>
                  <h2 className="font-semibold">{t.title}</h2>
                  <p className="text-xs text-[var(--muted)]">Chave: {t.key}</p>
                </div>
                <div>
                  <Label>Texto da mensagem</Label>
                  <TextArea
                    rows={10}
                    value={bodies[t.key] ?? ''}
                    onChange={(e) =>
                      setBodies((prev) => ({ ...prev, [t.key]: e.target.value }))
                    }
                  />
                </div>
                <Button type="submit" disabled={savingKey === t.key}>
                  {savingKey === t.key ? 'Salvando…' : 'Salvar modelo'}
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}
