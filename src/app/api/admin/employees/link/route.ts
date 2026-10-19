import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

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

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admin' }, { status: 403 })
    }

    const body = await request.json()
    const employeeId = String(body.employeeId || '')
    const email = String(body.email || '')
      .trim()
      .toLowerCase()
    const password = String(body.password || '')
    const fullName = String(body.fullName || 'Funcionária')

    if (!employeeId || !email) {
      return NextResponse.json(
        { error: 'Informe employeeId e e-mail' },
        { status: 400 }
      )
    }
    if (password && password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      )
    }

    // Busca usuário existente por e-mail (paginação simples)
    let userId: string | null = null
    let page = 1
    while (!userId && page <= 10) {
      const { data: listed, error: listError } = await admin.auth.admin.listUsers({
        page,
        perPage: 100,
      })
      if (listError) break
      const found = listed.users.find((u) => u.email?.toLowerCase() === email)
      if (found) userId = found.id
      if (!listed.users.length || listed.users.length < 100) break
      page += 1
    }

    if (!userId) {
      if (!password) {
        return NextResponse.json(
          {
            error:
              'Esse e-mail ainda não tem conta. Informe uma senha temporária para criar o login da faxineira.',
          },
          { status: 400 }
        )
      }
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'employee' },
      })
      if (createError || !created.user) {
        return NextResponse.json(
          { error: createError?.message || 'Falha ao criar usuário' },
          { status: 400 }
        )
      }
      userId = created.user.id
    }

    await admin
      .from('profiles')
      .update({ role: 'employee', full_name: fullName })
      .eq('id', userId)

    // Evita conflito se outro employee já usa esse user_id
    await admin.from('employees').update({ user_id: null }).eq('user_id', userId)

    const { error: linkError } = await admin
      .from('employees')
      .update({ user_id: userId, full_name: fullName })
      .eq('id', employeeId)

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      userId,
      message:
        'Login de faxineira vinculado. Ela entra com esse e-mail e senha e vai direto para a agenda de faxinas.',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
