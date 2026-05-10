'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ArrowLeftRight, Building2 } from 'lucide-react'
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore'

export function PharmacySwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const {
    isParent,
    branches,
    switchToBranch,
  } = usePharmacyContextStore()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    if (isOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Only show for parent pharmacies that have branches
  if (!isParent || branches.length === 0) return null

  const handleSwitch = async (branchId: string) => {
    setIsOpen(false)
    await switchToBranch(branchId)
  }

  const activeBranches = branches.filter((b) => b.status === 'active')
  if (activeBranches.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-[4px] px-2.5 py-1.5 text-sm hover:bg-accent transition-colors border border-border"
      >
        <ArrowLeftRight className="h-4 w-4 text-[#516057]" />
        <span className="hidden sm:inline text-sm font-medium truncate max-w-[140px]">
          Switch Branch
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-[4px] shadow-lg bg-card border border-border z-50 overflow-hidden">
          <div className="py-1">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Switch to Branch</p>
            </div>

            {activeBranches.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSwitch(b.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="truncate">{b.pharmacyName}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
