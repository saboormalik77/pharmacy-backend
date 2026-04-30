'use client';

import { ArrowUpIcon, ArrowDownIcon, HelpCircle } from 'lucide-react';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import { useState } from 'react';

interface StatCardProps {
    title: string;
    value: number;
    change: number;
    icon: React.ReactNode;
    tooltip: string;
    isCurrency?: boolean;
    changeLabel?: string;
}

export function StatCard({ title, value, change, icon, tooltip, isCurrency = false, changeLabel = 'vs last month' }: StatCardProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const isPositive = change >= 0;

    return (
        <div className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-medium text-gray-500">{title}</h3>
                    <div className="relative">
                        <button
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <HelpCircle className="w-3 h-3" />
                        </button>
                        {showTooltip && (
                            <div className="absolute left-0 top-5 z-10 w-40 sm:w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                                {tooltip}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-[#1e293b]">{icon}</div>
            </div>

            <div className="flex items-end justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-gray-900 truncate">
                        {isCurrency ? formatCurrency(value) : formatNumber(value)}
                    </p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {isPositive ? (
                            <ArrowUpIcon className="w-3 h-3 text-green-600 flex-shrink-0" />
                        ) : (
                            <ArrowDownIcon className="w-3 h-3 text-red-600 flex-shrink-0" />
                        )}
                        <span className={cn(
                            'text-xs font-medium',
                            isPositive ? 'text-green-600' : 'text-red-600'
                        )}>
                            {Math.abs(change)}%
                        </span>
                        <span className="text-gray-500 text-xs whitespace-nowrap">{changeLabel}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
