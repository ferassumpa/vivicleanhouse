'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import {
  Alert,
  Field,
  PasswordInput,
  PrimaryButton,
  TextInput,
} from '@/components/auth/AuthFields'
import { roleHomePath, useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const { signIn, user, profile, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(roleHomePath(profile.role))
    }
  }, [loading, profile, router, user])

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) return
    void supabase.auth.exchangeCodeForSession(code).then(({ error: exchError }) => {
      if (exchError) setError('Não foi possível confirmar o e-mail. Tente entrar normalmente.')
    })
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const result = await signIn(email.trim(), password)
    if (result.error) {
      setError(
        result.error.includes('Invalid login')
          ? 'E-mail ou senha inválidos.'
          : result.error
      )
      setSubmitting(false)
      return
    }
    setSubmitting(false)
  }

  return (
    <AuthShell
      eyebrow="Bem-vindo de volta"
      title="Entrar na sua conta"
      subtitle="Acesse agenda, faxinas e finanças do ViviClenaer."
      footer={
        <p className="text-sm text-slate-500">
          Ainda não tem conta?{' '}
          <Link
            href="/auth/signup"
            className="font-semibold text-[var(--teal-dark)] hover:underline"
          >
            Criar conta
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {error && <Alert kind="error">{error}</Alert>}

        <Field label="E-mail">
          <TextInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu-email@exemplo.com"
            icon={<Mail className="h-4 w-4" />}
            autoComplete="email"
          />
        </Field>

        <Field
          label="Senha"
          rightSlot={
            <Link
              href="/auth/forgot-password"
              className="text-xs font-semibold text-[var(--teal-dark)] hover:underline"
            >
              Esqueci minha senha
            </Link>
          }
        >
          <PasswordInput
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            icon={<Lock className="h-4 w-4" />}
            autoComplete="current-password"
          />
        </Field>

        <PrimaryButton type="submit" loading={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </PrimaryButton>
      </form>
    </AuthShell>
  )
}
