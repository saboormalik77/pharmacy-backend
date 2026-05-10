'use client';

import { useEffect, useState, useCallback } from 'react';
import { Building2, DollarSign, Package, Search, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';
import { PharmacyPerformanceResponse, GpoSummaryResponse } from '@/lib/types';

export default function PerformancePage() {
    // Pharmacy Performance state
    const [pharmData, setPharmData] = useState<PharmacyPerformanceResponse | null>(null);
    const [pharmLoading, setPharmLoading] = useState(true);
    const [pharmError, setPharmError] = useState<string | null>(null);
    const [pharmSearch, setPharmSearch] = useState('');
    const [pharmSort, setPharmSort] = useState('totalValue');
    const [pharmPage, setPharmPage] = useState(1);

    const fetchPharmacy = useCallback(async () => {
        setPharmLoading(true);
        setPharmError(null);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<any>('/admin/analytics/pharmacy-performance', true, {
                search: pharmSearch || undefined,
                sort_by: pharmSort,
                sort_dir: 'desc',
                page: pharmPage,
                limit: 10,
            });
            setPharmData({ data: response.data, overall: response.overall, pagination: response.pagination });
        } catch (err: any) {
            setPharmError(err?.message || 'Failed to load pharmacy performance');
        } finally {
            setPharmLoading(false);
        }
    }, [pharmSearch, pharmSort, pharmPage]);

    useEffect(() => { fetchPharmacy(); }, [fetchPharmacy]);

    const LoadingSkeleton = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                        <div className="h-8 bg-gray-200 rounded w-40" />
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6 h-80 animate-pulse" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Pharmacy Performance Section */}
            <div className="mb-4">
                <h1 className="text-xl font-semibold text-gray-900">Pharmacy Performance</h1>
                <p className="text-sm text-gray-600 mt-1">View detailed performance metrics for pharmacies</p>
            </div>
            <div>
                {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search pharmacy name..."
                                value={pharmSearch}
                                onChange={(e) => setPharmSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setPharmPage(1); fetchPharmacy(); } }}
                                className="w-full pl-10 pr-4 py-2.5 text-base border border-[#e2e2e2] rounded-[4px] bg-white"
                            />
                        </div>
                        <select
                            value={pharmSort}
                            onChange={(e) => { setPharmSort(e.target.value); setPharmPage(1); }}
                            className="text-base border border-[#e2e2e2] rounded-[4px] px-3 py-2.5 bg-white"
                        >
                            <option value="totalValue">Sort by Value</option>
                            <option value="returns">Sort by Returns</option>
                            <option value="avgValue">Sort by Avg Value</option>
                        </select>
                        <button
                            onClick={() => { setPharmPage(1); fetchPharmacy(); }}
                            className="px-5 py-2.5 text-base bg-[#516057] text-white rounded-[4px] hover:opacity-90"
                        >
                            Search
                        </button>
                    </div>

                    {pharmLoading ? <LoadingSkeleton /> : pharmError ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[4px] text-base">
                            {pharmError}
                            <button onClick={fetchPharmacy} className="ml-2 underline">Retry</button>
                        </div>
                    ) : pharmData ? (
                        <div className="space-y-6">
                            {/* Overall Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Pharmacies</p>
                                    <p className="text-base font-bold text-blue-600">{formatNumber(pharmData.overall?.totalPharmacies || 0)}</p>
                                </div>
                                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Returns</p>
                                    <p className="text-base font-bold text-gray-900">{formatNumber(pharmData.overall?.totalReturns || 0)}</p>
                                </div>
                                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Value</p>
                                    <p className="text-base font-bold text-green-600">{formatCurrency(pharmData.overall?.totalReturnableValue || 0)}</p>
                                </div>
                                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Items</p>
                                    <p className="text-base font-bold text-gray-900">{formatNumber(pharmData.overall?.totalItems || 0)}</p>
                                </div>
                                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Payout</p>
                                    <p className="text-base font-bold text-purple-600">{formatCurrency(pharmData.overall?.totalPayout || 0)}</p>
                                </div>
                            </div>

                            {/* Top Pharmacies Chart */}
                            {pharmData.data.length > 0 && (
                                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                                    <h2 className="text-base font-semibold text-gray-900 mb-4">Top Pharmacies by Value</h2>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={pharmData.data.slice(0, 8)} margin={{ top: 5, right: 5, left: -10, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="pharmacyName"
                                                    stroke="#6b7280"
                                                    style={{ fontSize: '11px' }}
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={80}
                                                />
                                                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                                                <Tooltip
                                                    formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value}
                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                                                />
                                                <Legend />
                                                <Bar dataKey="totalReturnableValue" fill="#3b82f6" name="Returnable Value" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="totalPayout" fill="#10b981" name="Payout" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Pharmacy Performance Table */}
                            <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                                <h2 className="text-base font-semibold text-gray-900 mb-4">Pharmacy Details</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border" style={{ borderColor: '#9ca3af' }}>
                                        <thead className="bg-[#f4f5f5] border-b" style={{ borderColor: '#9ca3af', borderBottomWidth: '1.5px' }}>
                                            <tr>
                                                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Pharmacy</th>
                                                {/* <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">GPO</th> */}
                                                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Returns</th>
                                                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Items</th>
                                                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Total Value</th>
                                                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Avg Value</th>
                                                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Payout</th>
                                                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Last Return</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: '#d1d5db' }}>
                                            {pharmData.data.map((item) => (
                                                <tr key={item.pharmacyId} className="hover:bg-[#e9ebec] transition-colors" style={{ borderColor: '#d1d5db' }}>
                                                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{item.pharmacyName}</td>
                                                    {/* <td className="px-3 py-3 text-sm text-gray-600">{item.gpoAffiliation || '—'}</td> */}
                                                    <td className="px-3 py-3 text-sm text-right">{formatNumber(item.totalReturns)}</td>
                                                    <td className="px-3 py-3 text-sm text-right">{formatNumber(item.totalItems)}</td>
                                                    <td className="px-3 py-3 text-sm text-right font-medium">{formatCurrency(item.totalReturnableValue)}</td>
                                                    <td className="px-3 py-3 text-sm text-right">{formatCurrency(item.avgReturnValue)}</td>
                                                    <td className="px-3 py-3 text-sm text-right text-green-600">{formatCurrency(item.totalPayout)}</td>
                                                    <td className="px-3 py-3 text-sm text-gray-600">
                                                        {item.lastReturnDate ? formatDate(item.lastReturnDate) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {pharmData.data.length === 0 && (
                                        <p className="text-center text-base text-gray-500 py-8">No pharmacy performance data found</p>
                                    )}
                                </div>

                                {/* Pagination */}
                                {pharmData.pagination && pharmData.pagination.totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                                        <p className="text-sm text-gray-500">
                                            Showing {((pharmData.pagination.page - 1) * 10) + 1}–{Math.min(pharmData.pagination.page * 10, pharmData.pagination.total)} of {pharmData.pagination.total}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPharmPage(Math.max(1, pharmPage - 1))}
                                                disabled={pharmPage <= 1}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ChevronLeft className="w-4 h-4" /> Previous
                                            </button>
                                            <span className="text-sm text-gray-600 tabular-nums">
                                                Page {pharmData.pagination.page} of {pharmData.pagination.totalPages}
                                            </span>
                                            <button
                                                onClick={() => setPharmPage(Math.min(pharmData.pagination.totalPages, pharmPage + 1))}
                                                disabled={pharmPage >= pharmData.pagination.totalPages}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Next <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
            </div>
        </div>
    );
}
