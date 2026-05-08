'use client';

import { useEffect, useRef } from 'react';
import { X, CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

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
    success: 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)] border-[var(--outline-variant)]',
    error: 'bg-[var(--error-container)] text-[var(--on-error-container)] border-[var(--outline-variant)]',
    info: 'bg-[var(--primary-fixed)] text-[var(--on-surface)] border-[var(--outline-variant)]',
    warning: 'bg-[var(--tertiary-fixed)] text-[var(--on-tertiary-container)] border-[var(--outline-variant)]',
};

export function ToastComponent({ toast, onClose }: ToastProps) {
    const Icon = toastIcons[toast.type];
    const style = toastStyles[toast.type];

    // Keep a ref to onClose so the timer never resets when the parent re-renders
    // and recreates the removeToast function (which would reset the countdown).
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; });

    useEffect(() => {
        const timer = setTimeout(() => {
            onCloseRef.current(toast.id);
        }, 10000); // Auto-close after 10 seconds

        return () => clearTimeout(timer);
    }, [toast.id]); // Only re-run when a NEW toast appears, not on every render

    return (
        <div
            onClick={() => onClose(toast.id)}
            className={`${style} border rounded-lg shadow-lg p-4 mb-3 flex items-center gap-3 min-w-[300px] max-w-[500px] animate-in slide-in-from-right cursor-pointer select-none`}
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

