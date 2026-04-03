'use client'

import { Mail } from 'lucide-react'

export function NoPharmacyPermissions() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 max-w-lg mx-auto">
      <Mail className="h-14 w-14 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">No access yet</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Your account has no permissions assigned yet. Please contact your pharmacy administrator so they can assign a role to your branch.
      </p>
    </div>
  )
}
