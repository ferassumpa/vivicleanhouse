'use client'

import { RequireAuth } from '@/components/RequireAuth'

/** Admin também executa faxinas — libera a mesma área da funcionária */
export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role={['employee', 'admin']}>{children}</RequireAuth>
}
