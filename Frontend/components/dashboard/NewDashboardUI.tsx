"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { downloadExcel } from "@/lib/utils/excelExport";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const referenceOptions = [
  {
    label: "2026-04-27 | 9C54C | $590.28",
    value: "9C54C",
    returnId: "7079aad4-fc4b-441b-bd73-04342fce11f3",
  },
  {
    label: "2026-03-24 | 3S38J | $590.28",
    value: "3S38J",
    returnId: "3a1b2c3d-1111-2222-3333-4a5b6c7d8e9f",
  },
  {
    label: "2026-02-15 | 4T92K | $812.40",
    value: "4T92K",
    returnId: "4b2c3d4e-2222-3333-4444-5a6b7c8d9e0f",
  },
  {
    label: "2026-01-08 | 7R21M | $310.00",
    value: "7R21M",
    returnId: "7c3d4e5f-3333-4444-5555-6a7b8c9d0e1f",
  },
];

// ─── Mock Excel Items for the selected return ─────────────────────────────────
const mockReturnItems: Record<string, any>[] = [
  {
    NDC: "00172-4130-70",
    "Label Name": "Olmesartan",
    Package: 30,
    Quantity: 1,
    Full: 1,
    Partial: 1,
    "Lot Number": "M230817",
    "Exp Date": "05/26",
    DEA: "RX",
    Value: 0.47,
    Manufacturer: "ACCORD",
    "Credit Type": "RSI OneCheck",
    "Date of Service": "03/24/26",
  },
  {
    NDC: "60505-2441-03",
    "Label Name": "Ipratropium",
    Package: 30,
    Quantity: 1,
    Full: 1,
    Partial: 1,
    "Lot Number": "VE3268",
    "Exp Date": "05/26",
    DEA: "RX",
    Value: 1.03,
    Manufacturer: "APOTEX",
    "Credit Type": "RSI OneCheck",
    "Date of Service": "03/24/26",
  },
  {
    NDC: "17478-0220-10",
    "Label Name": "Ofloxacin",
    Package: 10,
    Quantity: 2,
    Full: 2,
    Partial: 2,
    "Lot Number": "436712",
    "Exp Date": "02/26",
    DEA: "RX",
    Value: 13.2,
    Manufacturer: "ARMAS PH",
    "Credit Type": "Manufacturer Direct",
    "Date of Service": "03/24/26",
  },
];

const creditTypes = [
  {
    type: "RSI OneCheck",
    expected: 424.59,
    received: 0.0,
    expectedWidth: 95,
  },
  {
    type: "Manufacturer Direct Credit",
    expected: 162.91,
    received: 0.0,
    expectedWidth: 65,
  },
  {
    type: "RSI Pay-On-Receipt",
    expected: 2.78,
    received: 0.0,
    expectedWidth: 5,
  },
];

const returnableDonutData = [
  { name: "Returnable", value: 42222.77 },
  { name: "Non-Returnable", value: 18393.36 },
];
const RETURNABLE_COLORS = ["#0d9488", "#164e63"];

const nonReturnableReasonsData = [
  { name: "Expired", value: 9200 },
  { name: "Out of Window", value: 4500 },
  { name: "Manufacturer Policy", value: 3200 },
  { name: "Damaged", value: 1493.36 },
];
const NON_RETURNABLE_COLORS = ["#0d9488", "#0891b2", "#22d3ee", "#a5f3fc"];

