'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, TrendingUp, TrendingDown, Hash, Database } from 'lucide-react';
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils';
import { PriceAuditResponse } from '@/lib/types';

export default function PriceAuditPage() {
    const [data, setData] = useState<PriceAuditResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [page, setPage] = useState(1);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<any>('/admin/analytics/price-audit', true, {
                search: searchQuery || undefined,
                source: sourceFilter || undefined,
                page,
                limit: 25,
            });
            setData({ data: response.data, summary: response.summary, pagination: response.pagination });
        } catch (err: any) {
            setError(err?.message || 'Failed to load price audit data');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, sourceFilter, page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-[4px] shadow-md p-4 animate-pulse">
                            <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                            <div className="h-6 bg-gray-200 rounded w-32" />
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-[4px] shadow-md p-4 h-80 animate-pulse" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
                <button onClick={fetchData} className="ml-2 underline">Retry</button>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search NDC or source..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchData(); } }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border rounded bg-white"
                    />
                </div>
                <select
                    value={sourceFilter}
                    onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
                    className="text-xs border rounded px-2 py-1.5 bg-white"
                >
                    <option value="">All Sources</option>
                    <option value="manual">Manual</option>
                    <option value="import">Import</option>
                    <option value="api">API</option>
                </select>
                <button
                    onClick={() => { setPage(1); fetchData(); }}
                    className="px-3 py-1.5 text-xs bg-[#1d2222] text-white rounded hover:bg-[#3d4343]"
                >
                    Search
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-[4px] shadow-md p-3">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-600">Total Changes</p>
                        <Database className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-base font-bold">{formatNumber(data.summary?.totalChanges || 0)}</p>
                </div>
                <div className="bg-white rounded-[4px] shadow-md p-3">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-600">Unique NDCs</p>
                        <Hash className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-base font-bold text-purple-600">{formatNumber(data.summary?.uniqueNdcs || 0)}</p>
                </div>
                <div className="bg-white rounded-[4px] shadow-md p-3">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-600">Unique Sources</p>
                        <Database className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-base font-bold text-green-600">{formatNumber(data.summary?.uniqueSources || 0)}</p>
                </div>
                <div className="bg-white rounded-[4px] shadow-md p-3">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-600">Avg Price Change</p>
                        {(data.summary?.avgPriceIncrease || 0) >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-green-500" />
                        )}
                    </div>
                    <p className={`text-base font-bold ${(data.summary?.avgPriceIncrease || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {data.summary?.avgPriceIncrease || 0}%
                    </p>
                </div>
            </div>

            {/* Price Audit Table */}
            <div className="bg-white rounded-[4px] shadow-md p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Price Change History</h2>
                <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                            <tr>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">NDC</th>
                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Old Price</th>
                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">New Price</th>
                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Change</th>
                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Change %</th>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Source</th>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.data.map((item, idx) => (
                                <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50`}>
                                    <td className="px-4 py-3 text-sm font-mono font-medium">{item.ndc}</td>
                                    <td className="px-4 py-3 text-sm text-right">
                                        {item.oldPrice != null ? formatCurrency(item.oldPrice) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.newPrice)}</td>
                                    <td className="px-4 py-3 text-sm text-right">
                                        {item.priceChange != null ? (
                                            <span className={item.priceChange > 0 ? 'text-red-600' : item.priceChange < 0 ? 'text-green-600' : ''}>
                                                {item.priceChange > 0 ? '+' : ''}{formatCurrency(item.priceChange)}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right">
                                        {item.changePercent != null ? (
                                            <span className={`font-medium ${item.changePercent > 0 ? 'text-red-600' : item.changePercent < 0 ? 'text-green-600' : ''}`}>
                                                {item.changePercent > 0 ? '+' : ''}{item.changePercent}%
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                                            {item.priceSource || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {item.changedAt ? formatDateTime(item.changedAt) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.data.length === 0 && (
                        <p className="text-center text-xs text-gray-500 py-6">No price changes found</p>
                    )}
                </div>

                {/* Pagination */}
                {data.pagination && data.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <p className="text-xs text-gray-500">
                            Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                        </p>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page <= 1}
                                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
                                disabled={page >= data.pagination.totalPages}
                                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
