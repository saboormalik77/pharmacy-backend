'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Package, DollarSign, Building2, BarChart3 } from 'lucide-react';
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

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                            <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                            <div className="h-6 bg-gray-200 rounded w-32" />
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-lg shadow-md p-4 h-80 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                    <div className="h-64 bg-gray-100 rounded" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
                <button onClick={fetchData} className="ml-2 underline">Retry</button>
            </div>
        );
    }

    if (!data) return null;

    const { overall, byStatus, trend } = data;
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#6b7280'];

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Group by:</label>
                <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="text-xs border rounded px-2 py-1.5 bg-white"
                >
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="status">Status</option>
                    <option value="service_type">Service Type</option>
                </select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-600">Total Returns</p>
                        <Package className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(overall.totalReturns)}</p>
                    <p className="text-xs text-gray-500 mt-1">{overall.uniquePharmacies} pharmacies</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-600">Total Returnable Value</p>
                        <DollarSign className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(overall.totalReturnableValue)}</p>
                    <p className="text-xs text-gray-500 mt-1">Non-returnable: {formatCurrency(overall.totalNonReturnableValue)}</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-600">Average Return Value</p>
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(overall.avgReturnValue)}</p>
                    <p className="text-xs text-gray-500 mt-1">{overall.avgItemsPerReturn} avg items/return</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-600">Total Items</p>
                        <BarChart3 className="w-4 h-4 text-orange-500" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(overall.totalItems)}</p>
                    <p className="text-xs text-gray-500 mt-1">{overall.uniquePharmacies} unique pharmacies</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Trend Chart */}
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">Returns Trend</h2>
                    <div className="h-64">
                        {trend && trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trend} margin={{ top: 5, right: 5, left: -10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey={groupBy === 'service_type' ? 'serviceType' : (groupBy === 'status' ? 'status' : 'period')}
                                        stroke="#6b7280"
                                        style={{ fontSize: '10px' }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} width={45} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="returns" stroke="#3b82f6" strokeWidth={2} name="Returns" dot={{ fill: '#3b82f6', r: 3 }} />
                                    <Line type="monotone" dataKey="totalValue" stroke="#10b981" strokeWidth={2} name="Value" dot={{ fill: '#10b981', r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-xs text-gray-500">No trend data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">Returns by Status</h2>
                    <div className="h-64">
                        {byStatus && byStatus.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={byStatus.map(s => ({ name: s.status, value: s.count }))}
                                        cx="50%"
                                        cy="45%"
                                        outerRadius={70}
                                        labelLine={false}
                                        label={false}
                                        dataKey="value"
                                    >
                                        {byStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => typeof value === 'number' ? formatNumber(value) : value}
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-xs text-gray-500">No status data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Table */}
            {byStatus && byStatus.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">Status Breakdown</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {byStatus.map((row) => (
                                    <tr key={row.status} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-xs">
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[row.status] || '#6b7280' }} />
                                                {row.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-right font-medium">{formatNumber(row.count)}</td>
                                        <td className="px-3 py-2 text-xs text-right">{formatCurrency(row.totalReturnableValue)}</td>
                                        <td className="px-3 py-2 text-xs text-right">
                                            {overall.totalReturns > 0 ? ((row.count / overall.totalReturns) * 100).toFixed(1) : 0}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
