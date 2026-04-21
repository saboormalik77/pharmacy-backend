import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'md', ...props }, ref) => {
        const variantStyles = {
            default: 'bg-gray-600 text-white hover:bg-gray-700',
            primary: 'bg-primary-500 text-white hover:bg-primary-600',
            success: 'bg-green-600 text-white hover:bg-green-700',
            danger: 'bg-red-600 text-white hover:bg-red-700',
            warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
            ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
            outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700',
        };

        const sizeStyles = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                className={cn(
                    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
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
