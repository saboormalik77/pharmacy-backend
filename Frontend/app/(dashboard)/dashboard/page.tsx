"use client";

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NewDashboardUI } from '@/components/dashboard/NewDashboardUI';
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore';
import { authService } from '@/lib/api/services/authService';

export default function DashboardPage() {
  const pharmacyNameFromContext = usePharmacyContextStore((s) => s.pharmacyName);
  const pharmacyNameFromAuth = authService.getCurrentUser()?.pharmacy_name;
  const pharmacyName = pharmacyNameFromContext || pharmacyNameFromAuth || '';

  return (
    <DashboardLayout>
      <NewDashboardUI pharmacyName={pharmacyName} />
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIOUS DASHBOARD CODE — COMMENTED OUT (NOT REMOVED)
// ─────────────────────────────────────────────────────────────────────────────

/*
"use client";

import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  Package, 
  Building2,
  Loader2,
  Box,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
} from 'lucide-react';
import { dashboardService } from '@/lib/api/services';
import type { DashboardSummary, EarningsHistoryResponse, EarningsEstimationResponse } from '@/lib/api/services';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [earningsData, setEarningsData] = useState<EarningsHistoryResponse | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsEstimation, setEarningsEstimation] = useState<EarningsEstimationResponse | null>(null);
  const [estimationLoading, setEstimationLoading] = useState(true);
  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly');
  const [periods, setPeriods] = useState<number>(12);
  const [periodsInput, setPeriodsInput] = useState<string>('12');
  const [estimationPeriodType, setEstimationPeriodType] = useState<'monthly' | 'yearly'>('monthly');
  const [estimationPeriods, setEstimationPeriods] = useState<number>(12);
  const [estimationPeriodsInput, setEstimationPeriodsInput] = useState<string>('12');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const estimationDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get max periods based on period type
  const maxPeriods = periodType === 'monthly' ? 12 : 10;
  const maxEstimationPeriods = estimationPeriodType === 'monthly' ? 12 : 10;

  useEffect(() => {
    loadDashboardData();
    loadEarningsEstimation();
  }, []);

  useEffect(() => {
    loadEarningsHistory();
  }, [periodType, periods]);

  useEffect(() => {
    loadEarningsEstimation();
  }, [estimationPeriodType, estimationPeriods]);

  // Sync periodsInput when periods changes externally (e.g., when periodType changes)
  useEffect(() => {
    setPeriodsInput(periods.toString());
  }, [periods]);

  // Sync estimationPeriodsInput when estimationPeriods changes externally
  useEffect(() => {
    setEstimationPeriodsInput(estimationPeriods.toString());
  }, [estimationPeriods]);

  // Debounce periods input
  useEffect(() => {
    // Only debounce if the input value is different from current periods
    const inputValue = parseInt(periodsInput) || 1;
    if (inputValue === periods) {
      return; // No need to update if values match
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const value = parseInt(periodsInput) || 1;
      const clampedValue = Math.min(Math.max(1, value), maxPeriods);
      if (clampedValue !== periods) {
        setPeriods(clampedValue);
      }
    }, 800); // 800ms debounce delay

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [periodsInput, maxPeriods, periods]);

  // Debounce estimation periods input
  useEffect(() => {
    // Only debounce if the input value is different from current estimationPeriods
    const inputValue = parseInt(estimationPeriodsInput) || 1;
    if (inputValue === estimationPeriods) {
      return; // No need to update if values match
    }

    if (estimationDebounceTimerRef.current) {
      clearTimeout(estimationDebounceTimerRef.current);
    }

    estimationDebounceTimerRef.current = setTimeout(() => {
      const value = parseInt(estimationPeriodsInput) || 1;
      const clampedValue = Math.min(Math.max(1, value), maxEstimationPeriods);
      if (clampedValue !== estimationPeriods) {
        setEstimationPeriods(clampedValue);
      }
    }, 800); // 800ms debounce delay

    return () => {
      if (estimationDebounceTimerRef.current) {
        clearTimeout(estimationDebounceTimerRef.current);
      }
    };
  }, [estimationPeriodsInput, maxEstimationPeriods, estimationPeriods]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const summaryData = await dashboardService.getSummary();
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEarningsHistory = async () => {
    try {
      setEarningsLoading(true);
      const earningsHistory = await dashboardService.getEarningsHistory({
        periodType,
        periods,
      });
      setEarningsData(earningsHistory);
    } catch (err) {
      console.error('Failed to load earnings history:', err);
    } finally {
      setEarningsLoading(false);
    }
  };

  const loadEarningsEstimation = async () => {
    try {
      setEstimationLoading(true);
      const estimation = await dashboardService.getEarningsEstimation({
        periodType: estimationPeriodType,
        periods: estimationPeriods,
      });
      setEarningsEstimation(estimation);
    } catch (err) {
      console.error('Failed to load earnings estimation:', err);
    } finally {
      setEstimationLoading(false);
    }
  };

  // Prepare chart data
  const chartData = earningsData?.periodEarnings.map(item => ({
    period: item.label,
    earnings: item.earnings,
    documents: item.documentsCount,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-2 p-2">
        <h1 className="text-lg sm:text-xl font-bold text-[#000000]">Dashboard</h1>

        {/* Key Metrics * /}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <div className="p-2 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1] hover:bg-[var(--surface-container)] transition-all cursor-pointer shadow-sm hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-[#516057]" />
                  <p className="text-[10px] sm:text-xs text-[#516057] font-medium">Pharmacy Added Products</p>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#516057]" />
                ) : (
                  <p className="text-sm sm:text-base font-bold text-[#000000] whitespace-nowrap">{summary?.totalPharmacyAddedProducts ?? 0}</p>
                )}
              </div>
            </div>
            <div className="p-2 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1] hover:bg-[var(--surface-container)] transition-all cursor-pointer shadow-sm hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-[#516057]" />
                  <p className="text-[10px] sm:text-xs text-[#516057] font-medium">Top Distributors</p>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#516057]" />
                ) : (
                  <p className="text-sm sm:text-base font-bold text-[#000000] whitespace-nowrap">{summary?.topDistributorCount ?? 0}</p>
                )}
              </div>
            </div>
            <div className="p-2 rounded-[4px] border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all cursor-pointer shadow-sm hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Box className="h-3 w-3 text-blue-600" />
                  <p className="text-[10px] sm:text-xs text-blue-700 font-medium">Total Packages</p>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <p className="text-sm sm:text-base font-bold text-blue-900 whitespace-nowrap">{summary?.totalPackages ?? 0}</p>
                )}
              </div>
            </div>
            <div className="p-2 rounded-[4px] border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-all cursor-pointer shadow-sm hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <p className="text-[10px] sm:text-xs text-green-700 font-medium">Delivered Packages</p>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                ) : (
                  <p className="text-sm sm:text-base font-bold text-green-900 whitespace-nowrap">{summary?.deliveredPackages ?? 0}</p>
                )}
              </div>
            </div>
            <div className="p-2 rounded-[4px] border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 transition-all cursor-pointer shadow-sm hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-600" />
                  <p className="text-[10px] sm:text-xs text-red-700 font-medium">Non-Delivered Packages</p>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                ) : (
                  <p className="text-sm sm:text-base font-bold text-red-900 whitespace-nowrap">{summary?.nonDeliveredPackages ?? 0}</p>
                )}
              </div>
            </div>
        </div>

        {/* Earnings Cards * /}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Card className="border-2 border-[#e2e2e2]">
            <CardContent className="p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-[#516057]" />
                  <p className="text-[10px] sm:text-xs text-[#516057] font-medium">Total Earnings</p>
                </div>
                {earningsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#516057]" />
                ) : (
                  <p className="text-sm sm:text-base font-bold text-[#516057] whitespace-nowrap">
                    {earningsData ? formatCurrency(earningsData.totalEarnings) : '$0.00'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#e2e2e2]">
            <CardContent className="p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-[#516057]" />
                  <p className="text-[10px] sm:text-xs text-[#516057] font-medium">Total Documents</p>
                </div>
                {earningsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#516057]" />
                ) : (
                  <p className="text-sm sm:text-base font-bold text-[#516057] whitespace-nowrap">
                    {earningsData?.totalDocuments ?? 0}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts - Side by Side * /}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {/* Left Column - Earnings History Chart + Period Information * /}
          <div className="space-y-2">
            {/* Earnings History Chart * /}
            <Card className="border-2 border-[#e2e2e2]">
              <CardHeader className="p-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base">Earnings History</CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={periodType}
                      onChange={(e) => {
                        const newType = e.target.value as 'monthly' | 'yearly';
                        setPeriodType(newType);
                        // Adjust periods if it exceeds the new max
                        const newMax = newType === 'monthly' ? 12 : 10;
                        if (periods > newMax) {
                          setPeriods(newMax);
                          setPeriodsInput(newMax.toString());
                        }
                      }}
                      className="px-2 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057]"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      max={maxPeriods}
                      value={periodsInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPeriodsInput(value);
                      }}
                      className="w-20 px-2 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057]"
                      placeholder="Periods"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                {earningsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#516057]" />
                    <span className="ml-2 text-xs text-[#505454]">Loading earnings data...</span>
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="period" 
                        stroke="#6b7280"
                        style={{ fontSize: '10px' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '10px' }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value)}
                        labelStyle={{ color: '#374151', fontSize: '12px' }}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="earnings" fill="#14b8a6" name="Earnings" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-[#6b7280] text-xs">
                    No earnings data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Period Information * /}
          
          </div>

          {/* Right Column - Earnings Estimation Chart * /}
          <div>
            <Card className="border-2 border-[#e2e2e2]">
              <CardHeader className="p-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base">Earnings Estimation</CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={estimationPeriodType}
                      onChange={(e) => {
                        const newType = e.target.value as 'monthly' | 'yearly';
                        setEstimationPeriodType(newType);
                        // Adjust periods if it exceeds the new max
                        const newMax = newType === 'monthly' ? 12 : 10;
                        if (estimationPeriods > newMax) {
                          setEstimationPeriods(newMax);
                          setEstimationPeriodsInput(newMax.toString());
                        }
                      }}
                      className="px-2 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057]"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      max={maxEstimationPeriods}
                      value={estimationPeriodsInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEstimationPeriodsInput(value);
                      }}
                      className="w-20 px-2 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057]"
                      placeholder="Periods"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                {estimationLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#516057]" />
                    <span className="ml-2 text-xs text-[#505454]">Loading estimation data...</span>
                  </div>
                ) : earningsEstimation?.chartData && earningsEstimation.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={earningsEstimation.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="label" 
                        stroke="#6b7280"
                        style={{ fontSize: '10px' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '10px' }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value)}
                        labelStyle={{ color: '#374151', fontSize: '12px' }}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="actualEarnings" 
                        stroke="#14b8a6" 
                        strokeWidth={2}
                        name="Actual Earnings"
                        dot={{ r: 3 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="potentialEarnings" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        name="Potential Earnings"
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-[#6b7280] text-xs">
                    No estimation data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
*/
