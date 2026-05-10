import { cn } from '@/lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn('text-center py-8 px-4', className)}>
            {icon && (
                <div
                    className="w-10 h-10 mx-auto mb-3 flex items-center justify-center rounded-[4px]"
                    style={{ color: '#cbd5e1' }}
                >
                    {icon}
                </div>
            )}
            <p className="text-base font-medium" style={{ color: 'var(--on-surface)' }}>
                {title}
            </p>
            {description && (
                <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                    {description}
                </p>
            )}
            {action && (
                <div className="mt-4">
                    <Button variant="primary" onClick={action.onClick}>
                        {action.label}
                    </Button>
                </div>
            )}
        </div>
    );
}
