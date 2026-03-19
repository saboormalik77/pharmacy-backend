'use client';

import Link from 'next/link';
import {
    PackageCheck,
    Layers,
    Receipt,
    MailCheck,
    ArrowRight,
} from 'lucide-react';

const warehouseSections = [
    {
        href: '/warehouse/receiving',
        icon: PackageCheck,
        label: 'Receiving',
        description: 'Scan and receive returned packages from pharmacies. Verify contents and log discrepancies.',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-100',
    },
    {
        href: '/warehouse/batches',
        icon: Layers,
        label: 'Batches',
        description: 'Create and manage monthly batches. Assign returns, close batches and submit to Cardinal.',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-100',
    },
    {
        href: '/warehouse/debit-memos',
        icon: Receipt,
        label: 'Debit Memos',
        description: 'View auto-generated debit memos per manufacturer. Track RA status and payment.',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-100',
    },
    {
        href: '/warehouse/ra-tracking',
        icon: MailCheck,
        label: 'RA Tracking',
        description: 'Manage return authorization requests. Track outbound shipments and RA receipts.',
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-100',
    },
];

export default function WarehouseHubPage() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-lg font-bold text-gray-900">Warehouse</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                    Manage the full return processing flow — from receiving to manufacturer payments.
                </p>
            </div>

            {/* Flow indicator */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
                {warehouseSections.map((section, idx) => (
                    <div key={section.href} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-[10px] font-medium text-gray-500">{section.label}</span>
                        {idx < warehouseSections.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                        )}
                    </div>
                ))}
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {warehouseSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <Link
                            key={section.href}
                            href={section.href}
                            className={`group flex flex-col gap-3 p-4 bg-white border ${section.border} rounded-lg hover:shadow-md transition-all duration-150 hover:border-opacity-60`}
                        >
                            {/* Icon + label */}
                            <div className="flex items-center justify-between">
                                <div className={`flex items-center gap-2.5`}>
                                    <div className={`p-2 rounded-lg ${section.bg}`}>
                                        <Icon className={`w-4 h-4 ${section.color}`} />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800">{section.label}</span>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
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
    );
}
