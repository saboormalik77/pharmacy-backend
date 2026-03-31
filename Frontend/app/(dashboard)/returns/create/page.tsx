'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    Building2, Loader2, X, ClipboardList,
} from 'lucide-react';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api/client';

export default function CreateReturnPage() {
    const router = useRouter();

    const [confirmModal, setConfirmModal] = useState(false);
    const [notes, setNotes] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const handleConfirmCreate = async () => {
        setIsActionLoading(true);
        try {
            const res = await apiClient.post<any>('/return-transactions', {
                notes: notes.trim() || undefined,
            }, true);

            if (res.status === 'success') {
                const tx = res.data;
                showToast(`Return transaction ${tx.licensePlate} created successfully!`);
                setConfirmModal(false);
                setNotes('');
                router.push(`/returns/${tx.id}`);
            } else {
                throw new Error(res.message || 'Failed to create return transaction');
            }
        } catch (err: any) {
            const raw = err.message || '';
            const errMsg = raw.toLowerCase().includes('already has an active return')
                ? 'You already have an active return in progress. Please complete or finalize it before creating a new one.'
                : raw || 'Failed to create return transaction';
            showToast(errMsg, 'error');
            setConfirmModal(false);
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <DashboardLayout>
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div>
                <h1 className="text-lg font-bold text-gray-900">Create Return Transaction</h1>
                <p className="text-xs text-gray-500">Create a new return transaction for your pharmacy</p>
            </div>

            {/* Create Card */}
            <div className="bg-white rounded-lg shadow px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">New Return</h2>

                <div className="border border-gray-200 hover:border-primary-400 hover:bg-primary-50 rounded px-3 py-2 cursor-pointer transition-all"
                    onClick={() => setConfirmModal(true)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <Building2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                <span className="text-xs font-semibold text-gray-900">Start a new return transaction</span>
                            </div>
                            <p className="text-[10px] text-gray-500 pl-5">A unique license plate will be generated. You can then add products by scanning.</p>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                            <ClipboardList className="w-4 h-4 text-gray-300" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Confirm Return Creation</h2>
                            <button onClick={() => setConfirmModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3 space-y-3">
                            <p className="text-xs text-gray-600">You are about to create a new return transaction.</p>
                            <div className="bg-gray-50 rounded-lg border border-gray-100 px-3 py-2.5 space-y-2">
                                <div className="flex items-start gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-gray-900">Your Pharmacy</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">A unique license plate will be generated</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                                    placeholder="Optional notes..."
                                />
                            </div>
                            <p className="text-[10px] text-gray-500">Once created, you can begin adding products.</p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setConfirmModal(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleConfirmCreate} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating...</> : 'Confirm & Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </DashboardLayout>
    );
}
