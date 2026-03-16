'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2, MapPin, Calendar, ArrowRight, Loader2, AlertCircle,
    X, CheckCircle, Scan,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-800 font-medium">Access denied. This page is for processors only.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>Go to Dashboard</Button>
            </div>
        );
    }

    if (isStoresLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading your assigned stores...</p>
                </div>
            </div>
        );
    }

    if (error && myStores.length === 0) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-800">{error}</p>
                <Button variant="outline" className="mt-4" onClick={() => dispatch(fetchMyStores())}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Return Transaction</h1>
                <p className="text-sm text-gray-600 mt-1">Select a store to create a new return transaction</p>
            </div>

            {/* Store Selection Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Store</h2>

                {myStores.length === 0 ? (
                    <div className="text-center py-12">
                        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium mb-2">No stores assigned</p>
                        <p className="text-sm text-gray-500">Contact your administrator to assign stores to your account.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {myStores.map((store) => (
                            <div
                                key={store.pharmacyId}
                                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                    selectedStore?.pharmacyId === store.pharmacyId
                                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => setSelectedStore(store)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Building2 className="w-5 h-5 text-gray-600" />
                                            <h3 className="font-semibold text-gray-900">{store.businessName}</h3>
                                            {store.storeNumber && (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                                                    Store #{store.storeNumber}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                            {store.city && store.state && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{store.city}, {store.state}</span>
                                                </div>
                                            )}
                                            {store.lastVisitDate && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Last visit: {new Date(store.lastVisitDate).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {store.serviceType && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                    {store.serviceType.replace(/_/g, ' ').toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center ml-3">
                                        {selectedStore?.pharmacyId === store.pharmacyId ? (
                                            <CheckCircle className="w-5 h-5 text-primary-500" />
                                        ) : (
                                            <ArrowRight className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Selected Store Details + Options */}
                {selectedStore && (
                    <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-900 mb-1">Selected Store</h3>
                            <p className="text-blue-800">{selectedStore.businessName}</p>
                            {selectedStore.storeNumber && (
                                <p className="text-sm text-blue-600">Store #{selectedStore.storeNumber}</p>
                            )}
                            {selectedStore.address && (
                                <p className="text-sm text-blue-600 mt-1">{selectedStore.address}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Service Type</label>
                                <select
                                    value={serviceType}
                                    onChange={e => setServiceType(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="in_store">In-Store Processing</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="e.g. Quarterly return"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={handleCreateReturn}
                            disabled={isActionLoading}
                        >
                            {isActionLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</>
                            ) : (
                                <><Scan className="w-4 h-4 mr-2" />Create Return Transaction</>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal && selectedStore && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setConfirmModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Confirm Return Creation</h2>
                            <button onClick={() => setConfirmModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-700">
                                You are about to create a new return transaction for:
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="font-semibold text-gray-900">{selectedStore.businessName}</p>
                                {selectedStore.storeNumber && (
                                    <p className="text-sm text-gray-600">Store #{selectedStore.storeNumber}</p>
                                )}
                                <p className="text-sm text-gray-600 mt-1">
                                    Service: {serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </p>
                                {notes.trim() && (
                                    <p className="text-sm text-gray-600 mt-1">Notes: {notes.trim()}</p>
                                )}
                            </div>
                            <p className="text-sm text-gray-600">
                                A unique license plate will be generated. Once created, you can begin adding products.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setConfirmModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleConfirmCreate} disabled={isActionLoading}>
                                {isActionLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin mr-1" />Creating...</>
                                ) : (
                                    'Confirm & Create'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
