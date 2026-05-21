'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchDashboard, setSelectedPharmacy, setSelectedPeriodType } from '@/lib/store/dashboardSlice';
import { useEffect } from 'react';
import { PeriodType } from '@/lib/types';

function toFiniteNumber(value: unknown) {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) ? number : 0;
}

function ReturnsValueTooltip({ active, label, payload }: any) {
    if (!active || !payload?.length) return null;

    const point = payload[0]?.payload;
    const value = toFiniteNumber(point?.value ?? payload[0]?.value);

    return (
        <div
            className="rounded-[4px] border bg-white px-3 py-2 shadow-md"
            style={{ borderColor: '#e5e7eb', fontSize: '12px' }}
        >
            <p className="mb-1 font-medium text-gray-900">{point?.period || label}</p>
            <p className="text-gray-600">Returns Value : {formatCurrency(value)}</p>
        </div>
    );
}

export function ReturnsValueChart() {
    const dispatch = useAppDispatch();
    const { data, isLoading, selectedPharmacyId, selectedPeriodType } = useAppSelector((state) => state.dashboard);

    useEffect(() => {
        // Fetch initial data
        dispatch(fetchDashboard({
            pharmacyId: selectedPharmacyId || undefined,
            periodType: selectedPeriodType,
            periods: 12,
        }));
    }, [dispatch, selectedPharmacyId, selectedPeriodType]);

    const handlePharmacyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pharmacyId = e.target.value || null;
        dispatch(setSelectedPharmacy(pharmacyId));
    };

    const handlePeriodTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const periodType = e.target.value as PeriodType;
        dispatch(setSelectedPeriodType(periodType));
    };

    // Transform API data for chart
    const chartData = data?.returnsValueTrend.map((item) => ({
        period: item.label,
        value: toFiniteNumber(item.value),
    })) || [];

    return (
        <div className="space-y-3 sm:space-y-4">
            {/* Dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                    <label htmlFor="pharmacy-select" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Pharmacy
                    </label>
                    <select
                        id="pharmacy-select"
                        value={selectedPharmacyId || ''}
                        onChange={handlePharmacyChange}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">All Pharmacies</option>
                        {data?.pharmacies.map((pharmacy) => (
                            <option key={pharmacy.id} value={pharmacy.id}>
                                {pharmacy.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 min-w-0">
                    <label htmlFor="period-type-select" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Period Type
                    </label>
                    <select
                        id="period-type-select"
                        value={selectedPeriodType}
                        onChange={handlePeriodTypeChange}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
            </div>

            {/* Chart */}
            {isLoading ? (
                <div className="h-[250px] sm:h-[300px] lg:h-[400px] flex items-center justify-center">
                    <p className="text-sm sm:text-base text-gray-500">Loading chart data...</p>
                </div>
            ) : chartData.length === 0 ? (
                <div className="h-[250px] sm:h-[300px] lg:h-[400px] flex items-center justify-center">
                    <p className="text-sm sm:text-base text-gray-500">No data available</p>
                </div>
            ) : (
                <div className="h-[250px] sm:h-[300px] lg:h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="period"
                                stroke="#6b7280"
                                style={{ fontSize: '10px' }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                stroke="#6b7280"
                                style={{ fontSize: '10px' }}
                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                                width={45}
                            />
                            <Tooltip content={<ReturnsValueTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: '12px' }}
                            />
                            <Line
                                type="linear"
                                dataKey="value"
                                name="Returns Value"
                                stroke="#516057"
                                dot={{ fill: '#516057', r: 3 }}
                                activeDot={{ r: 5 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
