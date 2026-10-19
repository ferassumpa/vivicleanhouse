'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Sparkles,
  Wallet,
} from 'lucide-react'
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--navy)] text-white/70">
        Carregando…
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--navy)] text-white">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ duration: 1.4 }}
          className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[var(--teal)]/45 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.35, scale: 1 }}
          transition={{ duration: 1.6, delay: 0.15 }}
          className="absolute -bottom-28 -right-16 h-[26rem] w-[26rem] rounded-full bg-emerald-300/25 blur-3xl"
        />
        <motion.div
          animate={{ opacity: [0.15, 0.28, 0.15], scale: [1, 1.08, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--teal)]/30 blur-3xl"
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Sparkles className="h-5 w-5 text-[var(--teal)]" />
          </div>
          <span className="font-display text-xl tracking-tight">
            Vivi<span className="text-[var(--teal)]">Clenaer</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="rounded-xl px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Entrar
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-[var(--navy)] transition hover:bg-white/90"
          >
            Criar conta
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-10 text-center md:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mb-8 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white/10 ring-1 ring-white/20 shadow-[0_30px_60px_-15px_rgba(20,163,160,0.4)] backdrop-blur-md"
        >
          <Sparkles className="h-14 w-14 text-[var(--teal)]" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="font-display text-5xl tracking-tight md:text-6xl"
        >
          Vivi<span className="text-[var(--teal)]">Clenaer</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mt-4 max-w-xl text-base text-white/70 md:text-lg"
        >
          Gestão simples de faxinas para estúdios e apartamentos — agenda,
          equipe, fotos e finanças.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.32 }}
          className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--teal)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--teal-dark)]"
          >
            Criar conta
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
          >
            Já tenho conta — Entrar
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-sm text-white/45"
        >
          <Link href="/auth/forgot-password" className="underline-offset-2 hover:text-white/70 hover:underline">
            Esqueci minha senha
          </Link>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.45 }}
          className="mt-16 grid w-full max-w-3xl gap-3 sm:grid-cols-3"
        >
          {[
            {
              icon: <CalendarDays className="h-5 w-5" />,
              title: 'Agende',
              text: 'Cliente escolhe o horário; a admin confirma.',
            },
            {
              icon: <Camera className="h-5 w-5" />,
              title: 'Execute',
              text: 'Entrada, fotos e materiais na hora da faxina.',
            },
            {
              icon: <Wallet className="h-5 w-5" />,
              title: 'Controle',
              text: 'Receita, custo e margem por imóvel e por dia.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-white/8 px-4 py-5 text-left ring-1 ring-white/10 backdrop-blur"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--teal)]/25 text-[var(--teal)]">
                {item.icon}
              </div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-white/60">{item.text}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  )
}
