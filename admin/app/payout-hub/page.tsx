'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import Link from 'next/link';
import {
    DollarSign,
    CircleDollarSign,
    Landmark,
    ArrowRight,
} from 'lucide-react';

const payoutSections = [
    {
        href: '/pharmacy-payments',
        icon: DollarSign,
        label: 'Pharmacy Payments',
        description: 'Calculate and manage pharmacy payouts. Record payments, track payout status and history.',
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-100',
        badge: null,
    },
    {
        href: '/warehouse/unpaid',
        icon: CircleDollarSign,
        label: 'Memos',
        description: 'Track debit memos from manufacturers. View unpaid and paid memos, record payments, and send payment reminders.',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-100',
        badge: null,
    },
    {
        href: '/gpo-payment',
        icon: Landmark,
        label: 'GPO Payment',
        description: 'Manage Group Purchasing Organization payment allocations and settlements.',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-100',
        badge: 'Coming Soon',
    },
];

export default function PayoutHubPage() {
    return (
        <PermissionGate permission="payout_hub">
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-lg font-bold text-gray-900">Payout Management</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                    Manage pharmacy payouts, unpaid manufacturer memos, and GPO settlements.
                </p>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {payoutSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <Link
                            key={section.href}
                            href={section.href}
                            className={`group flex flex-col gap-3 p-4 bg-white border ${section.border} rounded-[4px] hover:shadow-md transition-all duration-150`}
                        >
                            {/* Icon + label + badge */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-2 rounded-[4px] ${section.bg}`}>
                                        <Icon className={`w-4 h-4 ${section.color}`} />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800">{section.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {section.badge && (
                                        <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">
                                            {section.badge}
                                        </span>
                                    )}
                                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-gray-500 leading-relaxed">
                                {section.description}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </div>
        </PermissionGate>
    );
}
