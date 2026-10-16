'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { roleHomePath, useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/lib/types'

export function RequireAuth({
  role,
  children,
}: {
  role?: UserRole | UserRole[]
  children: React.ReactNode
}) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const allowed = useMemo(
    () => (role ? (Array.isArray(role) ? role : [role]) : null),
    [role]
  )

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/auth/login')
      return
    }
    if (allowed && profile && !allowed.includes(profile.role)) {
      router.replace(roleHomePath(profile.role))
    }
  }, [allowed, loading, profile, router, user])

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
        Carregando…
      </div>
    )
  }

  if (allowed && !allowed.includes(profile.role)) {
    return null
  }

  return <>{children}</>
}
