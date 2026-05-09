'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, CheckCircle, Lock, Truck, Edit, FileText, Download, AlertTriangle, Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchReturnTransactionById,
    finalizeReturnTransaction,
    createFedexShipment,
    scheduleFedexPickup,
    updateFinalizeSteps,
    clearCurrentTransaction,
} from '@/lib/store/returnTransactionsSlice';

export default function FinalizeReturnPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const dispatch = useAppDispatch();
    
    const { currentTransaction: tx, isLoading, isActionLoading } = useAppSelector(
        (state) => state.returnTransactions
    );
    const { items } = useAppSelector((state) => state.returnTransactions);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const [finalizeForm, setFinalizeForm] = useState({ fedexTracking: '', boxCount: '' });
    const [pdfLoading, setPdfLoading] = useState<string | null>(null);
    const defaultSteps = { printManifest: false, fedexEntered: false, printJobSheets: false };
    const [optimisticSteps, setOptimisticSteps] = useState<Partial<typeof defaultSteps>>({});
    const serverSteps = tx?.finalizeSteps ?? defaultSteps;
    const finalizeStepsDone = { ...serverSteps, ...optimisticSteps };

    // FedEx/USPS tracking sub-modal state
    const [fedexSubModal, setFedexSubModal] = useState(false);
    const [fedexMode, setFedexMode] = useState<'choose' | 'api' | 'manual'>('choose');
    const [fedexApiLoading, setFedexApiLoading] = useState(false);
    const [fedexApiResult, setFedexApiResult] = useState<{
        masterTrackingNumber: string;
        shipmentId: string;
        packages: { trackingNumber: string; hasLabel: boolean }[];
    } | null>(null);
    const [fedexForm, setFedexForm] = useState({
        boxCount: '',
        prpNumber: '',
        packages: Array(12).fill('') as string[],
    });
    const [pickupForm, setPickupForm] = useState({
        readyTime: '09:00',
        closeTime: '17:00',
        pickupDate: new Date().toISOString().split('T')[0],
    });
    const [pickupLoading, setPickupLoading] = useState(false);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const tid = Date.now().toString();
        setToasts(prev => [...prev, { id: tid, message, type }]);
    };
    const removeToast = (tid: string) => setToasts(prev => prev.filter(t => t.id !== tid));

    useEffect(() => {
        if (id) dispatch(fetchReturnTransactionById(id));
        return () => { dispatch(clearCurrentTransaction()); };
    }, [dispatch, id]);

    // Clear optimistic updates when server data changes
    useEffect(() => {
        if (tx?.finalizeSteps) {
            setOptimisticSteps({});
        }
    }, [tx?.finalizeSteps]);

    useEffect(() => {
        if (tx) {
            setFinalizeForm({ fedexTracking: tx.fedexTracking || '', boxCount: tx.boxCount ? String(tx.boxCount) : '' });
            setFedexForm(prev => ({
                ...prev,
                boxCount: tx.boxCount ? String(tx.boxCount) : '1',
                prpNumber: tx.fedexTracking || '',
            }));
        }
    }, [tx]);

    const markStep = (step: Partial<typeof defaultSteps>, showFeedback = false) => {
        if (!id) return;
        setOptimisticSteps(prev => ({ ...prev, ...step }));
        dispatch(updateFinalizeSteps({ id, steps: step }));
        if (showFeedback) {
            showToast('Step completed!', 'success');
        }
    };

    // NOTE: TBD items check removed - handled by warehouse verification
    // const tbdItems = items.filter((i) => i.returnStatus === 'tbd');
    // const hasTbdItems = tbdItems.length > 0;
    const hasCiiItems = items.some((i) => i.deaForm222Required);

    const allStepsDone = finalizeStepsDone.printManifest && finalizeStepsDone.fedexEntered && finalizeStepsDone.printJobSheets;
    const canFinalize = allStepsDone;

    // ── Document / Print helpers ─────────────────────────────
    const printHtml = async (endpoint: string, docType: string) => {
        if (!tx) return;
        setPdfLoading(docType);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/return-transactions/${encodeURIComponent(id)}/${endpoint}`, {
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

            // Auto-mark step as complete when printing is successful
            if (docType === 'manifest') {
                markStep({ printManifest: true });
            } else if (docType === 'job-sheet') {
                markStep({ printJobSheets: true });
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
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/return-transactions/${encodeURIComponent(id)}/job-sheet`, {
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

            // Auto-mark step as complete when printing is successful
            markStep({ printJobSheets: true });
        } catch (err) {
            showToast((err as Error).message || 'Failed to print job sheet', 'error');
        } finally {
            setPdfLoading(null);
        }
    };

    const downloadPdf = async (endpoint: string, filename: string) => {
        if (!tx) return;
        setPdfLoading(endpoint);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/return-transactions/${encodeURIComponent(id)}/${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Download failed' }));
                throw new Error(err.message || 'Download failed');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e: any) {
            showToast(e.message || 'Failed to download document', 'error');
        } finally {
            setPdfLoading(null);
        }
    };

    const printShippingLabels = async () => {
        if (!tx) return;
        setPdfLoading('shipping-labels');
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/return-transactions/${encodeURIComponent(id)}/shipping-labels`, {
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
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/return-transactions/${encodeURIComponent(id)}/shipping-label/${packageNum}`, {
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

    const handleFinalize = async () => {
        if (!tx) return;
        const fedexTracking = finalizeForm.fedexTracking.trim();
        const boxCount = finalizeForm.boxCount ? parseInt(finalizeForm.boxCount) : undefined;

        const packageTracking: Record<number, string> = {};
        fedexForm.packages.forEach((pkg, i) => {
            if (pkg && pkg.trim()) packageTracking[i + 1] = pkg.trim();
        });

        const result = await dispatch(finalizeReturnTransaction({
            id: tx.id,
            fedexTracking,
            boxCount,
            packageTracking,
        }));

        if (finalizeReturnTransaction.fulfilled.match(result)) {
            showToast(`Return ${tx.licensePlate} finalized successfully!`);
            setTimeout(() => router.replace(`/warehouse/returns/${id}`), 1500);
        } else {
            showToast(result.payload as string || 'Failed to finalize return', 'error');
        }
    };

    if (isLoading || !tx) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-1.5 rounded-[4px] transition-colors"
                    style={{ 
                        color: 'var(--primary-action)',
                        backgroundColor: 'transparent'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-50)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1">
                    <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--primary-brand)', fontFamily: 'var(--font-newsreader), serif' }}>
                        <Lock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                        Finalize Return — {tx.licensePlate}
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Complete all steps below to finalize this return</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-3">

                {/* Progress Bar */}
                <div className="bg-white rounded-[4px] shadow px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold" style={{ color: 'var(--primary-brand)' }}>Progress</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--primary-action)' }}>
                            {[finalizeStepsDone.printManifest, finalizeStepsDone.fedexEntered, finalizeStepsDone.printJobSheets].filter(Boolean).length} / 3 steps completed
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-container-low)' }}>
                            <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                    width: `${([finalizeStepsDone.printManifest, finalizeStepsDone.fedexEntered, finalizeStepsDone.printJobSheets].filter(Boolean).length / 3) * 100}%`,
                                    background: 'linear-gradient(to right, var(--primary-action), var(--accent))'
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex justify-between mt-3">
                        <div className={`flex items-center gap-1.5 text-xs font-semibold`} style={{ color: finalizeStepsDone.printManifest ? 'var(--primary-action)' : 'var(--on-surface-variant)' }}>
                            {finalizeStepsDone.printManifest ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />}
                            Print Manifest
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-semibold`} style={{ color: finalizeStepsDone.fedexEntered ? 'var(--primary-action)' : 'var(--on-surface-variant)' }}>
                            {finalizeStepsDone.fedexEntered ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />}
                            FedEx/USPS
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-semibold`} style={{ color: finalizeStepsDone.printJobSheets ? 'var(--primary-action)' : 'var(--on-surface-variant)' }}>
                            {finalizeStepsDone.printJobSheets ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />}
                            Job Sheets
                        </div>
                    </div>
                </div>

                    {/* NOTE: TBD blocker removed - TBD items handled by warehouse verification */}

                {/* ── Step 1: Print Itemized Return ── */}
                <div className={`bg-white rounded-[4px] shadow px-4 py-3 transition-all border-l-4`} style={{ borderLeftColor: finalizeStepsDone.printManifest ? 'var(--primary-action)' : 'var(--accent)' }}>
                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white`} style={{ backgroundColor: finalizeStepsDone.printManifest ? 'var(--primary-action)' : 'var(--accent)' }}>
                                {finalizeStepsDone.printManifest ? <CheckCircle className="w-4 h-4" /> : '1'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold`} style={{ color: finalizeStepsDone.printManifest ? 'var(--primary-action)' : 'var(--primary-brand)' }}>
                                    Print Itemized Return
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Print the full list of all items included in this return.</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <button
                                        onClick={() => printHtml('manifest-html', 'manifest')}
                                        disabled={pdfLoading === 'manifest'}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                        style={{ backgroundColor: 'var(--primary-action)' }}
                                        onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-600)')}
                                        onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-action)')}
                                    >
                                        {pdfLoading === 'manifest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                        Print Manifest
                                    </button>
                                    {finalizeStepsDone.printManifest && (
                                        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--primary-action)' }}>
                                            <CheckCircle className="w-3.5 h-3.5" /> Completed
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                {/* ── Step 2: Enter FedEx Tracking ── */}
                <div className={`bg-white rounded-[4px] shadow px-4 py-3 transition-all border-l-4 ${!finalizeStepsDone.printManifest ? 'opacity-50 pointer-events-none' : ''}`} style={{ borderLeftColor: finalizeStepsDone.fedexEntered ? 'var(--primary-action)' : (finalizeStepsDone.printManifest ? 'var(--accent)' : 'var(--border)') }}>
                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm`} style={{ 
                                backgroundColor: finalizeStepsDone.fedexEntered ? 'var(--primary-action)' : (finalizeStepsDone.printManifest ? 'var(--accent)' : 'var(--surface-container-low)'),
                                color: finalizeStepsDone.fedexEntered || finalizeStepsDone.printManifest ? 'white' : 'var(--on-surface-variant)'
                            }}>
                                {finalizeStepsDone.fedexEntered ? <CheckCircle className="w-4 h-4" /> : '2'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold`} style={{ color: finalizeStepsDone.fedexEntered ? 'var(--primary-action)' : 'var(--primary-brand)' }}>
                                    FedEx / USPS Shipping
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Create a shipment via FedEx API or enter tracking info manually.</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <button
                                        onClick={() => { setFedexMode('api'); setFedexSubModal(true); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors"
                                        style={{ backgroundColor: 'var(--primary-action)' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-600)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--primary-action)'}
                                    >
                                        <Truck className="w-3.5 h-3.5" />
                                        {finalizeStepsDone.fedexEntered ? 'Edit Shipment' : 'Create FedEx Shipment'}
                                    </button>
                                    <button
                                        onClick={() => { setFedexMode('manual'); setFedexSubModal(true); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors border"
                                        style={{ 
                                            backgroundColor: 'var(--surface-container-low)', 
                                            color: 'var(--primary-brand)',
                                            borderColor: 'var(--border)'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-container)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--surface-container-low)'}
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        Enter Manually
                                    </button>
                                    {finalizeStepsDone.fedexEntered && (
                                        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--primary-action)' }}>
                                            <CheckCircle className="w-3.5 h-3.5" /> Completed
                                        </span>
                                    )}
                                </div>
                                {finalizeStepsDone.fedexEntered && (finalizeForm.fedexTracking.trim() || tx.fedexTracking) && (
                                    <div className="mt-2 p-2 rounded-[4px] border text-xs space-y-0.5" style={{ 
                                        backgroundColor: 'var(--secondary-container)', 
                                        borderColor: 'var(--primary-200)',
                                        color: 'var(--primary-action)'
                                    }}>
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
                <div className={`bg-white rounded-[4px] shadow px-4 py-3 transition-all border-l-4 ${!finalizeStepsDone.fedexEntered ? 'opacity-50 pointer-events-none' : ''}`} style={{ borderLeftColor: finalizeStepsDone.printJobSheets ? 'var(--primary-action)' : (finalizeStepsDone.fedexEntered ? 'var(--accent)' : 'var(--border)') }}>
                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm`} style={{ 
                                backgroundColor: finalizeStepsDone.printJobSheets ? 'var(--primary-action)' : (finalizeStepsDone.fedexEntered ? 'var(--accent)' : 'var(--surface-container-low)'),
                                color: finalizeStepsDone.printJobSheets || finalizeStepsDone.fedexEntered ? 'white' : 'var(--on-surface-variant)'
                            }}>
                                {finalizeStepsDone.printJobSheets ? <CheckCircle className="w-4 h-4" /> : '3'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold`} style={{ color: finalizeStepsDone.printJobSheets ? 'var(--primary-action)' : 'var(--primary-brand)' }}>
                                    Print Job Sheets
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Print job sheets for all outgoing boxes.</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <button
                                        onClick={() => printJobSheet()}
                                        disabled={pdfLoading === 'job-sheet'}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                        style={{ backgroundColor: 'var(--primary-action)' }}
                                        onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-600)')}
                                        onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-action)')}
                                    >
                                        {pdfLoading === 'job-sheet' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                        Print Job Sheet
                                    </button>
                                    
                                    {hasCiiItems && (
                                        <button
                                            onClick={() => downloadPdf('dea-form-222', `dea-form-222-${tx.licensePlate}.pdf`)}
                                            disabled={pdfLoading === 'dea-form-222'}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                            style={{ backgroundColor: 'var(--tertiary)' }}
                                            onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#9d8054')}
                                            onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--tertiary)')}
                                        >
                                            {pdfLoading === 'dea-form-222' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                            Print DEA Form 222
                                        </button>
                                    )}
                                    
                                    {finalizeStepsDone.printJobSheets && (
                                        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--primary-action)' }}>
                                            <CheckCircle className="w-3.5 h-3.5" /> Completed
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                {/* ── Step 4: Finalize Return ── */}
                <div className={`bg-white rounded-[4px] shadow px-4 py-3 transition-all border-l-4 ${!finalizeStepsDone.printJobSheets ? 'opacity-50 pointer-events-none' : ''} ${canFinalize ? '' : 'border-dashed'}`} style={{ borderLeftColor: canFinalize ? 'var(--primary-action)' : 'var(--border)' }}>
                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm`} style={{ 
                                backgroundColor: canFinalize ? 'var(--primary-action)' : (finalizeStepsDone.printJobSheets ? 'var(--accent)' : 'var(--surface-container-low)'),
                                color: canFinalize || finalizeStepsDone.printJobSheets ? 'white' : 'var(--on-surface-variant)'
                            }}>
                                {canFinalize ? <CheckCircle className="w-4 h-4" /> : '4'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold`} style={{ color: canFinalize ? 'var(--primary-action)' : 'var(--on-surface-variant)' }}>
                                    Finalize Return
                                </p>
                                <p className={`text-xs mt-0.5`} style={{ color: canFinalize ? 'var(--primary-action)' : 'var(--on-surface-variant)' }}>
                                    Lock this return permanently. This cannot be undone.
                                </p>
                                {!allStepsDone && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>Complete steps 1 – 3 above to enable finalization.</p>
                                )}
                                {allStepsDone && (
                                    <div className="mt-3">
                                        {/* NOTE: TBD items warning removed - handled by warehouse verification */}
                                        <div className="rounded-[4px] p-2 flex items-start gap-1.5 mb-3 border" style={{ 
                                            backgroundColor: 'var(--tertiary-fixed)', 
                                            borderColor: 'var(--tertiary)',
                                            color: 'var(--primary-brand)'
                                        }}>
                                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--tertiary)' }} />
                                            <p className="text-xs">
                                                Once finalized, items and shipping details can no longer be edited.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleFinalize}
                                            disabled={isActionLoading || !canFinalize}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                            style={{ backgroundColor: 'var(--danger)' }}
                                            onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#b91c1c')}
                                            onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--danger)')}
                                        >
                                            {isActionLoading ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" />Finalizing...</>
                                            ) : (
                                                <><Lock className="w-4 h-4" />Finalize Return</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

            {/* ── FedEx / USPS Tracking Sub-Modal ─────────── */}
            {fedexSubModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={() => { if (!fedexApiLoading && !pickupLoading) setFedexSubModal(false); }}>
                    <div className="bg-white rounded-[4px] max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className={`p-4 rounded-t-lg`} style={{ backgroundColor: fedexMode === 'api' ? 'var(--primary-action)' : 'var(--accent)' }}>
                            <h2 className={`text-center text-lg font-bold text-white`} style={{ fontFamily: 'var(--font-newsreader), serif' }}>
                                {fedexMode === 'api' ? 'FedEx API Shipment' : 'FedEX or USPS Info'} — <span className="underline font-mono">{tx.licensePlate}</span>
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
                                                        className="ml-2 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                        disabled={fedexApiLoading}
                                                    />
                                                </div>
                                            </div>

                                            <div className="border rounded-[4px] p-3 text-xs text-center space-y-1" style={{ 
                                                backgroundColor: 'var(--secondary-container)', 
                                                borderColor: 'var(--primary-200)',
                                                color: 'var(--primary-action)'
                                            }}>
                                                <p>The shipment will be created as <strong>FedEx Ground</strong> from the pharmacy address to the warehouse.</p>
                                                <p>Make sure both pharmacy and warehouse addresses are configured correctly.</p>
                                            </div>

                                            <div className="flex justify-center">
                                                <button
                                                    onClick={async () => {
                                                        if (!tx) return;
                                                        setFedexApiLoading(true);
                                                        try {
                                                            const result = await dispatch(createFedexShipment({
                                                                id: tx.id,
                                                                boxCount: parseInt(fedexForm.boxCount) || 1,
                                                            }));
                                                            if (createFedexShipment.fulfilled.match(result)) {
                                                                const shipment = result.payload.shipment;
                                                                setFedexApiResult(shipment);
                                                                const updatedPkgs = [...fedexForm.packages];
                                                                shipment.packages.forEach((p, i) => {
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
                                                                showToast(result.payload as string || 'Failed to create shipment', 'error');
                                                            }
                                                        } catch {
                                                            showToast('Unexpected error creating shipment', 'error');
                                                        } finally {
                                                            setFedexApiLoading(false);
                                                        }
                                                    }}
                                                    disabled={fedexApiLoading || !fedexForm.boxCount}
                                                    className="flex items-center gap-2 px-6 py-2.5 text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                                    style={{ backgroundColor: 'var(--primary-action)' }}
                                                    onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-600)')}
                                                    onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-action)')}
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
                                            <div className="border rounded-[4px] p-4 space-y-3" style={{ 
                                                backgroundColor: 'var(--secondary-container)', 
                                                borderColor: 'var(--primary-action)',
                                                color: 'var(--primary-action)'
                                            }}>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
                                                    <p className="text-sm font-semibold" style={{ color: 'var(--primary-action)' }}>Shipment Created Successfully</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span style={{ color: 'var(--on-surface-variant)' }}>Master Tracking:</span>
                                                        <span className="ml-1 font-mono font-medium" style={{ color: 'var(--primary-brand)' }}>{fedexApiResult.masterTrackingNumber}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--on-surface-variant)' }}>Packages:</span>
                                                        <span className="ml-1 font-medium" style={{ color: 'var(--primary-brand)' }}>{fedexApiResult.packages.length}</span>
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
                                                            <Printer className="w-3 h-3" /> Print Labels
                                                        </button>

                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {fedexApiResult.packages.map((pkg, i) => (
                                                        <div key={i} className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span style={{ color: 'var(--on-surface-variant)' }}>Package {i + 1}:</span>
                                                                <span className="font-mono" style={{ color: 'var(--primary-brand)' }}>{pkg.trackingNumber}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => printSingleLabel(i + 1)}
                                                                    disabled={pdfLoading === `shipping-label-${i + 1}`}
                                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors disabled:opacity-50"
                                                                    style={{ 
                                                                        backgroundColor: 'var(--secondary-container)', 
                                                                        borderColor: 'var(--primary-action)',
                                                                        color: 'var(--primary-action)'
                                                                    }}
                                                                    onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-50)')}
                                                                    onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--secondary-container)')}
                                                                    title={`Print shipping label for ${pkg.trackingNumber}`}
                                                                >
                                                                    {pdfLoading === `shipping-label-${i + 1}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                                </button>

                                                                {pkg.hasLabel && (
                                                                    <a
                                                                        href={`${process.env.NEXT_PUBLIC_API_URL}/return-transactions/${tx.id}/labels/${i + 1}/download`}
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
                                                        href={`${process.env.NEXT_PUBLIC_API_URL}/return-transactions/${tx.id}/labels?packageNumber=1`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-[4px] border transition-colors"
                                                        style={{ 
                                                            backgroundColor: 'var(--surface-container-low)', 
                                                            color: 'var(--primary-brand)',
                                                            borderColor: 'var(--border)'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-container)'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--surface-container-low)'}
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                        Download Labels
                                                    </a>
                                                </div>
                                            )}

                                            {/* Schedule Pickup */}
                                            <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
                                                <p className="text-sm font-medium" style={{ color: 'var(--primary-brand)' }}>Schedule FedEx Pickup (Optional)</p>
                                                <div className="border rounded-[4px] p-3 mb-3" style={{ 
                                                    backgroundColor: 'var(--tertiary-fixed)', 
                                                    borderColor: 'var(--tertiary)',
                                                    color: 'var(--primary-brand)'
                                                }}>
                                                    <p className="text-xs">
                                                        <strong>Note:</strong> Pickup scheduling may not work in sandbox/test mode. 
                                                        You can also call FedEx directly at <strong>1-800-463-3339</strong> and say &quot;Ground Return Pickup&quot;.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div>
                                                        <label className="text-xs text-gray-500">Pickup Date</label>
                                                        <input
                                                            type="date"
                                                            value={pickupForm.pickupDate}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, pickupDate: e.target.value }))}
                                                            className="block w-36 px-2 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">Ready Time</label>
                                                        <input
                                                            type="time"
                                                            value={pickupForm.readyTime}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, readyTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">Close Time</label>
                                                        <input
                                                            type="time"
                                                            value={pickupForm.closeTime}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, closeTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <button
                                                            onClick={async () => {
                                                                setPickupLoading(true);
                                                                try {
                                                                    const result = await dispatch(scheduleFedexPickup({
                                                                        id: tx.id,
                                                                        ...pickupForm,
                                                                    }));
                                                                    if (scheduleFedexPickup.fulfilled.match(result)) {
                                                                        showToast(`Pickup scheduled: ${result.payload.pickup.pickupConfirmationNumber}`, 'success');
                                                                    } else {
                                                                        showToast(result.payload as string || 'Failed to schedule pickup', 'error');
                                                                    }
                                                                } catch {
                                                                    showToast('Unexpected error scheduling pickup', 'error');
                                                                } finally {
                                                                    setPickupLoading(false);
                                                                }
                                                            }}
                                                            disabled={pickupLoading}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                                            style={{ backgroundColor: 'var(--primary-action)' }}
                                                            onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-600)')}
                                                            onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-action)')}
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
                                            className="ml-2 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                                        />
                                    </div>

                                    {/* Instructions */}
                                    <div className="text-center text-xs text-gray-600 space-y-1">
                                        <p>For FedEX Call <strong>1-(800) 463-3339</strong> and say &quot;Ground Return Pickup&quot;</p>
                                        <p>Once you have the Fed EX PRP Number Enter Below, Then Scan Tracking BarCodes Into &quot;Package Fields&quot;</p>
                                        <p>If This Is A USPS Shipment Enter &quot;USPS&quot; In the PRP Field, Then Scan Tracking BarCodes Into &quot;Package Fields&quot;</p>
                                    </div>

                                    {/* PRP Number */}
                                    <div className="text-center">
                                        <label className="text-sm font-medium text-gray-700">PRP Number:</label>
                                        <input
                                            type="text"
                                            value={fedexForm.prpNumber}
                                            onChange={e => setFedexForm(prev => ({ ...prev, prpNumber: e.target.value }))}
                                            placeholder="Enter PRP Number or USPS"
                                            className="ml-2 w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
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
                                                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center p-4 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-container-low)' }}>
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
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--primary-action)' }}
                                    onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-600)')}
                                    onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--primary-action)')}
                                >
                                    <Truck className="w-4 h-4" />
                                    Save FedEX or USPS Info
                                </button>
                            ) : (
                                <div />
                            )}
                            <button
                                onClick={() => setFedexSubModal(false)}
                                disabled={fedexApiLoading || pickupLoading}
                                className="px-4 py-2 border text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                style={{ 
                                    borderColor: 'var(--border)', 
                                    color: 'var(--primary-brand)', 
                                    backgroundColor: 'transparent' 
                                }}
                                onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--surface-container-low)')}
                                onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                                {fedexApiResult ? 'Close' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
