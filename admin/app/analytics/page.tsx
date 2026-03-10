'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Package, Building2, TrendingDown } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchAnalytics } from '@/lib/store/analyticsSlice';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0', '#00BCD4', '#E91E63'];

export default function AnalyticsPage() {
    const dispatch = useAppDispatch();
    const { data, isLoading, error } = useAppSelector((state) => state.analytics);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        dispatch(fetchAnalytics());
        
        // Check if mobile screen
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, [dispatch]);

    // Transform returns value trend data for chart
    const returnsValueTrendData = data?.charts.returnsValueTrend.map(item => ({
        month: item.month,
        value: item.totalValue,
    })) || [];

    // Transform top products data for bar chart
    const topProductsData = data?.charts.topProducts.map(item => ({
        name: item.productName.length > 20 ? item.productName.substring(0, 20) + '...' : item.productName,
        fullName: item.productName,
        value: item.totalValue,
        quantity: item.totalQuantity,
        returns: item.returnCount,
    })) || [];

    const getChangeColor = (change: number) => {
        return change >= 0 ? 'text-green-600' : 'text-red-600';
    };

    const getChangeIcon = (change: number) => {
        return change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-gray-600 mt-1">Insights and statistics for pharmaceutical returns</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {isLoading ? (
                <>
                    {/* Key Metrics Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-lg shadow-md p-3 animate-pulse">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                                </div>
                                <div className="h-6 bg-gray-200 rounded w-32 mt-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-20 mt-2"></div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
                            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
                            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                    </div>

                    {/* Tables Skeleton */}
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="h-4 bg-gray-200 rounded w-40 mb-3 animate-pulse"></div>
                        <div className="space-y-2">
                            <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                            <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                            <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                            <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                    </div>
                </>
            ) : data ? (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg shadow-md p-3">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-xs text-gray-600">Total Returns Value</p>
                                <DollarSign className="w-4 h-4 text-primary-500" />
                            </div>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(data.keyMetrics.totalReturnsValue.value)}</p>
                            <div className={`flex items-center gap-1 mt-1 ${getChangeColor(data.keyMetrics.totalReturnsValue.change)}`}>
                                {getChangeIcon(data.keyMetrics.totalReturnsValue.change)}
                                <p className="text-xs">{Math.abs(data.keyMetrics.totalReturnsValue.change)}% {data.keyMetrics.totalReturnsValue.changeLabel}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-3">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-xs text-gray-600">Total Returns</p>
                                <Package className="w-4 h-4 text-blue-500" />
                            </div>
                            <p className="text-lg font-bold text-gray-900">{formatNumber(data.keyMetrics.totalReturns.value)}</p>
                            <div className={`flex items-center gap-1 mt-1 ${getChangeColor(data.keyMetrics.totalReturns.change)}`}>
                                {getChangeIcon(data.keyMetrics.totalReturns.change)}
                                <p className="text-xs">{Math.abs(data.keyMetrics.totalReturns.change)}% {data.keyMetrics.totalReturns.changeLabel}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-3">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-xs text-gray-600">Avg Return Value</p>
                                <TrendingUp className="w-4 h-4 text-green-500" />
                            </div>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(data.keyMetrics.avgReturnValue.value)}</p>
                            <div className={`flex items-center gap-1 mt-1 ${getChangeColor(data.keyMetrics.avgReturnValue.change)}`}>
                                {getChangeIcon(data.keyMetrics.avgReturnValue.change)}
                                <p className="text-xs">{Math.abs(data.keyMetrics.avgReturnValue.change)}% {data.keyMetrics.avgReturnValue.changeLabel}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-3">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-xs text-gray-600">Active Pharmacies</p>
                                <Building2 className="w-4 h-4 text-purple-500" />
                            </div>
                            <p className="text-lg font-bold text-gray-900">{formatNumber(data.keyMetrics.activePharmacies.value)}</p>
                            <div className={`flex items-center gap-1 mt-1 ${getChangeColor(data.keyMetrics.activePharmacies.change)}`}>
                                {getChangeIcon(data.keyMetrics.activePharmacies.change)}
                                <p className="text-xs">{Math.abs(data.keyMetrics.activePharmacies.change)}% {data.keyMetrics.activePharmacies.changeLabel}</p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <h2 className="text-sm font-semibold text-gray-900 mb-3">Returns Value Trend</h2>
                            <div className="h-64">
                                {returnsValueTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={returnsValueTrendData} margin={{ top: 5, right: 5, left: -10, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis
                                                dataKey="month"
                                                stroke="#6b7280"
                                                style={{ fontSize: '10px' }}
                                                angle={-45}
                                                textAnchor="end"
                                                height={60}
                                            />
                                            <YAxis
                                                stroke="#6b7280"
                                                style={{ fontSize: '10px' }}
                                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                                                width={45}
                                            />
                                            <Tooltip
                                                formatter={(value: number | undefined) => value ? formatCurrency(value) : '$0'}
                                                contentStyle={{
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    fontSize: '12px'
                                                }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#4CAF50"
                                                strokeWidth={2}
                                                dot={{ fill: '#4CAF50', r: 3 }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-xs text-gray-500">No data available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-4">
                            <h2 className="text-sm font-semibold text-gray-900 mb-3">Top Products</h2>
                            <div className="h-64">
                                {topProductsData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={topProductsData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={isMobile ? false : ({ name }) => `${name}`}
                                                outerRadius={70}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {topProductsData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3" style={{ fontSize: '12px' }}>
                                                                <p className="font-semibold text-gray-900 mb-2">{data.fullName || data.name}</p>
                                                                <div className="space-y-1">
                                                                    <p className="text-gray-700">
                                                                        <span className="font-medium">Value: </span>
                                                                        {formatCurrency(data.value || 0)}
                                                                    </p>
                                                                    <p className="text-gray-700">
                                                                        <span className="font-medium">Quantity: </span>
                                                                        {formatNumber(data.quantity || 0)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                wrapperStyle={{ fontSize: '10px' }}
                                                formatter={(value, entry: any) => {
                                                    const data = topProductsData.find(d => d.name === value);
                                                    return data?.fullName || value;
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-xs text-gray-500">No data available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Distributor Breakdown Table */}
                    {data.distributorBreakdown && data.distributorBreakdown.length > 0 && (
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <h2 className="text-sm font-semibold text-gray-900 mb-3">Distributor Breakdown</h2>
                            <div className="overflow-x-auto lg:overflow-x-visible">
                                <table className="w-full table-auto">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distributor</th>
                                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacies</th>
                                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Returns</th>
                                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Return Value</th>
                                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.distributorBreakdown.map((distributor) => (
                                            <tr key={distributor.distributorId} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">{distributor.distributorName}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{distributor.pharmaciesCount}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{formatNumber(distributor.totalReturns)}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{formatCurrency(distributor.avgReturnValue)}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-xs font-semibold text-gray-900">{formatCurrency(distributor.totalValue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* State Breakdown Table */}
                    {data.stateBreakdown && data.stateBreakdown.length > 0 && (
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <h2 className="text-sm font-semibold text-gray-900 mb-3">State Breakdown</h2>
                            <div className="overflow-x-auto lg:overflow-x-visible">
                                <table className="w-full table-auto">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacies</th>
                                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Returns</th>
                                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Return Value</th>
                                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.stateBreakdown.map((state) => (
                                            <tr key={state.state} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">{state.state}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{state.pharmacies}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{formatNumber(state.totalReturns)}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{formatCurrency(state.avgReturnValue)}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-xs font-semibold text-gray-900">{formatCurrency(state.totalValue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Top Products Table */}
                    
                </>
            ) : null}
        </div>
    );
}
