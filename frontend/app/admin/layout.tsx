'use client'

import Navigation from '@/app/components/Navigation'
import AdminGuard from '@/app/components/AdminGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <Navigation />
      {children}
    </AdminGuard>
  )
}
