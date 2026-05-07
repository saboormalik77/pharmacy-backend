import { cn } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'controlled' | 'nonc';
    className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
    const variantStyles = {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-[#516057]/10 text-[#516057]',
        warning: 'bg-[#ad916a]/20 text-[#6b5a3f]',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        secondary: 'bg-purple-100 text-purple-800',
        controlled: 'bg-[#f97316] text-white',
        nonc: 'bg-[#f3f4f6] text-[#374151]',
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
