import { cn } from '@/lib/utils/cn'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'warning'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-[4px] font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#516057]/20 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            // Primary: Sage Green (#516057)
            'bg-[#516057] text-white hover:opacity-90 active:scale-[0.95]': variant === 'primary',
            // Secondary: Deep Charcoal (#1d2222)
            'bg-[#1d2222] text-white hover:bg-[#3d4343]': variant === 'secondary',
            // Outline: Border with charcoal text
            'border border-[#1d2222] bg-transparent text-[#1d2222] hover:bg-[#f5f2f1]': variant === 'outline',
            // Ghost: Transparent with hover
            'bg-transparent text-[#505454] hover:bg-[#f5f2f1]': variant === 'ghost',
            // Destructive: Red
            'bg-red-600 text-white hover:bg-red-700': variant === 'destructive',
            // Warning: Tan/Gold (#ad916a)
            'bg-[#ad916a] text-white hover:opacity-90': variant === 'warning',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
