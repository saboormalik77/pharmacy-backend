'use client';

import { useEffect, useRef } from 'react';
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

const toastStyles = {
    success: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--secondary)]/20',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-[var(--status-warning-bg)] text-[var(--on-tertiary-container)] border-[var(--tertiary)]/30',
};

export function ToastComponent({ toast, onClose }: ToastProps) {
    const Icon = toastIcons[toast.type];
    const style = toastStyles[toast.type];

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
            onClick={() => onClose(toast.id)}
            className={cn(
                'border rounded-[4px] shadow-lg p-4 mb-3 flex items-center gap-3 min-w-[300px] max-w-[500px] animate-in slide-in-from-right cursor-pointer select-none',
                style
            )}
        >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <X className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--outline)' }} />
        </div>
    );
}

interface ToastContainerProps {
    toasts: Toast[];
    onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[200] flex flex-col items-end">
            {toasts.map((toast) => (
                <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
}
