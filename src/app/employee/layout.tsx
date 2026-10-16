'use client'

import { RequireAuth } from '@/components/RequireAuth'

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="employee">{children}</RequireAuth>
}
