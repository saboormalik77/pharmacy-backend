'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    ArrowLeft, Loader2, AlertCircle, X, Play, CheckCircle, Lock,
    Trash2, Edit, ClipboardList, Building2, Package, Truck,
    Plus, Search, ScanLine, FileText, Download, AlertTriangle, Printer, QrCode,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/lib/api/client';
import { getToken } from '@/lib/utils/cookies';

// ── Types ──────────────────────────────────────────────────────

interface ReturnTransaction {
    id: string;
    licensePlate: string;
    pharmacyId: string;
    pharmacyName?: string;
    processorId?: string;
    processorName?: string;
    serviceType: string;
    status: string;
    totalItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    fedexTracking?: string;
    fedexPickupConfirmation?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    finalizedAt?: string;
    boxCount?: number;
    prpNumber?: string;
    packageTracking?: Record<string, string>;
    fedexShipmentId?: string;
    fedexLabels?: Record<string, string>;
    manifestGeneratedAt?: string;
    receivedInWarehouseDate?: string;
}

interface ReturnTransactionItem {
    id: string;
    ndc: string;
    ndc10?: string;
    proprietaryName?: string;
    genericName?: string;
    manufacturer?: string;
    packageDescription?: string;
    dosageForm?: string;
    strength?: string;
    lotNumber?: string;
    serialNumber?: string;
    expirationDate?: string;
    standardPrice?: number;
    quantity: number;
    quantityReturned: number;
    isPartial?: boolean;
    partialPercentage?: number;
    fullPackageSize?: number;
    fullPackageQtyReturned?: number;
    estimatedValue?: number;
    estimatedStoreValue?: number;
    returnStatus: string;
    returnReason?: string;
    destination?: string;
    memo?: string;
    wineCellarId?: string;
    nonReturnableReason?: string;
    deaForm222Required?: boolean;
    deaSchedule?: string;
    productType?: string;
    scanSource?: string;
    createdAt: string;
    updatedAt?: string;
}

interface ReverseDistributor {
    id: string;
    name: string;
}

// ── Helpers ────────────────────────────────────────────────────

