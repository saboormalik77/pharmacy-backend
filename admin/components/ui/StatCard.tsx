'use client';

import { HelpCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
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
        <div className="bg-white rounded-[4px] shadow-sm px-4 py-3 border border-[#e2e2e2]">
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
                <div className="bg-[#f5f2f1] rounded-[4px] p-2">
                    <div className="text-[#516057]">{icon}</div>
                </div>
            </div>

            <div className="flex items-end justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-gray-900 truncate">
                        {isCurrency ? formatCurrency(value) : formatNumber(value)}
                    </p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {isPositive ? (
                            <span className="text-green-600 text-xs font-medium bg-green-50 px-1.5 py-0.5 rounded">
                                +{Math.abs(change)}%
                            </span>
                        ) : (
                            <span className="text-red-600 text-xs font-medium bg-red-50 px-1.5 py-0.5 rounded">
                                {Math.abs(change)}%
                            </span>
                        )}
                        <span className="text-gray-500 text-xs whitespace-nowrap">{changeLabel}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