const productValueLineData = [
  { date: "2023-04-03", returnableValue: 800, nonReturnableValue: 200 },
  { date: "2023-09-11", returnableValue: 1200, nonReturnableValue: 400 },
  { date: "2023-11-06", returnableValue: 900, nonReturnableValue: 600 },
  { date: "2024-04-14", returnableValue: 2500, nonReturnableValue: 800 },
  { date: "2024-04-16", returnableValue: 3000, nonReturnableValue: 700 },
  { date: "2024-07-16", returnableValue: 2200, nonReturnableValue: 1200 },
  { date: "2024-01-22", returnableValue: 4000, nonReturnableValue: 900 },
  { date: "2025-02-10", returnableValue: 3500, nonReturnableValue: 1100 },
  { date: "2025-08-12", returnableValue: 5500, nonReturnableValue: 1500 },
  { date: "2025-06-09", returnableValue: 4800, nonReturnableValue: 800 },
  { date: "2025-09-04", returnableValue: 3800, nonReturnableValue: 1600 },
  { date: "2025-10-19", returnableValue: 2900, nonReturnableValue: 1900 },
  { date: "2026-01-23", returnableValue: 1500, nonReturnableValue: 1200 },
  { date: "2026-03-24", returnableValue: 1800, nonReturnableValue: 1000 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CreditBarRow({
  type,
  expected,
  received,
  expectedWidth,
}: {
  type: string;
  expected: number;
  received: number;
  expectedWidth: number;
}) {
  return (
    <tr className="border-b border-teal-100 hover:bg-teal-50/30 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-teal-800 w-48 align-top">{type}</td>
      <td className="px-4 py-3 w-full">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-teal-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"
                style={{ width: `${expectedWidth}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-teal-700 whitespace-nowrap w-16 text-right">
              ${expected.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-700 font-medium">${received.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NewDashboardUI({ pharmacyName = "PRIME PHARMACY INC" }: { pharmacyName?: string }) {
  const [selectedRef, setSelectedRef] = useState(referenceOptions[0].value);
  const router = useRouter();

  const selectedOption = referenceOptions.find((r) => r.value === selectedRef);

  const handleExportExcel = () => {
    const timestamp = new Date().toISOString().split("T")[0];
    downloadExcel(
      [{ name: "Return Items", data: mockReturnItems }],
      `return_${selectedRef}_${timestamp}.xlsx`
    );
  };

  const handleViewDetails = () => {
    if (selectedOption?.returnId) {
      router.push(`/returns/${selectedOption.returnId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Welcome Header ── */}
      <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-b-2 border-teal-200 px-6 py-4 flex items-center justify-between rounded-lg mb-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-wide">
            WELCOME &mdash; {pharmacyName}
          </h1>
          <p className="text-xs text-teal-600 mt-0.5">Dashboard overview &amp; credit summary</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors text-xs font-semibold"
          title="Export to Excel"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <rect x="2" y="3" width="20" height="18" rx="2" fill="#1D6F42" />
            <path d="M8 8l2.5 4-2.5 4h2l1.5-2.5L13 16h2l-2.5-4L15 8h-2l-1.5 2.5L10 8H8z" fill="white" />
          </svg>
          Export Excel
        </button>
      </div>

      <div className="px-0 py-4 space-y-4">
        {/* ── Reference Number Dropdown ── */}
        <div className="bg-white border-2 border-teal-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-teal-50 border-b border-teal-200">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Select Return Reference</p>
          </div>
          <div className="relative">
            <select
              value={selectedRef}
              onChange={(e) => setSelectedRef(e.target.value)}
              className="w-full px-4 py-3 text-sm text-teal-900 font-medium bg-white appearance-none focus:outline-none cursor-pointer focus:ring-2 focus:ring-teal-400"
            >
              {referenceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Credit Summary Section ── */}
        <div className="bg-white border-2 border-teal-200 rounded-lg overflow-hidden">
          {/* Header row */}
          <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-b-2 border-teal-200">
            <div>
              <h2 className="text-sm font-bold text-teal-900 uppercase tracking-wide">
                Credit Summary &mdash; Ref:{" "}
                <span className="text-teal-600 font-mono">{selectedRef}</span>
              </h2>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5 text-xs text-teal-700">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500" />
                  Expected
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Received
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleViewDetails}
                className="px-4 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors uppercase tracking-wide"
              >
                View Details
              </button>
              {/* <button className="px-4 py-1.5 text-xs font-semibold border-2 border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors uppercase tracking-wide">
                Add Credit
              </button> */}
            </div>
          </div>

          {/* Credit Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-teal-100 bg-teal-50/50">
                <th className="px-4 py-2.5 text-xs font-semibold text-teal-700 text-left w-52 uppercase tracking-wide">
                  Credit Type
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-teal-700 text-left uppercase tracking-wide">
                  Expected vs Received
                </th>
              </tr>
            </thead>
            <tbody>
              {creditTypes.map((row) => (
                <CreditBarRow
                  key={row.type}
                  type={row.type}
                  expected={row.expected}
                  received={row.received}
                  expectedWidth={row.expectedWidth}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pie Charts Box ── */}
        <div className="bg-white border-2 border-teal-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-teal-100">
            <h3 className="text-sm font-bold text-teal-900 uppercase tracking-wide">Product Value Breakdown</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut 1 - Returnable vs Non-Returnable */}
            <div className="flex flex-col items-center">
              <p className="text-xs font-semibold text-teal-700 text-center mb-3 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                Returnable vs Non-Returnable
              </p>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={returnableDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    label={({ name, value }) =>
                      `${name}: $${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    }
                    labelLine={true}
                  >
                    {returnableDonutData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={RETURNABLE_COLORS[index % RETURNABLE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, borderColor: "#99f6e4", fontSize: 12 }}
                    formatter={(value: number) =>
                      `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Donut 2 - Non-Returnable Reasons */}
            <div className="flex flex-col items-center">
              <p className="text-xs font-semibold text-teal-700 text-center mb-3 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                Non-Returnable Reasons
              </p>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={nonReturnableReasonsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    label={({ name, value }) =>
                      `${name}: $${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    }
                    labelLine={true}
                  >
                    {nonReturnableReasonsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={NON_RETURNABLE_COLORS[index % NON_RETURNABLE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, borderColor: "#99f6e4", fontSize: 12 }}
                    formatter={(value: number) =>
                      `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Line / Area Chart Box ── */}
        <div className="bg-white border-2 border-teal-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-teal-100">
            <h3 className="text-sm font-bold text-teal-900 uppercase tracking-wide">
              Product Values Over Time
            </h3>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-teal-700 font-medium">
                <span className="inline-block w-5 h-0.5 bg-teal-400 rounded" />
                Returnable
              </span>
              <span className="flex items-center gap-1.5 text-xs text-cyan-600 font-medium">
                <span className="inline-block w-5 h-0.5 bg-cyan-400 rounded" />
                Non-Returnable
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={productValueLineData}>
              <defs>
                <linearGradient id="colorReturnable" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNonReturnable" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2f1" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 7, fill: "#0f766e" }}
                angle={-45}
                textAnchor="end"
                height={55}
                stroke="#99f6e4"
                label={{
                  value: "Service Date",
                  position: "insideBottom",
                  offset: -5,
                  fontSize: 9,
                  fill: "#0d9488",
                }}
              />
              <YAxis
                tick={{ fontSize: 8, fill: "#0f766e" }}
                stroke="#99f6e4"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                label={{
                  value: "Amount ($)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 9,
                  fill: "#0d9488",
                }}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, borderColor: "#99f6e4", fontSize: 12 }}
                formatter={(value: number) =>
                  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                }
              />
              <Area
                type="monotone"
                dataKey="returnableValue"
                stroke="#2dd4bf"
                strokeWidth={2}
                fill="url(#colorReturnable)"
                dot={{ r: 2, fill: "#0d9488" }}
                name="Returnable Value"
              />
              <Area
                type="monotone"
                dataKey="nonReturnableValue"
                stroke="#22d3ee"
                strokeWidth={2}
                fill="url(#colorNonReturnable)"
                dot={{ r: 2, fill: "#0891b2" }}
                name="Non-Returnable Value"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Summary Banners ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg px-6 py-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-teal-100 text-xs font-medium uppercase tracking-wide mb-1">All-Time Returnable</p>
              <p className="text-white text-xl font-bold">$42,222.77</p>
            </div>
            <div className="w-10 h-10 bg-teal-400/30 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-lg px-6 py-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-cyan-100 text-xs font-medium uppercase tracking-wide mb-1">All-Time Non-Returnable</p>
              <p className="text-white text-xl font-bold">$18,393.36</p>
            </div>
            <div className="w-10 h-10 bg-cyan-400/30 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
