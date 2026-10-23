import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

    const { data: cleaningId, error } = await caller.rpc('book_cleaning_request', {
      p_property_id: propertyId,
      p_slot_id: slotId,
    })

    if (error) {
      const msg = error.message || ''
      if (msg.includes('Could not find the function') || error.code === 'PGRST202') {
        return NextResponse.json(
          {
            error:
              'Função de agendamento não instalada no Supabase. Rode o arquivo docs/sql/009_client_book_cleaning_rpc.sql no SQL Editor.',
          },
          { status: 503 }
        )
      }
      const status = msg.includes('disponível') || msg.includes('reservado') ? 409 : 400
      return NextResponse.json({ error: msg }, { status })
    }

    return NextResponse.json({ ok: true, cleaningId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
