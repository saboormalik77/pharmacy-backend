import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'md', ...props }, ref) => {
        const variantStyles = {
            default: 'bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-container)] active:scale-[0.95]',
            primary: 'bg-[var(--secondary)] text-[var(--on-secondary)] hover:opacity-90 active:scale-[0.95]',
            success: 'bg-[var(--secondary)] text-[var(--on-secondary)] hover:opacity-90 active:scale-[0.95]',
            danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.95]',
            warning: 'bg-[var(--tertiary)] text-[var(--on-tertiary)] hover:opacity-90 active:scale-[0.95]',
            ghost: 'bg-transparent hover:bg-gray-50 text-gray-700 border border-[var(--primary)]',
            outline: 'border border-[var(--primary)] bg-transparent text-[var(--primary)] hover:bg-gray-50',
        };

        const sizeStyles = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                className={cn(
                    'inline-flex items-center justify-center rounded-[4px] font-medium transition-all cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--secondary)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Button.displayName = 'Button';

export { Button };
