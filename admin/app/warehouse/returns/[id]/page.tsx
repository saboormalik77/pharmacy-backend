'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, X, Pause, Play, CheckCircle, Lock,
    Trash2, Edit, ClipboardList, Building2, UserCog, Package, Truck, Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchReturnTransactionById,
    updateReturnTransaction,
    pauseReturnTransaction,
    resumeReturnTransaction,
    completeReturnTransaction,
    finalizeReturnTransaction,
    deleteReturnTransaction,
    clearCurrentTransaction,
} from '@/lib/store/returnTransactionsSlice';
import { ReturnTransaction } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string } {
    switch (status) {
        case 'in_progress': return { variant: 'info', label: 'In Progress' };
        case 'paused': return { variant: 'warning', label: 'Paused' };
        case 'completed': return { variant: 'success', label: 'Completed' };
        case 'finalized': return { variant: 'default', label: 'Finalized' };
        case 'received': return { variant: 'success', label: 'Received' };
        case 'closed_out': return { variant: 'default', label: 'Closed Out' };
        default: return { variant: 'default', label: status };
    }
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function canDoAction(tx: ReturnTransaction, action: string): boolean {
    switch (action) {
        case 'pause': return tx.status === 'in_progress';
        case 'resume': return tx.status === 'paused';
        case 'complete': return tx.status === 'in_progress' || tx.status === 'paused';
        case 'finalize': return tx.status === 'completed';
        case 'edit': return tx.status !== 'finalized' && tx.status !== 'closed_out';
        case 'delete': return tx.status !== 'finalized' && tx.status !== 'closed_out' && tx.status !== 'received';
        default: return false;
    }
}

// ── Page ───────────────────────────────────────────────────────

export default function ReturnDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const dispatch = useAppDispatch();
    const { currentTransaction: tx, isLoading, isActionLoading, error } = useAppSelector(
        (state) => state.returnTransactions
    );

    const [toasts, setToasts] = useState<Toast[]>([]);
    const [editModal, setEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ fedexTracking: '', fedexPickupConfirmation: '', notes: '' });
    const [actionModal, setActionModal] = useState<'pause' | 'resume' | 'complete' | 'finalize' | null>(null);
    const [deleteModal, setDeleteModal] = useState(false);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const tid = Date.now().toString();
        setToasts(prev => [...prev, { id: tid, message, type }]);
    };
    const removeToast = (tid: string) => setToasts(prev => prev.filter(t => t.id !== tid));

    useEffect(() => {
        if (id) dispatch(fetchReturnTransactionById(id));
        return () => { dispatch(clearCurrentTransaction()); };
    }, [dispatch, id]);

    useEffect(() => {
        if (editModal && tx) {
            setEditForm({
                fedexTracking: tx.fedexTracking || '',
                fedexPickupConfirmation: tx.fedexPickupConfirmation || '',
                notes: tx.notes || '',
            });
        }
    }, [editModal, tx]);

    const refresh = () => dispatch(fetchReturnTransactionById(id));

    const handleStatusAction = async () => {
        if (!actionModal || !tx) return;
        const thunkMap = { pause: pauseReturnTransaction, resume: resumeReturnTransaction, complete: completeReturnTransaction, finalize: finalizeReturnTransaction };
        const thunk = thunkMap[actionModal];
        const result = await dispatch(thunk(tx.id));
        if (thunk.fulfilled.match(result)) {
            const labels = { pause: 'paused', resume: 'resumed', complete: 'completed', finalize: 'finalized' };
            showToast(`Return ${tx.licensePlate} ${labels[actionModal]} successfully!`);
            setActionModal(null);
            refresh();
        } else {
            showToast(result.payload as string || `Failed to ${actionModal}`, 'error');
            setActionModal(null);
        }
    };

    const handleUpdate = async () => {
        if (!tx) return;
        const result = await dispatch(updateReturnTransaction({ id: tx.id, payload: editForm }));
        if (updateReturnTransaction.fulfilled.match(result)) {
            showToast('Return updated successfully!');
            setEditModal(false);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to update', 'error');
        }
    };

    const handleDelete = async () => {
        if (!tx) return;
        const result = await dispatch(deleteReturnTransaction(tx.id));
        if (deleteReturnTransaction.fulfilled.match(result)) {
            showToast(`Return ${tx.licensePlate} deleted!`);
            setDeleteModal(false);
            setTimeout(() => router.push('/warehouse/returns'), 1000);
        } else {
            showToast(result.payload as string || 'Failed to delete', 'error');
            setDeleteModal(false);
        }
    };

    // ── Loading / Error States ─────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error || !tx) {
        return (
            <div className="space-y-4">
                <button onClick={() => router.push('/warehouse/returns')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back to Returns
                </button>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <p className="text-red-800 font-medium">{error || 'Return transaction not found.'}</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.push('/warehouse/returns')}>Go Back</Button>
                </div>
            </div>
        );
    }

    const badge = getStatusBadge(tx.status);

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Back + Header */}
            <div>
                <button onClick={() => router.push('/warehouse/returns')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-3">
                    <ArrowLeft className="w-4 h-4" /> Back to Returns
                </button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold font-mono text-gray-900">{tx.licensePlate}</h1>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canDoAction(tx, 'edit') && (
                            <Button variant="outline" size="sm" onClick={() => setEditModal(true)}>
                                <Edit className="w-4 h-4 mr-1" /> Edit
                            </Button>
                        )}
                        {canDoAction(tx, 'pause') && (
                            <Button variant="warning" size="sm" onClick={() => setActionModal('pause')}>
                                <Pause className="w-4 h-4 mr-1" /> Pause
                            </Button>
                        )}
                        {canDoAction(tx, 'resume') && (
                            <Button variant="success" size="sm" onClick={() => setActionModal('resume')}>
                                <Play className="w-4 h-4 mr-1" /> Resume
                            </Button>
                        )}
                        {canDoAction(tx, 'complete') && (
                            <Button variant="primary" size="sm" onClick={() => setActionModal('complete')}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Complete
                            </Button>
                        )}
                        {canDoAction(tx, 'finalize') && (
                            <Button variant="danger" size="sm" onClick={() => setActionModal('finalize')}>
                                <Lock className="w-4 h-4 mr-1" /> Finalize
                            </Button>
                        )}
                        {canDoAction(tx, 'delete') && (
                            <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>
                                <Trash2 className="w-4 h-4 mr-1" /> Delete
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Info */}
                <div className="bg-white rounded-lg shadow-md p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" /> General Information
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">License Plate</dt>
                            <dd className="font-mono font-semibold text-gray-900">{tx.licensePlate}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Service Type</dt>
                            <dd className="text-gray-900">{tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Created</dt>
                            <dd className="text-gray-900">{formatDate(tx.createdAt)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Last Updated</dt>
                            <dd className="text-gray-900">{formatDate(tx.updatedAt)}</dd>
                        </div>
                        {tx.finalizedAt && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Finalized</dt>
                                <dd className="text-gray-900">{formatDate(tx.finalizedAt)}</dd>
                            </div>
                        )}
                        {tx.notes && (
                            <div className="pt-2 border-t border-gray-100">
                                <dt className="text-gray-500 mb-1">Notes</dt>
                                <dd className="text-gray-700">{tx.notes}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Store & Processor */}
                <div className="bg-white rounded-lg shadow-md p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Store & Processor
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Store Name</dt>
                            <dd className="font-medium text-gray-900">{tx.pharmacyName || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Processor</dt>
                            <dd className="text-gray-900 flex items-center gap-1">
                                <UserCog className="w-3.5 h-3.5 text-gray-400" /> {tx.processorName || '—'}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Values */}
                <div className="bg-white rounded-lg shadow-md p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4" /> Items & Values
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Total Items</dt>
                            <dd className="font-semibold text-gray-900">{tx.totalItems}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Returnable Value</dt>
                            <dd className="font-semibold text-green-700">{formatCurrency(tx.totalReturnableValue)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Non-Returnable Value</dt>
                            <dd className="font-semibold text-red-700">{formatCurrency(tx.totalNonReturnableValue)}</dd>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-100">
                            <dt className="text-gray-500 font-medium">Total Value</dt>
                            <dd className="font-bold text-gray-900">{formatCurrency(tx.totalReturnableValue + tx.totalNonReturnableValue)}</dd>
                        </div>
                    </dl>
                </div>

                {/* Shipping & Times */}
                <div className="bg-white rounded-lg shadow-md p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Truck className="w-4 h-4" /> Shipping & Processing
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">FedEx Tracking</dt>
                            <dd className="text-gray-900 font-mono text-xs">{tx.fedexTracking || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Pickup Confirmation</dt>
                            <dd className="text-gray-900">{tx.fedexPickupConfirmation || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Time In</dt>
                            <dd className="text-gray-900">{tx.timeIn ? formatDate(tx.timeIn) : '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Time Out</dt>
                            <dd className="text-gray-900">{tx.timeOut ? formatDate(tx.timeOut) : '—'}</dd>
                        </div>
                        {tx.receivedInWarehouseDate && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Received in Warehouse</dt>
                                <dd className="text-gray-900">{formatDate(tx.receivedInWarehouseDate)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Verified Integrity</dt>
                            <dd className="text-gray-900">{tx.verifiedIntegrity ? 'Yes' : 'No'}</dd>
                        </div>
                    </dl>
                </div>
            </div>

            {/* ── Edit Modal ────────────────────────────────── */}
            {editModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setEditModal(false)}>
                    <div className="bg-white rounded-lg max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Return — {tx.licensePlate}</h2>
                            <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">FedEx Tracking Number</label>
                                <input
                                    type="text"
                                    value={editForm.fedexTracking}
                                    onChange={e => setEditForm({ ...editForm, fedexTracking: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Enter tracking number"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">FedEx Pickup Confirmation</label>
                                <input
                                    type="text"
                                    value={editForm.fedexPickupConfirmation}
                                    onChange={e => setEditForm({ ...editForm, fedexPickupConfirmation: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Enter pickup confirmation"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={editForm.notes}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                    placeholder="Optional notes"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdate} disabled={isActionLoading}>
                                {isActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving...</> : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Status Action Modal ──────────────────────── */}
            {actionModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {actionModal === 'pause' && 'Pause Return'}
                                {actionModal === 'resume' && 'Resume Return'}
                                {actionModal === 'complete' && 'Mark as Completed'}
                                {actionModal === 'finalize' && 'Finalize Return'}
                            </h2>
                            <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-3">
                                Are you sure you want to <strong>{actionModal}</strong> return <strong>{tx.licensePlate}</strong>?
                            </p>
                            {actionModal === 'finalize' && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                                    <strong>Warning:</strong> Finalizing a return locks it permanently. This action cannot be undone.
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
                            <Button variant={actionModal === 'finalize' ? 'danger' : 'primary'} onClick={handleStatusAction} disabled={isActionLoading}>
                                {isActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Processing...</> : 'Confirm'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ─────────────────────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Delete Return</h2>
                            <button onClick={() => setDeleteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700">
                                Are you sure you want to delete return <strong>{tx.licensePlate}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setDeleteModal(false)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} disabled={isActionLoading}>
                                {isActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Deleting...</> : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
