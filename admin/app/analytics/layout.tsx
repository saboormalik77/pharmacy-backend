'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, TrendingUp, DollarSign, Package, Clock, Search, Building2 } from 'lucide-react';

const tabs = [
    { href: '/analytics', label: 'Overview', icon: BarChart3 },
    { href: '/analytics/returns', label: 'Returns', icon: TrendingUp },
    { href: '/analytics/financials', label: 'Financials', icon: DollarSign },
    // { href: '/analytics/inventory', label: 'Inventory', icon: Package },
    // { href: '/analytics/price-audit', label: 'Price Audit', icon: Search },
    { href: '/analytics/performance', label: 'Performance', icon: Building2 },
];

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
                <p className="text-gray-600 mt-1">Comprehensive insights, reports, and performance metrics</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 border-b overflow-x-auto pb-0">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                                isActive
                                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            {/* Page Content */}
            {children}
        </div>
    );
}
