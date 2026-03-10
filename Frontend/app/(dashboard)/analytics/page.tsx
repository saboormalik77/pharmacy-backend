"use client";

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
  CreditCard,
  Building2,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { mockReturns } from '@/data/mockReturns';
import { mockCredits } from '@/data/mockCredits';
import { calculateCommission, DEFAULT_COMMISSION_RATE } from '@/lib/utils/commission';
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

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'ytd' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'performance' | 'distributors' | 'products'>('overview');

  // Calculate comprehensive metrics
  const totalReturns = mockReturns.length;
  const completedReturns = mockReturns.filter(r => r.status === 'completed').length;
  const totalEstimatedValue = mockReturns.reduce((sum, r) => sum + r.totalEstimatedCredit, 0);
  const totalReceived = mockCredits
    .filter(c => c.status === 'received')
    .reduce((sum, c) => sum + (c.actualAmount || 0), 0);

  // Commission calculations
  const totalGrossPayments = totalReceived;
  const totalCommission = calculateCommission(totalGrossPayments).amount;
  const netAmountReceived = totalGrossPayments - totalCommission;

  const conversionRate = totalReturns > 0 ? (completedReturns / totalReturns) * 100 : 0;
  const creditRecoveryRate = totalEstimatedValue > 0 ? (totalReceived / totalEstimatedValue) * 100 : 0;
  const averageProcessingDays = 28;
  const averageReturnValue = totalReturns > 0 ? totalEstimatedValue / totalReturns : 0;

  // Enhanced trend data
  const returnsTrend = [
    { month: 'Jan', returns: 12, gross: 8500, commission: 425, net: 8075 },
    { month: 'Feb', returns: 15, gross: 11200, commission: 560, net: 10640 },
    { month: 'Mar', returns: 18, gross: 13500, commission: 675, net: 12825 },
    { month: 'Apr', returns: 14, gross: 10200, commission: 510, net: 9690 },
    { month: 'May', returns: 20, gross: 15200, commission: 760, net: 14440 },
    { month: 'Jun', returns: 16, gross: 11800, commission: 590, net: 11210 },
  ];

  const topReturnedDrugs = [
    { name: 'Lipitor 20mg', gross: 4500, commission: 225, net: 4275, count: 8 },
    { name: 'Metformin 500mg', gross: 3200, commission: 160, net: 3040, count: 12 },
    { name: 'Lisinopril 10mg', gross: 2800, commission: 140, net: 2660, count: 6 },
    { name: 'Amoxicillin 500mg', gross: 1800, commission: 90, net: 1710, count: 10 },
    { name: 'Omeprazole 20mg', gross: 1500, commission: 75, net: 1425, count: 5 },
  ];

  const distributorPerformance = [
    { name: 'Cardinal Health', payments: 8, gross: 12500, net: 11875, avgDays: 25 },
    { name: 'McKesson', payments: 6, gross: 9800, net: 9310, avgDays: 28 },
    { name: 'AmerisourceBergen', payments: 5, gross: 7200, net: 6840, avgDays: 32 },
    { name: 'H.D. Smith', payments: 3, gross: 4500, net: 4275, avgDays: 35 },
  ];

  const manufacturerData = [
    { name: 'Pfizer', value: 5200, days: 28, returns: 12 },
    { name: 'Merck', value: 3800, days: 32, returns: 8 },
    { name: 'Teva', value: 2900, days: 35, returns: 6 },
    { name: 'GlaxoSmithKline', value: 2100, days: 45, returns: 4 },
  ];

  const statusData = [
    { name: 'Completed', value: completedReturns, color: '#10b981' },
    { name: 'Processing', value: mockReturns.filter(r => r.status === 'processing').length, color: '#3b82f6' },
    { name: 'In Transit', value: mockReturns.filter(r => r.status === 'in_transit').length, color: '#f59e0b' },
    { name: 'Draft', value: mockReturns.filter(r => r.status === 'draft').length, color: '#6b7280' },
  ];

  const paymentStatusData = [
    { name: 'Completed', value: 8, color: '#10b981' },
    { name: 'Partial', value: 2, color: '#f59e0b' },
    { name: 'Pending', value: 3, color: '#3b82f6' },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6b7280', '#ef4444', '#8b5cf6'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' && entry.value > 1000 
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
    { id: 'distributors', label: 'Distributors', icon: Building2 },
    { id: 'products', label: 'Products', icon: Package },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Analytics & Insights</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Comprehensive performance metrics and financial analytics
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
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="ytd">Year to Date</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <Button onClick={() => alert('Export report functionality')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Enhanced KPI Cards - Always Visible */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Amount Received
              </CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">{formatCurrency(netAmountReceived)}</div>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs text-muted-foreground">After {DEFAULT_COMMISSION_RATE}% commission</p>
                <Badge variant="success" className="text-xs">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +8.2%
                </Badge>
              </div>
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
              <div className="text-2xl sm:text-3xl font-bold">{totalReturns}</div>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs text-muted-foreground">Active returns</p>
                <Badge variant="success" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Platform Commission
              </CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Percent className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-purple-600">{formatCurrency(totalCommission)}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {DEFAULT_COMMISSION_RATE}% of {formatCurrency(totalGrossPayments)}
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
              <div className="text-2xl sm:text-3xl font-bold text-green-600">{creditRecoveryRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-2">
                {completedReturns} of {totalReturns} completed
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
            {/* Financial Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Performance</CardTitle>
                <CardDescription>Gross payments, commission, and net amounts over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={returnsTrend}>
                    <defs>
                      <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="gross"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorGross)"
                      name="Gross Payments"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorNet)"
                      name="Net Amount (After Commission)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="commission"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Commission"
                      dot={{ fill: '#f59e0b', r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Returns Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Returns Volume Trend</CardTitle>
                  <CardDescription>Monthly returns count</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={returnsTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="returns"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        name="Returns Count"
                        dot={{ fill: '#3b82f6', r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Payment Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Status</CardTitle>
                  <CardDescription>Distribution of payment statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            {/* Revenue Summary */}
            <Card className="bg-gradient-to-br from-green-50 via-white to-green-50 border-2 border-green-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-green-800 text-xl">Revenue Summary</CardTitle>
                    <CardDescription className="text-green-700">
                      Complete financial breakdown with commission transparency
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
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Gross Payments
                      </p>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">
                      {formatCurrency(totalGrossPayments)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total received from suppliers
                    </p>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Payments:</span>
                        <span className="font-semibold">13</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Avg per payment:</span>
                        <span className="font-semibold">{formatCurrency(totalGrossPayments / 13)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-white rounded-lg border-2 border-orange-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Platform Commission
                      </p>
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Percent className="h-4 w-4 text-orange-600" />
                      </div>
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold text-orange-600 mb-2">
                      -{formatCurrency(totalCommission)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {DEFAULT_COMMISSION_RATE}% commission rate
                    </p>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Commission rate:</span>
                        <span className="font-semibold">{DEFAULT_COMMISSION_RATE}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Per payment avg:</span>
                        <span className="font-semibold">{formatCurrency(totalCommission / 13)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-green-100 to-green-50 rounded-lg border-2 border-green-300 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                        Net Amount Received
                      </p>
                      <div className="p-2 bg-green-200 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-700" />
                      </div>
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold text-green-700 mb-2">
                      {formatCurrency(netAmountReceived)}
                    </p>
                    <p className="text-xs text-green-700 font-medium">
                      Amount you receive after commission
                    </p>
                    <div className="mt-4 pt-4 border-t border-green-300">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-700">Net percentage:</span>
                        <span className="font-bold text-green-800">
                          {((netAmountReceived / totalGrossPayments) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-green-700">Avg per payment:</span>
                        <span className="font-bold text-green-800">
                          {formatCurrency(netAmountReceived / 13)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Breakdown Table */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
                    Financial Breakdown
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Gross:</span>
                        <span className="font-semibold">{formatCurrency(totalGrossPayments)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Commission ({DEFAULT_COMMISSION_RATE}%):</span>
                        <span className="font-semibold text-orange-600">-{formatCurrency(totalCommission)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-bold text-base">
                        <span>Net Amount:</span>
                        <span className="text-green-600">{formatCurrency(netAmountReceived)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Returns:</span>
                        <span className="font-semibold">{totalReturns}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="font-semibold text-green-600">{completedReturns}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Value:</span>
                        <span className="font-semibold">{formatCurrency(totalEstimatedValue)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recovery Rate:</span>
                        <span className="font-semibold text-green-600">{creditRecoveryRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Completion Rate:</span>
                        <span className="font-semibold">{conversionRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Processing:</span>
                        <span className="font-semibold">{averageProcessingDays} days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Trend Analysis</CardTitle>
                <CardDescription>6-month financial performance breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={returnsTrend}>
                    <defs>
                      <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="gross"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorGross)"
                      name="Gross Payments"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorNet)"
                      name="Net Amount"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="commission"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Commission"
                      dot={{ fill: '#f59e0b', r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <Card className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-blue-800 text-xl">Performance Metrics</CardTitle>
                    <CardDescription className="text-blue-700">
                      Key operational indicators and efficiency metrics
                    </CardDescription>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="p-5 bg-white rounded-lg border-2 border-green-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Completion Rate
                      </p>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Target className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-green-600 mb-2">
                      {conversionRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {completedReturns} of {totalReturns} returns completed
                    </p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${conversionRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-5 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Recovery Rate
                      </p>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {creditRecoveryRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Credits received vs estimated
                    </p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${creditRecoveryRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-5 bg-white rounded-lg border-2 border-purple-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Avg Processing Time
                      </p>
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-purple-600 mb-2">
                      {averageProcessingDays}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Days from return to payment
                    </p>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingDown className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">-3 days vs last month</span>
                    </div>
                  </div>

                  <div className="p-5 bg-white rounded-lg border-2 border-orange-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Avg Return Value
                      </p>
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <DollarSign className="h-4 w-4 text-orange-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-orange-600 mb-2">
                      {formatCurrency(averageReturnValue)}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Average value per return
                    </p>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+5.2% vs last month</span>
                    </div>
                  </div>
                </div>

                {/* Performance Summary Table */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
                    Performance Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-sm text-muted-foreground">Total Returns Processed</span>
                        <span className="font-bold">{totalReturns}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-sm text-muted-foreground">Successfully Completed</span>
                        <span className="font-bold text-green-600">{completedReturns}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-sm text-muted-foreground">In Progress</span>
                        <span className="font-bold text-blue-600">
                          {mockReturns.filter(r => r.status === 'processing').length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-sm text-muted-foreground">Total Estimated Value</span>
                        <span className="font-bold">{formatCurrency(totalEstimatedValue)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-sm text-muted-foreground">Total Received</span>
                        <span className="font-bold text-green-600">{formatCurrency(totalReceived)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-sm text-muted-foreground">Efficiency Score</span>
                        <span className="font-bold text-purple-600">
                          {((creditRecoveryRate + conversionRate) / 2).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Returns Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Returns Status Distribution</CardTitle>
                <CardDescription>Current status breakdown of all returns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {statusData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-5 h-5 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{item.value}</p>
                          <p className="text-xs text-muted-foreground">
                            {totalReturns > 0 ? ((item.value / totalReturns) * 100).toFixed(1) : 0}% of total
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manufacturer Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Manufacturer Performance</CardTitle>
                <CardDescription>Credit value and average processing time by manufacturer</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={manufacturerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis 
                      yAxisId="left"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      yAxisId="left" 
                      dataKey="value" 
                      fill="#3b82f6" 
                      name="Credit Value ($)" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="days" 
                      fill="#f59e0b" 
                      name="Avg Processing Days" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Distributors Tab */}
        {activeTab === 'distributors' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Distributor Performance
                </CardTitle>
                <CardDescription>Payment performance and efficiency by distributor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {distributorPerformance.map((dist, index) => {
                    const commission = calculateCommission(dist.gross);
                    return (
                      <div key={index} className="p-5 border-2 rounded-lg hover:shadow-md transition-all bg-white">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <h4 className="font-bold text-lg">{dist.name}</h4>
                              <Badge variant="secondary" className="text-sm">{dist.payments} payments</Badge>
                              <Badge variant="info" className="text-sm">{dist.avgDays} avg days</Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Gross Amount</p>
                                <p className="text-lg font-bold text-blue-600">{formatCurrency(dist.gross)}</p>
                              </div>
                              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Commission</p>
                                <p className="text-lg font-bold text-orange-600">-{formatCurrency(commission.amount)}</p>
                              </div>
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Net Amount</p>
                                <p className="text-lg font-bold text-green-600">{formatCurrency(dist.net)}</p>
                              </div>
                              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Avg Days</p>
                                <p className="text-lg font-bold text-purple-600">{dist.avgDays} days</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                <CardDescription>Most valuable returns with commission breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={topReturnedDrugs} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number" 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={140}
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="gross" stackId="a" fill="#3b82f6" name="Gross Amount" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="commission" stackId="a" fill="#f59e0b" name="Commission" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="net" stackId="a" fill="#10b981" name="Net Amount" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {topReturnedDrugs.map((drug, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border-2 hover:border-blue-300 transition-colors">
                      <p className="text-sm font-bold mb-3">{drug.name}</p>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between pb-1 border-b">
                          <span className="text-muted-foreground">Gross:</span>
                          <span className="font-semibold">{formatCurrency(drug.gross)}</span>
                        </div>
                        <div className="flex justify-between pb-1 border-b">
                          <span className="text-muted-foreground">Commission:</span>
                          <span className="font-semibold text-orange-600">-{formatCurrency(drug.commission)}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-muted-foreground font-medium">Net:</span>
                          <span className="font-bold text-green-600">{formatCurrency(drug.net)}</span>
                        </div>
                        <div className="pt-2 mt-2 border-t text-center">
                          <span className="text-muted-foreground">{drug.count} returns</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
