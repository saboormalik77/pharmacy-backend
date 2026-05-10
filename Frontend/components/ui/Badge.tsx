import { cn } from '@/lib/utils/cn'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'destructive' | 'controlled' | 'nonc'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        {
          // Default: Primary sage color
          'bg-[#516057]/10 text-[#516057]': variant === 'default',
          // Success: Sage green with background
          'bg-[#516057]/10 text-[#516057]': variant === 'success',
          // Warning: Tan/gold
          'bg-[#ad916a]/20 text-[#6b5a3f]': variant === 'warning',
          // Error: Red
          'bg-red-100 text-red-800': variant === 'error',
          // Info: Blue
          'bg-blue-100 text-blue-800': variant === 'info',
          // Secondary: Gray
          'bg-gray-100 text-gray-800': variant === 'secondary',
          // Destructive
          'bg-red-600 text-white': variant === 'destructive',
          // Controlled (C-II): Orange
          'bg-[#f97316] text-white': variant === 'controlled',
          // Non-Controlled: Gray
          'bg-[#f3f4f6] text-[#374151]': variant === 'nonc',
        },
        className
      )}
      {...props}
    />
  )
}
