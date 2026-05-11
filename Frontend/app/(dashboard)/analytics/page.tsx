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
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
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

const COLORS = ['#516057', '#ad916a', '#1d2222', '#505454', '#e2e2e2', '#6b7280'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  finalized: 'Finalized',
  received: 'Received',
  closed_out: 'Closed Out',
  cancelled: 'Cancelled',
};

const PRODUCT_SORT_OPTIONS = [
  { value: 'totalValue', label: 'Total Value' },
  { value: 'totalQuantity', label: 'Quantity' },
  { value: 'returnCount', label: 'Return Count' },
  { value: 'productName', label: 'Product Name' },
  { value: 'manufacturer', label: 'Manufacturer' },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<PharmacyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'30d' | '90d' | '6m' | '1y' | 'all'>('1y');
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'performance' | 'products' | 'recent'>('overview');
  
  // Products table pagination and sorting
  const [productsSortBy, setProductsSortBy] = useState('totalValue');
  const [productsSortOrder, setProductsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [productsPage, setProductsPage] = useState(1);
  const [productsPerPage] = useState(10);

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
        <div className="bg-white p-3 border border-[#e2e2e2] rounded-[4px] shadow-lg">
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

  // Products sorting and pagination logic
  const getSortedAndPaginatedProducts = () => {
    if (!data?.topProducts) return { paginatedProducts: [], totalPages: 0, total: 0 };
    
    // Sort products
    const sortedProducts = [...data.topProducts].sort((a, b) => {
      let aValue, bValue;
      
      switch (productsSortBy) {
        case 'totalValue':
          aValue = a.totalValue;
          bValue = b.totalValue;
          break;
        case 'totalQuantity':
          aValue = a.totalQuantity;
          bValue = b.totalQuantity;
          break;
        case 'returnCount':
          aValue = a.returnCount;
          bValue = b.returnCount;
          break;
        case 'productName':
          aValue = a.productName.toLowerCase();
          bValue = b.productName.toLowerCase();
          break;
        case 'manufacturer':
          aValue = a.manufacturer.toLowerCase();
          bValue = b.manufacturer.toLowerCase();
          break;
        default:
          aValue = a.totalValue;
          bValue = b.totalValue;
      }
      
      if (typeof aValue === 'string') {
        return productsSortOrder === 'asc' 
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }
      
      return productsSortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    // Paginate
    const total = sortedProducts.length;
    const totalPages = Math.ceil(total / productsPerPage);
    const startIndex = (productsPage - 1) * productsPerPage;
    const paginatedProducts = sortedProducts.slice(startIndex, startIndex + productsPerPage);
    
    return { paginatedProducts, totalPages, total };
  };

  const handleProductsSortChange = (newSortBy: string) => {
    setProductsSortBy(newSortBy);
    setProductsPage(1); // Reset to first page
  };

  const handleProductsSortOrderToggle = () => {
    setProductsSortOrder(productsSortOrder === 'asc' ? 'desc' : 'asc');
    setProductsPage(1); // Reset to first page
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
            <h1 className="text-2xl font-bold">Analytics & Insights</h1>
            <p className="text-sm text-muted-foreground">
              Your pharmacy performance metrics and financial analytics
            </p>
          </div>
          <div className="flex items-center gap-2 border border-[#e2e2e2] rounded-[4px] px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#516057] rounded-[4px]"
            >
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="6m">Last 6 months</option>
              <option value="1y">Last 12 months</option>
              <option value="all">All Time</option>
            </select>
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
                  <CardHeader className="pb-2"><div className="h-4 bg-[#e2e2e2] rounded w-24" /></CardHeader>
                  <CardContent><div className="h-8 bg-[#e2e2e2] rounded w-32" /></CardContent>
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
              <Card className="border-l-4 border-l-[#516057]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Returnable Value
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-[#516057]" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-[#516057]">
                    {formatCurrency(data.overview.totalReturnableValue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Non-returnable: {formatCurrency(data.overview.totalNonReturnableValue)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-[#516057]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Returns
                  </CardTitle>
                  <Package className="h-4 w-4 text-[#516057]" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{data.overview.totalReturns}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{data.overview.totalItems} items total</p>
                    {data.overview.inProgressReturns > 0 && (
                      <Badge variant="info" className="text-xs">{data.overview.inProgressReturns} in progress</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-[#1d2222]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Net Payout
                  </CardTitle>
                  <Percent className="h-4 w-4 text-[#1d2222]" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-[#1d2222]">
                    {formatCurrency(data.creditsSummary.totalPayout)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid: {formatCurrency(data.creditsSummary.paidPayout)} | Pending: {formatCurrency(data.creditsSummary.pendingPayout)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-[#ad916a]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Recovery Rate
                  </CardTitle>
                  <Target className="h-4 w-4 text-[#ad916a]" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-[#516057]">
                    {data.creditsSummary.estimatedVsActual?.recoveryPercent || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.overview.completedReturns} of {data.overview.totalReturns} completed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-[#e2e2e2] overflow-x-auto bg-[#f5f2f1] rounded-[4px] p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-[4px] border transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-[#516057] bg-white text-[#516057] shadow-sm'
                        : 'border-transparent text-[#505454] hover:text-[#000000] hover:bg-white/50 hover:border-[#e2e2e2]'
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
                            stroke="#516057"
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            name="Total Value"
                            strokeWidth={2}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="returns"
                            stroke="#516057"
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
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-[#f5f2f1] rounded-[4px]">
                          <span className="text-sm text-muted-foreground">Average Items per Return</span>
                          <span className="font-bold">{data.overview.avgItemsPerReturn}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#f5f2f1] rounded-[4px]">
                          <span className="text-sm text-muted-foreground">Total Credits Received</span>
                          <span className="font-bold text-[#516057]">{formatCurrency(data.creditsSummary.totalCreditsReceived)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#f5f2f1] rounded-[4px]">
                          <span className="text-sm text-muted-foreground">Company Fee</span>
                          <span className="font-bold text-[#ad916a]">{formatCurrency(data.creditsSummary.totalCompanyFee)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#f5f2f1] rounded-[4px]">
                          <span className="text-sm text-muted-foreground">GPO Share</span>
                          <span className="font-bold text-[#1d2222]">{formatCurrency(data.creditsSummary.totalGpoShare)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#f5f2f1] rounded-[4px] border border-[#e2e2e2]">
                          <span className="text-sm font-medium text-[#000000]">Your Net Payout</span>
                          <span className="font-bold text-[#505454]">{formatCurrency(data.creditsSummary.totalPayout)}</span>
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
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Revenue Summary</CardTitle>
                        <CardDescription>Complete financial breakdown with fee transparency</CardDescription>
                      </div>
                      <DollarSign className="h-5 w-5 text-[#516057]" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 bg-white rounded-[4px] border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-muted-foreground">Total Credits</p>
                          <TrendingUp className="h-4 w-4 text-[#516057]" />
                        </div>
                        <p className="text-xl font-bold text-[#516057] mb-2">
                          {formatCurrency(data.creditsSummary.totalCreditsReceived)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total credits received from returns</p>
                        <div className="mt-3 pt-3 border-t space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Payments:</span>
                            <span className="font-semibold">{data.creditsSummary.totalPayments}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-[4px] border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-muted-foreground">Fees & Deductions</p>
                          <Percent className="h-4 w-4 text-[#ad916a]" />
                        </div>
                        <p className="text-xl font-bold text-[#ad916a] mb-2">
                          -{formatCurrency(data.creditsSummary.totalCompanyFee + data.creditsSummary.totalGpoShare)}
                        </p>
                        <p className="text-xs text-muted-foreground">Company fee + GPO share</p>
                        <div className="mt-3 pt-3 border-t space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Company Fee:</span>
                            <span className="font-semibold text-[#ad916a]">-{formatCurrency(data.creditsSummary.totalCompanyFee)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">GPO Share:</span>
                            <span className="font-semibold text-[#ad916a]">-{formatCurrency(data.creditsSummary.totalGpoShare)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-[#f5f2f1] rounded-[4px] border border-[#e2e2e2] shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-[#000000]">Your Net Payout</p>
                          <DollarSign className="h-4 w-4 text-[#505454]" />
                        </div>
                        <p className="text-xl font-bold text-[#505454] mb-2">
                          {formatCurrency(data.creditsSummary.totalPayout)}
                        </p>
                        <p className="text-xs text-[#505454]">Amount you receive after deductions</p>
                        <div className="mt-3 pt-3 border-t border-[#e2e2e2] space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#505454]">Paid:</span>
                            <span className="font-semibold text-[#000000]">{formatCurrency(data.creditsSummary.paidPayout)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#505454]">Pending:</span>
                            <span className="font-semibold text-[#000000]">{formatCurrency(data.creditsSummary.pendingPayout)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Estimated vs Actual */}
                    {data.creditsSummary.estimatedVsActual && (
                      <div className="mt-6 p-4 bg-[#f5f2f1] rounded-[4px] border">
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
                            <span className="font-semibold text-[#516057]">{formatCurrency(data.creditsSummary.estimatedVsActual.actualReceived)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded">
                            <span className="text-muted-foreground">Recovery Rate:</span>
                            <span className="font-bold text-lg text-[#516057]">{data.creditsSummary.estimatedVsActual.recoveryPercent}%</span>
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
                            stroke="#516057"
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
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Performance Metrics</CardTitle>
                        <CardDescription>Key operational indicators</CardDescription>
                      </div>
                      <Target className="h-5 w-5 text-[#516057]" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="p-4 bg-white rounded-[4px] border shadow-sm">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Completion Rate</p>
                        <p className="text-xl font-bold text-[#516057] mb-2">
                          {data.overview.totalReturns > 0 ? ((data.overview.completedReturns / data.overview.totalReturns) * 100).toFixed(1) : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">{data.overview.completedReturns} of {data.overview.totalReturns} completed</p>
                        <div className="h-2 bg-[#e2e2e2] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#f5f2f1]0 transition-all"
                            style={{ width: `${data.overview.totalReturns > 0 ? (data.overview.completedReturns / data.overview.totalReturns) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-[4px] border shadow-sm">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Recovery Rate</p>
                        <p className="text-xl font-bold text-[#516057] mb-2">
                          {data.creditsSummary.estimatedVsActual?.recoveryPercent || 0}%
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">Credits received vs estimated</p>
                        <div className="h-2 bg-[#e2e2e2] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#f5f2f1]0 transition-all"
                            style={{ width: `${Math.min(data.creditsSummary.estimatedVsActual?.recoveryPercent || 0, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-[4px] border shadow-sm">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Total Items Returned</p>
                        <p className="text-xl font-bold text-[#1d2222] mb-2">{data.overview.totalItems}</p>
                        <p className="text-xs text-muted-foreground">{data.overview.avgItemsPerReturn} avg per return</p>
                      </div>

                      <div className="p-4 bg-white rounded-[4px] border shadow-sm">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Payment Status</p>
                        <p className="text-xl font-bold text-[#ad916a] mb-2">{data.creditsSummary.totalPayments}</p>
                        <p className="text-xs text-muted-foreground">Total payment records</p>
                      </div>
                    </div>

                    {/* Performance Summary */}
                    <div className="mt-6 p-4 bg-[#f5f2f1] rounded-[4px] border">
                      <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">Total Returns</span>
                            <span className="font-bold">{data.overview.totalReturns}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">Completed</span>
                            <span className="font-bold text-[#516057]">{data.overview.completedReturns}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">In Progress</span>
                            <span className="font-bold text-[#516057]">{data.overview.inProgressReturns}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">Returnable Value</span>
                            <span className="font-bold">{formatCurrency(data.overview.totalReturnableValue)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">Credits Received</span>
                            <span className="font-bold text-[#516057]">{formatCurrency(data.creditsSummary.totalCreditsReceived)}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded">
                            <span className="text-sm text-muted-foreground">Net Payout</span>
                            <span className="font-bold text-[#1d2222]">{formatCurrency(data.creditsSummary.totalPayout)}</span>
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Top Returned Products</CardTitle>
                        <CardDescription>
                          {(() => {
                            const { total } = getSortedAndPaginatedProducts();
                            return `${total} products with return data`;
                          })()}
                        </CardDescription>
                      </div>
                      
                      {/* Sorting Controls */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Sort by:</label>
                        <select
                          value={productsSortBy}
                          onChange={(e) => handleProductsSortChange(e.target.value)}
                          className="px-2 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] bg-white"
                        >
                          {PRODUCT_SORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleProductsSortOrderToggle}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-[#e2e2e2] rounded-[4px] bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]"
                          title={`Sort ${productsSortOrder === 'asc' ? 'ascending' : 'descending'}`}
                        >
                          {productsSortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          <span className="hidden sm:inline">{productsSortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const { paginatedProducts, totalPages, total } = getSortedAndPaginatedProducts();
                      
                      if (total === 0) {
                        return (
                          <div className="h-64 flex items-center justify-center text-muted-foreground">
                            No product data available
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Products Bar Chart - Show top 10 for chart */}
                          <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={data.topProducts.slice(0, 10)} layout="vertical">
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
                              <Bar dataKey="totalValue" fill="#516057" name="Total Value" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>

                          {/* Products Table */}
                          <div className="mt-6 overflow-x-auto">
                            <table className="w-full table-auto">
                              <thead>
                                <tr className="bg-[#516057] border-b-2 border-[#516057]">
                                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Product</th>
                                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">NDC</th>
                                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Manufacturer</th>
                                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Qty</th>
                                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Value</th>
                                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Returns</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedProducts.map((product, idx) => (
                                  <tr key={`${product.ndc}-${idx}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]/40'} hover:bg-[#f5f2f1] transition-colors border-b border-[#f3f4f6]`}>
                                    <td className="px-4 py-3"><span className="text-sm text-[#000000] font-medium">{product.productName}</span></td>
                                    <td className="px-4 py-3"><span className="text-sm text-[#505454] font-mono">{product.ndc}</span></td>
                                    <td className="px-4 py-3"><span className="text-sm text-[#505454]">{product.manufacturer}</span></td>
                                    <td className="px-4 py-3 text-right"><span className="text-sm text-[#000000]">{product.totalQuantity}</span></td>
                                    <td className="px-4 py-3 text-right"><span className="text-sm text-[#000000] font-semibold text-[#516057]">{formatCurrency(product.totalValue)}</span></td>
                                    <td className="px-4 py-3 text-right"><span className="text-sm text-[#000000]">{product.returnCount}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-[#e2e2e2] bg-white rounded-b-[4px]">
                              <p className="text-sm text-[#6b7280] font-medium">
                                Page <span className="font-bold text-[#000000]">{productsPage}</span> of <span className="font-bold text-[#000000]">{totalPages}</span> (<span className="font-bold text-[#000000]">{total}</span> total)
                              </p>
                              <div className="flex items-center gap-1">
                                {/* Previous Button */}
                                <button 
                                  onClick={() => setProductsPage(p => Math.max(1, p - 1))} 
                                  disabled={productsPage <= 1} 
                                  className="p-1.5 border border-[#e2e2e2] rounded-[4px] disabled:opacity-40 hover:bg-[#f5f2f1] transition-colors"
                                  title="Previous page"
                                >
                                  <ChevronLeft className="w-4 h-4 text-[#505454]" />
                                </button>

                                {/* Page Numbers */}
                                {(() => {
                                  const pages = [];
                                  
                                  if (totalPages <= 7) {
                                    // Show all pages if 7 or fewer
                                    for (let i = 1; i <= totalPages; i++) {
                                      pages.push(i);
                                    }
                                  } else {
                                    // Always show first page
                                    pages.push(1);
                                    
                                    if (productsPage <= 4) {
                                      // Show pages 1,2,3,4,5...last
                                      for (let i = 2; i <= 5; i++) {
                                        pages.push(i);
                                      }
                                      if (totalPages > 6) pages.push('...');
                                      pages.push(totalPages);
                                    } else if (productsPage >= totalPages - 3) {
                                      // Show pages 1...last-4,last-3,last-2,last-1,last
                                      if (totalPages > 6) pages.push('...');
                                      for (let i = totalPages - 4; i <= totalPages; i++) {
                                        pages.push(i);
                                      }
                                    } else {
                                      // Show pages 1...current-1,current,current+1...last
                                      pages.push('...');
                                      for (let i = productsPage - 1; i <= productsPage + 1; i++) {
                                        pages.push(i);
                                      }
                                      pages.push('...');
                                      pages.push(totalPages);
                                    }
                                  }
                                  
                                  return pages.map((pageNum, index) => 
                                    pageNum === '...' ? (
                                      <span key={`ellipsis-${index}`} className="px-2 py-1.5 text-sm text-[#9ca3af]">...</span>
                                    ) : (
                                      <button
                                        key={pageNum}
                                        onClick={() => setProductsPage(pageNum as number)}
                                        className={`px-3 py-1.5 text-sm border rounded-[4px] transition-colors ${
                                          pageNum === productsPage
                                            ? 'border-[#516057] bg-[#516057] text-white font-semibold'
                                            : 'border-[#e2e2e2] text-[#505454] hover:bg-[#f5f2f1]'
                                        }`}
                                      >
                                        {pageNum}
                                      </button>
                                    )
                                  );
                                })()}

                                {/* Next Button */}
                                <button 
                                  onClick={() => setProductsPage(p => Math.min(totalPages, p + 1))} 
                                  disabled={productsPage >= totalPages} 
                                  className="p-1.5 border border-[#e2e2e2] rounded-[4px] disabled:opacity-40 hover:bg-[#f5f2f1] transition-colors"
                                  title="Next page"
                                >
                                  <ChevronRight className="w-4 h-4 text-[#505454]" />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
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
                          <div key={ret.id} className="p-4 border border-[#e2e2e2] rounded-[4px] hover:shadow-md transition-shadow">
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
