import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse bg-[var(--surface-container-low)] rounded-[4px]',
                className
            )}
            style={style}
        />
    );
}

export function CardSkeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                'rounded-[4px] shadow-sm border border-[var(--outline-variant)] p-4 animate-pulse',
                className
            )}
            style={{ backgroundColor: 'var(--surface-container-lowest)' }}
        >
            <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-[4px]" />
            </div>
        </div>
    );
}

export function TableRowSkeleton({ columns = 5, className }: { columns?: number; className?: string }) {
    return (
        <tr className={cn('border-b border-[var(--outline-variant)]', className)}>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-4">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
            ))}
        </tr>
    );
}

export function ChartSkeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn('rounded-[4px] border border-[var(--outline-variant)] animate-pulse', className)}
            style={{ backgroundColor: 'var(--surface-container-lowest)', height: '320px' }}
        />
    );
}

export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="h-4"
                    style={{ width: i === lines - 1 ? '60%' : '100%' }}
                />
            ))}
        </div>
    );
}
