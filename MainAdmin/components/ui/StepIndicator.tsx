import { cn } from '@/lib/utils';

type StepStatus = 'completed' | 'current' | 'pending';

interface Step {
    id: string;
    label: string;
    description?: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: string;
    onStepClick?: (stepId: string) => void;
    className?: string;
}

function StepCircle({ status }: { status: StepStatus }) {
    const baseClasses = 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2';
    const baseStyle = 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold';

    if (status === 'completed') {
        return (
            <div className={baseStyle} style={{ backgroundColor: 'var(--secondary)', color: 'var(--on-secondary)' }}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        );
    }

    if (status === 'current') {
        return (
            <div className={baseStyle} style={{ borderColor: 'var(--secondary)', color: 'var(--secondary)' }}>
                {''}
            </div>
        );
    }

    return (
        <div className={baseStyle} style={{ borderColor: 'var(--outline-variant)', color: 'var(--outline)' }}>
            {''}
        </div>
    );
}

export function StepIndicator({ steps, currentStep, onStepClick, className }: StepIndicatorProps) {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);

    const getStepStatus = (index: number): StepStatus => {
        if (index < currentIndex) return 'completed';
        if (index === currentIndex) return 'current';
        return 'pending';
    };

    return (
        <div className={cn('flex items-center', className)}>
            {steps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                    <div key={step.id} className="flex items-center flex-1 last:flex-none">
                        <button
                            type="button"
                            onClick={() => onStepClick?.(step.id)}
                            disabled={!onStepClick || status === 'pending'}
                            className={cn(
                                'flex flex-col items-center gap-1',
                                status !== 'pending' && onStepClick ? 'cursor-pointer' : 'cursor-default',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)] focus-visible:ring-offset-1 rounded-[4px]'
                            )}
                        >
                            <StepCircle status={status} />
                            <div className="text-center">
                                <p
                                    className="text-xs font-medium"
                                    style={{
                                        color: status === 'pending' ? 'var(--outline)' : 'var(--on-surface)',
                                    }}
                                >
                                    {step.label}
                                </p>
                                {step.description && (
                                    <p
                                        className="text-[10px] hidden sm:block"
                                        style={{ color: 'var(--on-surface-variant)' }}
                                    >
                                        {step.description}
                                    </p>
                                )}
                            </div>
                        </button>
                        {index < steps.length - 1 && (
                            <div
                                className="flex-1 h-0.5 mx-2"
                                style={{
                                    backgroundColor: index < currentIndex ? 'var(--secondary)' : 'var(--outline-variant)',
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
