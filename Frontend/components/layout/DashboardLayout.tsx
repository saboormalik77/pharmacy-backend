'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Chatbot } from '@/components/chatbot/Chatbot'
import { CartDrawer } from '@/components/marketplace/CartDrawer'
import { X, Menu } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full lg:w-auto">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-4">
          {children}
        </main>
      </div>

      {/* Chatbot */}
      {/* <Chatbot /> */}

      {/* Cart Drawer - Global across all pages */}
      <CartDrawer />
    </div>
  )
}
