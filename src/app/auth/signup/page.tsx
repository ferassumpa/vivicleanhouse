'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, User } from 'lucide-react'
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

export default function SignupPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const passwordsMatch = !!confirmPassword && password === confirmPassword
  const passwordsMismatch = !!confirmPassword && password !== confirmPassword

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(roleHomePath(profile.role))
    }
  }, [loading, profile, router, user])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setSubmitting(false)
      return
    }

    if (!data.session) {
      setSuccess(true)
      setSubmitting(false)
      return
    }

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
    <AuthShell
      eyebrow="Crie sua conta"
      title="Começar no ViviClenaer"
      subtitle="Cadastro de cliente para ver imóveis e solicitar faxinas."
      back={{ href: '/auth/login', label: 'Já tenho conta' }}
      footer={
        <p className="text-sm text-slate-500">
          Já tem conta?{' '}
          <Link
            href="/auth/login"
            className="font-semibold text-[var(--teal-dark)] hover:underline"
          >
            Fazer login
          </Link>
        </p>
      }
    >
      {success ? (
        <Alert kind="success">
          Conta criada. Verifique seu e-mail para confirmar o cadastro e depois
          faça login.
          <div className="mt-3">
            <Link
              href="/auth/login"
              className="font-semibold text-emerald-800 underline"
            >
              Ir para o login
            </Link>
          </div>
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          {error && <Alert kind="error">{error}</Alert>}

          <Field label="Nome completo">
            <TextInput
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              icon={<User className="h-4 w-4" />}
              autoComplete="name"
            />
          </Field>

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

          <Field label="Senha" hint="Mínimo de 6 caracteres">
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha"
              icon={<Lock className="h-4 w-4" />}
              minLength={6}
              autoComplete="new-password"
            />
          </Field>

          <Field
            label="Confirmar senha"
            error={passwordsMismatch ? 'As senhas não coincidem' : undefined}
            hint={passwordsMatch ? '✓ As senhas coincidem' : undefined}
          >
            <PasswordInput
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a senha novamente"
              icon={<Lock className="h-4 w-4" />}
              invalid={!!passwordsMismatch}
              minLength={6}
              autoComplete="new-password"
            />
          </Field>

          <PrimaryButton type="submit" loading={submitting} disabled={!!passwordsMismatch}>
            {submitting ? 'Criando…' : 'Criar conta'}
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  )
}
