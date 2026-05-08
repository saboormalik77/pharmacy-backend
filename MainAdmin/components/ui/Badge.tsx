import { cn } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'controlled' | 'nonc';
    className?: string;
    style?: React.CSSProperties;
}

export function Badge({ children, variant = 'default', className, style }: BadgeProps) {
    const variantStyles = {
        default: 'bg-[var(--surface-container-low)] text-[var(--on-surface)] border border-[var(--outline-variant)]',
        success: 'bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--outline-variant)]',
        warning: 'bg-[var(--tertiary)]/20 text-[var(--tertiary)] border border-[var(--outline-variant)]',
        danger: 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--outline-variant)]',
        info: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--outline-variant)]',
        secondary: 'bg-[var(--primary-container)] text-[var(--on-primary)] border border-[var(--outline-variant)]',
        controlled: 'bg-[var(--badge-controlled-bg)] text-[var(--badge-controlled-text)]',
        nonc: 'bg-[var(--badge-nonc-bg)] text-[var(--badge-nonc-text)]',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                variantStyles[variant],
                className
            )}
            style={style}
        >
            {children}
        </span>
    );
}
