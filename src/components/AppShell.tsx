'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Home,
  LandPlot,
  ListChecks,
  LogOut,
  MessageCircle,
  Package,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/lib/types'

type NavItem = { href: string; label: string; icon: React.ReactNode }

const NAV: Record<UserRole, NavItem[]> = {
  admin: [
    { href: '/admin', label: 'Painel', icon: <Home size={18} /> },
    { href: '/admin/clients', label: 'Clientes', icon: <Users size={18} /> },
    { href: '/admin/employees', label: 'Funcionárias', icon: <Sparkles size={18} /> },
    { href: '/admin/buildings', label: 'Prédios', icon: <LandPlot size={18} /> },
    { href: '/admin/properties', label: 'Imóveis', icon: <Building2 size={18} /> },
    { href: '/admin/packages', label: 'Pacotes', icon: <Package size={18} /> },
    { href: '/admin/checklist', label: 'Checklist', icon: <ListChecks size={18} /> },
    { href: '/admin/schedule', label: 'Agenda', icon: <CalendarDays size={18} /> },
    { href: '/admin/messages', label: 'Mensagens', icon: <MessageCircle size={18} /> },
    { href: '/admin/finance', label: 'Finanças', icon: <Wallet size={18} /> },
  ],
  employee: [
    { href: '/employee', label: 'Agenda', icon: <ClipboardList size={18} /> },
    { href: '/employee/availability', label: 'Disponibilidade', icon: <CalendarDays size={18} /> },
  ],
  client: [
    { href: '/client', label: 'Meus imóveis', icon: <Building2 size={18} /> },
    { href: '/client/schedule', label: 'Agendar', icon: <CalendarDays size={18} /> },
    { href: '/client/history', label: 'Histórico', icon: <ClipboardList size={18} /> },
  ],
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administração',
  employee: 'Funcionária',
  client: 'Cliente',
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const { profile, signOut, role } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const items = role ? NAV[role] : []

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
        <aside className="border-b border-[var(--line)] bg-white/90 backdrop-blur md:w-60 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-3 px-4 py-4 md:block">
            <div>
              <BrandLogo href={role === 'admin' ? '/admin' : role === 'employee' ? '/employee' : '/client'} size="sm" />
              <p className="mt-2 text-xs text-[var(--muted)]">
                {profile?.full_name || 'Usuário'}
                {role ? ` · ${ROLE_LABEL[role]}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-[var(--muted)] transition hover:bg-[var(--soft)] md:mt-3"
              onClick={async () => {
                await signOut()
                router.replace('/')
              }}
            >
              <LogOut size={16} /> Sair
            </button>
          </div>

          <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible md:px-3 md:pb-6">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/admin' &&
                  item.href !== '/employee' &&
                  item.href !== '/client' &&
                  pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-[var(--navy)] text-white shadow-sm'
                      : 'text-[var(--ink)] hover:bg-[var(--soft)]'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <header className="mb-7">
            <h1 className="font-display text-2xl tracking-tight text-[var(--navy)] md:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
            )}
          </header>
          {children}
        </main>
      </div>
    </div>
  )
}