function canDoAction(tx: ReturnTransaction, action: string): boolean {
    switch (action) {
        case 'pause': return tx.status === 'in_progress';
        case 'resume': return tx.status === 'paused';
        case 'complete': return tx.status === 'in_progress' || tx.status === 'paused';
        case 'finalize': return tx.status === 'completed';
        case 'edit': return tx.status !== 'finalized' && tx.status !== 'closed_out';
        case 'delete': return !['finalized', 'received', 'closed_out'].includes(tx.status);
        case 'add_items': return tx.status === 'in_progress' || tx.status === 'paused';
        default: return false;
    }
}

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string } {
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

function getItemStatusBadge(status: string): { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string } {
    switch (status) {
        case 'returnable': return { variant: 'success', label: 'Returnable' };
        case 'non_returnable': return { variant: 'error', label: 'Non-Returnable' };
        case 'tbd': return { variant: 'warning', label: 'TBD' };
        default: return { variant: 'default', label: status };
    }
}

// ── Page ───────────────────────────────────────────────────────

export default function ReturnDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [tx, setTx] = useState<ReturnTransaction | null>(null);
    const [items, setItems] = useState<ReturnTransactionItem[]>([]);
    const [itemsSummary, setItemsSummary] = useState<{
        totalItems: number;
        totalReturnableValue: number;
        totalNonReturnableValue: number;
        totalValue: number;
    } | null>(null);
    const [reverseDistributors, setReverseDistributors] = useState<ReverseDistributor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isItemsLoading, setIsItemsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([]);
    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const toastId = Date.now().toString();
        setToasts(prev => [...prev, { id: toastId, message, type }]);
    };
    const removeToast = (toastId: string) => setToasts(prev => prev.filter(t => t.id !== toastId));

    // Modal states
    const [finalizeModal, setFinalizeModal] = useState(false);
    const [fedexSubModal, setFedexSubModal] = useState(false);
    const [fedexMode, setFedexMode] = useState<'choose' | 'api' | 'manual'>('choose');
    const [fedexApiLoading, setFedexApiLoading] = useState(false);
    const [fedexApiResult, setFedexApiResult] = useState<{
        masterTrackingNumber: string;
        shipmentId: string;
        packages: { trackingNumber: string; hasLabel: boolean }[];
    } | null>(null);
    const [pickupLoading, setPickupLoading] = useState(false);
    const [pickupForm, setPickupForm] = useState({
        pickupDate: new Date().toISOString().split('T')[0],
        readyTime: '09:00',
        closeTime: '17:00',
    });
    const [pdfLoading, setPdfLoading] = useState<string | null>(null);

    // Finalize form states
    const [finalizeForm, setFinalizeForm] = useState({
        fedexTracking: '',
        boxCount: '',
    });
    const [fedexForm, setFedexForm] = useState({
        boxCount: '',
        prpNumber: '',
        packages: Array(12).fill(''),
    });
    const [finalizeStepsDone, setFinalizeStepsDone] = useState({
        printManifest: false,
        fedexEntered: false,
        printJobSheets: false,
    });

    // Filters
    const [itemSearch, setItemSearch] = useState('');
    const [itemStatusFilter, setItemStatusFilter] = useState('');
    const debouncedItemSearch = useDebounce(itemSearch, 300);

    // Modals
    const [editModal, setEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [actionModal, setActionModal] = useState<{ action: 'pause' | 'resume' | 'complete' } | null>(null);
    const [editItemModal, setEditItemModal] = useState<ReturnTransactionItem | null>(null);
    const [deleteItemModal, setDeleteItemModal] = useState<ReturnTransactionItem | null>(null);

    // Edit forms
    const [editForm, setEditForm] = useState({ fedexTracking: '', fedexPickupConfirmation: '', notes: '' });
    const [editItemForm, setEditItemForm] = useState({
        fullPackageSize: '',
        fullPackageQtyReturned: '',
        standardPrice: 0,
        returnStatus: '',
        destination: '',
        memo: '',
    });
    const [editPolicyCheck, setEditPolicyCheck] = useState<{
        status: 'returnable' | 'non_returnable' | 'tbd';
        reason?: string;
        destination?: string;
        manufacturerName?: string;
    } | null>(null);
    const [isEditPolicyChecking, setIsEditPolicyChecking] = useState(false);

    // ── Data fetching ─────────────────────────────────────────

    const fetchTransaction = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiClient.get<any>(`/return-transactions/${id}`, {}, true);
            if (res.status === 'success') {
                setTx(res.data);
            } else {
                throw new Error(res.message || 'Failed to fetch transaction');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load return transaction');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    const fetchItems = useCallback(async () => {
        if (!id) return;
        setIsItemsLoading(true);
        try {
            const queryParams: any = {};
            if (debouncedItemSearch) queryParams.search = debouncedItemSearch;
            if (itemStatusFilter) queryParams.status = itemStatusFilter;

            const res = await apiClient.get<any>(`/return-transactions/${id}/items`, queryParams, true);
            if (res.status === 'success') {
                setItems(res.data.items || []);
                if (res.data.summary) {
                    setItemsSummary(res.data.summary);
                }
            } else {
                throw new Error(res.message || 'Failed to fetch items');
            }
        } catch (err: any) {
            showToast('Failed to load items', 'error');
        } finally {
            setIsItemsLoading(false);
        }
    }, [id, debouncedItemSearch, itemStatusFilter]);

    const fetchReverseDistributors = useCallback(async () => {
        try {
            const res = await apiClient.get<any>('/admin/reverse-distributors', {}, true);
            if (res.status === 'success') {
                setReverseDistributors(res.data || []);
            }
        } catch {
            // non-critical
        }
    }, []);

    useEffect(() => {
        fetchTransaction();
        fetchReverseDistributors();
    }, [fetchTransaction, fetchReverseDistributors]);

    useEffect(() => {
        if (tx) fetchItems();
    }, [fetchItems, tx]);

    useEffect(() => {
        if (editModal && tx) {
            setEditForm({
                fedexTracking: tx.fedexTracking || '',
                fedexPickupConfirmation: tx.fedexPickupConfirmation || '',
                notes: tx.notes || '',
            });
        }
    }, [editModal, tx]);

    useEffect(() => {
        if (editItemModal) {
            setEditItemForm({
                fullPackageSize: editItemModal.fullPackageSize ? String(editItemModal.fullPackageSize) : '',
                fullPackageQtyReturned: editItemModal.fullPackageQtyReturned ? String(editItemModal.fullPackageQtyReturned) : (editItemModal.quantity ? String(editItemModal.quantity) : ''),
                standardPrice: editItemModal.standardPrice || 0,
                returnStatus: editItemModal.returnStatus,
                destination: editItemModal.destination || '',
                memo: editItemModal.memo || '',
            });
            setEditPolicyCheck(null);
        }
    }, [editItemModal]);

    const runEditPolicyCheck = useCallback(async () => {
        if (!editItemModal) return;
        const ndc = editItemModal.ndc;
        const expDate = editItemModal.expirationDate;
        if (!ndc || !expDate) return;

        const pkgSize = parseInt(editItemForm.fullPackageSize) || 0;
        const qtyReturned = parseInt(editItemForm.fullPackageQtyReturned) || 0;
        const isPartial = pkgSize > 0 && qtyReturned > 0 && qtyReturned < pkgSize;

        setIsEditPolicyChecking(true);
        setEditPolicyCheck(null);
        try {
            const res = await apiClient.post<any>('/policies/check', {
                ndc,
                expirationDate: expDate,
                dosageForm: editItemModal.dosageForm || undefined,
                isPartial,
            }, true);
            if (res.status === 'success' && res.data) {
                const policy = res.data;
                setEditPolicyCheck(policy);
                if (policy.status === 'returnable' || policy.status === 'non_returnable') {
                    setEditItemForm(prev => ({
                        ...prev,
                        returnStatus: policy.status,
                        destination: policy.destination || prev.destination,
                    }));
                }
            }
        } catch { /* non-critical */ }
        setIsEditPolicyChecking(false);
    }, [editItemModal, editItemForm.fullPackageSize, editItemForm.fullPackageQtyReturned]);

    useEffect(() => {
        if (!editItemModal) return;
        const pkgSize = parseInt(editItemForm.fullPackageSize) || 0;
        const qtyReturned = parseInt(editItemForm.fullPackageQtyReturned) || 0;
        if (pkgSize <= 0 || qtyReturned <= 0) return;

        runEditPolicyCheck();
    }, [editItemForm.fullPackageSize, editItemForm.fullPackageQtyReturned, editItemModal, runEditPolicyCheck]);

    // ── Action handlers ────────────────────────────────────────

    const handleStatusAction = async () => {
        if (!actionModal || !tx) return;
        setIsActionLoading(true);
        try {
            const res = await apiClient.post(`/return-transactions/${tx.id}/${actionModal.action}`, {}, true);
            if (res.status === 'success') {
                const labels: Record<string, string> = { pause: 'paused', resume: 'resumed', complete: 'completed' };
                showToast(`Return ${tx.licensePlate} ${labels[actionModal.action]} successfully!`);
                setActionModal(null);
                fetchTransaction();
            } else {
                throw new Error(res.message || `Failed to ${actionModal.action} return`);
            }
        } catch (err: any) {
            showToast(err.message || `Failed to ${actionModal.action} return`, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!tx) return;
        setIsActionLoading(true);
        try {
            const res = await apiClient.patch(`/return-transactions/${tx.id}`, editForm, true);
            if (res.status === 'success') {
                showToast(`Return ${tx.licensePlate} updated!`);
                setEditModal(false);
                fetchTransaction();
            } else {
                throw new Error(res.message || 'Failed to update return');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to update return', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!tx) return;
        setIsActionLoading(true);
        try {
            const res = await apiClient.delete(`/return-transactions/${tx.id}`, true);
            if (res.status === 'success') {
                showToast(`Return ${tx.licensePlate} deleted!`);
                setDeleteModal(false);
                router.push('/returns');
            } else {
                throw new Error(res.message || 'Failed to delete return');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to delete return', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    // ── Finalize Functions ─────────────────────────────────────

    const openFinalizeModal = () => {
        if (!tx) return;
        
        // Pre-populate form with existing data
        setFinalizeForm({
            fedexTracking: tx.fedexTracking || '',
            boxCount: tx.boxCount ? String(tx.boxCount) : '',
        });

        // Pre-populate FedEx form
        const pkgs = Array(12).fill('');
        if (tx.packageTracking) {
            Object.entries(tx.packageTracking).forEach(([key, value]) => {
                const match = key.match(/package(\d+)/);
                if (match) {
                    const index = parseInt(match[1]) - 1;
                    if (index >= 0 && index < 12) pkgs[index] = value;
                }
            });
        }
        setFedexForm({
            boxCount: tx.boxCount ? String(tx.boxCount) : '',
            prpNumber: tx.prpNumber || '',
            packages: pkgs,
        });
        setFinalizeModal(true);
    };

    const handleFinalize = async () => {
        if (!tx) return;

        const fedexTracking = finalizeForm.fedexTracking.trim();
        const boxCount = parseInt(finalizeForm.boxCount) || undefined;

        // Build package tracking
        const packageTracking: Record<string, string> = {};
        fedexForm.packages.forEach((val, i) => {
            if (val.trim()) packageTracking[`package${i + 1}`] = val.trim();
        });

        setIsActionLoading(true);
        try {
            const res = await apiClient.post(`/return-transactions/${tx.id}/finalize`, {
                fedexTracking,
                boxCount,
                prpNumber: fedexForm.prpNumber.trim() || undefined,
                packageTracking: Object.keys(packageTracking).length > 0 ? packageTracking : undefined,
            }, true);

            if (res.status === 'success') {
                showToast(`Return ${tx.licensePlate} finalized successfully!`);
                setFinalizeModal(false);
                fetchTransaction();
            } else {
                throw new Error(res.message || 'Failed to finalize return');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to finalize return', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const updateFinalizeSteps = async (steps: Partial<typeof finalizeStepsDone>) => {
        if (!tx) return;
        try {
            await apiClient.patch(`/return-transactions/${tx.id}/finalize-steps`, { steps }, true);
            setFinalizeStepsDone(prev => ({ ...prev, ...steps }));
        } catch (err: any) {
            showToast('Failed to update finalize steps', 'error');
        }
    };

    const downloadPdf = async (endpoint: string, filename: string) => {
        setPdfLoading(endpoint);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = getToken();
            const response = await fetch(`${baseUrl}/return-transactions/${tx?.id}/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Download failed' }));
                throw new Error(err.message || 'Download failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err: any) {
            showToast(err.message || 'Download failed', 'error');
        }
        setPdfLoading(null);
    };

    const printHtml = async (endpoint: string, loadingKey: string) => {
        setPdfLoading(loadingKey);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = getToken();
            const res = await fetch(`${baseUrl}/return-transactions/${tx?.id}/${endpoint}`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    Accept: 'text/html'
                },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Print failed' }));
                throw new Error(err.message || 'Print failed');
            }
            const htmlContent = await res.text();
            
            // Create a new window with the HTML content
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                
                // Wait for content to load, then print
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                };
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to print document', 'error');
        }
        setPdfLoading(null);
    };

    const printJobSheet = () => {
        printHtml('job-sheet', 'job-sheet');
    };

    // ── FedEx API Functions ───────────────────────────────────

    const createFedexShipment = async (boxCount: number) => {
        if (!tx) return;
        setFedexApiLoading(true);
        try {
            const res = await apiClient.post(`/return-transactions/${tx.id}/create-shipment`, {
                boxCount,
            }, true);
            
            if (res.status === 'success') {
                const shipment = (res.data as any).shipment;
                setFedexApiResult(shipment);
                
                // Update forms with API result
                const updatedPkgs = [...fedexForm.packages];
                shipment.packages.forEach((p: any, i: number) => {
                    if (i < 12) updatedPkgs[i] = p.trackingNumber;
                });
                
                setFedexForm(prev => ({
                    ...prev,
                    prpNumber: shipment.masterTrackingNumber,
                    packages: updatedPkgs,
                    boxCount: String(shipment.packages.length || prev.boxCount),
                }));
                
                setFinalizeForm(prev => ({
                    ...prev,
                    fedexTracking: shipment.masterTrackingNumber,
                    boxCount: String(shipment.packages.length),
                }));
                
                updateFinalizeSteps({ fedexEntered: true });
                showToast('FedEx shipment created successfully!');
                fetchTransaction(); // Refresh transaction data
            } else {
                throw new Error(res.message || 'Failed to create shipment');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to create shipment', 'error');
        } finally {
            setFedexApiLoading(false);
        }
    };

    const scheduleFedexPickup = async () => {
        if (!tx) return;
        setPickupLoading(true);
        try {
            const res = await apiClient.post(`/return-transactions/${tx.id}/schedule-pickup`, {
                ...pickupForm,
            }, true);
            
            if (res.status === 'success') {
                showToast(`Pickup scheduled: ${(res.data as any).pickup.pickupConfirmationNumber}`);
                fetchTransaction(); // Refresh transaction data
            } else {
                throw new Error(res.message || 'Failed to schedule pickup');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to schedule pickup', 'error');
        } finally {
            setPickupLoading(false);
        }
    };

    const printShippingLabels = () => {
        printHtml('shipping-labels', 'shipping-labels');
    };

    const printSingleLabel = (packageNumber: number) => {
        printHtml(`shipping-label/${packageNumber}`, `shipping-label-${packageNumber}`);
    };

    // Calculate finalize state
    const returnableItemsCount = items.filter(item => item.returnStatus === 'returnable').length;
    const tbdItems = items.filter(item => item.returnStatus === 'tbd');
    const ciiItems = items.filter(item => item.deaForm222Required);
    const hasTbdItems = tbdItems.length > 0;
    const hasCiiItems = ciiItems.length > 0;
    const allStepsDone = finalizeStepsDone.printManifest && finalizeStepsDone.fedexEntered && finalizeStepsDone.printJobSheets;
    const canFinalize = allStepsDone && !hasTbdItems;

    const handleUpdateItem = async () => {
        if (!editItemModal) return;
        setIsActionLoading(true);
        try {
            const payload: Record<string, any> = {
                returnStatus: editItemForm.returnStatus,
            };
            
            const pkgSize = editItemForm.fullPackageSize ? parseInt(editItemForm.fullPackageSize) : 0;
            const qtyReturned = editItemForm.fullPackageQtyReturned ? parseInt(editItemForm.fullPackageQtyReturned) : 0;
            if (pkgSize > 0) payload.fullPackageSize = pkgSize;
            if (qtyReturned > 0) {
                payload.fullPackageQtyReturned = qtyReturned;
                if (pkgSize > 0 && qtyReturned < pkgSize) {
                    payload.quantity = 1;
                    payload.isPartial = true;
                    payload.partialPercentage = Math.round((qtyReturned / pkgSize) * 100 * 100) / 100;
                } else {
                    payload.quantity = qtyReturned >= pkgSize && pkgSize > 0 ? Math.floor(qtyReturned / pkgSize) : qtyReturned;
                    payload.isPartial = false;
                    payload.partialPercentage = null;
                }
            }
            if (editItemForm.standardPrice) payload.standardPrice = editItemForm.standardPrice;
            if (editItemForm.destination) payload.destination = editItemForm.destination;
            if (editItemForm.memo) payload.memo = editItemForm.memo;

            const res = await apiClient.patch(
                `/return-transactions/${id}/items/${editItemModal.id}`,
                payload,
                true,
            );
            if (res.status === 'success') {
                showToast('Item updated successfully!');
                setEditItemModal(null);
                fetchItems();
                fetchTransaction();
            } else {
                throw new Error(res.message || 'Failed to update item');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to update item', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!deleteItemModal) return;
        setIsActionLoading(true);
        try {
            const res = await apiClient.delete(
                `/return-transactions/${id}/items/${deleteItemModal.id}`,
                true,
            );
            if (res.status === 'success') {
                showToast('Item deleted successfully!');
                setDeleteItemModal(null);
                fetchItems();
                fetchTransaction();
            } else {
                throw new Error(res.message || 'Failed to delete item');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to delete item', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };


    // ── Render ─────────────────────────────────────────────────

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-64">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Loading return transaction...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !tx) {
        return (
            <DashboardLayout>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-800">{error || 'Return transaction not found'}</p>
                    <button
                        className="mt-3 px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => router.push('/returns')}
                    >
                        Back to Returns
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const badge = getStatusBadge(tx.status);
    const showDocuments = ['finalized', 'received', 'closed_out'].includes(tx.status);
    const showShipping = !!(tx.fedexTracking || tx.fedexPickupConfirmation);

    return (
        <DashboardLayout>
            <div className="space-y-4">
                <ToastContainer toasts={toasts} onClose={removeToast} />

                {/* ── Header ─────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-lg font-mono font-bold text-gray-900">{tx.licensePlate}</h1>
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                            </div>
                            <p className="text-xs text-gray-500">Return Transaction Details</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {canDoAction(tx, 'resume') && (
                            <button
                                onClick={() => setActionModal({ action: 'resume' })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <Play className="w-3 h-3" /> Resume
                            </button>
                        )}
                        {canDoAction(tx, 'complete') && (
                            <button
                                onClick={() => setActionModal({ action: 'complete' })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <CheckCircle className="w-3 h-3" /> Complete
                            </button>
                        )}
                        {canDoAction(tx, 'finalize') && (
                            <button
                                onClick={openFinalizeModal}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <Lock className="w-3 h-3" /> Finalize
                            </button>
                        )}
                        {/* Print Job Sheet - Available for completed/finalized transactions with tracking */}
                        {(tx.status === 'completed' || tx.status === 'finalized') && (tx.fedexTracking || (tx.packageTracking && Object.keys(tx.packageTracking).length > 0)) && (
                            <button
                                onClick={printJobSheet}
                                disabled={pdfLoading === 'job-sheet'}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                                title="Print job sheet with addresses and barcodes"
                            >
                                {pdfLoading === 'job-sheet' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
                                Print Job Sheet
                            </button>
                        )}
                        {canDoAction(tx, 'edit') && (
                            <button
                                onClick={() => setEditModal(true)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                                title="Edit"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                        )}
                        {canDoAction(tx, 'delete') && (
                            <button
                                onClick={() => setDeleteModal(true)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Info Cards ──────────────────────────────────── */}
                <div className={`grid grid-cols-1 gap-4 ${showShipping ? 'md:grid-cols-2 lg:grid-cols-2' : 'md:grid-cols-3'}`}>
                    {/* General Information */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-gray-500" />
                            General Information
                        </h2>
                        <dl className="space-y-2">
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">License Plate</dt>
                                <dd className="text-xs font-mono font-medium text-gray-900">{tx.licensePlate}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Service Type</dt>
                                <dd className="text-xs font-medium text-gray-900">
                                    {tx.serviceType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Created</dt>
                                <dd className="text-xs font-medium text-gray-900">{formatDate(tx.createdAt)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Updated</dt>
                                <dd className="text-xs font-medium text-gray-900">{formatDate(tx.updatedAt)}</dd>
                            </div>
                            {tx.finalizedAt && (
                                <div className="flex justify-between">
                                    <dt className="text-xs text-gray-500">Finalized</dt>
                                    <dd className="text-xs font-medium text-gray-900">{formatDate(tx.finalizedAt)}</dd>
                                </div>
                            )}
                            {tx.notes && (
                                <div className="pt-2 border-t border-gray-100">
                                    <dt className="text-xs text-gray-500 mb-1">Notes</dt>
                                    <dd className="text-xs text-gray-700">{tx.notes}</dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* Store & Processor */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-500" />
                            Store &amp; Processor
                        </h2>
                        <dl className="space-y-2">
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Store Name</dt>
                                <dd className="text-xs font-medium text-gray-900">{tx.pharmacyName || '—'}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Processor</dt>
                                <dd className="text-xs font-medium text-gray-900">{tx.processorName || '—'}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Items & Values */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-500" />
                            Items &amp; Values
                        </h2>
                        <dl className="space-y-2">
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Total Items</dt>
                                <dd className="text-xs font-medium text-gray-900">{returnableItemsCount}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Returnable Value</dt>
                                <dd className="text-xs font-medium text-green-700">{formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}</dd>
                            </div>
                            {/* <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Non-Returnable Value</dt>
                                <dd className="text-xs font-medium text-red-700">{formatCurrency(itemsSummary?.totalNonReturnableValue ?? tx.totalNonReturnableValue)}</dd>
                            </div> */}
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <dt className="text-xs font-semibold text-gray-700">Total Value</dt>
                                <dd className="text-xs font-bold text-gray-900">
                                    {formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Shipping (conditional) */}
                    {showShipping && (
                        <div className="bg-white rounded-lg shadow p-4">
                            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-gray-500" />
                                Shipping
                            </h2>
                            <dl className="space-y-2">
                                {tx.fedexTracking && (
                                    <div className="flex justify-between">
                                        <dt className="text-xs text-gray-500">FedEx Tracking</dt>
                                        <dd className="text-xs font-medium text-gray-900 font-mono">{tx.fedexTracking}</dd>
                                    </div>
                                )}
                                {tx.fedexPickupConfirmation && (
                                    <div className="flex justify-between">
                                        <dt className="text-xs text-gray-500">Pickup Confirmation</dt>
                                        <dd className="text-xs font-medium text-gray-900 font-mono">{tx.fedexPickupConfirmation}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    )}
                </div>

                {/* ── Documents Section ───────────────────────────── */}
                {showDocuments && (
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            Documents
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => downloadPdf('manifest', `manifest-${tx.licensePlate}.pdf`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <Download className="w-3.5 h-3.5" /> Download Manifest
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Summary Bar ─────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Items</p>
                        <p className="text-lg font-bold text-gray-900">{returnableItemsCount}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-green-600 mb-1">Returnable</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}</p>
                    </div>
                    {/* <div className="bg-white rounded-lg shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-red-600 mb-1">Non-Returnable</p>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(itemsSummary?.totalNonReturnableValue ?? tx.totalNonReturnableValue)}</p>
                    </div> */}
                    <div className="bg-white rounded-lg shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-blue-600 mb-1">Total Value</p>
                        <p className="text-lg font-bold text-blue-700">{formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}</p>
                    </div>
                </div>

                {/* ── Items Section ───────────────────────────────── */}
                <div className="bg-white rounded-lg shadow">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-500" />
                            Products ({itemsSummary?.totalItems ?? items.length})
                        </h2>
                        {canDoAction(tx, 'add_items') && (
                            <button
                                onClick={() => router.push(`/returns/${tx.id}/add-items`)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <Plus className="w-3 h-3" /> Add Items
                            </button>
                        )}
                    </div>

                    {/* Items Filters */}
                    <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-gray-100">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by NDC, name, or manufacturer..."
                                value={itemSearch}
                                onChange={e => setItemSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                        </div>
                        <select
                            value={itemStatusFilter}
                            onChange={e => setItemStatusFilter(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="returnable">Returnable</option>
                            <option value="non_returnable">Non-Returnable</option>
                            <option value="tbd">TBD</option>
                        </select>
                    </div>

                    {/* Items Table */}
                    {isItemsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 font-medium mb-1">No items found</p>
                            <p className="text-xs text-gray-400 mb-3">
                                {itemSearch || itemStatusFilter ? 'Try adjusting your filters.' : 'Start adding items to this return.'}
                            </p>
                            {canDoAction(tx, 'add_items') && !itemSearch && !itemStatusFilter && (
                                <button
                                    onClick={() => router.push(`/returns/${tx.id}/add-items`)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <ScanLine className="w-3 h-3" /> Start Scanning
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">NDC</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Name</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Manufacturer</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Pkg Size</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Qty Returned</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Serial#</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Price</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Est. Value</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Est. Store Value</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Expires</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Destination</th>
                                        <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => {
                                        const itemBadge = getItemStatusBadge(item.returnStatus);
                                        return (
                                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-3 py-2">
                                                    <span className="text-xs font-mono text-gray-900">{item.ndc}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <p className="text-xs font-medium text-gray-900 truncate max-w-[180px]">
                                                        {item.proprietaryName || item.genericName || '—'}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-700">{item.manufacturer || '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-900">{item.fullPackageSize || '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-900">
                                                        {(() => {
                                                            const qtyReturned = item.fullPackageQtyReturned ?? item.quantity;
                                                            const displayQty = (item.fullPackageQtyReturned && item.fullPackageSize && item.fullPackageQtyReturned === item.fullPackageSize) ? 1 : qtyReturned;
                                                            return <>{displayQty}{item.isPartial && <span className="text-orange-500 font-semibold ml-0.5">P</span>}</>;
                                                        })()}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs font-mono text-gray-700">{item.serialNumber || '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-900">{item.standardPrice ? formatCurrency(item.standardPrice) : '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-900 font-medium">{item.estimatedValue ? formatCurrency(item.estimatedValue) : '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-900">{item.estimatedStoreValue ? formatCurrency(item.estimatedStoreValue) : '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-700">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1">
                                                        <Badge variant={itemBadge.variant}>
                                                            <span className="text-[10px]">{itemBadge.label}</span>
                                                        </Badge>
                                                        {item.wineCellarId && (
                                                            <Badge variant="info">
                                                                <span className="text-[10px]">WC</span>
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {item.returnStatus === 'returnable' ? (
                                                        item.destination ? (
                                                            <span className="text-xs text-gray-700">{item.destination}</span>
                                                        ) : (
                                                            <span className="text-xs text-orange-500 flex items-center gap-0.5">
                                                                <AlertTriangle className="w-3 h-3" /> Missing
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        {canDoAction(tx, 'edit') && (
                                                            <button
                                                                onClick={() => setEditItemModal(item)}
                                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                                title="Edit Item"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {canDoAction(tx, 'delete') && (
                                                            <button
                                                                onClick={() => setDeleteItemModal(item)}
                                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                                title="Delete Item"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Edit Return Modal ───────────────────────────── */}
                {editModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(false)}>
                        <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-900">Edit Return — {tx.licensePlate}</h2>
                                <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3 space-y-2.5">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">FedEx Tracking Number</label>
                                    <input
                                        type="text"
                                        value={editForm.fedexTracking}
                                        onChange={e => setEditForm({ ...editForm, fedexTracking: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        placeholder="Enter tracking number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">FedEx Pickup Confirmation</label>
                                    <input
                                        type="text"
                                        value={editForm.fedexPickupConfirmation}
                                        onChange={e => setEditForm({ ...editForm, fedexPickupConfirmation: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        placeholder="Enter pickup confirmation"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Notes</label>
                                    <textarea
                                        value={editForm.notes}
                                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                        rows={2}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                                        placeholder="Optional notes"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <button onClick={() => setEditModal(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleUpdate} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Status Action Modal ─────────────────────────── */}
                {actionModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
                        <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-900">
                                    {actionModal.action === 'pause' && 'Pause Return'}
                                    {actionModal.action === 'resume' && 'Resume Return'}
                                    {actionModal.action === 'complete' && 'Mark as Completed'}
                                </h2>
                                <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3">
                                <p className="text-xs text-gray-700">
                                    Are you sure you want to <strong>{actionModal.action}</strong> return <strong>{tx.licensePlate}</strong>?
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <button onClick={() => setActionModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleStatusAction} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processing...</> : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Delete Return Modal ─────────────────────────── */}
                {deleteModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(false)}>
                        <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-900">Delete Return</h2>
                                <button onClick={() => setDeleteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3">
                                <p className="text-xs text-gray-700">
                                    Are you sure you want to delete return <strong>{tx.licensePlate}</strong>? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <button onClick={() => setDeleteModal(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleDelete} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Edit Item Modal ─────────────────────────────── */}
                {editItemModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditItemModal(null)}>
                        <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-900">Edit Item — {editItemModal.ndc}</h2>
                                <button onClick={() => setEditItemModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3 space-y-2.5">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Pkg Size</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editItemForm.fullPackageSize}
                                            onChange={e => setEditItemForm({ ...editItemForm, fullPackageSize: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            placeholder="e.g. 60"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Qty Returned</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editItemForm.fullPackageQtyReturned}
                                            onChange={e => setEditItemForm({ ...editItemForm, fullPackageQtyReturned: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            placeholder="e.g. 45"
                                        />
                                    </div>
                                </div>
                                {isEditPolicyChecking && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Checking policy...
                                    </div>
                                )}
                                {editPolicyCheck && (
                                    <div className={`flex items-start gap-1.5 text-xs rounded px-2.5 py-1.5 border ${
                                        editPolicyCheck.status === 'returnable' ? 'bg-green-50 border-green-200 text-green-800' :
                                        editPolicyCheck.status === 'non_returnable' ? 'bg-red-50 border-red-200 text-red-800' :
                                        'bg-yellow-50 border-yellow-200 text-yellow-800'
                                    }`}>
                                        {editPolicyCheck.status === 'returnable' ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> :
                                         editPolicyCheck.status === 'non_returnable' ? <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> :
                                         <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                                        <div>
                                            <span className="font-semibold">{editPolicyCheck.manufacturerName ? `${editPolicyCheck.manufacturerName}: ` : 'Policy: '}</span>
                                            {editPolicyCheck.status === 'returnable' && 'Returnable — status & destination updated.'}
                                            {editPolicyCheck.status === 'non_returnable' && `Non-Returnable${editPolicyCheck.reason ? ` — ${editPolicyCheck.reason.replace(/_/g, ' ')}` : ''}`}
                                            {editPolicyCheck.status === 'tbd' && 'No policy found — set status manually.'}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editItemForm.standardPrice}
                                        onChange={e => setEditItemForm({ ...editItemForm, standardPrice: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Return Status</label>
                                    <select
                                        value={editItemForm.returnStatus}
                                        onChange={e => setEditItemForm({ ...editItemForm, returnStatus: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    >
                                        <option value="tbd">TBD</option>
                                        <option value="returnable">Returnable</option>
                                        <option value="non_returnable">Non-Returnable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Destination</label>
                                    <select
                                        value={editItemForm.destination}
                                        onChange={e => setEditItemForm({ ...editItemForm, destination: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    >
                                        <option value="">— Select Destination —</option>
                                        {reverseDistributors.map(rd => (
                                            <option key={rd.id} value={rd.name}>{rd.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Memo</label>
                                    <textarea
                                        value={editItemForm.memo}
                                        onChange={e => setEditItemForm({ ...editItemForm, memo: e.target.value })}
                                        rows={2}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                                        placeholder="Optional memo"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <button onClick={() => setEditItemModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleUpdateItem} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Delete Item Modal ───────────────────────────── */}
                {deleteItemModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteItemModal(null)}>
                        <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-900">Delete Item</h2>
                                <button onClick={() => setDeleteItemModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3">
                                <p className="text-xs text-gray-700">
                                    Are you sure you want to delete <strong>{deleteItemModal.proprietaryName || deleteItemModal.genericName || deleteItemModal.ndc}</strong>
                                    {deleteItemModal.lotNumber && <> (Lot: <span className="font-mono">{deleteItemModal.lotNumber}</span>)</>}? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <button onClick={() => setDeleteItemModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleDeleteItem} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Finalize Return Modal ──────────────────── */}
                {finalizeModal && tx && (
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setFinalizeModal(false)}>
                        <div className="bg-white rounded-lg max-w-xl w-full shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-red-600" /> Finalize Return — {tx.licensePlate}
                                </h2>
                                <button onClick={() => setFinalizeModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 flex-1 overflow-y-auto space-y-3">

                                {/* TBD blocker */}
                                {hasTbdItems && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-red-800">
                                                {items.filter(item => item.returnStatus === 'tbd').length} item{items.filter(item => item.returnStatus === 'tbd').length !== 1 ? 's' : ''} still have TBD status
                                            </p>
                                            <p className="text-xs text-red-700 mt-0.5">
                                                Resolve all TBD items before finalizing.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ── Step 1: Print Itemized Return ── */}
                                <div className={`border rounded-lg p-4 transition-all ${finalizeStepsDone.printManifest ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.printManifest ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                            {finalizeStepsDone.printManifest ? <CheckCircle className="w-4 h-4" /> : '1'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold ${finalizeStepsDone.printManifest ? 'text-green-800' : 'text-gray-800'}`}>
                                                Print Itemized Return
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">Print the full list of all items included in this return.</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <button
                                                    onClick={() => {
                                                        printHtml('manifest-html', 'manifest');
                                                        updateFinalizeSteps({ printManifest: true });
                                                    }}
                                                    disabled={pdfLoading === 'manifest'}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {pdfLoading === 'manifest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                                    Print
                                                </button>
                                                {finalizeStepsDone.printManifest && (
                                                    <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Done
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Step 2: Enter FedEx Tracking ── */}
                                <div className={`border rounded-lg p-4 transition-all ${!finalizeStepsDone.printManifest ? 'opacity-50 pointer-events-none' : ''} ${finalizeStepsDone.fedexEntered ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.fedexEntered ? 'bg-green-500 text-white' : finalizeStepsDone.printManifest ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                            {finalizeStepsDone.fedexEntered ? <CheckCircle className="w-4 h-4" /> : '2'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold ${finalizeStepsDone.fedexEntered ? 'text-green-800' : 'text-gray-800'}`}>
                                                FedEx / USPS Shipping
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">Create a shipment via FedEx API or enter tracking info manually.</p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <button
                                                    onClick={() => { setFedexMode('api'); setFedexSubModal(true); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                                                >
                                                    <Truck className="w-3.5 h-3.5" />
                                                    {finalizeStepsDone.fedexEntered ? 'Edit Shipment' : 'Create FedEx Shipment'}
                                                </button>
                                                <button
                                                    onClick={() => { setFedexMode('manual'); setFedexSubModal(true); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors border border-gray-300"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                    Enter Manually
                                                </button>
                                                {finalizeStepsDone.fedexEntered && (
                                                    <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Done
                                                    </span>
                                                )}
                                            </div>
                                            {finalizeStepsDone.fedexEntered && (finalizeForm.fedexTracking.trim() || tx.fedexTracking) && (
                                                <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                                                    <p><span className="font-medium">Tracking:</span> <span className="font-mono">{fedexForm.prpNumber || finalizeForm.fedexTracking || tx.fedexTracking || '—'}</span></p>
                                                    <p><span className="font-medium">Boxes:</span> {finalizeForm.boxCount || tx.boxCount || '—'}</p>
                                                    {fedexForm.packages.filter((p: string) => p.trim()).length > 0 && (
                                                        <p><span className="font-medium">Packages:</span> {fedexForm.packages.filter((p: string) => p.trim()).length} tracking number(s)</p>
                                                    )}
                                                    {tx.fedexPickupConfirmation && (
                                                        <p><span className="font-medium">Pickup:</span> <span className="font-mono">{tx.fedexPickupConfirmation}</span></p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Step 3: Print Job Sheets ── */}
                                <div className={`border rounded-lg p-4 transition-all ${!finalizeStepsDone.fedexEntered ? 'opacity-50 pointer-events-none' : ''} ${finalizeStepsDone.printJobSheets ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.printJobSheets ? 'bg-green-500 text-white' : finalizeStepsDone.fedexEntered ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                            {finalizeStepsDone.printJobSheets ? <CheckCircle className="w-4 h-4" /> : '3'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold ${finalizeStepsDone.printJobSheets ? 'text-green-800' : 'text-gray-800'}`}>
                                                Print Job Sheets
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">Print job sheets for all outgoing boxes.</p>
                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                <button
                                                    onClick={() => {
                                                        printJobSheet();
                                                        updateFinalizeSteps({ printJobSheets: true });
                                                    }}
                                                    disabled={pdfLoading === 'job-sheet'}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {pdfLoading === 'job-sheet' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                                    Print Job Sheet
                                                </button>
                                                
                                                {hasCiiItems && (
                                                    <button
                                                        onClick={() => {
                                                            downloadPdf('dea-form-222', `dea-form-222-${tx.licensePlate}.pdf`);
                                                            updateFinalizeSteps({ printJobSheets: true });
                                                        }}
                                                        disabled={pdfLoading === 'dea-form-222'}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                                    >
                                                        {pdfLoading === 'dea-form-222' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                                        Print DEA Form 222
                                                    </button>
                                                )}
                                                
                                                {finalizeStepsDone.printJobSheets && (
                                                    <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Done
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Step 4: Finalize Return ── */}
                                <div className={`border-2 rounded-lg p-4 transition-all ${!finalizeStepsDone.printJobSheets ? 'opacity-50 pointer-events-none' : ''} ${canFinalize ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${canFinalize ? 'bg-green-500 text-white' : finalizeStepsDone.printJobSheets ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                                            {canFinalize ? <CheckCircle className="w-4 h-4" /> : '4'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold ${canFinalize ? 'text-green-800' : 'text-gray-400'}`}>
                                                Finalize Return
                                            </p>
                                            <p className={`text-xs mt-0.5 ${canFinalize ? 'text-green-700' : 'text-gray-400'}`}>
                                                Lock this return permanently. This cannot be undone.
                                            </p>
                                            {!allStepsDone && (
                                                <p className="text-xs text-gray-400 mt-1">Complete steps 1 – 3 above to enable finalization.</p>
                                            )}
                                            {allStepsDone && (
                                                <div className="mt-3">
                                                    {hasTbdItems && (
                                                        <div className="bg-red-50 border border-red-200 rounded-md p-2 flex items-start gap-1.5 mb-3">
                                                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                            <p className="text-xs text-red-700">
                                                                Resolve all TBD items before finalizing.
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 flex items-start gap-1.5 mb-3">
                                                        <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                        <p className="text-xs text-yellow-800">
                                                            Once finalized, items and shipping details can no longer be edited.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={handleFinalize}
                                                        disabled={isActionLoading || !canFinalize}
                                                        className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    >
                                                        {isActionLoading
                                                            ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Finalizing...</>
                                                            : <><Lock className="w-4 h-4 mr-1" />Finalize Return</>
                                                        }
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
                                <button
                                    onClick={() => setFinalizeModal(false)}
                                    className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── FedEx / USPS Tracking Sub-Modal ─────────── */}
                {fedexSubModal && (
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={() => { if (!fedexApiLoading && !pickupLoading) setFedexSubModal(false); }}>
                        <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div className={`p-4 rounded-t-lg ${fedexMode === 'api' ? 'bg-blue-600' : 'bg-amber-400'}`}>
                                <h2 className={`text-center text-lg font-bold ${fedexMode === 'api' ? 'text-white' : 'text-gray-900'}`}>
                                    {fedexMode === 'api' ? 'FedEx API Shipment' : 'FedEX or USPS Info'} — <span className="underline font-mono">{tx?.licensePlate}</span>
                                </h2>
                            </div>

                            <div className="p-5 flex-1 overflow-y-auto space-y-4">

                                {/* ── API Mode ── */}
                                {fedexMode === 'api' && (
                                    <>
                                        {!fedexApiResult ? (
                                            <>
                                                <p className="text-sm text-gray-600 text-center">
                                                    Create a FedEx Ground shipment via the FedEx API. Tracking numbers and shipping labels will be generated automatically.
                                                </p>

                                                <div className="flex items-center justify-center gap-4">
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700">Number of Boxes:</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="99"
                                                            value={fedexForm.boxCount}
                                                            onChange={e => setFedexForm(prev => ({ ...prev, boxCount: e.target.value }))}
                                                            className="ml-2 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                            disabled={fedexApiLoading}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800 text-center space-y-1">
                                                    <p>The shipment will be created as <strong>FedEx Ground</strong> from the pharmacy address to the warehouse.</p>
                                                    <p>Make sure both pharmacy and warehouse addresses are configured correctly.</p>
                                                </div>

                                                <div className="flex justify-center">
                                                    <button
                                                        onClick={() => createFedexShipment(parseInt(fedexForm.boxCount) || 1)}
                                                        disabled={fedexApiLoading || !fedexForm.boxCount}
                                                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                                                    >
                                                        {fedexApiLoading ? (
                                                            <><Loader2 className="w-4 h-4 animate-spin" /> Creating Shipment...</>
                                                        ) : (
                                                            <><Truck className="w-4 h-4" /> Create FedEx Shipment</>
                                                        )}
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* API Result */}
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                        <p className="text-sm font-semibold text-green-800">Shipment Created Successfully</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <span className="text-gray-500">Master Tracking:</span>
                                                            <span className="ml-1 font-mono font-medium text-gray-900">{fedexApiResult.masterTrackingNumber}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Packages:</span>
                                                            <span className="ml-1 font-medium text-gray-900">{fedexApiResult.packages.length}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Package Tracking Numbers */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium text-gray-700">Package Tracking Numbers:</p>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={printShippingLabels}
                                                                disabled={pdfLoading === 'shipping-labels'}
                                                                className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-xs text-green-700 rounded border border-green-200 transition-colors disabled:opacity-50"
                                                                title="Print all shipping labels"
                                                            >
                                                                {pdfLoading === 'shipping-labels' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />} Print Labels
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {fedexApiResult.packages.map((pkg, i) => (
                                                            <div key={i} className="flex items-center justify-between text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-500">Package {i + 1}:</span>
                                                                    <span className="font-mono text-gray-900">{pkg.trackingNumber}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => printSingleLabel(i + 1)}
                                                                        disabled={pdfLoading === `shipping-label-${i + 1}`}
                                                                        className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 transition-colors disabled:opacity-50"
                                                                        title={`Print shipping label for ${pkg.trackingNumber}`}
                                                                    >
                                                                        {pdfLoading === `shipping-label-${i + 1}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                                    </button>

                                                                    {pkg.hasLabel && (
                                                                        <a
                                                                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/return-transactions/${tx?.id}/labels/${i + 1}/download`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-blue-600 hover:text-blue-800"
                                                                            title="Download Label"
                                                                        >
                                                                            <Download className="w-3.5 h-3.5" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Download All Labels */}
                                                {fedexApiResult.packages.some(p => p.hasLabel) && (
                                                    <div className="flex justify-center">
                                                        <a
                                                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/return-transactions/${tx?.id}/labels?packageNumber=1`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md border border-gray-300 transition-colors"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                            Download Labels
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Schedule Pickup */}
                                                <div className="border-t border-gray-200 pt-4 space-y-3">
                                                    <p className="text-sm font-medium text-gray-700">Schedule FedEx Pickup (Optional)</p>
                                                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
                                                        <p className="text-xs text-amber-800">
                                                            <strong>Note:</strong> Pickup scheduling may not work in sandbox/test mode. 
                                                            You can also call FedEx directly at <strong>1-800-463-3339</strong> and say "Ground Return Pickup".
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        <div>
                                                            <label className="text-xs text-gray-500">Pickup Date</label>
                                                            <input
                                                                type="date"
                                                                value={pickupForm.pickupDate}
                                                                onChange={e => setPickupForm(prev => ({ ...prev, pickupDate: e.target.value }))}
                                                                className="block w-36 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                disabled={pickupLoading}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Ready Time</label>
                                                            <input
                                                                type="time"
                                                                value={pickupForm.readyTime}
                                                                onChange={e => setPickupForm(prev => ({ ...prev, readyTime: e.target.value }))}
                                                                className="block w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                disabled={pickupLoading}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Close Time</label>
                                                            <input
                                                                type="time"
                                                                value={pickupForm.closeTime}
                                                                onChange={e => setPickupForm(prev => ({ ...prev, closeTime: e.target.value }))}
                                                                className="block w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                disabled={pickupLoading}
                                                            />
                                                        </div>
                                                        <div className="flex items-end">
                                                            <button
                                                                onClick={scheduleFedexPickup}
                                                                disabled={pickupLoading}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-medium rounded-md transition-colors"
                                                            >
                                                                {pickupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                                                                Schedule Pickup
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {/* ── Manual Mode ── */}
                                {fedexMode === 'manual' && (
                                    <>
                                        {/* Number of Boxes */}
                                        <div className="text-center">
                                            <label className="text-sm font-medium text-gray-700">Number of Boxes on this Return:</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="99"
                                                value={fedexForm.boxCount}
                                                onChange={e => setFedexForm(prev => ({ ...prev, boxCount: e.target.value }))}
                                                className="ml-2 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                                            />
                                        </div>

                                        {/* Instructions */}
                                        <div className="text-center text-xs text-gray-600 space-y-1">
                                            <p>For FedEX Call <strong>1-(800) 463-3339</strong> and say "Ground Return Pickup"</p>
                                            <p>Once you have the Fed EX PRP Number Enter Below, Then Scan Tracking BarCodes Into "Package Fields"</p>
                                            <p>If This Is A USPS Shipment Enter "USPS" In the PRP Field, Then Scan Tracking BarCodes Into "Package Fields"</p>
                                        </div>

                                        {/* PRP Number */}
                                        <div className="text-center">
                                            <label className="text-sm font-medium text-gray-700">PRP Number:</label>
                                            <input
                                                type="text"
                                                value={fedexForm.prpNumber}
                                                onChange={e => setFedexForm(prev => ({ ...prev, prpNumber: e.target.value }))}
                                                placeholder="Enter PRP Number or USPS"
                                                className="ml-2 w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                            />
                                        </div>

                                        <div className="border-t-2 border-amber-400" />

                                        {/* Package Tracking Fields */}
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                            {fedexForm.packages.map((val, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <label className="text-sm text-gray-700 w-24 text-right flex-shrink-0">Package {i + 1}:</label>
                                                    <input
                                                        type="text"
                                                        value={val}
                                                        onChange={e => {
                                                            const updated = [...fedexForm.packages];
                                                            updated[i] = e.target.value;
                                                            setFedexForm(prev => ({ ...prev, packages: updated }));
                                                        }}
                                                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-100">
                                {fedexMode === 'manual' ? (
                                    <button
                                        onClick={() => {
                                            const tracking = fedexForm.prpNumber.trim();
                                            setFinalizeForm(prev => ({
                                                ...prev,
                                                fedexTracking: tracking,
                                                boxCount: fedexForm.boxCount,
                                            }));
                                            if (tracking.length > 0) updateFinalizeSteps({ fedexEntered: true });
                                            setFedexSubModal(false);
                                        }}
                                        className="px-4 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                                    >
                                        Save Tracking Info
                                    </button>
                                ) : (
                                    <div></div>
                                )}
                                <button
                                    onClick={() => { if (!fedexApiLoading && !pickupLoading) setFedexSubModal(false); }}
                                    disabled={fedexApiLoading || pickupLoading}
                                    className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    {fedexApiLoading || pickupLoading ? 'Processing...' : 'Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
