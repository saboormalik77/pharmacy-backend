'use client';

import Link from 'next/link';
import { Landmark, ChevronLeft, Clock } from 'lucide-react';

export default function GpoPaymentPage() {
    return (
        <div className="space-y-4">
            {/* Back link */}
            <Link
                href="/payout-hub"
                className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 transition-colors"
            >
                <ChevronLeft className="w-3 h-3" /> Back to Payout Management
            </Link>

            {/* Coming Soon card */}
            <div
                className="flex flex-col items-center justify-center py-20 border rounded-[4px] shadow-sm"
                style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            >
                <div className="p-4 rounded-full mb-4" style={{ backgroundColor: 'var(--tertiary-fixed)' }}>
                    <Landmark className="w-8 h-8" style={{ color: 'var(--tertiary)' }} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" style={{ color: 'var(--tertiary)' }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--tertiary)' }}>Coming Soon</span>
                </div>
                <h1 className="font-heading text-headline mb-1" style={{ color: 'var(--foreground)' }}>GPO Payment</h1>
                <p className="text-xs text-center max-w-xs leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                    Group Purchasing Organization payment allocations and settlements will be available here soon.
                </p>
            </div>
        </div>
    );
}
