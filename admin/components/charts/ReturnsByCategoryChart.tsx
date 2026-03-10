'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const data = [
    { name: 'Pain Relief', value: 1450, color: '#4CAF50' },
    { name: 'Antibiotics', value: 1125, color: '#2196F3' },
    { name: 'Cardiovascular', value: 890, color: '#FFC107' },
    { name: 'Diabetes', value: 756, color: '#FF5722' },
    { name: 'Vitamins', value: 637, color: '#9C27B0' },
];

const COLORS = data.map(item => item.color);

export function ReturnsByCategoryChart() {
    const renderLabel = (entry: any) => {
        return `${entry.name}: ${entry.value}`;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '14px' }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
