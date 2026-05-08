'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
    content: string;
    position?: TooltipPosition;
    children: React.ReactNode;
    className?: string;
}

const positionClasses: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({ content, position = 'top', children, className }: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);

    return (
        <div className={cn('relative inline-flex', className)}>
            <div
                ref={triggerRef}
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                onFocus={() => setVisible(true)}
                onBlur={() => setVisible(false)}
            >
                {children}
            </div>
            {visible && (
                <div
                    className={cn(
                        'absolute z-10 px-2 py-1 text-xs font-medium whitespace-nowrap rounded-[4px] shadow-lg pointer-events-none',
                        positionClasses[position]
                    )}
                    style={{
                        backgroundColor: 'var(--inverse-surface)',
                        color: 'var(--inverse-on-surface)',
                    }}
                    role="tooltip"
                >
                    {content}
                </div>
            )}
        </div>
    );
}
