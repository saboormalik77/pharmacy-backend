'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    className?: string;
}

const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-4xl',
};

export function Modal({ isOpen, onClose, title, children, footer, size = 'md', className }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => e.target === overlayRef.current && onClose()}
        >
            <div
                className={cn(
                    'w-full rounded-[4px] shadow-2xl flex flex-col',
                    sizeMap[size],
                    className
                )}
                style={{ backgroundColor: 'var(--surface-container-lowest)', maxHeight: '90vh' }}
                role="dialog"
                aria-modal="true"
            >
                {title && (
                    <div
                        className="px-5 py-4 border-b flex items-center justify-between"
                        style={{ borderColor: 'var(--outline-variant)' }}
                    >
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--on-surface)' }}>
                            {title}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-[4px] hover:bg-[var(--surface-container-low)] transition-colors"
                            style={{ color: 'var(--on-surface-variant)' }}
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
                <div className="px-5 py-4 overflow-y-auto flex-1">
                    {children}
                </div>
                {footer && (
                    <div
                        className="px-5 py-3 border-t flex justify-end gap-2"
                        style={{ borderColor: 'var(--outline-variant)' }}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'default';
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    isLoading = false,
}: ConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                {message}
            </p>
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                    {cancelLabel}
                </Button>
                <Button
                    variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}
                    onClick={onConfirm}
                    disabled={isLoading}
                >
                    {isLoading ? 'Processing...' : confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}
