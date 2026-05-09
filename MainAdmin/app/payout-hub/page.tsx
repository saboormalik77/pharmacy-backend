'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import Link from 'next/link';
import {
    DollarSign,
    CircleDollarSign,
    ArrowRight,
} from 'lucide-react';

const payoutSections = [
    {
        href: '/pharmacy-payments',
        icon: DollarSign,
        label: 'Pharmacy Payments',
        description: 'Calculate and manage pharmacy payouts. Record payments, track payout status and history.',
        color: 'text-[var(--secondary)]',
        bg: 'bg-[var(--secondary-container)]',
        border: 'border-[color-mix(in_srgb,var(--secondary)_30%,var(--outline-variant))]',
        badge: null,
    },
    {
        href: '/warehouse/unpaid',
        icon: CircleDollarSign,
        label: 'Memos',
        description: 'Track debit memos from manufacturers. View unpaid and paid memos, record payments, and send payment reminders.',
        color: 'text-[var(--tertiary)]',
        bg: 'bg-[var(--tertiary-fixed)]',
        border: 'border-[color-mix(in_srgb,var(--tertiary)_30%,var(--outline-variant))]',
        badge: null,
    },
];

export default function PayoutHubPage() {
    return (
        <PermissionGate permission="payout_hub">
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="font-heading text-headline" style={{ color: 'var(--foreground)' }}>Payout Management</h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                    Manage pharmacy payouts and unpaid manufacturer memos.
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
                            className={`group flex flex-col gap-3 p-4 border ${section.border} rounded-[4px] hover:shadow-md transition-all duration-150`}
                            style={{ backgroundColor: 'var(--surface-container-lowest)' }}
                        >
                            {/* Icon + label + badge */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-2 rounded-[4px] ${section.bg}`}>
                                        <Icon className={`w-4 h-4 ${section.color}`} />
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{section.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {section.badge && (
                                        <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border" style={{ backgroundColor: 'var(--primary-fixed)', color: 'var(--primary)', borderColor: 'var(--outline-variant)' }}>
                                            {section.badge}
                                        </span>
                                    )}
                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-all" style={{ color: 'var(--outline)' }} />
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
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
