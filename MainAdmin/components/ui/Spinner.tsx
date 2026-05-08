import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
    return (
        <Loader2
            className={cn('animate-spin text-[var(--secondary)]', sizeMap[size], className)}
        />
    );
}

interface LoadingOverlayProps {
    text?: string;
}

export function LoadingOverlay({ text }: LoadingOverlayProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
            <div
                className="flex flex-col items-center gap-3 p-6 rounded-[4px] shadow-xl"
                style={{ backgroundColor: 'var(--surface-container-lowest)' }}
            >
                <Spinner size="lg" />
                {text && (
                    <p className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                        {text}
                    </p>
                )}
            </div>
        </div>
    );
}
