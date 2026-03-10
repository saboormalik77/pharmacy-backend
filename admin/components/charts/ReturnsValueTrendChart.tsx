'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';

const data = [
    { month: 'Jul', value: 185000 },
    { month: 'Aug', value: 205000 },
    { month: 'Sep', value: 195000 },
    { month: 'Oct', value: 220000 },
    { month: 'Nov', value: 245000 },
    { month: 'Dec', value: 246000 },
];

export function ReturnsValueTrendChart() {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="month"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                />
                <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                    formatter={(value: number | undefined) => value ? formatCurrency(value) : '$0'}
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                />
                <Legend
                    wrapperStyle={{ fontSize: '14px' }}
                />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4CAF50"
                    strokeWidth={3}
                    name="Returns Value"
                    dot={{ fill: '#4CAF50', r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
