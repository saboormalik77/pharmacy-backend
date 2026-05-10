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

/** Opaque surfaces so header/nav dropdowns never show through (no /alpha tailwind fills). */
const toastStyles = {
    success: 'bg-[#eef1ee] border border-[#c5cfc7] text-[#516057]',
    error: 'bg-[#fef2f2] border border-[#fecaca] text-red-800',
    info: 'bg-[#eff6ff] border border-[#bfdbfe] text-blue-800',
    warning: 'bg-[#faf6f0] border border-[#e8dcc8] text-[#6b5a3f]',
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
            className={`${style} rounded-[4px] shadow-lg p-4 mb-3 flex items-center gap-3 min-w-[300px] max-w-[500px] animate-in slide-in-from-right cursor-pointer select-none`}
        >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <X className="w-4 h-4 flex-shrink-0 text-gray-400" />
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
        <div className="fixed top-4 right-4 z-[10000] flex flex-col items-end pointer-events-none [&>*]:pointer-events-auto">
            {toasts.map((toast) => (
                <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
}
