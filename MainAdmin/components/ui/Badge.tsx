import { cn } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
    className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
    const variantStyles = {
        default: 'bg-[var(--surface-container-low)] text-[var(--on-surface)] border border-[var(--outline-variant)]',
        success: 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)] border border-[var(--outline-variant)]',
        warning: 'bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)] border border-[var(--outline-variant)]',
        danger: 'bg-[var(--error-container)] text-[var(--on-error-container)] border border-[var(--outline-variant)]',
        info: 'bg-[var(--primary-container)] text-[var(--on-primary)] border border-[var(--outline-variant)]',
        secondary: 'bg-[var(--primary-container)] text-[var(--on-primary)] border border-[var(--outline-variant)]',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                variantStyles[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
