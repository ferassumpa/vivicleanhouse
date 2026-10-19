'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { roleHomePath, useAuth } from '@/contexts/AuthContext'
import { Button, Card, Input, Label } from '@/components/ui'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(roleHomePath(profile.role))
    }
  }, [loading, profile, router, user])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setSubmitting(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role: 'client',
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setSubmitting(false)
      return
    }

    // Se o projeto exige confirmação de e-mail, não haverá sessão imediata
    if (!data.session) {
      setSuccess(true)
      setSubmitting(false)
      return
    }

    // Garante vínculo em clients (além do trigger SQL 003, se já aplicado)
    if (data.user) {
      await supabase.from('clients').upsert(
        {
          user_id: data.user.id,
          full_name: fullName.trim(),
          email: email.trim(),
        },
        { onConflict: 'user_id' }
      )
    }

    setSubmitting(false)
    router.replace('/client')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <p className="font-display text-3xl text-[var(--brand)]">ViviClenaer</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Crie sua conta de cliente para agendar faxinas.
        </p>

        {success ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Conta criada. Verifique seu e-mail para confirmar o cadastro e depois faça
              login.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            <div>
              <Label>Nome completo</Label>
              <Input
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Senha</Label>
              <Input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Confirmar senha</Label>
              <Input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Criando…' : 'Criar conta'}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          Já tem conta?{' '}
          <Link href="/auth/login" className="font-medium text-[var(--brand)] hover:underline">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  )
}
