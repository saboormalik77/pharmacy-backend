'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

interface DropdownProps {
    options: DropdownOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
}

export function Dropdown({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    className,
    triggerClassName,
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.value === value);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[4px] border transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--secondary)]',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
                style={{
                    backgroundColor: 'var(--surface-container-lowest)',
                    borderColor: isOpen ? 'var(--secondary)' : 'var(--outline-variant)',
                    color: selected ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                }}
            >
                <span className="flex items-center gap-2 truncate text-sm">
                    {selected?.icon}
                    {selected?.label || placeholder}
                </span>
                <ChevronDown
                    className={cn('w-4 h-4 flex-shrink-0 transition-transform', isOpen && 'rotate-180')}
                    style={{ color: '#9ca3af' }}
                />
            </button>

            {isOpen && (
                <div
                    className="absolute z-50 w-full mt-1 rounded-[4px] shadow-lg border overflow-hidden"
                    style={{
                        backgroundColor: 'var(--surface-container-lowest)',
                        borderColor: 'var(--outline-variant)',
                        maxHeight: '240px',
                        overflowY: 'auto',
                    }}
                >
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                if (!option.disabled) {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }
                            }}
                            disabled={option.disabled}
                            className={cn(
                                'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors',
                                option.disabled
                                    ? 'opacity-40 cursor-not-allowed'
                                    : 'hover:bg-gray-100',
                                option.value === value && 'bg-gray-100'
                            )}
                            style={{ color: '#374151' }}
                        >
                            {option.icon}
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
