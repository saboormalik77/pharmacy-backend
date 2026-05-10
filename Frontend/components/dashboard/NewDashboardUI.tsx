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

// ─── Nordic Healthcare Colors ─────────────────────────────────────────────

const NORDIC_SAGE = "#516057";
const NORDIC_SAGE_LIGHT = "#7fb399";
const NORDIC_CHARCOAL = "#1d2222";
const NORDIC_TAN = "#ad916a";

const RETURNABLE_COLORS = [NORDIC_SAGE, NORDIC_SAGE_LIGHT];
const NON_RETURNABLE_COLORS = [NORDIC_TAN, "#6b5a3f", "#c4a882", "#e2d4c4"];

// ─── Main Component ───────────────────────────────────────────────────────────

export function NewDashboardUI({ pharmacyName = "" }: { pharmacyName?: string }) {
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
        "Credit Expected": returnDetail.creditSummary.totalExpected,
        "Credit Received": returnDetail.creditSummary.totalReceived,
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
    <div className="min-h-screen bg-[#ebe8e7]">
      {/* ── Welcome Header ── */}
      <div className="bg-white border border-[#e2e2e2] px-6 py-4 flex items-center justify-between rounded-[4px] mb-1 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#000000] tracking-wide font-serif">
            WELCOME &mdash; {pharmacyName}
          </h1>
          <p className="text-xs text-[#6b7280] mt-0.5">Dashboard overview &amp; credit summary</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#516057] text-[#516057] rounded-[4px] hover:bg-[#516057]/10 transition-colors text-xs font-semibold"
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
          <div className="bg-white border border-[#e2e2e2] rounded-[4px] px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 bg-[#f5f2f1] rounded-[4px] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#516057]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-[#505454] text-[10px] font-semibold uppercase tracking-widest">Total Returns</p>
              <p className="text-[#000000] text-2xl font-bold leading-tight">
                {isLoadingStats ? (
                  <span className="text-[#9ca3af] text-base">Loading...</span>
                ) : statsError ? (
                  <span className="text-red-500 text-base">Error</span>
                ) : (
                  returnStats?.totalReturns || 0
                )}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#e2e2e2] rounded-[4px] px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 bg-[#f5f2f1] rounded-[4px] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#516057]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[#505454] text-[10px] font-semibold uppercase tracking-widest">Total Return Value</p>
              <p className="text-[#000000] text-2xl font-bold leading-tight">
                {isLoadingStats ? (
                  <span className="text-[#9ca3af] text-base">Loading...</span>
                ) : statsError ? (
                  <span className="text-red-500 text-base">Error</span>
                ) : (
                  `$${returnStats?.totalReturnValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
                )}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#e2e2e2] rounded-[4px] px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 bg-[#f5f2f1] rounded-[4px] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#516057]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[#505454] text-[10px] font-semibold uppercase tracking-widest">Total Credits</p>
              <p className="text-[#000000] text-2xl font-bold leading-tight">
                {isLoadingStats ? (
                  <span className="text-[#9ca3af] text-base">Loading...</span>
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
        <div className="bg-white border border-[#e2e2e2] rounded-[4px] overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-[#516057] flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Select Return Reference</p>
          </div>
          <div className="relative">
            {isLoadingList ? (
              <div className="px-4 py-3.5 text-sm text-[#9ca3af]">Loading returns...</div>
            ) : returnsList.length === 0 ? (
              <div className="px-4 py-3.5 text-sm text-[#9ca3af]">No returns found</div>
            ) : (
              <select
                value={selectedReturnId}
                onChange={(e) => setSelectedReturnId(e.target.value)}
                className="w-full px-4 py-3.5 text-sm text-[#000000] font-medium bg-white appearance-none focus:outline-none cursor-pointer"
              >
                {returnsList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatDropdownLabel(item)}
                  </option>
                ))}
              </select>
            )}
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 text-[#516057]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Loading state for detail ── */}
        {isLoadingDetail && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-[#516057]">
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
          <div className="bg-white border border-[#e2e2e2] rounded-[4px] overflow-hidden shadow-lg">
            <div className="px-6 py-4 bg-[#1d2222] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden">
              <div className="flex flex-col relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-8 bg-[#7fb399] rounded-full"></div>
                  <p className="text-white text-base font-bold uppercase tracking-wider font-serif">
                    Credit Summary
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-[#9ca3af] text-xs font-medium">Reference:</span>
                  <span className="bg-[#3d4343] text-white font-mono font-semibold px-3 py-1 rounded-[4px] text-xs border border-[#3d4343]">
                    {selectedLicensePlateShort}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-6 relative z-10 bg-[#3d4343] px-4 py-2 rounded-[4px]">
                <div className="flex items-center gap-2 text-xs text-white font-medium">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#516057]" />
                  Expected
                </div>
                <div className="w-px h-4 bg-[#3d4343]"></div>
                <div className="flex items-center gap-2 text-xs text-white font-medium">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#7fb399]" />
                  Received
                </div>
              </div>
              
              <button
                onClick={handleViewDetails}
                className="px-5 py-2 text-xs font-bold bg-white text-[#516057] rounded-[4px] hover:bg-[#f5f2f1] transition-all duration-200 shadow-md flex-shrink-0 relative z-10 border border-[#e2e2e2]"
              >
                View Details →
              </button>
            </div>

            {/* Totals row */}
            <div className="grid grid-cols-2 divide-x divide-[#e2e2e2] border-b border-[#e2e2e2] bg-[#f5f2f1]">
              {[
                { label: "Total Expected", value: returnDetail.creditSummary.totalExpected, color: "text-[#516057]" },
                { label: "Total Received", value: returnDetail.creditSummary.totalReceived, color: "text-[#7fb399]" },
              ].map((stat) => (
                <div key={stat.label} className="px-4 py-3 text-center">
                  <p className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-0.5">{stat.label}</p>
                  <p className={`text-sm font-bold ${stat.color}`}>${stat.value.toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Progress bars */}
            {(() => {
              const expected = returnDetail.creditSummary.totalExpected;
              const received = returnDetail.creditSummary.totalReceived;
              const receivedPct = expected > 0 ? Math.min((received / expected) * 100, 100) : 0;
              return (
                <div className="px-6 py-5 bg-white space-y-4">
                  {/* Expected bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-[#505454] uppercase tracking-wide">Expected</span>
                      <span className="text-[10px] font-bold text-[#516057]">${expected.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-[#f5f2f1] rounded-full h-3 overflow-hidden border border-[#e2e2e2]">
                      <div
                        className="h-full bg-[#516057] rounded-full transition-all duration-700"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  {/* Received bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-[#7fb399] uppercase tracking-wide">Received</span>
                      <span className="text-[10px] font-bold text-[#7fb399]">${received.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-[#f5f2f1] rounded-full h-3 overflow-hidden border border-[#e2e2e2]">
                      <div
                        className="h-full bg-[#7fb399] rounded-full transition-all duration-700"
                        style={{ width: `${receivedPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Percentage received pill */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#e2e2e2]">
                    <span className="text-[10px] text-[#6b7280]">Credit collection rate</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      receivedPct >= 80
                        ? "bg-[#516057]/10 text-[#516057] border-[#516057]/20"
                        : receivedPct >= 40
                        ? "bg-[#ad916a]/10 text-[#ad916a] border-[#ad916a]/20"
                        : "bg-red-50 text-red-600 border-red-200"
                    }`}>
                      {receivedPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* ── Pie Charts Box ── */}
        {returnDetail && !isLoadingDetail && (
          <div className="bg-white border border-[#e2e2e2] rounded-[4px] p-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e2e2e2]">
              <h3 className="text-sm font-bold text-[#000000] uppercase tracking-wide font-serif">Product Value Breakdown</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Donut 1 - Returnable vs Non-Returnable */}
              <div className="flex flex-col items-center">
                <p className="text-xs font-semibold text-[#516057] text-center mb-3 bg-[#516057]/10 px-3 py-1 rounded-full border border-[#516057]/20">
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
                          contentStyle={{ borderRadius: 8, borderColor: "#e2e2e2", fontSize: 12 }}
                          formatter={(value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full mt-2 space-y-1.5">
                      {returnableDonutData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: RETURNABLE_COLORS[index % RETURNABLE_COLORS.length] }} />
                            <span className="text-xs text-[#505454]">{entry.name}</span>
                          </div>
                          <span className="text-xs font-semibold text-[#000000]">
                            ${entry.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[#9ca3af] py-8">No product value data available</p>
                )}
              </div>

              {/* Donut 2 - Non-Returnable Reasons */}
              <div className="flex flex-col items-center">
                <p className="text-xs font-semibold text-[#ad916a] text-center mb-3 bg-[#ad916a]/20 px-3 py-1 rounded-full border border-[#ad916a]/30">
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
                          contentStyle={{ borderRadius: 8, borderColor: "#e2e2e2", fontSize: 12 }}
                          formatter={(value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full mt-2 space-y-1.5">
                      {nonReturnableReasonsData.map((entry, index) => (
                        <div key={entry.reason} className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: NON_RETURNABLE_COLORS[index % NON_RETURNABLE_COLORS.length] }} />
                            <span className="text-xs text-[#505454]">{entry.reason}</span>
                          </div>
                          <span className="text-xs font-semibold text-[#000000]">
                            ${entry.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[#9ca3af] py-8">No non-returnable items in this return</p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── Line / Area Chart Box ── */}
        {returnDetail && !isLoadingDetail && (
          <div className="bg-white border border-[#e2e2e2] rounded-[4px] p-4">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#e2e2e2]">
              <h3 className="text-sm font-bold text-[#000000] uppercase tracking-wide font-serif">
                Product Values Over Time
              </h3>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-[#516057] font-medium">
                  <span className="inline-block w-5 h-0.5 bg-[#516057] rounded" />
                  Returnable
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#ad916a] font-medium">
                  <span className="inline-block w-5 h-0.5 bg-[#ad916a] rounded" />
                  Non-Returnable
                </span>
              </div>
            </div>
            {productValueLineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={productValueLineData}>
                  <defs>
                    <linearGradient id="colorReturnable" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={NORDIC_SAGE} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={NORDIC_SAGE} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNonReturnable" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={NORDIC_TAN} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={NORDIC_TAN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e2" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 7, fill: "#505454" }}
                    angle={-45}
                    textAnchor="end"
                    height={55}
                    stroke="#e2e2e2"
                    label={{ value: "Service Date", position: "insideBottom", offset: -5, fontSize: 9, fill: "#505454" }}
                  />
                  <YAxis
                    tick={{ fontSize: 8, fill: "#505454" }}
                    stroke="#e2e2e2"
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    label={{ value: "Amount ($)", angle: -90, position: "insideLeft", fontSize: 9, fill: "#505454" }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, borderColor: "#e2e2e2", fontSize: 12 }}
                    formatter={(value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                  />
                  <Area type="monotone" dataKey="returnableValue" stroke={NORDIC_SAGE} strokeWidth={2} fill="url(#colorReturnable)" dot={{ r: 2, fill: NORDIC_SAGE }} name="Returnable Value" />
                  <Area type="monotone" dataKey="nonReturnableValue" stroke={NORDIC_TAN} strokeWidth={2} fill="url(#colorNonReturnable)" dot={{ r: 2, fill: NORDIC_TAN }} name="Non-Returnable Value" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#9ca3af] text-center py-8">No timeline data available</p>
            )}
          </div>
        )}

        {/* ── Summary Banners ── */}
        {returnDetail && !isLoadingDetail && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#516057] rounded-[4px] px-6 py-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">Returnable Value</p>
                <p className="text-white text-xl font-bold">
                  ${returnDetail.productValueBreakdown.returnable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-[#ad916a] rounded-[4px] px-6 py-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">Non-Returnable Value</p>
                <p className="text-white text-xl font-bold">
                  ${returnDetail.productValueBreakdown.nonReturnable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
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
