import { cn } from '@/lib/utils';

interface ProgressBarProps {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const sizeMap = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
};

export function ProgressBar({ value, max = 100, size = 'md', showLabel = false, className }: ProgressBarProps) {
    const percentage = Math.min(Math.round((value / max) * 100), 100);

    return (
        <div className={cn('w-full', className)}>
            <div
                className={cn('w-full rounded-full overflow-hidden', sizeMap[size])}
                style={{ backgroundColor: 'var(--surface-container-high)' }}
            >
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: 'var(--secondary)',
                    }}
                />
            </div>
            {showLabel && (
                <p className="text-xs mt-1 font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                    {percentage}%
                </p>
            )}
        </div>
    );
}
