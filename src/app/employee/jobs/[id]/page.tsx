'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import {
  Button,
  Card,
  EmptyState,
  Input,
  StatusBadge,
} from '@/components/ui'
import { ensureCleaningChecklist } from '@/lib/checklist'
import { getCleaningPhotoUrl, supabase } from '@/lib/supabase'
import {
  formatCleaningWhen,
  type Cleaning,
  type CleaningChecklistRow,
  type PhotoKind,
} from '@/lib/types'
import { fillTemplate, openWhatsApp } from '@/lib/whatsapp'

type PhotoRow = { id: string; kind: PhotoKind; storage_path: string; url?: string | null }

export default function EmployeeJobPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<Cleaning | null>(null)
  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [checklist, setChecklist] = useState<CleaningChecklistRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true)
  const [templates, setTemplates] = useState<Record<string, string>>({})

  async function load() {
    const { data } = await supabase
      .from('cleanings')
      .select(
        '*, properties(id,label,address,access_notes,building_id, buildings(id,name,address,entry_rules,doorman_name,doorman_phone,syndic_name,syndic_phone,caretaker_name,caretaker_phone)), clients(id,full_name,phone)'
      )
      .eq('id', params.id)
      .maybeSingle()

    const cleaning = data as Cleaning | null
    setJob(cleaning)

    if (cleaning) {
      await ensureCleaningChecklist(cleaning.id, cleaning.property_id)
    }

    const [photosRes, checklistRes, templatesRes] = await Promise.all([
      supabase.from('cleaning_photos').select('*').eq('cleaning_id', params.id),
      supabase
        .from('cleaning_checklist')
        .select('*')
        .eq('cleaning_id', params.id)
        .order('created_at'),
      supabase.from('notification_templates').select('key, body').eq('active', true),
    ])

    const withUrls = await Promise.all(
      ((photosRes.data as PhotoRow[]) || []).map(async (p) => ({
        ...p,
        url: await getCleaningPhotoUrl(p.storage_path),
      }))
    )
    setPhotos(withUrls)
    setChecklist((checklistRes.data as CleaningChecklistRow[]) || [])

    const map: Record<string, string> = {}
    for (const t of templatesRes.data || []) {
      map[t.key as string] = t.body as string
    }
    setTemplates(map)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  function buildVars(at: Date = new Date()) {
    if (!job) {
      return { cliente: '', imovel: '', hora: '', endereco: '', predio: '' }
    }
    return {
      cliente: job.clients?.full_name || 'cliente',
      imovel: job.properties?.label || 'imóvel',
      hora: format(at, "HH:mm 'de' dd/MM", { locale: ptBR }),
      endereco: job.properties?.address || job.properties?.buildings?.address || '',
      predio: job.properties?.buildings?.name || '',
    }
  }

  function maybeOpenWhatsApp(templateKey: string) {
    if (!notifyWhatsApp || !job) return
    const body = templates[templateKey]
    if (!body) {
      setMessage(
        (prev) =>
          (prev ? `${prev} ` : '') +
          'Modelo de WhatsApp não encontrado — rode o SQL 006 ou cadastre em Mensagens.'
      )
      return
    }
    const text = fillTemplate(body, buildVars())
    const ok = openWhatsApp(job.clients?.phone, text)
    if (!ok) {
      setMessage(
        (prev) =>
          (prev ? `${prev} ` : '') +
          'Cliente sem telefone cadastrado — WhatsApp não aberto. Atualize o telefone do cliente na admin.'
      )
    }
  }

  async function setStatus(status: Cleaning['status'], extra: Record<string, unknown> = {}) {
    if (!job) return false
    const { error } = await supabase
      .from('cleanings')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', job.id)
    if (error) {
      setMessage(error.message)
      return false
    }
    await load()
    return true
  }

  async function checkIn() {
    setMessage(null)
    const ok = await setStatus('in_progress', { started_at: new Date().toISOString() })
    if (!ok) return
    setMessage('Faxina iniciada no sistema. Tire a foto pré-faxina.')
    maybeOpenWhatsApp('cleaning_started')
  }

  async function checkOut() {
    setMessage(null)
    const missingBefore = photos.filter((p) => p.kind === 'before').length === 0
    const missingAfter = photos.filter((p) => p.kind === 'after').length === 0
    if (missingBefore || missingAfter) {
      setMessage('Envie ao menos uma foto pré e uma foto pós antes de concluir.')
      return
    }
    const ok = await setStatus('done', { ended_at: new Date().toISOString() })
    if (!ok) return
    setMessage('Faxina concluída no sistema.')
    maybeOpenWhatsApp('cleaning_finished')
  }

  async function uploadPhoto(kind: PhotoKind, file: File) {
    if (!job) return
    setUploading(true)
    setMessage(null)
    const path = `${job.id}/${kind}-${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage
      .from('cleaning-photos')
      .upload(path, file, { upsert: false })
    if (upErr) {
      setUploading(false)
      setMessage(upErr.message)
      return
    }
    const { error } = await supabase.from('cleaning_photos').insert({
      cleaning_id: job.id,
      kind,
      storage_path: path,
    })
    setUploading(false)
    if (error) {
      setMessage(error.message)
      return
    }
    await load()
  }

  async function toggleCheck(row: CleaningChecklistRow) {
    const done = !row.done
    await supabase
      .from('cleaning_checklist')
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq('id', row.id)
    await load()
  }

  if (!job) {
    return (
      <AppShell title="Faxina">
        <EmptyState text="Faxina não encontrada." />
        <Button className="mt-4" variant="secondary" onClick={() => router.push('/employee')}>
          Voltar
        </Button>
      </AppShell>
    )
  }

  const before = photos.filter((p) => p.kind === 'before')
  const after = photos.filter((p) => p.kind === 'after')
  const building = job.properties?.buildings
  const clientPhone = job.clients?.phone

  return (
    <AppShell title={job.properties?.label || 'Faxina'}>
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{job.clients?.full_name}</p>
            <p className="text-sm text-[var(--muted)]">
              {formatCleaningWhen(job.scheduled_start)}
            </p>
            {clientPhone ? (
              <p className="mt-1 text-sm text-[var(--muted)]">WhatsApp: {clientPhone}</p>
            ) : (
              <p className="mt-1 text-sm text-rose-600">
                Cliente sem telefone — cadastre na admin para avisar no WhatsApp.
              </p>
            )}
            {building?.name && (
              <p className="mt-1 text-sm font-medium text-[var(--navy)]">
                Prédio: {building.name}
              </p>
            )}
            {(job.properties?.address || building?.address) && (
              <p className="mt-1 text-sm">{job.properties?.address || building?.address}</p>
            )}
          </div>
          <StatusBadge status={job.status} />
        </div>

        {building && (
          <div className="mt-3 space-y-1 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">
            {building.entry_rules && (
              <p>
                <strong>Regras de entrada:</strong> {building.entry_rules}
              </p>
            )}
            {building.doorman_name && (
              <p>
                Porteiro: {building.doorman_name}
                {building.doorman_phone ? ` · ${building.doorman_phone}` : ''}
              </p>
            )}
          </div>
        )}

        {job.properties?.access_notes && (
          <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-[var(--line)]">
            Acesso do imóvel: {job.properties.access_notes}
          </p>
        )}
      </Card>

      {message && (
        <p className="mb-4 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">{message}</p>
      )}

      <Card className="mb-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={notifyWhatsApp}
            onChange={(e) => setNotifyWhatsApp(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--pink-deep)]"
          />
          <span>
            <span className="font-semibold text-[var(--navy)]">
              Avisar cliente no WhatsApp
            </span>
            <span className="mt-0.5 block text-[var(--muted)]">
              Ao iniciar ou concluir, abre o WhatsApp com a mensagem salva pela admin
              (você só confirma o envio). Grátis via wa.me.
            </span>
          </span>
        </label>
      </Card>

      <div className="mb-6 flex flex-wrap gap-2">
        {job.status === 'confirmed' && (
          <Button onClick={() => void checkIn()}>Iniciei a faxina</Button>
        )}
        {job.status === 'in_progress' && (
          <Button onClick={() => void checkOut()}>Concluí a faxina</Button>
        )}
        <Button variant="secondary" onClick={() => router.push('/employee')}>
          Voltar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-semibold">Foto pré-faxina</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">Tire antes de começar a limpeza.</p>
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={uploading || job.status === 'requested'}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadPhoto('before', file)
            }}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {before.map((p) =>
              p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.url} alt="Pré" className="h-28 w-full rounded-xl object-cover" />
              ) : null
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Foto pós-faxina</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">Tire ao finalizar a limpeza.</p>
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={uploading || job.status === 'requested'}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadPhoto('after', file)
            }}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {after.map((p) =>
              p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.url} alt="Pós" className="h-28 w-full rounded-xl object-cover" />
              ) : null
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 font-semibold">Checklist da faxina</h2>
        {checklist.length === 0 ? (
          <EmptyState text="Nenhum item de checklist para este imóvel." />
        ) : (
          <ul className="space-y-2">
            {checklist.map((row) => (
              <li key={row.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={row.done}
                    onChange={() => void toggleCheck(row)}
                    className="h-4 w-4 accent-[var(--pink-deep)]"
                  />
                  <span className={row.done ? 'text-[var(--muted)] line-through' : ''}>
                    {row.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  )
}
