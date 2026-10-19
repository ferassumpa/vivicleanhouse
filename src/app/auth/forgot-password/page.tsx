'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, MailCheck } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import {
  Alert,
  Field,
  PrimaryButton,
  TextInput,
} from '@/components/auth/AuthFields'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    )

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <AuthShell
      eyebrow="Recuperação de acesso"
      title="Esqueceu sua senha?"
      subtitle="Digite seu e-mail e enviaremos um link para criar uma nova senha."
      back={{ href: '/auth/login', label: 'Voltar para login' }}
      footer={
        <p className="text-sm text-slate-500">
          Lembrou sua senha?{' '}
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
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
            <MailCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--navy)]">E-mail enviado!</h3>
          <p className="mt-2 text-sm text-slate-500">
            Enviamos um link de recuperação para
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--navy)]">{email}</p>
          <div className="mt-5 rounded-2xl bg-teal-50 p-4 text-left ring-1 ring-teal-100">
            <p className="text-xs text-[var(--teal-dark)]">
              Verifique a caixa de entrada e o spam. Clique no link para
              redefinir a senha. O link expira em cerca de 1 hora.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSuccess(false)
              setEmail('')
            }}
            className="mt-5 text-sm font-medium text-slate-500 underline-offset-2 hover:text-[var(--navy)] hover:underline"
          >
            Enviar para outro e-mail
          </button>
        </motion.div>
      ) : (
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
              autoFocus
            />
          </Field>
          <PrimaryButton type="submit" loading={loading}>
            {loading ? 'Enviando…' : 'Enviar link de recuperação'}
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  )
}
