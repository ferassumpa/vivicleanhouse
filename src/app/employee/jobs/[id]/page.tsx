'use client'

import { useParams, useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppShell } from '@/components/AppShell'
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Select,
  StatusBadge,
} from '@/components/ui'
import { getCleaningPhotoUrl, supabase } from '@/lib/supabase'
import {
  formatBRL,
  type Cleaning,
  type Material,
  type PhotoKind,
} from '@/lib/types'

type PhotoRow = { id: string; kind: PhotoKind; storage_path: string; url?: string | null }
type MaterialRow = {
  id: string
  name: string
  quantity: number
  unit_cost: number
  total_cost: number
}

export default function EmployeeJobPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<Cleaning | null>(null)
  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [used, setUsed] = useState<MaterialRow[]>([])
  const [materialId, setMaterialId] = useState('')
  const [qty, setQty] = useState('1')
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('cleanings')
      .select('*, properties(id,label,address,access_notes), clients(id,full_name)')
      .eq('id', params.id)
      .maybeSingle()
    setJob((data as Cleaning) || null)

    const [photosRes, matsRes, usedRes] = await Promise.all([
      supabase.from('cleaning_photos').select('*').eq('cleaning_id', params.id),
      supabase.from('materials').select('*').eq('active', true).order('name'),
      supabase.from('cleaning_materials').select('*').eq('cleaning_id', params.id),
    ])

    const withUrls = await Promise.all(
      ((photosRes.data as PhotoRow[]) || []).map(async (p) => ({
        ...p,
        url: await getCleaningPhotoUrl(p.storage_path),
      }))
    )
    setPhotos(withUrls)
    setMaterials((matsRes.data as Material[]) || [])
    setUsed((usedRes.data as MaterialRow[]) || [])
    if (matsRes.data?.[0] && !materialId) setMaterialId(matsRes.data[0].id)
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
    setMessage('Entrada registrada.')
  }

  async function checkOut() {
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

  async function addMaterial(e: FormEvent) {
    e.preventDefault()
    if (!job) return
    const mat = materials.find((m) => m.id === materialId)
    if (!mat) return
    const quantity = Number(qty) || 1
    const unit = Number(mat.unit_cost)
    const { error } = await supabase.from('cleaning_materials').insert({
      cleaning_id: job.id,
      material_id: mat.id,
      name: mat.name,
      quantity,
      unit_cost: unit,
      total_cost: unit * quantity,
    })
    if (error) {
      setMessage(error.message)
      return
    }
    setQty('1')
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

  return (
    <AppShell title={job.properties?.label || 'Faxina'}>
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{job.clients?.full_name}</p>
            <p className="text-sm text-[var(--muted)]">
              {format(new Date(job.scheduled_start), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
            {job.properties?.address && (
              <p className="mt-1 text-sm">{job.properties.address}</p>
            )}
            {job.properties?.access_notes && (
              <p className="mt-2 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">
                Acesso: {job.properties.access_notes}
              </p>
            )}
          </div>
          <div className="text-right">
            <StatusBadge status={job.status} />
            <p className="mt-2 text-sm">{formatBRL(job.employee_pay_amount)} / faxina</p>
          </div>
        </div>
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
          <h2 className="mb-3 font-semibold">Fotos antes</h2>
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
                <img key={p.id} src={p.url} alt="Antes" className="h-28 w-full rounded-xl object-cover" />
              ) : null
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Fotos depois</h2>
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
                <img key={p.id} src={p.url} alt="Depois" className="h-28 w-full rounded-xl object-cover" />
              ) : null
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 font-semibold">Materiais usados</h2>
        <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={addMaterial}>
          <div className="min-w-[180px] flex-1">
            <Label>Material</Label>
            <Select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({formatBRL(m.unit_cost)})
                </option>
              ))}
            </Select>
          </div>
          <div className="w-24">
            <Label>Qtd</Label>
            <Input type="number" min="0.1" step="0.1" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <Button type="submit" disabled={!materialId}>
            Adicionar
          </Button>
        </form>
        {used.length === 0 ? (
          <EmptyState text="Nenhum material registrado." />
        ) : (
          <div className="space-y-1 text-sm">
            {used.map((u) => (
              <div key={u.id} className="flex justify-between border-b border-[var(--line)] py-2">
                <span>
                  {u.name} × {u.quantity}
                </span>
                <span>{formatBRL(u.total_cost)}</span>
              </div>
            ))}
            <p className="pt-2 font-medium">
              Total materiais: {formatBRL(job.materials_cost)}
            </p>
          </div>
        )}
      </Card>
    </AppShell>
  )
}
