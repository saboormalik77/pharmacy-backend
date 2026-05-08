'use client';

import { Fragment } from 'react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Package, Building2, TrendingDown } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchAnalytics } from '@/lib/store/analyticsSlice';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#516057', '#2196F3', '#ad916a', '#FF5722', '#9C27B0', '#00BCD4', '#E91E63'];

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
        <PermissionGate permission="analytics">
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[4px]">
                    {error}
                </div>
            )}

            {isLoading ? (
                <Fragment>
                    {/* Key Metrics Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4 animate-pulse">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="h-4 bg-gray-100 rounded-[4px] w-32"></div>
                                    <div className="h-5 w-5 bg-gray-100 rounded-[4px]"></div>
                                </div>
                                <div className="h-8 bg-gray-100 rounded-[4px] w-40 mt-3"></div>
                                <div className="h-4 bg-gray-100 rounded-[4px] w-24 mt-3"></div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                            <div className="h-5 bg-gray-100 rounded-[4px] w-40 mb-4 animate-pulse"></div>
                            <div className="h-80 bg-gray-50 rounded-[4px] animate-pulse"></div>
                        </div>
                        <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                            <div className="h-5 bg-gray-100 rounded-[4px] w-40 mb-4 animate-pulse"></div>
                            <div className="h-80 bg-gray-50 rounded-[4px] animate-pulse"></div>
                        </div>
                    </div>

                    {/* Tables Skeleton */}
                    <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                        <div className="h-5 bg-gray-100 rounded-[4px] w-48 mb-4 animate-pulse"></div>
                        <div className="space-y-3">
                            <div className="h-10 bg-gray-50 rounded-[4px] animate-pulse"></div>
                            <div className="h-10 bg-gray-50 rounded-[4px] animate-pulse"></div>
                            <div className="h-10 bg-gray-50 rounded-[4px] animate-pulse"></div>
                            <div className="h-10 bg-gray-50 rounded-[4px] animate-pulse"></div>
                            <div className="h-10 bg-gray-100 rounded-[4px] animate-pulse"></div>
                            <div className="h-10 bg-gray-100 rounded-[4px] animate-pulse"></div>
                            <div className="h-10 bg-gray-100 rounded-[4px] animate-pulse"></div>
                        </div>
                    </div>
                </Fragment>
            ) : data ? (
                <Fragment>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-sm text-gray-500">Total Returns Value</p>
                                <DollarSign className="w-5 h-5 text-[#516057]" />
                            </div>
                            <p className="text-base font-bold text-gray-900">{formatCurrency(data.keyMetrics.totalReturnsValue.value)}</p>
                            <div className={`flex items-center gap-1.5 mt-2 ${getChangeColor(data.keyMetrics.totalReturnsValue.change)}`}>
                                {getChangeIcon(data.keyMetrics.totalReturnsValue.change)}
                                <p className="text-sm">{Math.abs(data.keyMetrics.totalReturnsValue.change)}% {data.keyMetrics.totalReturnsValue.changeLabel}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-sm text-gray-500">Total Returns</p>
                                <Package className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-base font-bold text-gray-900">{formatNumber(data.keyMetrics.totalReturns.value)}</p>
                            <div className={`flex items-center gap-1.5 mt-2 ${getChangeColor(data.keyMetrics.totalReturns.change)}`}>
                                {getChangeIcon(data.keyMetrics.totalReturns.change)}
                                <p className="text-sm">{Math.abs(data.keyMetrics.totalReturns.change)}% {data.keyMetrics.totalReturns.changeLabel}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-sm text-gray-500">Avg Return Value</p>
                                <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                            <p className="text-base font-bold text-gray-900">{formatCurrency(data.keyMetrics.avgReturnValue.value)}</p>
                            <div className={`flex items-center gap-1.5 mt-2 ${getChangeColor(data.keyMetrics.avgReturnValue.change)}`}>
                                {getChangeIcon(data.keyMetrics.avgReturnValue.change)}
                                <p className="text-sm">{Math.abs(data.keyMetrics.avgReturnValue.change)}% {data.keyMetrics.avgReturnValue.changeLabel}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-sm text-gray-500">Active Pharmacies</p>
                                <Building2 className="w-5 h-5 text-purple-500" />
                            </div>
                            <p className="text-base font-bold text-gray-900">{formatNumber(data.keyMetrics.activePharmacies.value)}</p>
                            <div className={`flex items-center gap-1.5 mt-2 ${getChangeColor(data.keyMetrics.activePharmacies.change)}`}>
                                {getChangeIcon(data.keyMetrics.activePharmacies.change)}
                                <p className="text-sm">{Math.abs(data.keyMetrics.activePharmacies.change)}% {data.keyMetrics.activePharmacies.changeLabel}</p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                            <h2 className="text-base font-semibold text-gray-900 mb-4">Returns Value Trend</h2>
                            <div className="h-80">
                                {returnsValueTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={returnsValueTrendData} margin={{ top: 5, right: 5, left: -10, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis
                                                dataKey="month"
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
                                                formatter={(value: number | undefined) => value ? formatCurrency(value) : '$0'}
                                                contentStyle={{
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    fontSize: '14px'
                                                }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#516057"
                                                strokeWidth={2}
                                                dot={{ fill: '#516057', r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-sm text-gray-500">No data available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                            <h2 className="text-base font-semibold text-gray-900 mb-4">Top Products</h2>
                            <div className="h-80">
                                {topProductsData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={topProductsData}
                                                cx="50%"
                                                cy="45%"
                                                labelLine={false}
                                                label={false}
                                                outerRadius={80}
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
                                                            <div className="bg-white border border-[#e2e2e2] rounded-[4px] shadow-lg p-3">
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
                                                height={40}
                                                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                                iconType="circle"
                                                formatter={(value, entry: any) => {
                                                    const data = topProductsData.find(d => d.name === value);
                                                    const fullName = data?.fullName || value;
                                                    return fullName.length > 20 ? fullName.substring(0, 20) + '...' : fullName;
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-sm text-gray-500">No data available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Distributor Breakdown Table */}
                    {data.distributorBreakdown && data.distributorBreakdown.length > 0 && (
                        <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                            <h2 className="text-base font-semibold text-gray-900 mb-4">Distributor Breakdown</h2>
                            <div className="overflow-x-auto lg:overflow-x-visible">
                                <table className="w-full table-auto">
                                    <thead>
                                        <tr className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Distributor</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Pharmacies</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Returns</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Avg Return Value</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.distributorBreakdown.map((distributor, idx) => (
                                            <tr key={distributor.distributorId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]'} hover:bg-[#fafafa] transition-all border-b border-[#e2e2e2]`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{distributor.distributorName}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{distributor.pharmaciesCount}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatNumber(distributor.totalReturns)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatCurrency(distributor.avgReturnValue)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(distributor.totalValue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* State Breakdown Table */}
                    {data.stateBreakdown && data.stateBreakdown.length > 0 && (
                        <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-4">
                            <h2 className="text-base font-semibold text-gray-900 mb-4">State Breakdown</h2>
                            <div className="overflow-x-auto lg:overflow-x-visible">
                                <table className="w-full table-auto">
                                    <thead>
                                        <tr className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">State</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Pharmacies</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Returns</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Avg Return Value</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.stateBreakdown.map((state, idx) => (
                                            <tr key={state.state} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]'} hover:bg-[#fafafa] transition-all border-b border-[#e2e2e2]`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{state.state}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{state.pharmacies}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatNumber(state.totalReturns)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatCurrency(state.avgReturnValue)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(state.totalValue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Top Products Table */}
                </Fragment>
            ) : null}
        </div>
    </PermissionGate>
    );
}
