'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Settings, ChevronDown, Loader2 } from 'lucide-react'
import { authService } from '@/lib/api/services'
import { getUserData } from '@/lib/utils/cookies'
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore'

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
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
    // Set loading state to show full page loader
    setIsLoggingOut(true)
    
    // Add a small delay to ensure the loader is visible
    setTimeout(() => {
      // Clear auth data first
      authService.signout()
      
      // Reset store completely
      usePharmacyContextStore.getState().reset()
      
      // Navigate to login
      window.location.href = '/login'
    }, 100)
  }

  return (
    <>
      {/* Full page logout loader */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#516057]" />
            <p className="text-sm text-[#505454]">Signing out...</p>
          </div>
        </div>
      )}
      
      <div className="relative min-w-0" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group flex items-center gap-2 sm:gap-3 rounded-[4px] px-2 sm:px-3 py-1.5 sm:py-2 transition-colors hover:bg-primary/10"
          aria-label="User menu"
          disabled={isLoggingOut}
        >
          <div className="text-right hidden sm:block min-w-0">
            <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary truncate max-w-48">
              {userData?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground transition-colors group-hover:text-primary/80 truncate max-w-48">
              {userData?.pharmacy_name || 'Pharmacy'}
            </p>
          </div>
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground ring-0 transition-shadow group-hover:ring-2 group-hover:ring-primary/35">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-all group-hover:text-primary ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && !isLoggingOut && (
          <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-[4px] shadow-lg bg-card border border-border z-50 overflow-hidden">
            <div className="py-1">
              <div className="px-4 py-3 border-b border-border min-w-0">
                <p className="text-sm font-medium truncate">{userData?.name || 'User'}</p>
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
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

