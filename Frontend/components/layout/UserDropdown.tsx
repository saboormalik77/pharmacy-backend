'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { authService } from '@/lib/api/services'
import { getUserData } from '@/lib/utils/cookies'

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [userData, setUserData] = useState<{ name: string; pharmacy_name: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const loadUserData = () => {
    // Get user data from cookies
    const data = getUserData()
    if (data?.user) {
      setUserData({
        name: data.user.name,
        pharmacy_name: data.user.pharmacy_name,
      })
    }
  }

  useEffect(() => {
    // Load user data on mount
    loadUserData()

    // Listen for user data updates
    const handleUserDataUpdate = (event: CustomEvent) => {
      const updatedData = event.detail
      if (updatedData?.user) {
        setUserData({
          name: updatedData.user.name,
          pharmacy_name: updatedData.user.pharmacy_name,
        })
      }
    }

    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener)

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener)
    }
  }, [])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = () => {
    authService.signout()
    router.push('/login')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-accent transition-colors"
        aria-label="User menu"
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{userData?.name || 'User'}</p>
          <p className="text-xs text-muted-foreground">
            {userData?.pharmacy_name || 'Pharmacy'}
          </p>
        </div>
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-teal-600 text-white">
          <User className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-card border border-border z-50">
          <div className="py-1">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium">{userData?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {userData?.pharmacy_name || 'Pharmacy'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false)
                router.push('/settings')
                // Add settings navigation if needed
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

