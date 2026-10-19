import { NextRequest, NextResponse } from 'next/server'

/**
 * Destino de confirmação de e-mail / OAuth.
 * O client Supabase processa tokens na URL; aqui só redirecionamos com segurança.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const next = url.searchParams.get('next')
  const destination = new URL('/auth/login', url.origin)

  if (next && next.startsWith('/') && !next.startsWith('//')) {
    destination.pathname = next
  }

  // Preserva code/hash params para o client trocar a sessão quando aplicável
  for (const [key, value] of url.searchParams) {
    if (key === 'next') continue
    destination.searchParams.set(key, value)
  }

  return NextResponse.redirect(destination)
}
