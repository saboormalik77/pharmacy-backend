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
        <div className="space-y-6 p-8">
            <div>
                <h1 className="text-lg font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Analytics & Reporting</h1>
                <p className="text-xs text-gray-500 mt-1">Comprehensive insights, reports, and performance metrics</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b overflow-x-auto pb-0">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap rounded-t-lg ${
                                isActive
                                    ? 'border-[#516057] text-[#516057] bg-[#f5f2f1]'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
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
