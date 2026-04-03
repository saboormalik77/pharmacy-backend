'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore'

const ADMIN_BACKUP_KEY = 'pharmacy_admin_auth_backup'

export function BranchBanner() {
  const { switchBackToAdmin, pharmacyName } = usePharmacyContextStore()
  const [adminName, setAdminName] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_BACKUP_KEY)
      if (raw) {
        const backup = JSON.parse(raw)
        setAdminName(backup?.userData?.user?.pharmacy_name || 'Admin Pharmacy')
      }
    } catch {
      // ignore
    }
  }, [])

  if (!adminName) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-amber-800 text-sm">
        <span>
          Viewing as <strong>{pharmacyName}</strong>
        </span>
      </div>
      <button
        onClick={switchBackToAdmin}
        className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md px-2.5 py-1 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to {adminName}
      </button>
    </div>
  )
}
