import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
    error?: string;
    wrapperClassName?: string;
}

export function DateInput({
    label,
    error,
    className,
    wrapperClassName,
    id,
    ...props
}: DateInputProps) {
    return (
        <div className={cn('w-full', wrapperClassName)}>
            {label && (
                <label
                    htmlFor={id}
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--on-surface-variant)' }}
                >
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    type="date"
                    id={id}
                    className={cn(
                        'w-full px-3 py-2 rounded-[4px] border text-sm transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-offset-1',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        error
                            ? 'border-[var(--error)] focus:ring-[var(--error)]'
                            : 'border-[var(--outline-variant)] focus:ring-[var(--secondary)]',
                        className
                    )}
                    style={{
                        backgroundColor: 'var(--surface-container-lowest)',
                        color: 'var(--on-surface)',
                    }}
                    {...props}
                />
                <Calendar
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: 'var(--outline)' }}
                />
            </div>
            {error && (
                <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
                    {error}
                </p>
            )}
        </div>
    );
}
