"use client";

import { useState, useEffect } from "react";
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
import { apiClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────

interface ReturnStatsResponse {
  totalReturns: number;
  totalPharmacyCreatedReturns: number;
  totalProcessorHandledReturns: number;
  totalReturnValue: number;
  totalCredits: number;
}

interface ReturnListItem {
  id: string;
  licensePlate: string;
  createdAt: string;
  status: string;
  totalReturnableValue: number;
  totalNonReturnableValue: number;
}

interface ReturnDetailResponse {
  returnTransaction: {
    id: string;
    licensePlate: string;
    status: string;
    totalItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    createdAt: string;
  };
  creditSummary: {
    fcrOneCheck: { expected: number; received: number };
    manufacturerDirect: { expected: number; received: number };
    totalExpected: number;
    totalReceived: number;
  };
  productValueBreakdown: {
    returnable: number;
    nonReturnable: number;
  };
  nonReturnableReasons: Array<{ reason: string; value: number }>;
  productValuesOverTime: Array<{
    date: string;
    returnableValue: number;
    nonReturnableValue: number;
  }>;
}

// ─── Colors ──────────────────────────────────────────────────────────────

const RETURNABLE_COLORS = ["#0d9488", "#164e63"];
const NON_RETURNABLE_COLORS = ["#0d9488", "#0891b2", "#22d3ee", "#a5f3fc"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CreditTypeCard({
  type,
  expected,
  received,
  index,
  maxValue,
}: {
  type: string;
  expected: number;
  received: number;
  index: number;
  maxValue: number;
}) {
  // Calculate bar widths as percentage of maxValue (so bars are proportional to actual dollar amounts)
  const expectedWidth = maxValue > 0 ? Math.min((expected / maxValue) * 100, 100) : 0;
  const receivedWidth = maxValue > 0 ? Math.min((received / maxValue) * 100, 100) : 0;
  const icons = ["💳", "🏭", "📦"];

  return (
    <div className="bg-white border border-teal-100 rounded-xl p-4 hover:border-teal-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* <span className="text-lg">{icons[index] ?? "📋"}</span> */}
          <span className="text-xs font-semibold text-teal-900 leading-tight">{type}</span>
        </div>
        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
          ${expected.toFixed(2)}
        </span>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-teal-600 uppercase tracking-wide">Expected</span>
          <span className="text-[10px] text-teal-500">${expected.toFixed(2)}</span>
        </div>
        <div className="w-full bg-teal-50 rounded-full h-2.5 overflow-hidden border border-teal-100">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500"
            style={{ width: `${expectedWidth}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Received</span>
          <span className="text-[10px] text-emerald-500">${received.toFixed(2)}</span>
        </div>
        <div className="w-full bg-emerald-50 rounded-full h-2.5 overflow-hidden border border-emerald-100">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${receivedWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NewDashboardUI({ pharmacyName = "PRIME PHARMACY INC" }: { pharmacyName?: string }) {
  const router = useRouter();

  // Return stats (top cards)
  const [returnStats, setReturnStats] = useState<ReturnStatsResponse | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Returns list (dropdown)
  const [returnsList, setReturnsList] = useState<ReturnListItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [selectedReturnId, setSelectedReturnId] = useState<string>("");

  // Return detail (credit summary + charts)
  const [returnDetail, setReturnDetail] = useState<ReturnDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Fetch return statistics
  useEffect(() => {
    const fetchReturnStats = async () => {
      try {
        setIsLoadingStats(true);
        setStatsError(null);
        const response = await apiClient.get<ReturnStatsResponse>('/dashboard/return-stats');
        if (response.status === 'success' && response.data) {
          setReturnStats(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch return stats');
        }
      } catch (error: any) {
        console.error('Error fetching return stats:', error);
        setStatsError(error.message || 'Failed to load statistics');
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchReturnStats();
  }, []);

  // Fetch returns list for dropdown
  useEffect(() => {
    const fetchReturnsList = async () => {
      try {
        setIsLoadingList(true);
        const response = await apiClient.get<ReturnListItem[]>('/dashboard/returns-list');
        if (response.status === 'success' && response.data) {
          setReturnsList(response.data);
          if (response.data.length > 0) {
            setSelectedReturnId(response.data[0].id);
          }
        }
      } catch (error: any) {
        console.error('Error fetching returns list:', error);
      } finally {
        setIsLoadingList(false);
      }
    };
    fetchReturnsList();
  }, []);

  // Fetch return detail when selection changes
  useEffect(() => {
    if (!selectedReturnId) return;

    const fetchReturnDetail = async () => {
      try {
        setIsLoadingDetail(true);
        const response = await apiClient.get<ReturnDetailResponse>(`/dashboard/return-detail/${selectedReturnId}`);
        if (response.status === 'success' && response.data) {
          setReturnDetail(response.data);
        }
      } catch (error: any) {
        console.error('Error fetching return detail:', error);
      } finally {
        setIsLoadingDetail(false);
      }
    };
    fetchReturnDetail();
  }, [selectedReturnId]);

  // Derived data from returnDetail
  const selectedReturn = returnsList.find((r) => r.id === selectedReturnId);
  const selectedLicensePlateShort = selectedReturn
    ? selectedReturn.licensePlate.slice(-5)
    : "";

  const creditTypes = returnDetail
    ? [
        {
          type: "FCR OneCheck",
          expected: returnDetail.creditSummary.fcrOneCheck.expected,
          received: returnDetail.creditSummary.fcrOneCheck.received,
        },
        {
          type: "Manufacturer Direct Credit",
          expected: returnDetail.creditSummary.manufacturerDirect.expected,
          received: returnDetail.creditSummary.manufacturerDirect.received,
        },
      ]
    : [];

  // Calculate max value for proportional bar widths
  const maxCreditValue = returnDetail
    ? Math.max(
        returnDetail.creditSummary.fcrOneCheck.expected,
        returnDetail.creditSummary.fcrOneCheck.received,
        returnDetail.creditSummary.manufacturerDirect.expected,
        returnDetail.creditSummary.manufacturerDirect.received,
        1 // Minimum to avoid division by zero
      )
    : 1;

  const returnableDonutData = returnDetail
    ? [
        { name: "Returnable", value: returnDetail.productValueBreakdown.returnable },
        { name: "Non-Returnable", value: returnDetail.productValueBreakdown.nonReturnable },
      ]
    : [];

  const nonReturnableReasonsData = returnDetail?.nonReturnableReasons || [];

  const productValueLineData = returnDetail?.productValuesOverTime || [];

  const handleExportExcel = () => {
    if (!returnDetail) return;
    const timestamp = new Date().toISOString().split("T")[0];
    const fileName = `return_${selectedLicensePlateShort || "export"}_${timestamp}.xlsx`;
    downloadExcel(
      [{ name: "Return Summary", data: [{
        "License Plate": returnDetail.returnTransaction.licensePlate,
        "Status": returnDetail.returnTransaction.status,
        "Total Items": returnDetail.returnTransaction.totalItems,
        "Returnable Value": returnDetail.productValueBreakdown.returnable,
        "Non-Returnable Value": returnDetail.productValueBreakdown.nonReturnable,
        "FCR OneCheck Expected": returnDetail.creditSummary.fcrOneCheck.expected,
        "FCR OneCheck Received": returnDetail.creditSummary.fcrOneCheck.received,
        "Manufacturer Direct Expected": returnDetail.creditSummary.manufacturerDirect.expected,
        "Manufacturer Direct Received": returnDetail.creditSummary.manufacturerDirect.received,
        "Created": returnDetail.returnTransaction.createdAt,
      }] }],
      fileName
    );
  };

  const handleViewDetails = () => {
    if (selectedReturnId) {
      router.push(`/returns/${selectedReturnId}`);
    }
  };

  // Format dropdown label
  const formatDropdownLabel = (item: ReturnListItem) => {
    const date = new Date(item.createdAt).toISOString().split("T")[0];
    const plateShort = item.licensePlate.slice(-5);
    const totalValue = (item.totalReturnableValue + item.totalNonReturnableValue).toFixed(2);
    return `${date} | ${plateShort} | $${totalValue}`;
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

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border-2 border-teal-200 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-teal-600 text-[10px] font-semibold uppercase tracking-widest">Total Returns</p>
              <p className="text-teal-700 text-2xl font-bold leading-tight">
                {isLoadingStats ? (
                  <span className="text-gray-400 text-base">Loading...</span>
                ) : statsError ? (
                  <span className="text-red-500 text-base">Error</span>
                ) : (
                  returnStats?.totalReturns || 0
                )}
              </p>
            </div>
          </div>

          <div className="bg-white border-2 border-cyan-200 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-cyan-600 text-[10px] font-semibold uppercase tracking-widest">Total Return Value</p>
              <p className="text-cyan-700 text-2xl font-bold leading-tight">
                {isLoadingStats ? (
                  <span className="text-gray-400 text-base">Loading...</span>
                ) : statsError ? (
                  <span className="text-red-500 text-base">Error</span>
                ) : (
                  `$${returnStats?.totalReturnValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
                )}
              </p>
            </div>
          </div>

          <div className="bg-white border-2 border-emerald-200 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-emerald-600 text-[10px] font-semibold uppercase tracking-widest">Total Credits</p>
              <p className="text-emerald-700 text-2xl font-bold leading-tight">
                {isLoadingStats ? (
                  <span className="text-gray-400 text-base">Loading...</span>
                ) : statsError ? (
                  <span className="text-red-500 text-base">Error</span>
                ) : (
                  `$${returnStats?.totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Reference Number Dropdown ── */}
        <div className="bg-white border-2 border-teal-300 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-teal-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Select Return Reference</p>
          </div>
          <div className="relative">
            {isLoadingList ? (
              <div className="px-4 py-3.5 text-sm text-gray-400">Loading returns...</div>
            ) : returnsList.length === 0 ? (
              <div className="px-4 py-3.5 text-sm text-gray-400">No returns found</div>
            ) : (
              <select
                value={selectedReturnId}
                onChange={(e) => setSelectedReturnId(e.target.value)}
                className="w-full px-4 py-3.5 text-sm text-gray-800 font-medium bg-white appearance-none focus:outline-none cursor-pointer"
              >
                {returnsList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatDropdownLabel(item)}
                  </option>
                ))}
              </select>
            )}
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Loading state for detail ── */}
        {isLoadingDetail && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-teal-600">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium">Loading return details...</span>
            </div>
          </div>
        )}

        {/* ── Credit Summary Section ── */}
        {returnDetail && !isLoadingDetail && (
          <div className="bg-white border-2 border-teal-200 rounded-xl overflow-hidden shadow-lg">
            <div className="px-6 py-4 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
              </div>
              
              <div className="flex flex-col relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-8 bg-gradient-to-b from-emerald-400 to-teal-300 rounded-full"></div>
                  <p className="text-white text-base font-bold uppercase tracking-wider drop-shadow-sm">
                    Credit Summary
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-teal-100 text-xs font-medium">Reference:</span>
                  <span className="bg-white/25 backdrop-blur-sm text-white font-mono font-semibold px-3 py-1 rounded-lg text-xs border border-white/30 shadow-sm">
                    {selectedLicensePlateShort}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-6 relative z-10 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                <div className="flex items-center gap-2 text-xs text-white font-medium">
                  <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-teal-300 to-teal-400 shadow-sm border-2 border-white/50" />
                  Expected
                </div>
                <div className="w-px h-4 bg-white/30"></div>
                <div className="flex items-center gap-2 text-xs text-white font-medium">
                  <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-emerald-300 to-emerald-400 shadow-sm border-2 border-white/50" />
                  Received
                </div>
              </div>
              
              <button
                onClick={handleViewDetails}
                className="px-5 py-2 text-xs font-bold bg-white text-teal-700 rounded-lg hover:bg-teal-50 hover:shadow-lg transition-all duration-200 shadow-md flex-shrink-0 relative z-10 border-2 border-teal-200 hover:scale-105"
              >
                View Details →
              </button>
            </div>

            <div className="grid grid-cols-2 divide-x divide-teal-100 border-b-2 border-teal-100 bg-teal-50/40">
              {[
                { label: "Total Expected", value: returnDetail.creditSummary.totalExpected, color: "text-teal-700" },
                { label: "Total Received", value: returnDetail.creditSummary.totalReceived, color: "text-emerald-700" },
              ].map((stat) => (
                <div key={stat.label} className="px-4 py-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{stat.label}</p>
                  <p className={`text-sm font-bold ${stat.color}`}>${stat.value.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/50">
              {creditTypes.map((row, i) => (
                <CreditTypeCard
                  key={row.type}
                  index={i}
                  type={row.type}
                  expected={row.expected}
                  received={row.received}
                  maxValue={maxCreditValue}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Pie Charts Box ── */}
        {returnDetail && !isLoadingDetail && (
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
                {returnableDonutData.length > 0 && (returnableDonutData[0].value > 0 || returnableDonutData[1].value > 0) ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={returnableDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {returnableDonutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={RETURNABLE_COLORS[index % RETURNABLE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 8, borderColor: "#99f6e4", fontSize: 12 }}
                          formatter={(value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full mt-2 space-y-1.5">
                      {returnableDonutData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: RETURNABLE_COLORS[index % RETURNABLE_COLORS.length] }} />
                            <span className="text-xs text-gray-600">{entry.name}</span>
                          </div>
                          <span className="text-xs font-semibold text-gray-800">
                            ${entry.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 py-8">No product value data available</p>
                )}
              </div>

              {/* Donut 2 - Non-Returnable Reasons */}
              <div className="flex flex-col items-center">
                <p className="text-xs font-semibold text-teal-700 text-center mb-3 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  Non-Returnable Reasons
                </p>
                {nonReturnableReasonsData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={nonReturnableReasonsData.map(r => ({ name: r.reason, value: r.value }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {nonReturnableReasonsData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={NON_RETURNABLE_COLORS[index % NON_RETURNABLE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 8, borderColor: "#99f6e4", fontSize: 12 }}
                          formatter={(value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full mt-2 space-y-1.5">
                      {nonReturnableReasonsData.map((entry, index) => (
                        <div key={entry.reason} className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: NON_RETURNABLE_COLORS[index % NON_RETURNABLE_COLORS.length] }} />
                            <span className="text-xs text-gray-600">{entry.reason}</span>
                          </div>
                          <span className="text-xs font-semibold text-gray-800">
                            ${entry.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 py-8">No non-returnable items in this return</p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── Line / Area Chart Box ── */}
        {returnDetail && !isLoadingDetail && (
          <div className="bg-white border-2 border-teal-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-teal-100">
              <h3 className="text-sm font-bold text-teal-900 uppercase tracking-wide">
                Product Values Over Time
              </h3>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <span className="inline-block w-5 h-0.5 bg-emerald-500 rounded" />
                  Returnable
                </span>
                <span className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                  <span className="inline-block w-5 h-0.5 bg-amber-500 rounded" />
                  Non-Returnable
                </span>
              </div>
            </div>
            {productValueLineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={productValueLineData}>
                  <defs>
                    <linearGradient id="colorReturnable" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNonReturnable" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                    label={{ value: "Service Date", position: "insideBottom", offset: -5, fontSize: 9, fill: "#0d9488" }}
                  />
                  <YAxis
                    tick={{ fontSize: 8, fill: "#0f766e" }}
                    stroke="#99f6e4"
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    label={{ value: "Amount ($)", angle: -90, position: "insideLeft", fontSize: 9, fill: "#0d9488" }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, borderColor: "#99f6e4", fontSize: 12 }}
                    formatter={(value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                  />
                  <Area type="monotone" dataKey="returnableValue" stroke="#10b981" strokeWidth={2} fill="url(#colorReturnable)" dot={{ r: 2, fill: "#059669" }} name="Returnable Value" />
                  <Area type="monotone" dataKey="nonReturnableValue" stroke="#f59e0b" strokeWidth={2} fill="url(#colorNonReturnable)" dot={{ r: 2, fill: "#d97706" }} name="Non-Returnable Value" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">No timeline data available</p>
            )}
          </div>
        )}

        {/* ── Summary Banners ── */}
        {returnDetail && !isLoadingDetail && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg px-6 py-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-teal-100 text-xs font-medium uppercase tracking-wide mb-1">Returnable Value</p>
                <p className="text-white text-xl font-bold">
                  ${returnDetail.productValueBreakdown.returnable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-teal-400/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-lg px-6 py-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-cyan-100 text-xs font-medium uppercase tracking-wide mb-1">Non-Returnable Value</p>
                <p className="text-white text-xl font-bold">
                  ${returnDetail.productValueBreakdown.nonReturnable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-cyan-400/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
