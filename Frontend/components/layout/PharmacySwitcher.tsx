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
        className="group flex items-center gap-2 rounded-[4px] px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors border border-border hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
      >
        <ArrowLeftRight className="h-4 w-4 text-primary transition-colors group-hover:text-primary" />
        <span className="hidden sm:inline truncate max-w-[140px] transition-colors group-hover:text-primary">
          Switch Branch
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-all group-hover:text-primary ${isOpen ? 'rotate-180' : ''}`}
        />
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
                className="group/item w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Building2 className="h-4 w-4 text-muted-foreground transition-colors group-hover/item:text-primary" />
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
