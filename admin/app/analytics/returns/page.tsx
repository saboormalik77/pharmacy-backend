'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Package, DollarSign, Building2, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from 'recharts';
import { ReturnsSummaryData } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b',
    in_progress: '#3b82f6',
    completed: '#10b981',
    finalized: '#8b5cf6',
    received: '#06b6d4',
    closed_out: '#6b7280',
    cancelled: '#ef4444',
};

export default function ReturnsPage() {
    const [data, setData] = useState<ReturnsSummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groupBy, setGroupBy] = useState('month');
    
    // Status Breakdown pagination
    const [statusCurrentPage, setStatusCurrentPage] = useState(1);
    const statusItemsPerPage = 10;

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<any>('/admin/analytics/returns-summary', true, {
                group_by: groupBy,
            });
            setData(response.data);
        } catch (err: any) {
            setError(err?.message || 'Failed to load returns summary');
        } finally {
            setLoading(false);
        }
    }, [groupBy]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Reset pagination when data changes
    useEffect(() => {
        setStatusCurrentPage(1);
    }, [data]);

if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                            <div className="h-8 bg-gray-200 rounded w-40" />
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6 h-80 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
                    <div className="h-72 bg-gray-100 rounded" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[4px]">
                {error}
                <button onClick={fetchData} className="ml-2 underline">Retry</button>
            </div>
        );
    }

    if (!data) return null;

    const { overall, byStatus, trend } = data;
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#6b7280'];

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500">Group by:</label>
                <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="text-sm border border-[#e2e2e2] rounded-[4px] px-3 py-2 bg-white"
                >
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="status">Status</option>
                    <option value="service_type">Service Type</option>
                </select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-sm text-gray-500">Total Returns</p>
                        <Package className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-base font-bold text-gray-900">{formatNumber(overall.totalReturns)}</p>
                    <p className="text-sm text-gray-500 mt-2">{overall.uniquePharmacies} pharmacies</p>
                </div>

                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-sm text-gray-500">Total Returnable Value</p>
                        <DollarSign className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-base font-bold text-gray-900">{formatCurrency(overall.totalReturnableValue)}</p>
                    <p className="text-sm text-gray-500 mt-2">Non-returnable: {formatCurrency(overall.totalNonReturnableValue)}</p>
                </div>

                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-sm text-gray-500">Average Return Value</p>
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-base font-bold text-gray-900">{formatCurrency(overall.avgReturnValue)}</p>
                    <p className="text-sm text-gray-500 mt-2">{overall.avgItemsPerReturn} avg items/return</p>
                </div>

                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-sm text-gray-500">Total Items</p>
                        <BarChart3 className="w-5 h-5 text-orange-500" />
                    </div>
                    <p className="text-base font-bold text-gray-900">{formatNumber(overall.totalItems)}</p>
                    <p className="text-sm text-gray-500 mt-2">{overall.uniquePharmacies} unique pharmacies</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend Chart */}
                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Returns Trend</h2>
                    <div className="h-72">
                        {trend && trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trend} margin={{ top: 5, right: 5, left: -10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey={groupBy === 'service_type' ? 'serviceType' : (groupBy === 'status' ? 'status' : 'period')}
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px' }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        style={{ fontSize: '12px' }}
                                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                                        width={50}
                                    />
                                    <Tooltip
                                        formatter={(value) => typeof value === 'number' ? formatNumber(value) : value}
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="returns"
                                        stroke="#516057"
                                        strokeWidth={2}
                                        dot={{ fill: '#516057', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-base text-gray-500">No data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Breakdown Chart */}
                <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Status Distribution</h2>
                    <div className="h-72">
                        {byStatus && byStatus.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={byStatus}
                                        cx="50%"
                                        cy="45%"
                                        labelLine={false}
                                        label={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count"
                                    >
                                        {byStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => typeof value === 'number' ? formatNumber(value) : value}
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-base text-gray-500">No status data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Table */}
            {byStatus && byStatus.length > 0 && (() => {
                // Sort by totalReturnableValue in descending order, then by count
                const sortedByStatus = [...byStatus].sort((a, b) => {
                    const valueA = a.totalReturnableValue || 0;
                    const valueB = b.totalReturnableValue || 0;
                    if (valueB !== valueA) return valueB - valueA; // Sort by value (descending)
                    return b.count - a.count; // Then by count (descending)
                });
                
                // Pagination logic for Status Breakdown
                const totalStatusPages = Math.ceil(sortedByStatus.length / statusItemsPerPage);
                const startIndex = (statusCurrentPage - 1) * statusItemsPerPage;
                const endIndex = startIndex + statusItemsPerPage;
                const paginatedStatuses = sortedByStatus.slice(startIndex, endIndex);
                const showStatusPagination = totalStatusPages > 1;
                
                return (
                    <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-gray-900">Status Breakdown</h2>
                            <p className="text-sm text-gray-500">{sortedByStatus.length} statuses</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border" style={{ borderColor: '#9ca3af' }}>
                                <thead className="bg-[#f4f5f5] border-b" style={{ borderColor: '#9ca3af', borderBottomWidth: '1.5px' }}>
                                    <tr>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Status</th>
                                        <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Count</th>
                                        <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Total Value</th>
                                        <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">% of Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: '#d1d5db' }}>
                                    {paginatedStatuses.map((row) => (
                                        <tr key={row.status} className="hover:bg-[#e9ebec] transition-colors" style={{ borderColor: '#d1d5db' }}>
                                            <td className="px-3 py-3 text-sm">
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[row.status] || '#6b7280' }} />
                                                    {row.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-right font-medium">{formatNumber(row.count)}</td>
                                            <td className="px-3 py-3 text-sm text-right">{formatCurrency(row.totalReturnableValue)}</td>
                                            <td className="px-3 py-3 text-sm text-right">
                                                {overall.totalReturns > 0 ? ((row.count / overall.totalReturns) * 100).toFixed(1) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {showStatusPagination && (
                            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-500">
                                    Showing {startIndex + 1}–{Math.min(endIndex, sortedByStatus.length)} of {sortedByStatus.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setStatusCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={statusCurrentPage === 1}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Previous
                                    </button>
                                    <span className="text-sm text-gray-600 tabular-nums">
                                        Page {statusCurrentPage} of {totalStatusPages}
                                    </span>
                                    <button
                                        onClick={() => setStatusCurrentPage(prev => Math.min(totalStatusPages, prev + 1))}
                                        disabled={statusCurrentPage === totalStatusPages}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
