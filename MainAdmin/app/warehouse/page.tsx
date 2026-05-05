'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import Link from 'next/link';
import {
    PackageCheck,
    ClipboardCheck,
    Layers,
    Receipt,
    MailCheck,
    ArrowRight,
    Package,
    Archive,
    Ban,
    Clock,
} from 'lucide-react';

const warehouseSections = [
    {
        href: '/warehouse/receiving',
        icon: PackageCheck,
        label: 'Receiving',
        description: 'Scan and receive returned packages from pharmacies. Verify contents and log discrepancies.',
        tone: { chipBg: 'var(--surface-container-low)', icon: 'var(--primary)' },
    },
    {
        href: '/warehouse/verification',
        icon: ClipboardCheck,
        label: 'Verification',
        description: 'Verify received returns item-by-item. Check conditions, report damaged or missing items, track surplus.',
        tone: { chipBg: 'var(--surface-container-low)', icon: 'var(--secondary)' },
    },
    // {
    //     href: '/warehouse/surplus',
    //     icon: Archive,
    //     label: 'Surplus Inventory',
    //     description: 'View and manage surplus items found during verification. Track storage locations and status.',
    //     color: 'text-cyan-600',
    //     bg: 'bg-cyan-50',
    //     border: 'border-cyan-100',
    // },
    {
        href: '/warehouse/batches',
        icon: Layers,
        label: 'Batches',
        description: 'Create and manage monthly batches. Assign returns, close batches and submit to Cardinal.',
        tone: { chipBg: 'var(--surface-container-low)', icon: 'var(--tertiary)' },
    },
    {
        href: '/warehouse/debit-memos',
        icon: Receipt,
        label: 'Debit Memos',
        description: 'View auto-generated debit memos per reverse distributor. Track RA status and payment.',
        tone: { chipBg: 'var(--surface-container-low)', icon: 'var(--tertiary)' },
    },
    {
        href: '/warehouse/ra-tracking',
        icon: MailCheck,
        label: 'RA Tracking',
        description: 'Manage return authorization requests. Track outbound shipments and RA receipts.',
        tone: { chipBg: 'var(--surface-container-low)', icon: 'var(--secondary)' },
    },
    {
        href: '/warehouse/wine-cellar',
        icon: Archive,
        label: 'Wine Cellar',
        description: 'Products stored for future return processing. Monitor shelved items and ready-to-return inventory.',
        tone: { chipBg: 'var(--surface-container-low)', icon: 'var(--primary)' },
    },
    {
        href: '/warehouse/tbd-items',
        icon: Clock,
        label: 'TBD Items',
        description: 'Items pending disposition decisions. Review and resolve items awaiting classification.',
        tone: { chipBg: 'var(--surface-container-low)', icon: 'var(--tertiary)' },
    },
    {
        href: '/warehouse/destruction',
        icon: Ban,
        label: 'Destruction',
        description: 'Items scheduled for destruction. Track destruction records and compliance documentation.',
        tone: { chipBg: 'var(--error-container)', icon: 'var(--error)' },
    },
];

export default function WarehouseHubPage() {
    return (
        <PermissionGate permission="warehouse">
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Warehouse</h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                    Manage the full return processing flow — from receiving to manufacturer payments.
                </p>
            </div>

            {/* Flow indicator */}
            <div
                className="flex items-center gap-1.5 px-3 py-2 border rounded-lg overflow-x-auto"
                style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}
            >
                {warehouseSections.map((section, idx) => (
                    <div key={section.href} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-[10px] font-medium" style={{ color: 'var(--on-surface-variant)' }}>{section.label}</span>
                        {idx < warehouseSections.length - 1 && (
                            <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--outline-variant)' }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {warehouseSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <Link
                            key={section.href}
                            href={section.href}
                            className="group flex flex-col gap-3 p-4 border rounded-lg hover:shadow-md transition-all duration-150"
                            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                        >
                            {/* Icon + label */}
                            <div className="flex items-center justify-between">
                                <div className={`flex items-center gap-2.5`}>
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: section.tone.chipBg }}>
                                        <Icon className="w-4 h-4" style={{ color: section.tone.icon }} />
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{section.label}</span>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-all" style={{ color: 'var(--outline)' }} />
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
