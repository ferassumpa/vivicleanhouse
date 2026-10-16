'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const { loading, user, homePath } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? homePath : '/auth/login')
  }, [homePath, loading, router, user])

  return (
    <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">
      Carregando ViviClenaer…
    </div>
  )
}
