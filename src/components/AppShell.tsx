'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  CalendarCheck,
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

type NavItem = { href: string; label: string; icon: React.ReactNode; shortLabel?: string }

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
    { href: '/admin/availability', label: 'Disponibilidade', icon: <CalendarDays size={18} /> },
    { href: '/employee', label: 'Minhas faxinas', icon: <ClipboardList size={18} /> },
    { href: '/admin/messages', label: 'Mensagens', icon: <MessageCircle size={18} /> },
    { href: '/admin/finance', label: 'Finanças', icon: <Wallet size={18} /> },
  ],
  employee: [
    { href: '/employee', label: 'Agenda', icon: <ClipboardList size={18} /> },
    { href: '/employee/availability', label: 'Disponibilidade', icon: <CalendarDays size={18} /> },
  ],
  client: [
    { href: '/client', label: 'Meus imóveis', shortLabel: 'Imóveis', icon: <Building2 size={20} /> },
    { href: '/client/schedule', label: 'Agendar', shortLabel: 'Agendar', icon: <CalendarDays size={20} /> },
    {
      href: '/client/bookings',
      label: 'Minhas faxinas',
      shortLabel: 'Faxinas',
      icon: <CalendarCheck size={20} />,
    },
    { href: '/client/history', label: 'Histórico', shortLabel: 'Histórico', icon: <ClipboardList size={20} /> },
  ],
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administração',
  employee: 'Funcionária',
  client: 'Cliente',
}

function navActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href === '/admin' || href === '/employee' || href === '/client') return false
  return pathname.startsWith(href)
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
  const isClient = role === 'client'

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--ink)]">
      {isClient && (
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 px-4 py-3 backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <BrandLogo href="/client" size="sm" />
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm text-[var(--muted)] active:bg-[var(--soft)]"
              onClick={async () => {
                await signOut()
                router.replace('/')
              }}
            >
              <LogOut size={18} />
              <span className="sr-only sm:not-sr-only">Sair</span>
            </button>
          </div>
        </header>
      )}

      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col md:min-h-screen md:flex-row">
        <aside
          className={`border-b border-[var(--line)] bg-white/90 backdrop-blur md:w-60 md:border-b-0 md:border-r ${
            isClient ? 'hidden md:block' : ''
          }`}
        >
          {!isClient && (
            <div className="flex items-center justify-between gap-3 px-4 py-4 md:block">
              <div>
                <BrandLogo
                  href={role === 'admin' ? '/admin' : role === 'employee' ? '/employee' : '/client'}
                  size="sm"
                />
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {profile?.full_name || 'Usuário'}
                  {role ? ` · ${ROLE_LABEL[role]}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-[var(--muted)] transition hover:bg-[var(--soft)] md:mt-3"
                onClick={async () => {
                  await signOut()
                  router.replace('/')
                }}
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}

          {isClient && (
            <div className="hidden px-4 py-4 md:block">
              <BrandLogo href="/client" size="sm" />
              <p className="mt-2 text-xs text-[var(--muted)]">
                {profile?.full_name || 'Usuário'} · Cliente
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--soft)]"
                onClick={async () => {
                  await signOut()
                  router.replace('/')
                }}
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}

          <nav
            className={`flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible md:px-3 md:pb-6 ${
              isClient ? 'hidden md:flex' : ''
            }`}
          >
            {items.map((item) => {
              const active = navActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
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

        <main
          className={`min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8 ${
            isClient ? 'pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:pb-8' : ''
          }`}
        >
          <header className="mb-5 md:mb-7">
            <h1 className="font-display text-xl tracking-tight text-[var(--navy)] sm:text-2xl md:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{subtitle}</p>
            )}
          </header>
          <div className="mx-auto w-full max-w-lg md:max-w-none">{children}</div>
        </main>
      </div>

      {isClient && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(74,36,48,0.08)] backdrop-blur-md md:hidden"
          aria-label="Menu principal"
        >
          <div className="mx-auto grid max-w-lg grid-cols-4 gap-0">
            {items.map((item) => {
              const active = navActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold leading-tight transition active:scale-95 ${
                    active ? 'text-[var(--pink-deep)]' : 'text-[var(--muted)]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      active ? 'bg-[var(--soft)] text-[var(--navy)]' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.shortLabel || item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
