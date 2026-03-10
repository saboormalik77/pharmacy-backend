import { cn } from '@/lib/utils/cn'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'destructive'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'bg-primary text-primary-foreground': variant === 'default',
          'bg-green-100 text-green-800': variant === 'success',
          'bg-yellow-100 text-yellow-800': variant === 'warning',
          'bg-red-100 text-red-800': variant === 'error',
          'bg-blue-100 text-blue-800': variant === 'info',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'bg-destructive text-destructive-foreground': variant === 'destructive',
        },
        className
      )}
      {...props}
    />
  )
}
