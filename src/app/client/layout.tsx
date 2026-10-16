'use client'

import { RequireAuth } from '@/components/RequireAuth'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="client">{children}</RequireAuth>
}
