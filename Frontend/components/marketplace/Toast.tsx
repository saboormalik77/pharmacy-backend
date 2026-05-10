'use client'

import { useEffect } from 'react'
import { CheckCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  show: boolean
  onClose: () => void
}

export function Toast({ message, show, onClose }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#516057] text-white px-6 py-4 rounded-[4px] shadow-2xl flex items-center gap-3 min-w-[300px]">
        <CheckCircle className="h-6 w-6 flex-shrink-0" />
        <span className="font-semibold flex-1">{message}</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

