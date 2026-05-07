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
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-[4px] shadow-sm">
                <div className="p-4 bg-purple-50 rounded-full mb-4">
                    <Landmark className="w-8 h-8 text-purple-400" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-purple-400">Coming Soon</span>
                </div>
                <h1 className="text-lg font-bold text-gray-800 mb-1">GPO Payment</h1>
                <p className="text-xs text-gray-400 text-center max-w-xs leading-relaxed">
                    Group Purchasing Organization payment allocations and settlements will be available here soon.
                </p>
            </div>
        </div>
    );
}
