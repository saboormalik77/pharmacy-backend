'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Ban, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { useAppSelector } from '@/lib/store/hooks';

function PolicyDetail({ label, value, capitalize, highlight }: {
    label: string;
    value: string;
    capitalize?: boolean;
    highlight?: 'green' | 'red' | 'purple';
}) {
    const valueClass = highlight === 'green' ? 'text-green-700 font-semibold'
        : highlight === 'red' ? 'text-red-700 font-semibold'
        : highlight === 'purple' ? 'text-purple-700 font-semibold'
        : 'text-[var(--on-surface)]';
    
    return (
        <div className="text-sm">
            <p className="font-medium text-[var(--on-surface-variant)] mb-1">{label}</p>
            <p className={`${valueClass} ${capitalize ? 'capitalize' : ''}`}>{value}</p>
        </div>
    );
}

export default function PolicyPage() {
    const params = useParams();
    const router = useRouter();
    const returnId = params.id as string;
    
    const policyResult = typeof window !== 'undefined' 
        ? JSON.parse(sessionStorage.getItem('policyResult') || 'null')
        : null;

    const handleBack = () => {
        router.back();
    };

    if (!policyResult) {
        return (
            <div className="min-h-screen bg-[var(--surface-container-low)] p-4">
                <div className="max-w-2xl mx-auto">
                    <button 
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Verification
                    </button>
                    
                    <div className="bg-[var(--surface-container-lowest)] rounded-[4px] shadow p-8 text-center">
                        <p className="text-[var(--on-surface-variant)]">No policy data available</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--surface-container-low)] p-4">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <button 
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Verification
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="w-6 h-6 text-blue-600" />
                        <div>
                            <h1 className="font-heading text-headline text-[var(--on-surface)]">Manufacturer Return Policy</h1>
                            <p className="text-sm text-[var(--on-surface-variant)]">Policy details for this item</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--surface-container-lowest)] rounded-[4px] shadow">
                    <div className="p-6 space-y-6">
                        <div className={`flex items-center gap-3 rounded-[4px] px-4 py-3 ${
                            policyResult.status === 'returnable' ? 'bg-green-100 border border-green-300' :
                            policyResult.status === 'non_returnable' ? 'bg-red-100 border border-red-300' :
                            'bg-yellow-100 border border-yellow-300'
                        }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                policyResult.status === 'returnable' ? 'bg-green-200' :
                                policyResult.status === 'non_returnable' ? 'bg-red-200' : 'bg-yellow-200'
                            }`}>
                                {policyResult.status === 'returnable' ? <CheckCircle className="w-5 h-5 text-green-700" /> :
                                 policyResult.status === 'non_returnable' ? <Ban className="w-5 h-5 text-red-700" /> :
                                 <AlertTriangle className="w-5 h-5 text-yellow-700" />}
                            </div>
                            <div>
                                <p className={`text-lg font-bold ${
                                    policyResult.status === 'returnable' ? 'text-green-800' :
                                    policyResult.status === 'non_returnable' ? 'text-red-800' : 'text-yellow-800'
                                }`}>
                                    {policyResult.status === 'returnable' ? 'RETURNABLE' : 
                                     policyResult.status === 'non_returnable' ? 'NON-RETURNABLE' : 'TBD — No Policy Found'}
                                </p>
                                {policyResult.reason && (
                                    <p className="text-sm text-[var(--on-surface-variant)] mt-1 capitalize">
                                        {policyResult.reason.replace(/_/g, ' ')}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {policyResult.manufacturerName && <PolicyDetail label="Manufacturer" value={policyResult.manufacturerName} />}
                            {policyResult.destination && <PolicyDetail label="Destination" value={policyResult.destination} capitalize />}
                            {policyResult.windowStart && <PolicyDetail label="Window Start" value={policyResult.windowStart} />}
                            {policyResult.windowEnd && <PolicyDetail label="Window End" value={policyResult.windowEnd} />}
                            {policyResult.expectedReturnableDate && <PolicyDetail label="Returnable From" value={policyResult.expectedReturnableDate} highlight="purple" />}
                            {policyResult.discountRate != null && <PolicyDetail label="Discount Rate" value={`${policyResult.discountRate}%`} />}
                            {policyResult.reimbursementType && <PolicyDetail label="Reimbursement" value={policyResult.reimbursementType} capitalize />}
                            {policyResult.partialsAccepted != null && <PolicyDetail label="Partials" value={policyResult.partialsAccepted ? 'Yes' : 'No'} highlight={policyResult.partialsAccepted ? 'green' : 'red'} />}
                            {policyResult.returnableWithinPolicyPeriod != null && (
                                <PolicyDetail
                                    label="Returnable in window"
                                    value={policyResult.returnableWithinPolicyPeriod ? 'Yes' : 'No'}
                                    highlight={policyResult.returnableWithinPolicyPeriod ? 'green' : 'red'}
                                />
                            )}
                            {policyResult.policyNumber != null && <PolicyDetail label="Policy #" value={String(policyResult.policyNumber)} />}
                            {policyResult.autoRaEmail && <PolicyDetail label="RA Email" value={policyResult.autoRaEmail} />}
                        </div>

                        {policyResult.policyDescription && (
                            <div>
                                <h3 className="text-sm font-medium text-[var(--on-surface)] mb-2">Policy Notes</h3>
                                <div className="bg-[var(--surface-container-low)] rounded-[4px] p-4 border" style={{ borderColor: 'var(--outline-variant)' }}>
                                    <p className="text-sm text-[var(--on-surface)] leading-relaxed">
                                        {policyResult.policyDescription}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t bg-[var(--surface-container-low)] px-6 py-4 rounded-b-lg">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-[var(--on-surface-variant)]">
                                Policy information is read-only and cannot be modified
                            </p>
                            <button 
                                onClick={handleBack}
                                className="px-4 py-2 text-sm font-medium bg-[var(--primary-container)] text-[var(--on-primary-container)] rounded-[4px] hover:bg-[var(--surface-container-high)] transition-colors"
                            >
                                Back to Verification
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}