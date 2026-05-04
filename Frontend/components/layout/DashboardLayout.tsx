'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BranchBanner } from './BranchBanner'
import { CartDrawer } from '@/components/marketplace/CartDrawer'
import { Chatbot } from '@/components/chatbot/Chatbot'
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { isLoaded, fetchContext } = usePharmacyContextStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoaded) {
      fetchContext()
    }
  }, [mounted, isLoaded, fetchContext])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden w-full lg:w-auto">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <BranchBanner />
        <main className="flex-1 overflow-y-auto p-4 sm:p-4">
          {children}
        </main>
      </div>

      <CartDrawer />
      <Chatbot />
    </div>
  )
}
