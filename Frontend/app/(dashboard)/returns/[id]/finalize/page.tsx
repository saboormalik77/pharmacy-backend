'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, CheckCircle, Lock, Truck, Edit, FileText, AlertTriangle, Printer,
} from 'lucide-react';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { apiClient } from '@/lib/api/client';
import { getToken } from '@/lib/utils/cookies';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

// Types
interface ReturnTransaction {
    id: string;
    licensePlate: string;
    pharmacyName?: string;
    processorName?: string;
    status: string;
    fedexTracking?: string;
    fedexPickupConfirmation?: string;
    boxCount?: number;
    prpNumber?: string;
    packageTracking?: Record<string, string>;
    manifestGeneratedAt?: string;
    fedexShipmentId?: string;
    fedexLabels?: Record<string, string>;
}

interface ReturnTransactionItem {
    id: string;
    returnStatus: string;
    deaForm222Required?: boolean;
}

export default function FinalizeReturnPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [tx, setTx] = useState<ReturnTransaction | null>(null);
    const [items, setItems] = useState<ReturnTransactionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pdfLoading, setPdfLoading] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const [finalizeForm, setFinalizeForm] = useState({
        fedexTracking: '',
        boxCount: '',
    });

    const [finalizeStepsDone, setFinalizeStepsDone] = useState({
        printManifest: false,
        fedexEntered: false,
        printJobSheets: false,
    });

    const [fedexSubModal, setFedexSubModal] = useState(false);
    const [fedexMode, setFedexMode] = useState<'api' | 'manual'>('api');
    const [fedexApiLoading, setFedexApiLoading] = useState(false);
    const [fedexApiResult, setFedexApiResult] = useState<any>(null);
    const [pickupLoading, setPickupLoading] = useState(false);

    const [fedexForm, setFedexForm] = useState({
        boxCount: '',
        prpNumber: '',
        packages: Array(12).fill(''),
    });

    const [pickupForm, setPickupForm] = useState({
        date: '',
        readyTime: '10:00',
        closeTime: '17:00',
    });

    useEffect(() => {
        if (id) {
            fetchTransaction();
            fetchItems();
        }
    }, [id]);

    const fetchTransaction = async () => {
        try {
            const res = await apiClient.get(`/return-transactions/${id}`, {}, true);
            if (res.status === 'success' && res.data) {
                const transaction = res.data as ReturnTransaction;
                setTx(transaction);
                
                // Pre-populate forms
                setFinalizeForm({
                    fedexTracking: transaction.fedexTracking || '',
                    boxCount: transaction.boxCount ? String(transaction.boxCount) : '',
                });

                // Pre-populate FedEx form
                const pkgs = Array(12).fill('');
                if (transaction.packageTracking) {
                    Object.entries(transaction.packageTracking).forEach(([key, value]) => {
                        const match = key.match(/package(\d+)/);
                        if (match) {
                            const index = parseInt(match[1]) - 1;
                            if (index >= 0 && index < 12) pkgs[index] = value;
                        }
                    });
                }
                setFedexForm({
                    boxCount: transaction.boxCount ? String(transaction.boxCount) : '',
                    prpNumber: transaction.prpNumber || '',
                    packages: pkgs,
                });
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to fetch return', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchItems = async () => {
        try {
            const res = await apiClient.get(`/return-transactions/${id}/items`, {}, true);
            if (res.status === 'success' && res.data) {
                const data = res.data as any;
                setItems(data.items || []);
            }
        } catch (err: any) {
            console.error('Failed to fetch items:', err);
        }
    };

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const tid = Date.now().toString();
        setToasts(prev => [...prev, { id: tid, message, type }]);
    };

    const removeToast = (tid: string) => setToasts(prev => prev.filter(t => t.id !== tid));

    const markStep = async (step: Partial<typeof finalizeStepsDone>) => {
        if (!tx) return;
        try {
            await apiClient.patch(`/return-transactions/${tx.id}/finalize-steps`, { steps: step }, true);
            setFinalizeStepsDone(prev => ({ ...prev, ...step }));
        } catch (err: any) {
            showToast('Failed to update step', 'error');
        }
    };

    const printHtml = async (endpoint: string, loadingKey: string) => {
        if (!tx) return;
        setPdfLoading(loadingKey);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = getToken();
            const res = await fetch(`${baseUrl}/return-transactions/${id}/${endpoint}`, {
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
            
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                };
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (err) {
            showToast((err as Error).message || 'Failed to print document', 'error');
        } finally {
            setPdfLoading(null);
        }
    };

    const printJobSheet = async () => {
        if (!tx) return;
        setPdfLoading('job-sheet');
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = getToken();
            const res = await fetch(`${baseUrl}/return-transactions/${id}/job-sheet`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    Accept: 'text/html'
                },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Failed to fetch job sheet' }));
                throw new Error(err.message || 'Failed to fetch job sheet');
            }
            const htmlContent = await res.text();
            
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                };
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (err) {
            showToast((err as Error).message || 'Failed to print job sheet', 'error');
        } finally {
            setPdfLoading(null);
        }
    };

    const downloadPdf = async (endpoint: string, filename: string) => {
        setPdfLoading(endpoint);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = getToken();
            const response = await fetch(`${baseUrl}/return-transactions/${id}/${endpoint}`, {
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

    const printShippingLabels = async () => {
        if (!tx) return;
        setPdfLoading('shipping-labels');
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = getToken();
            const res = await fetch(`${baseUrl}/return-transactions/${id}/shipping-labels`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    Accept: 'text/html'
                },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Failed to fetch labels' }));
                throw new Error(err.message || 'Failed to fetch labels');
            }
            const htmlContent = await res.text();
            
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                };
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (err) {
            showToast((err as Error).message || 'Failed to print labels', 'error');
        } finally {
            setPdfLoading(null);
        }
    };

    const printSingleLabel = async (packageNum: number) => {
        if (!tx) return;
        setPdfLoading(`shipping-label-${packageNum}`);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = getToken();
            const res = await fetch(`${baseUrl}/return-transactions/${id}/shipping-label/${packageNum}`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    Accept: 'text/html'
                },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Failed to fetch label' }));
                throw new Error(err.message || 'Failed to fetch label');
            }
            const htmlContent = await res.text();
            
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                };
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (err) {
            showToast((err as Error).message || 'Failed to print label', 'error');
        } finally {
            setPdfLoading(null);
        }
    };

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
                
                markStep({ fedexEntered: true });
                showToast('FedEx shipment created successfully!', 'success');
            } else {
                throw new Error((res as any).message || 'Failed to create shipment');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to create FedEx shipment', 'error');
        } finally {
            setFedexApiLoading(false);
        }
    };

    const scheduleFedexPickup = async () => {
        if (!tx || !pickupForm.date) return;
        setPickupLoading(true);
        try {
            const res = await apiClient.post(`/return-transactions/${tx.id}/schedule-pickup`, {
                pickupDate: pickupForm.date,
                readyTime: pickupForm.readyTime,
                closeTime: pickupForm.closeTime,
            }, true);
            
            if (res.status === 'success') {
                showToast('Pickup scheduled successfully!', 'success');
                fetchTransaction();
            } else {
                throw new Error((res as any).message || 'Failed to schedule pickup');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to schedule pickup', 'error');
        } finally {
            setPickupLoading(false);
        }
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
                setTimeout(() => router.replace(`/returns/${id}`), 1500);
            } else {
                throw new Error((res as any).message || 'Failed to finalize return');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to finalize return', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    if (isLoading || !tx) {
        return (
        <DashboardLayout>
            <PermissionGuard permission="returns:view">
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            </PermissionGuard>
        </DashboardLayout>
        );
    }

    // NOTE: TBD items check removed - handled by warehouse verification
    // const tbdItems = items.filter(item => item.returnStatus === 'tbd');
    // const hasTbdItems = tbdItems.length > 0;
    const hasCiiItems = items.some(item => item.deaForm222Required);
    const allStepsDone = finalizeStepsDone.printManifest && finalizeStepsDone.fedexEntered && finalizeStepsDone.printJobSheets;
    const canFinalize = allStepsDone;

    return (
        <DashboardLayout>
            <PermissionGuard permission="returns:view">
                <div className="min-h-screen bg-gray-50">
                    <ToastContainer toasts={toasts} onClose={removeToast} />

                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                        <div className="max-w-5xl mx-auto px-4 py-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => router.back()}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                                </button>
                                <div className="flex-1">
                                    <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-red-600" />
                                        Finalize Return — {tx.licensePlate}
                                    </h1>
                                    <p className="text-xs text-gray-500 mt-0.5">Complete all steps below to finalize this return</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="max-w-5xl mx-auto px-4 py-4">
                        <div className="space-y-4">

                            {/* NOTE: TBD blocker removed - TBD items handled by warehouse verification */}

                            {/* ── Step 1: Print Itemized Return ── */}
                            <div className={`border rounded-lg p-4 transition-all ${finalizeStepsDone.printManifest ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-white'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.printManifest ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                        {finalizeStepsDone.printManifest ? <CheckCircle className="w-4 h-4" /> : '1'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold ${finalizeStepsDone.printManifest ? 'text-green-800' : 'text-gray-800'}`}>
                                            Print Itemized Return
                                        </p>
                                        <p className="text-xs text-gray-600 mt-0.5">Print the full list of all items included in this return.</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <button
                                                onClick={() => {
                                                    printHtml('manifest-html', 'manifest');
                                                    markStep({ printManifest: true });
                                                }}
                                                disabled={pdfLoading === 'manifest'}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                            >
                                                {pdfLoading === 'manifest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                                Print Manifest
                                            </button>
                                            {finalizeStepsDone.printManifest && (
                                                <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Completed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Step 2: Enter FedEx Tracking ── */}
                            <div className={`border rounded-lg p-4 transition-all ${!finalizeStepsDone.printManifest ? 'opacity-50 pointer-events-none' : ''} ${finalizeStepsDone.fedexEntered ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-white'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.fedexEntered ? 'bg-green-500 text-white' : finalizeStepsDone.printManifest ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                        {finalizeStepsDone.fedexEntered ? <CheckCircle className="w-4 h-4" /> : '2'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold ${finalizeStepsDone.fedexEntered ? 'text-green-800' : 'text-gray-800'}`}>
                                            FedEx / USPS Shipping
                                        </p>
                                        <p className="text-xs text-gray-600 mt-0.5">Create a shipment via FedEx API or enter tracking info manually.</p>
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
                                                <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Completed
                                                </span>
                                            )}
                                        </div>
                                        {finalizeStepsDone.fedexEntered && (finalizeForm.fedexTracking.trim() || tx.fedexTracking) && (
                                            <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200 text-xs text-gray-700 space-y-0.5">
                                                <p><span className="font-semibold">Tracking:</span> <span className="font-mono">{fedexForm.prpNumber || finalizeForm.fedexTracking || tx.fedexTracking || '—'}</span></p>
                                                <p><span className="font-semibold">Boxes:</span> {finalizeForm.boxCount || tx.boxCount || '—'}</p>
                                                {fedexForm.packages.filter((p: string) => p.trim()).length > 0 && (
                                                    <p><span className="font-semibold">Packages:</span> {fedexForm.packages.filter((p: string) => p.trim()).length} tracking number(s)</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Step 3: Print Job Sheets ── */}
                            <div className={`border rounded-lg p-4 transition-all ${!finalizeStepsDone.fedexEntered ? 'opacity-50 pointer-events-none' : ''} ${finalizeStepsDone.printJobSheets ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-white'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.printJobSheets ? 'bg-green-500 text-white' : finalizeStepsDone.fedexEntered ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                        {finalizeStepsDone.printJobSheets ? <CheckCircle className="w-4 h-4" /> : '3'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold ${finalizeStepsDone.printJobSheets ? 'text-green-800' : 'text-gray-800'}`}>
                                            Print Job Sheets
                                        </p>
                                        <p className="text-xs text-gray-600 mt-0.5">Print job sheets for all outgoing boxes.</p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <button
                                                onClick={() => {
                                                    printJobSheet();
                                                    markStep({ printJobSheets: true });
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
                                                        markStep({ printJobSheets: true });
                                                    }}
                                                    disabled={pdfLoading === 'dea-form-222'}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {pdfLoading === 'dea-form-222' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                                    Print DEA Form 222
                                                </button>
                                            )}
                                            
                                            {finalizeStepsDone.printJobSheets && (
                                                <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Completed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Step 4: Finalize Return ── */}
                            <div className={`border-2 rounded-lg p-4 transition-all ${!finalizeStepsDone.printJobSheets ? 'opacity-50 pointer-events-none' : ''} ${canFinalize ? 'border-green-300 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${canFinalize ? 'bg-green-500 text-white' : finalizeStepsDone.printJobSheets ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                                        {canFinalize ? <CheckCircle className="w-4 h-4" /> : '4'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold ${canFinalize ? 'text-green-800' : 'text-gray-500'}`}>
                                            Finalize Return
                                        </p>
                                        <p className={`text-xs mt-0.5 ${canFinalize ? 'text-green-700' : 'text-gray-500'}`}>
                                            Lock this return permanently. This cannot be undone.
                                        </p>
                                        {!allStepsDone && (
                                            <p className="text-xs text-gray-500 mt-1">Complete steps 1 – 3 above to enable finalization.</p>
                                        )}
                                        {allStepsDone && (
                                            <div className="mt-3">
                                                {/* NOTE: TBD items warning removed - handled by warehouse verification */}
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 flex items-start gap-1.5 mb-3">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-yellow-800">
                                                        Once finalized, items and shipping details can no longer be edited.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleFinalize}
                                                    disabled={isActionLoading || !canFinalize}
                                                    className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    </div>

                    {/* ── FedEx / USPS Tracking Sub-Modal ─────────── */}
                    {fedexSubModal && (
                        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={() => { if (!fedexApiLoading && !pickupLoading) setFedexSubModal(false); }}>
                            <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                                {/* Header */}
                                <div className={`p-4 rounded-t-lg ${fedexMode === 'api' ? 'bg-blue-600' : 'bg-amber-400'}`}>
                                    <h2 className={`text-center text-base font-bold ${fedexMode === 'api' ? 'text-white' : 'text-gray-900'}`}>
                                        {fedexMode === 'api' ? 'FedEx API Shipment' : 'FedEx or USPS Info'} — <span className="underline font-mono text-sm">{tx.licensePlate}</span>
                                    </h2>
                                </div>

                                <div className="p-4 flex-1 overflow-y-auto space-y-3">

                                    {/* API Mode */}
                                    {fedexMode === 'api' && (
                                        <>
                                            {!fedexApiResult ? (
                                                <>
                                                    <p className="text-xs text-gray-600 text-center">
                                                        Create a FedEx Ground shipment via the FedEx API. Tracking numbers and shipping labels will be generated automatically.
                                                    </p>

                                                    <div className="flex items-center justify-center gap-3">
                                                        <label className="text-xs font-medium text-gray-700">Number of Boxes:</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="99"
                                                            value={fedexForm.boxCount}
                                                            onChange={e => setFedexForm(prev => ({ ...prev, boxCount: e.target.value }))}
                                                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                            disabled={fedexApiLoading}
                                                        />
                                                    </div>

                                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-xs text-blue-800 text-center space-y-0.5">
                                                        <p>The shipment will be created as <strong>FedEx Ground</strong> from the pharmacy address to the warehouse.</p>
                                                        <p>Make sure both pharmacy and warehouse addresses are configured correctly.</p>
                                                    </div>

                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => createFedexShipment(parseInt(fedexForm.boxCount) || 1)}
                                                            disabled={fedexApiLoading || !fedexForm.boxCount}
                                                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-lg transition-colors"
                                                        >
                                                            {fedexApiLoading ? (
                                                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Shipment...</>
                                                            ) : (
                                                                <><Truck className="w-3.5 h-3.5" /> Create FedEx Shipment</>
                                                            )}
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                                            <p className="text-xs font-semibold text-green-800">Shipment Created Successfully</p>
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

                                                    <div className="space-y-2">
                                                        <p className="text-xs font-medium text-gray-700">Package Tracking Numbers:</p>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            {fedexApiResult.packages.map((pkg: any, idx: number) => (
                                                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                                                                    <span className="text-gray-600">Package {idx + 1}:</span>
                                                                    <span className="font-mono text-gray-900">{pkg.trackingNumber}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <p className="text-xs font-medium text-gray-700">Shipping Labels:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={printShippingLabels}
                                                                disabled={pdfLoading === 'shipping-labels'}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                                            >
                                                                {pdfLoading === 'shipping-labels' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                                Print All Labels
                                                            </button>
                                                            {fedexApiResult.packages.map((pkg: any, idx: number) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => printSingleLabel(idx + 1)}
                                                                    disabled={pdfLoading === `shipping-label-${idx + 1}`}
                                                                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded border border-gray-300 transition-colors disabled:opacity-50"
                                                                >
                                                                    {pdfLoading === `shipping-label-${idx + 1}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                                    Label {idx + 1}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Schedule Pickup */}
                                                    <div className="border-t border-gray-200 pt-3 space-y-2">
                                                        <p className="text-xs font-medium text-gray-700">Schedule FedEx Pickup (Optional):</p>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div>
                                                                <label className="text-xs text-gray-600">Pickup Date:</label>
                                                                <input
                                                                    type="date"
                                                                    value={pickupForm.date}
                                                                    onChange={e => setPickupForm(prev => ({ ...prev, date: e.target.value }))}
                                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    disabled={pickupLoading}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-600">Ready Time:</label>
                                                                <input
                                                                    type="time"
                                                                    value={pickupForm.readyTime}
                                                                    onChange={e => setPickupForm(prev => ({ ...prev, readyTime: e.target.value }))}
                                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    disabled={pickupLoading}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-600">Close Time:</label>
                                                                <input
                                                                    type="time"
                                                                    value={pickupForm.closeTime}
                                                                    onChange={e => setPickupForm(prev => ({ ...prev, closeTime: e.target.value }))}
                                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    disabled={pickupLoading}
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={scheduleFedexPickup}
                                                            disabled={pickupLoading || !pickupForm.date}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-medium rounded-md transition-colors"
                                                        >
                                                            {pickupLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Scheduling...</> : 'Schedule Pickup'}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {/* Manual Mode */}
                                    {fedexMode === 'manual' && (
                                        <>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700">PRP Number / Master Tracking:</label>
                                                    <input
                                                        type="text"
                                                        value={fedexForm.prpNumber}
                                                        onChange={e => setFedexForm(prev => ({ ...prev, prpNumber: e.target.value }))}
                                                        placeholder="Enter PRP tracking number"
                                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-medium text-gray-700">Number of Boxes:</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="99"
                                                        value={fedexForm.boxCount}
                                                        onChange={e => setFedexForm(prev => ({ ...prev, boxCount: e.target.value }))}
                                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Individual Package Tracking Numbers (Optional):</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {fedexForm.packages.slice(0, 12).map((pkg, idx) => (
                                                            <input
                                                                key={idx}
                                                                type="text"
                                                                value={pkg}
                                                                onChange={e => {
                                                                    const updated = [...fedexForm.packages];
                                                                    updated[idx] = e.target.value;
                                                                    setFedexForm(prev => ({ ...prev, packages: updated }));
                                                                }}
                                                                placeholder={`Package ${idx + 1}`}
                                                                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                </div>

                                {/* Footer */}
                                <div className="flex justify-between items-center p-3 border-t border-gray-200 bg-gray-50">
                                    {fedexMode === 'manual' ? (
                                        <button
                                            onClick={() => {
                                                const tracking = fedexForm.prpNumber.trim();
                                                setFinalizeForm(prev => ({
                                                    ...prev,
                                                    fedexTracking: tracking,
                                                    boxCount: fedexForm.boxCount,
                                                }));
                                                if (tracking.length > 0) markStep({ fedexEntered: true });
                                                setFedexSubModal(false);
                                            }}
                                            disabled={!fedexForm.prpNumber.trim()}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <Truck className="w-3.5 h-3.5" />
                                            Save FedEx or USPS Info
                                        </button>
                                    ) : (
                                        <div />
                                    )}
                                    <button
                                        onClick={() => setFedexSubModal(false)}
                                        disabled={fedexApiLoading || pickupLoading}
                                        className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        {fedexApiResult ? 'Close' : 'Cancel'}
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
