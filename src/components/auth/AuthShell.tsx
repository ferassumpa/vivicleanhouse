'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CalendarDays, Camera, Sparkles, Wallet } from 'lucide-react'
import { ReactNode } from 'react'

interface AuthShellProps {
  eyebrow?: ReactNode
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  back?: { href: string; label: string }
}

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  back,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[var(--navy)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.55, scale: 1 }}
            transition={{ duration: 1.4 }}
            className="absolute -top-24 -left-20 h-96 w-96 rounded-full bg-[var(--teal)]/40 blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.35, scale: 1 }}
            transition={{ duration: 1.6, delay: 0.15 }}
            className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-emerald-400/20 blur-3xl"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md">
              <Sparkles className="h-6 w-6 text-[var(--teal)]" />
            </div>
            <span className="font-display text-2xl tracking-tight">
              Vivi<span className="text-[var(--teal)]">Clenaer</span>
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="relative z-10 max-w-md"
        >
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--teal)] ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" />
            Limpeza organizada
          </p>
          <h2 className="font-display text-4xl leading-tight tracking-tight xl:text-5xl">
            Agenda, equipe e finanças das faxinas em um só lugar.
          </h2>
          <p className="mt-4 text-base text-white/70 xl:text-lg">
            Clientes agendam, a admin confirma, a funcionária executa com fotos e
            materiais — e você acompanha a margem de cada imóvel.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { icon: <CalendarDays className="h-4 w-4" />, label: 'Agenda com confirmação' },
              { icon: <Camera className="h-4 w-4" />, label: 'Fotos antes e depois' },
              { icon: <Wallet className="h-4 w-4" />, label: 'Finanças por faxina' },
              { icon: <Sparkles className="h-4 w-4" />, label: 'Equipe e clientes' },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.07 }}
                className="flex items-center gap-2.5 rounded-2xl bg-white/8 px-3.5 py-2.5 ring-1 ring-white/10 backdrop-blur"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--teal)]/25 text-[var(--teal)]">
                  {f.icon}
                </span>
                <span className="text-sm font-medium text-white/90">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} ViviClenaer · Todos os direitos reservados
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-col px-5 py-8 sm:px-8 lg:px-12 xl:px-20">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <Sparkles className="h-5 w-5 text-[var(--teal-dark)]" />
            </div>
            <span className="font-display text-lg text-[var(--navy)]">
              Vivi<span className="text-[var(--teal-dark)]">Clenaer</span>
            </span>
          </Link>
        </div>

        {back && (
          <div className="mb-4">
            <Link
              href={back.href}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-[var(--navy)]"
            >
              ← {back.label}
            </Link>
          </div>
        )}

        <div className="flex flex-1 items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-md"
          >
            <div className="mb-7">
              {eyebrow && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal-dark)]">
                  {eyebrow}
                </p>
              )}
              <h1 className="font-display text-3xl tracking-tight text-[var(--navy)] md:text-4xl">
                {title}
              </h1>
              {subtitle && <p className="mt-2 text-base text-slate-500">{subtitle}</p>}
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/80 sm:p-8">
              {children}
            </div>

            {footer && <div className="mt-6 text-center">{footer}</div>}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
