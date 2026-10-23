import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { combineDateAndTime, resolvePropertyPrice } from '@/lib/pricing'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { AvailabilitySlot, Property } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 })
    }

    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
    }

    const body = await request.json()
    const propertyId = String(body.propertyId || '')
    const slotId = String(body.slotId || '')
    if (!propertyId || !slotId) {
      return NextResponse.json({ error: 'Informe imóvel e horário' }, { status: 400 })
    }

    const { data: clientRow, error: clientErr } = await caller
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (clientErr || !clientRow) {
      return NextResponse.json({ error: 'Conta de cliente não vinculada' }, { status: 403 })
    }

    const { data: property, error: propErr } = await caller
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('client_id', clientRow.id)
      .maybeSingle()
    if (propErr || !property) {
      return NextResponse.json({ error: 'Imóvel inválido' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data: slot, error: slotErr } = await admin
      .from('availability_slots')
      .select('*')
      .eq('id', slotId)
      .eq('is_open', true)
      .maybeSingle()

    if (slotErr || !slot) {
      return NextResponse.json(
        { error: 'Esse horário não está mais disponível. Escolha outro.' },
        { status: 409 }
      )
    }

    const slotRow = slot as AvailabilitySlot
    const quote = resolvePropertyPrice(property as Property)

    const { data: closed, error: closeErr } = await admin
      .from('availability_slots')
      .update({ is_open: false })
      .eq('id', slotId)
      .eq('is_open', true)
      .select('id')
      .maybeSingle()

    if (closeErr || !closed) {
      return NextResponse.json(
        { error: 'Esse horário acabou de ser reservado. Atualize a página.' },
        { status: 409 }
      )
    }

    const scheduledStart = combineDateAndTime(slotRow.slot_date, slotRow.start_time)
    const scheduledEnd = combineDateAndTime(slotRow.slot_date, slotRow.end_time)

    const { error: insertErr } = await admin.from('cleanings').insert({
      property_id: propertyId,
      client_id: clientRow.id,
      availability_slot_id: slotId,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      status: 'requested',
      pricing_type: quote.pricing_type,
      unit_price: quote.unit_price,
      hours: quote.hours,
      revenue_amount: quote.revenue_amount,
      employee_pay_amount: 0,
      notes: 'Solicitação do cliente — aguardando confirmação da admin',
    })

    if (insertErr) {
      await admin.from('availability_slots').update({ is_open: true }).eq('id', slotId)
      return NextResponse.json({ error: insertErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
