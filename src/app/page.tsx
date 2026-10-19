'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarDays, Camera, ClipboardCheck } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { roleHomePath, useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const { loading, user, profile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(roleHomePath(profile.role))
    }
  }, [loading, profile, router, user])

  if (loading || (user && profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
        Carregando…
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-[var(--pink-soft)] blur-3xl"
        />
        <motion.div
          animate={{ opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[var(--pink)]/40 blur-3xl"
        />
      </div>

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <BrandLogo href="/" size="md" />
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--navy)] transition hover:bg-white/70"
          >
            Entrar
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-xl bg-[var(--navy)] px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Criar conta
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-8 text-center md:pt-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-[2rem] bg-white px-6 py-5 shadow-sm ring-1 ring-[var(--line)]"
        >
          <BrandLogo href={null} size="lg" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="font-display text-4xl tracking-tight text-[var(--navy)] md:text-5xl"
        >
          Faxinas organizadas com carinho
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mt-4 max-w-xl text-base text-[var(--muted)] md:text-lg"
        >
          Agende limpezas, aprove solicitações, acompanhe a equipe com fotos pré e pós
          e checklist por studio.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--pink-deep)] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
          >
            Criar conta
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-6 py-3.5 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--soft)]"
          >
            Já tenho conta — Entrar
          </Link>
        </motion.div>

        <p className="mt-4 text-sm text-[var(--muted)]">
          <Link href="/auth/forgot-password" className="underline-offset-2 hover:underline">
            Esqueci minha senha
          </Link>
        </p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-14 grid w-full max-w-3xl gap-3 sm:grid-cols-3"
        >
          {[
            {
              icon: <CalendarDays className="h-5 w-5" />,
              title: 'Dia e hora',
              text: 'Cliente solicita; admin aprova ou agenda direto.',
            },
            {
              icon: <Camera className="h-5 w-5" />,
              title: 'Pré e pós',
              text: 'Faxineira registra fotos antes e depois.',
            },
            {
              icon: <ClipboardCheck className="h-5 w-5" />,
              title: 'Checklist',
              text: 'Padrão da casa ou personalizado por apartamento.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-white px-4 py-5 text-left shadow-sm ring-1 ring-[var(--line)]"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--soft)] text-[var(--pink-deep)]">
                {item.icon}
              </div>
              <p className="font-semibold text-[var(--navy)]">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{item.text}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  )
}
