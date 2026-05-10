'use client'

import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <ShieldAlert className="h-16 w-16 text-red-400 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-500 max-w-md mb-6">
        {message || 'You do not have permission to access this page. Please contact your pharmacy administrator.'}
      </p>
      <Link
        href="/portal"
        className="px-5 py-2.5 bg-[#516057] text-white rounded-[4px] hover:bg-[#505454] transition-colors text-sm font-medium"
      >
        Go to home
      </Link>
    </div>
  )
}
