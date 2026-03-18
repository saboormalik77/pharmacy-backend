'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2, MapPin, Calendar, ArrowRight, Loader2, AlertCircle,
    X, CheckCircle, Scan,
} from 'lucide-react';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchMyStores,
    createReturnTransaction,
} from '@/lib/store/returnTransactionsSlice';
import { ProcessorMyStore } from '@/lib/types';

export default function CreateReturnPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { myStores, isStoresLoading, isActionLoading, error } = useAppSelector(
        (state) => state.returnTransactions
    );

    const [selectedStore, setSelectedStore] = useState<ProcessorMyStore | null>(null);
    const [confirmModal, setConfirmModal] = useState(false);
    const [serviceType, setServiceType] = useState('in_store');
    const [notes, setNotes] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        if (user?.role === 'processor') {
            dispatch(fetchMyStores());
        }
    }, [dispatch, user]);

    const handleCreateReturn = () => {
        if (!selectedStore) return;
        setConfirmModal(true);
    };

    const handleConfirmCreate = async () => {
        if (!selectedStore) return;

        const result = await dispatch(createReturnTransaction({
            pharmacyId: selectedStore.pharmacyId,
            serviceType,
            notes: notes.trim() || undefined,
        }));

        if (createReturnTransaction.fulfilled.match(result)) {
            const tx = result.payload;
            showToast(`Return transaction ${tx.licensePlate} created successfully!`);
            setConfirmModal(false);
            setSelectedStore(null);
            setNotes('');
            router.push(`/warehouse/returns/${tx.id}`);
        } else {
            const errMsg = result.payload as string || 'Failed to create return transaction';
            showToast(errMsg, 'error');
            setConfirmModal(false);
        }
    };

    if (user?.role !== 'processor') {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-800 font-medium">Access denied. This page is for processors only.</p>
                <button className="mt-3 px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => router.push('/')}>Go to Dashboard</button>
            </div>
        );
    }

    if (isStoresLoading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Loading your assigned stores...</p>
                </div>
            </div>
        );
    }

    if (error && myStores.length === 0) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-800">{error}</p>
                <button className="mt-3 px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => dispatch(fetchMyStores())}>Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div>
                <h1 className="text-lg font-bold text-gray-900">Create Return Transaction</h1>
                <p className="text-xs text-gray-500">Select a store to create a new return transaction</p>
            </div>

            {/* Store Selection Card */}
            <div className="bg-white rounded-lg shadow px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">Select Store</h2>

                {myStores.length === 0 ? (
                    <div className="text-center py-10">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 font-medium mb-1">No stores assigned</p>
                        <p className="text-xs text-gray-400">Contact your administrator to assign stores to your account.</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {myStores.map((store) => (
                            <div
                                key={store.pharmacyId}
                                className={`border rounded px-3 py-2 cursor-pointer transition-all ${
                                    selectedStore?.pharmacyId === store.pharmacyId
                                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-400'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => setSelectedStore(store)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Building2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                            <span className="text-xs font-semibold text-gray-900 truncate">{store.businessName}</span>
                                            {store.storeNumber && (
                                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full flex-shrink-0">
                                                    #{store.storeNumber}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 pl-5">
                                            {store.city && store.state && (
                                                <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                                                    <MapPin className="w-2.5 h-2.5" />{store.city}, {store.state}
                                                </span>
                                            )}
                                            {store.lastVisitDate && (
                                                <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                                                    <Calendar className="w-2.5 h-2.5" />Last: {new Date(store.lastVisitDate).toLocaleDateString()}
                                                </span>
                                            )}
                                            {store.serviceType && (
                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                                                    {store.serviceType.replace(/_/g, ' ').toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ml-2 flex-shrink-0">
                                        {selectedStore?.pharmacyId === store.pharmacyId ? (
                                            <CheckCircle className="w-4 h-4 text-primary-500" />
                                        ) : (
                                            <ArrowRight className="w-4 h-4 text-gray-300" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Selected Store Options */}
                {selectedStore && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                            <p className="text-[10px] font-semibold text-blue-700 uppercase mb-0.5">Selected Store</p>
                            <p className="text-xs font-semibold text-blue-900">{selectedStore.businessName}</p>
                            {selectedStore.storeNumber && <p className="text-[10px] text-blue-600">Store #{selectedStore.storeNumber}</p>}
                            {selectedStore.address && <p className="text-[10px] text-blue-600 mt-0.5">{selectedStore.address}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">Service Type</label>
                                <select value={serviceType} onChange={e => setServiceType(e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500">
                                    <option value="in_store">In-Store Processing</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">Notes (optional)</label>
                                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Quarterly return" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" />
                            </div>
                        </div>

                        <button onClick={handleCreateReturn} disabled={isActionLoading} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                            {isActionLoading ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating...</>
                            ) : (
                                <><Scan className="w-3.5 h-3.5" />Create Return Transaction</>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal && selectedStore && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmModal(false)}>
                    <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Confirm Return Creation</h2>
                            <button onClick={() => setConfirmModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3 space-y-3">
                            <p className="text-xs text-gray-600">You are about to create a new return transaction for:</p>
                            <div className="bg-gray-50 rounded px-3 py-2">
                                <p className="text-xs font-semibold text-gray-900">{selectedStore.businessName}</p>
                                {selectedStore.storeNumber && <p className="text-[10px] text-gray-500">Store #{selectedStore.storeNumber}</p>}
                                <p className="text-[10px] text-gray-500 mt-0.5">Service: {serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                                {notes.trim() && <p className="text-[10px] text-gray-500 mt-0.5">Notes: {notes.trim()}</p>}
                            </div>
                            <p className="text-[10px] text-gray-500">A unique license plate will be generated. Once created, you can begin adding products.</p>
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
    );
}
