'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    Building2, Loader2, X, ClipboardList,
} from 'lucide-react';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api/client';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

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
        <PermissionGuard permission="returns:create">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div>
                <h1 className="text-lg font-bold text-[#000000] font-serif">Create Return Transaction</h1>
                <p className="text-xs text-[#6b7280]">Create a new return transaction for your pharmacy</p>
            </div>

            {/* Create Card */}
            <div className="bg-white rounded-[4px] shadow-sm border border-[#e2e2e2] px-4 py-3">
                <h2 className="text-sm font-semibold text-[#000000] mb-2">New Return</h2>

                <div className="border border-[#e2e2e2] hover:border-[#516057] hover:bg-[#f5f2f1] rounded-[4px] px-3 py-2 cursor-pointer transition-all"
                    onClick={() => setConfirmModal(true)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <Building2 className="w-3.5 h-3.5 text-[#516057] flex-shrink-0" />
                                <span className="text-xs font-semibold text-[#000000]">Start a new return transaction</span>
                            </div>
                            <p className="text-[10px] text-[#6b7280] pl-5">A unique license plate will be generated. You can then add products by scanning.</p>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                            <ClipboardList className="w-4 h-4 text-[#9ca3af]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmModal(false)}>
                    <div className="bg-white rounded-[4px] max-w-md w-full shadow-xl border border-[#e2e2e2]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e2] bg-[#f5f2f1]">
                            <h2 className="text-sm font-semibold text-[#000000] font-serif">Confirm Return Creation</h2>
                            <button onClick={() => setConfirmModal(false)} className="text-[#9ca3af] hover:text-[#505454]"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3 space-y-3">
                            <p className="text-xs text-[#505454]">You are about to create a new return transaction.</p>
                            <div className="bg-[#f5f2f1] rounded-[4px] border border-[#e2e2e2] px-3 py-2.5 space-y-2">
                                <div className="flex items-start gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-[#516057] mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-[#000000]">Your Pharmacy</p>
                                        <p className="text-[10px] text-[#6b7280] mt-0.5">A unique license plate will be generated</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#505454] mb-1">Notes (optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-2.5 py-1.5 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] resize-none"
                                    placeholder="Optional notes..."
                                />
                            </div>
                            <p className="text-[10px] text-[#6b7280]">Once created, you can begin adding products.</p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#e2e2e2] bg-[#f5f2f1]">
                            <button onClick={() => setConfirmModal(false)} className="px-3 py-1.5 text-xs rounded-[4px] border border-[#e2e2e2] text-[#505454] hover:bg-white transition-colors">Cancel</button>
                            <button onClick={handleConfirmCreate} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-[4px] bg-[#516057] text-white hover:opacity-90 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating...</> : 'Confirm & Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGuard>
        </DashboardLayout>
    );
}
