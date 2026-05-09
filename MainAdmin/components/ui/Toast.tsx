'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastProps {
    toast: Toast;
    onClose: (id: string) => void;
}

const toastIcons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertCircle,
};

/** Theme-aligned surfaces (avoid Tailwind text-red-* / text-blue-* — they map to unreadable tokens in globals.css). */
function toastAppearance(type: ToastType): {
    panel: React.CSSProperties;
    iconColor: string;
} {
    switch (type) {
        case 'success':
            return {
                panel: {
                    backgroundColor: 'var(--secondary-container)',
                    borderColor: 'var(--secondary)',
                    color: 'var(--on-surface)',
                    boxShadow: '0 10px 40px color-mix(in srgb, var(--inverse-surface) 12%, transparent)',
                },
                iconColor: 'var(--secondary)',
            };
        case 'error':
            return {
                panel: {
                    backgroundColor: 'var(--status-danger-bg)',
                    borderColor: 'var(--error)',
                    color: 'var(--on-surface)',
                    boxShadow: '0 10px 40px color-mix(in srgb, var(--error) 18%, transparent)',
                },
                iconColor: 'var(--error)',
            };
        case 'info':
            return {
                panel: {
                    backgroundColor: 'var(--surface-container-lowest)',
                    borderColor: 'var(--outline-variant)',
                    color: 'var(--on-surface)',
                    boxShadow: '0 10px 40px color-mix(in srgb, var(--inverse-surface) 14%, transparent)',
                },
                iconColor: 'var(--secondary)',
            };
        case 'warning':
            return {
                panel: {
                    backgroundColor: 'var(--tertiary-fixed)',
                    borderColor: 'var(--tertiary)',
                    color: 'var(--on-surface)',
                    boxShadow: '0 10px 40px color-mix(in srgb, var(--tertiary) 15%, transparent)',
                },
                iconColor: 'var(--status-warning)',
            };
        default:
            return {
                panel: {
                    backgroundColor: 'var(--surface-container-lowest)',
                    borderColor: 'var(--outline-variant)',
                    color: 'var(--on-surface)',
                },
                iconColor: 'var(--on-surface-variant)',
            };
    }
}

export function ToastComponent({ toast, onClose }: ToastProps) {
    const Icon = toastIcons[toast.type];
    const { panel, iconColor } = toastAppearance(toast.type);

    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; });

    useEffect(() => {
        const timer = setTimeout(() => {
            onCloseRef.current(toast.id);
        }, 10000);

        return () => clearTimeout(timer);
    }, [toast.id]);

    return (
        <div
            role="status"
            onClick={() => onClose(toast.id)}
            className={cn(
                'border rounded-[4px] p-4 mb-3 flex items-start gap-3 min-w-[300px] max-w-[500px] animate-in slide-in-from-right cursor-pointer select-none backdrop-blur-sm',
            )}
            style={panel}
        >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: iconColor }} aria-hidden />
            <p className="flex-1 text-sm font-medium leading-snug" style={{ color: 'var(--on-surface)' }}>
                {toast.message}
            </p>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(toast.id); }}
                className="p-0.5 rounded-[4px] flex-shrink-0 transition-colors hover:bg-black/5"
                style={{ color: 'var(--on-surface-variant)' }}
                aria-label="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

interface ToastContainerProps {
    toasts: Toast[];
    onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || toasts.length === 0) return null;

    return createPortal(
        <div
            className="fixed top-4 right-4 flex flex-col items-end pointer-events-none isolate"
            style={{ zIndex: 11000 }}
        >
            <div className="pointer-events-auto flex flex-col items-end">
                {toasts.map((toast) => (
                    <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
                ))}
            </div>
        </div>,
        document.body,
    );
}
