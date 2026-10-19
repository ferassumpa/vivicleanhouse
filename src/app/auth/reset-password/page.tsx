'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, ShieldCheck } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import {
  Alert,
  Field,
  PasswordInput,
  PrimaryButton,
} from '@/components/auth/AuthFields'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const readyRef = useRef(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const passwordsMatch = !!confirmPassword && password === confirmPassword
  const passwordsMismatch = !!confirmPassword && password !== confirmPassword

  useEffect(() => {
    let active = true

    const markReady = () => {
      if (!active || readyRef.current) return
      readyRef.current = true
      setReady(true)
      setChecking(false)
      setError('')
    }

    const markFailed = () => {
      if (!active || readyRef.current) return
      setReady(false)
      setChecking(false)
      setError('Link inválido ou expirado. Solicite uma nova recuperação de senha.')
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady()
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') markReady()
      if (event === 'SIGNED_IN' && session) markReady()
    })

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      void supabase.auth.exchangeCodeForSession(code).then(({ error: exchError }) => {
        if (exchError) markFailed()
        else markReady()
      })
    }

    const timeout = setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) markReady()
        else markFailed()
      })
    }, 2500)

    return () => {
      active = false
      clearTimeout(timeout)
      sub.subscription.unsubscribe()
    }
  }, [])

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

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    setTimeout(() => router.push('/auth/login'), 2500)
  }

  return (
    <AuthShell
      eyebrow="Nova senha"
      title="Redefinir sua senha"
      subtitle="Crie uma nova senha com pelo menos 6 caracteres."
      back={{ href: '/auth/forgot-password', label: 'Pedir novo link' }}
    >
      {checking ? (
        <p className="text-sm text-slate-500">Validando link de recuperação…</p>
      ) : done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--navy)]">Senha redefinida!</h3>
          <p className="mt-2 text-sm text-slate-500">
            Você será redirecionado para o login em alguns segundos…
          </p>
        </motion.div>
      ) : !ready ? (
        <div className="space-y-4">
          <Alert kind="error">{error}</Alert>
          <PrimaryButton type="button" onClick={() => router.push('/auth/forgot-password')}>
            Solicitar novo link
          </PrimaryButton>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          {error && <Alert kind="error">{error}</Alert>}

          <Field label="Nova senha" hint="Mínimo de 6 caracteres">
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua nova senha"
              icon={<Lock className="h-4 w-4" />}
              minLength={6}
              autoComplete="new-password"
              autoFocus
            />
          </Field>

          <Field
            label="Confirmar nova senha"
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

          <div className="rounded-2xl bg-teal-50 p-3.5 ring-1 ring-teal-100">
            <p className="flex items-start gap-2 text-xs text-[var(--teal-dark)]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Use uma senha forte e única. Evite reaproveitar senhas de outros sites.
            </p>
          </div>

          <PrimaryButton type="submit" loading={loading} disabled={!!passwordsMismatch}>
            {loading ? 'Redefinindo…' : 'Redefinir senha'}
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  )
}
