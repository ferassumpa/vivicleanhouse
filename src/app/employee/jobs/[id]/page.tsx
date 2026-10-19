'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

type PhotoRow = { id: string; kind: PhotoKind; storage_path: string; url?: string | null }

export default function EmployeeJobPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<Cleaning | null>(null)
  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [checklist, setChecklist] = useState<CleaningChecklistRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('cleanings')
      .select(
        '*, properties(id,label,address,access_notes,building_id, buildings(id,name,address,entry_rules,doorman_name,doorman_phone,syndic_name,syndic_phone,caretaker_name,caretaker_phone)), clients(id,full_name)'
      )
      .eq('id', params.id)
      .maybeSingle()

    const cleaning = data as Cleaning | null
    setJob(cleaning)

    if (cleaning) {
      await ensureCleaningChecklist(cleaning.id, cleaning.property_id)
    }

    const [photosRes, checklistRes] = await Promise.all([
      supabase.from('cleaning_photos').select('*').eq('cleaning_id', params.id),
      supabase
        .from('cleaning_checklist')
        .select('*')
        .eq('cleaning_id', params.id)
        .order('created_at'),
    ])

    const withUrls = await Promise.all(
      ((photosRes.data as PhotoRow[]) || []).map(async (p) => ({
        ...p,
        url: await getCleaningPhotoUrl(p.storage_path),
      }))
    )
    setPhotos(withUrls)
    setChecklist((checklistRes.data as CleaningChecklistRow[]) || [])
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function setStatus(status: Cleaning['status'], extra: Record<string, unknown> = {}) {
    if (!job) return
    const { error } = await supabase
      .from('cleanings')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', job.id)
    if (error) {
      setMessage(error.message)
      return
    }
    await load()
  }

  async function checkIn() {
    await setStatus('in_progress', { started_at: new Date().toISOString() })
    setMessage('Entrada registrada. Tire a foto pré-faxina.')
  }

  async function checkOut() {
    const missingBefore = photos.filter((p) => p.kind === 'before').length === 0
    const missingAfter = photos.filter((p) => p.kind === 'after').length === 0
    if (missingBefore || missingAfter) {
      setMessage('Envie ao menos uma foto pré e uma foto pós antes de concluir.')
      return
    }
    await setStatus('done', { ended_at: new Date().toISOString() })
    setMessage('Saída registrada. Faxina concluída.')
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

  return (
    <AppShell title={job.properties?.label || 'Faxina'}>
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{job.clients?.full_name}</p>
            <p className="text-sm text-[var(--muted)]">
              {formatCleaningWhen(job.scheduled_start)}
            </p>
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
            {building.caretaker_name && (
              <p>
                Zelador: {building.caretaker_name}
                {building.caretaker_phone ? ` · ${building.caretaker_phone}` : ''}
              </p>
            )}
            {building.syndic_name && (
              <p>
                Síndico: {building.syndic_name}
                {building.syndic_phone ? ` · ${building.syndic_phone}` : ''}
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

      <div className="mb-6 flex flex-wrap gap-2">
        {job.status === 'confirmed' && (
          <Button onClick={() => void checkIn()}>Registrar entrada</Button>
        )}
        {job.status === 'in_progress' && (
          <Button onClick={() => void checkOut()}>Registrar saída e concluir</Button>
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
