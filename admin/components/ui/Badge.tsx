import { cn } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
    className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
    const variantStyles = {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        secondary: 'bg-purple-100 text-purple-800',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                variantStyles[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
