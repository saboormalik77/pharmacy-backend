"use client";

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Clock,
  Target,
  Building2,
  Percent,
  ArrowUpRight,
  Calendar,
  BarChart3,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { analyticsService, PharmacyDashboardData } from '@/lib/api/services/analyticsService';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6b7280', '#ef4444', '#8b5cf6'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  finalized: 'Finalized',
  received: 'Received',
  closed_out: 'Closed Out',
  cancelled: 'Cancelled',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<PharmacyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'30d' | '90d' | '6m' | '1y' | 'all'>('1y');
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'performance' | 'products' | 'recent'>('overview');

  const getDateParams = useCallback(() => {
    const now = new Date();
    let periodStart: string | undefined;
    const periodEnd = now.toISOString().split('T')[0];

    switch (dateRange) {
      case '30d':
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90d':
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '6m':
        periodStart = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0];
        break;
      case '1y':
        periodStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
        break;
      case 'all':
      default:
        periodStart = undefined;
        break;
    }

    return { period_start: periodStart, period_end: periodEnd };
  }, [dateRange]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = getDateParams();
      const result = await analyticsService.getDashboard(params);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [getDateParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' && entry.value > 100
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'performance', label: 'Performance', icon: Target },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'recent', label: 'Recent Returns', icon: Clock },
  ];

  return (
    <DashboardLayout>
      <PermissionGuard permission="analytics:view">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Analytics & Insights</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Your pharmacy performance metrics and financial analytics
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="text-sm border-0 bg-transparent focus:outline-none"
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="6m">Last 6 months</option>
                <option value="1y">Last 12 months</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <Button onClick={fetchData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <Button onClick={fetchData} variant="outline" size="sm">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2"><div className="h-4 bg-gray-200 rounded w-24" /></CardHeader>
                  <CardContent><div className="h-8 bg-gray-200 rounded w-32" /></CardContent>
                </Card>
              ))}
            </div>
            <Card className="animate-pulse"><CardContent className="h-80" /></Card>
          </div>
        )}

        {/* Data Content */}
        {!loading && data && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Returnable Value
                  </CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                    {formatCurrency(data.overview.totalReturnableValue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Non-returnable: {formatCurrency(data.overview.totalNonReturnableValue)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Returns
                  </CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Package className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">{data.overview.totalReturns}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{data.overview.totalItems} items total</p>
                    {data.overview.inProgressReturns > 0 && (
                      <Badge variant="info" className="text-xs">{data.overview.inProgressReturns} in progress</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Net Payout
                  </CardTitle>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Percent className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                    {formatCurrency(data.creditsSummary.totalPayout)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid: {formatCurrency(data.creditsSummary.paidPayout)} | Pending: {formatCurrency(data.creditsSummary.pendingPayout)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Recovery Rate
                  </CardTitle>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Target className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">
                    {data.creditsSummary.estimatedVsActual?.recoveryPercent || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.overview.completedReturns} of {data.overview.totalReturns} completed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Returns Value Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle>Returns Value Trend</CardTitle>
                    <CardDescription>Monthly returns count and value over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.returnsTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={data.returnsTrend}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="period" stroke="#6b7280" style={{ fontSize: '12px' }} />
                          <YAxis
                            yAxisId="left"
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          />
                          <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '12px' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="totalValue"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            name="Total Value"
                            strokeWidth={2}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="returns"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Returns Count"
                            dot={{ fill: '#10b981', r: 4 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No trend data available for the selected period
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Overview Stats Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Completion Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Returns Completion</CardTitle>
                      <CardDescription>Completed vs in-progress returns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Completed', value: data.overview.completedReturns, color: '#10b981' },
                              { name: 'In Progress', value: data.overview.inProgressReturns, color: '#3b82f6' },
                              { name: 'Other', value: Math.max(0, data.overview.totalReturns - data.overview.completedReturns - data.overview.inProgressReturns), color: '#6b7280' },
                            ].filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                            outerRadius={90}
                            dataKey="value"
                          >
                            {[
                              { color: '#10b981' },
                              { color: '#3b82f6' },
                              { color: '#6b7280' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Statistics</CardTitle>
                      <CardDescription>Summary of your return activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-muted-foreground">Average Items per Return</span>
                          <span className="font-bold text-lg">{data.overview.avgItemsPerReturn}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-muted-foreground">Total Credits Received</span>
                          <span className="font-bold text-lg text-green-600">{formatCurrency(data.creditsSummary.totalCreditsReceived)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-muted-foreground">Company Fee</span>
                          <span className="font-bold text-lg text-orange-600">{formatCurrency(data.creditsSummary.totalCompanyFee)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-muted-foreground">GPO Share</span>
                          <span className="font-bold text-lg text-purple-600">{formatCurrency(data.creditsSummary.totalGpoShare)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-sm font-medium text-green-800">Your Net Payout</span>
                          <span className="font-bold text-xl text-green-700">{formatCurrency(data.creditsSummary.totalPayout)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Financial Tab */}
            {activeTab === 'financial' && (
              <div className="space-y-6">
                {/* Revenue Breakdown */}
                <Card className="bg-gradient-to-br from-green-50 via-white to-green-50 border-2 border-green-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-green-800 text-xl">Revenue Summary</CardTitle>
                        <CardDescription className="text-green-700">
                          Complete financial breakdown with fee transparency
                        </CardDescription>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-6 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Total Credits</p>
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <p className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">
                          {formatCurrency(data.creditsSummary.totalCreditsReceived)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total credits received from returns</p>
                        <div className="mt-4 pt-4 border-t space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Payments:</span>
                            <span className="font-semibold">{data.creditsSummary.totalPayments}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-white rounded-lg border-2 border-orange-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fees & Deductions</p>
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Percent className="h-4 w-4 text-orange-600" />
                          </div>
                        </div>
                        <p className="text-3xl sm:text-4xl font-bold text-orange-600 mb-2">
                          -{formatCurrency(data.creditsSummary.totalCompanyFee + data.creditsSummary.totalGpoShare)}
                        </p>
                        <p className="text-xs text-muted-foreground">Company fee + GPO share</p>
                        <div className="mt-4 pt-4 border-t space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Company Fee:</span>
                            <span className="font-semibold text-orange-600">-{formatCurrency(data.creditsSummary.totalCompanyFee)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">GPO Share:</span>
                            <span className="font-semibold text-orange-600">-{formatCurrency(data.creditsSummary.totalGpoShare)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-gradient-to-br from-green-100 to-green-50 rounded-lg border-2 border-green-300 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-green-800 uppercase tracking-wide">Your Net Payout</p>
                          <div className="p-2 bg-green-200 rounded-lg">
                            <DollarSign className="h-4 w-4 text-green-700" />
                          </div>
                        </div>
                        <p className="text-3xl sm:text-4xl font-bold text-green-700 mb-2">
                          {formatCurrency(data.creditsSummary.totalPayout)}
                        </p>
                        <p className="text-xs text-green-700 font-medium">Amount you receive after deductions</p>
                        <div className="mt-4 pt-4 border-t border-green-300 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-700">Paid:</span>
                            <span className="font-bold text-green-800">{formatCurrency(data.creditsSummary.paidPayout)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-700">Pending:</span>
                            <span className="font-bold text-green-800">{formatCurrency(data.creditsSummary.pendingPayout)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Estimated vs Actual */}
                    {data.creditsSummary.estimatedVsActual && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                        <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
                          Estimated vs Actual Recovery
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex justify-between items-center p-3 bg-white rounded">
                            <span className="text-muted-foreground">Estimated Value:</span>
                            <span className="font-semibold">{formatCurrency(data.creditsSummary.estimatedVsActual.estimatedValue)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded">
                            <span className="text-muted-foreground">Actual Received:</span>
                            <span className="font-semibold text-green-600">{formatCurrency(data.creditsSummary.estimatedVsActual.actualReceived)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded">
                            <span className="text-muted-foreground">Recovery Rate:</span>
                            <span className="font-bold text-lg text-green-600">{data.creditsSummary.estimatedVsActual.recoveryPercent}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Financial Trend */}
                {data.returnsTrend.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Returns Value Over Time</CardTitle>
                      <CardDescription>Monthly returns value trend</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data.returnsTrend}>
                          <defs>
                            <linearGradient id="colorValueFin" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="period" stroke="#6b7280" style={{ fontSize: '12px' }} />
                          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="totalValue"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorValueFin)"
                            name="Value"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-blue-800 text-xl">Performance Metrics</CardTitle>
                        <CardDescription className="text-blue-700">Key operational indicators</CardDescription>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Target className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="p-5 bg-white rounded-lg border-2 border-green-200 shadow-sm">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Completion Rate</p>
                        <p className="text-3xl font-bold text-green-600 mb-2">
                          {data.overview.totalReturns > 0 ? ((data.overview.completedReturns / data.overview.totalReturns) * 100).toFixed(1) : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">{data.overview.completedReturns} of {data.overview.totalReturns} completed</p>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${data.overview.totalReturns > 0 ? (data.overview.completedReturns / data.overview.totalReturns) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-5 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Recovery Rate</p>
                        <p className="text-3xl font-bold text-blue-600 mb-2">
                          {data.creditsSummary.estimatedVsActual?.recoveryPercent || 0}%
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">Credits received vs estimated</p>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${Math.min(data.creditsSummary.estimatedVsActual?.recoveryPercent || 0, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-5 bg-white rounded-lg border-2 border-purple-200 shadow-sm">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Total Items Returned</p>
                        <p className="text-3xl font-bold text-purple-600 mb-2">{data.overview.totalItems}</p>
                        <p className="text-xs text-muted-foreground">{data.overview.avgItemsPerReturn} avg per return</p>
                      </div>

                      <div className="p-5 bg-white rounded-lg border-2 border-orange-200 shadow-sm">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Payment Status</p>
                        <p className="text-3xl font-bold text-orange-600 mb-2">{data.creditsSummary.totalPayments}</p>
                        <p className="text-xs text-muted-foreground">Total payment records</p>
                      </div>
                    </div>

                    {/* Performance Summary */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                      <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">Total Returns</span>
                            <span className="font-bold">{data.overview.totalReturns}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">Completed</span>
                            <span className="font-bold text-green-600">{data.overview.completedReturns}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">In Progress</span>
                            <span className="font-bold text-blue-600">{data.overview.inProgressReturns}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">Returnable Value</span>
                            <span className="font-bold">{formatCurrency(data.overview.totalReturnableValue)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">Credits Received</span>
                            <span className="font-bold text-green-600">{formatCurrency(data.creditsSummary.totalCreditsReceived)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">Net Payout</span>
                            <span className="font-bold text-purple-600">{formatCurrency(data.creditsSummary.totalPayout)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Returned Products</CardTitle>
                    <CardDescription>Highest value products returned (top 10)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.topProducts.length > 0 ? (
                      <>
                        {/* Products Bar Chart */}
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={data.topProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              type="number"
                              stroke="#6b7280"
                              style={{ fontSize: '12px' }}
                              tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                            />
                            <YAxis
                              dataKey="productName"
                              type="category"
                              width={160}
                              stroke="#6b7280"
                              style={{ fontSize: '11px' }}
                              tickFormatter={(v) => v.length > 22 ? v.substring(0, 22) + '...' : v}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="totalValue" fill="#3b82f6" name="Total Value" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>

                        {/* Products Table */}
                        <div className="mt-6 overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">NDC</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Returns</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {data.topProducts.map((product, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium">{product.productName}</td>
                                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{product.ndc}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600">{product.manufacturer}</td>
                                  <td className="px-4 py-3 text-sm text-right">{product.totalQuantity}</td>
                                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{formatCurrency(product.totalValue)}</td>
                                  <td className="px-4 py-3 text-sm text-right">{product.returnCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No product data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Returns Tab */}
            {activeTab === 'recent' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Returns</CardTitle>
                    <CardDescription>Your most recent return transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.recentReturns.length > 0 ? (
                      <div className="space-y-3">
                        {data.recentReturns.map((ret) => (
                          <div key={ret.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-bold text-sm">{ret.licensePlate || ret.id.slice(0, 8)}</h4>
                                  <Badge variant={
                                    ret.status === 'completed' || ret.status === 'finalized' ? 'success' :
                                    ret.status === 'in_progress' ? 'info' :
                                    ret.status === 'cancelled' ? 'error' : 'secondary'
                                  } className="text-xs">
                                    {STATUS_LABELS[ret.status] || ret.status}
                                  </Badge>
                                  {ret.serviceType && (
                                    <Badge variant="secondary" className="text-xs">{ret.serviceType}</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Package className="h-3.5 w-3.5" />
                                    {ret.totalItems} items
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    {formatCurrency(ret.returnableValue)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatDate(ret.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-muted-foreground">
                        No recent returns found
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
      </PermissionGuard>
    </DashboardLayout>
  );
}
