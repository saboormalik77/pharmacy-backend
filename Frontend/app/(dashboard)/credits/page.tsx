"use client";

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  Package,
  Building2,
  Info,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react'
import { mockCredits } from '@/data/mockCredits'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { calculateCommission, DEFAULT_COMMISSION_RATE } from '@/lib/utils/commission'
import Link from 'next/link'
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
} from 'recharts'

export default function CreditsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'expected' | 'received' | 'overdue' | 'disputed'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'details'>('overview');

  // Calculate summary stats
  const expectedCredits = mockCredits
    .filter(c => c.status === 'expected')
    .reduce((sum, c) => sum + c.expectedAmount, 0)

  const receivedCredits = mockCredits
    .filter(c => c.status === 'received')
    .reduce((sum, c) => sum + (c.actualAmount || 0), 0)

  const overdueCredits = mockCredits
    .filter(c => c.status === 'overdue')
    .reduce((sum, c) => sum + c.expectedAmount, 0)

  const totalVariance = mockCredits
    .filter(c => c.variance !== undefined)
    .reduce((sum, c) => sum + (c.variance || 0), 0)

  // Commission calculations
  const totalCommission = calculateCommission(receivedCredits).amount;
  const netAmountReceived = receivedCredits - totalCommission;

  // Filter credits
  const filteredCredits = mockCredits.filter(credit => {
    const matchesSearch = !searchQuery ||
      credit.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      credit.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      credit.returnId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || credit.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  // Analytics Data
  const statusDistribution = [
    { name: 'Received', value: mockCredits.filter(c => c.status === 'received').length, amount: receivedCredits, color: '#10b981' },
    { name: 'Expected', value: mockCredits.filter(c => c.status === 'expected').length, amount: expectedCredits, color: '#3b82f6' },
    { name: 'Overdue', value: mockCredits.filter(c => c.status === 'overdue').length, amount: overdueCredits, color: '#ef4444' },
  ];

  // Manufacturer performance
  const manufacturerData = mockCredits.reduce((acc, credit) => {
    const existing = acc.find(m => m.name === credit.manufacturer);
    if (existing) {
      existing.expected += credit.expectedAmount;
      existing.received += credit.actualAmount || 0;
      existing.count += 1;
    } else {
      acc.push({
        name: credit.manufacturer,
        expected: credit.expectedAmount,
        received: credit.actualAmount || 0,
        count: 1,
      });
    }
    return acc;
  }, [] as Array<{ name: string; expected: number; received: number; count: number }>);

  // Monthly trend data
  const monthlyTrend = [
    { month: 'Jan', expected: 0, received: 0, net: 0 },
    { month: 'Feb', expected: 0, received: 0, net: 0 },
    { month: 'Mar', expected: 450, received: 430, net: 408.5 },
    { month: 'Apr', expected: 830.5, received: 555, net: 527.25 },
    { month: 'May', expected: 0, received: 0, net: 0 },
    { month: 'Jun', expected: 0, received: 0, net: 0 },
  ];

  // Payment timeline
  const paymentTimeline = mockCredits
    .filter(c => c.actualPaymentDate)
    .map(c => ({
      date: formatDate(c.actualPaymentDate!),
      amount: c.actualAmount || 0,
      net: (c.actualAmount || 0) - calculateCommission(c.actualAmount || 0).amount,
      commission: calculateCommission(c.actualAmount || 0).amount,
      drugName: c.drugName,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'received':
        return 'success'
      case 'expected':
        return 'info'
      case 'overdue':
        return 'error'
      case 'disputed':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const getDaysUntilPayment = (expectedDate: string): number => {
    const expDate = new Date(expectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysOverdue = (expectedDate: string): number => {
    const expDate = new Date(expectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    return Math.ceil((today.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));
  };

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

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Professional Medical Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Credits & Payments</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Track your credit payments, receivables, and commission details
            </p>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={() => alert('Export functionality')}>
            <Download className="mr-1 h-3 w-3" />
            Export Report
          </Button>
        </div>

        {/* Professional Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-cyan-600" />
              <p className="text-xs text-cyan-700 font-medium">Expected</p>
            </div>
            <p className="text-xl font-bold text-cyan-900">{formatCurrency(expectedCredits)}</p>
            <p className="text-xs text-cyan-700 mt-1">{mockCredits.filter(c => c.status === 'expected').length} pending</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3 w-3 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">Net Received</p>
            </div>
            <p className="text-xl font-bold text-emerald-900">{formatCurrency(netAmountReceived)}</p>
            <p className="text-xs text-emerald-700 mt-1">After {DEFAULT_COMMISSION_RATE}%</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-amber-600" />
              <p className="text-xs text-amber-700 font-medium">Commission</p>
            </div>
            <p className="text-xl font-bold text-amber-900">{formatCurrency(totalCommission)}</p>
            <p className="text-xs text-amber-700 mt-1">Platform fees</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100">
            <div className="flex items-center gap-1 mb-1">
              <AlertCircle className="h-3 w-3 text-red-600" />
              <p className="text-xs text-red-700 font-medium">Overdue</p>
            </div>
            <p className="text-xl font-bold text-red-900">{formatCurrency(overdueCredits)}</p>
            <p className="text-xs text-red-700 mt-1">{mockCredits.filter(c => c.status === 'overdue').length} overdue</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3 w-3 text-teal-600" />
              <p className="text-xs text-teal-700 font-medium">Gross Received</p>
            </div>
            <p className="text-xl font-bold text-teal-900">{formatCurrency(receivedCredits)}</p>
          </div>
          <div className={`p-3 rounded-lg border-2 ${totalVariance >= 0 ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100' : 'border-red-200 bg-gradient-to-br from-red-50 to-red-100'}`}>
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className={`h-3 w-3 ${totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              <p className={`text-xs font-medium ${totalVariance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Variance</p>
            </div>
            <p className={`text-xl font-bold ${totalVariance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
              {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)}
            </p>
          </div>
          <div className="p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">Received Count</p>
            </div>
            <p className="text-xl font-bold text-emerald-900">{mockCredits.filter(c => c.status === 'received').length}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
            <div className="flex items-center gap-1 mb-1">
              <BarChart3 className="h-3 w-3 text-cyan-600" />
              <p className="text-xs text-cyan-700 font-medium">Recovery Rate</p>
            </div>
            <p className="text-xl font-bold text-cyan-900">
              {expectedCredits + receivedCredits > 0 
                ? ((receivedCredits / (expectedCredits + receivedCredits)) * 100).toFixed(1)
                : 0}%
            </p>
          </div>
        </div>

        {/* Professional Tabs */}
        <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-teal-100 text-teal-700 border-teal-300 shadow-md scale-105'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-cyan-100 text-cyan-700 border-cyan-300 shadow-md scale-105'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <LineChartIcon className="h-4 w-4" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all whitespace-nowrap ${
              activeTab === 'details'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-md scale-105'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Credit Details</span>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Professional Commission Transparency Notice */}
            <Card className="border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 via-teal-50 to-cyan-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-100">
                    <Info className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-cyan-900 mb-1">Platform Commission Transparency</p>
                    <p className="text-xs text-cyan-800 leading-relaxed">
                      We charge a {DEFAULT_COMMISSION_RATE}% commission on each payment you receive from suppliers. 
                      This commission is automatically calculated and deducted from the gross amount. 
                      The "Net Amount Received" shown above is what you actually receive after commission.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Financial Performance Chart */}
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
              <CardHeader className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-100">
                    <BarChart3 className="h-4 w-4 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-gray-900">Financial Performance</CardTitle>
                    <CardDescription className="text-xs text-gray-600">Expected vs Received credits with commission breakdown</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
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
                      dataKey="expected"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorExpected)"
                      name="Expected Credits"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="received"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorReceived)"
                      name="Gross Received"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#colorNet)"
                      name="Net Received (After Commission)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-3 lg:grid-cols-2">
              {/* Professional Status Distribution */}
              <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30">
                <CardHeader className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-100">
                      <PieChartIcon className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-gray-900">Status Distribution</CardTitle>
                      <CardDescription className="text-xs text-gray-600">Credit status breakdown by count and value</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {statusDistribution.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{item.value} credits</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(item.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Professional Manufacturer Performance */}
              <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
                <CardHeader className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-100">
                      <Building2 className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-gray-900">Manufacturer Performance</CardTitle>
                      <CardDescription className="text-xs text-gray-600">Expected vs received by manufacturer</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={manufacturerData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="expected" fill="#3b82f6" name="Expected" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="received" fill="#10b981" name="Received" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-3">
            {/* Professional Payment Timeline */}
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
              <CardHeader className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-100">
                    <Calendar className="h-4 w-4 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-gray-900">Payment Timeline</CardTitle>
                    <CardDescription className="text-xs text-gray-600">Historical payment receipts with commission breakdown</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {paymentTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={paymentTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="amount" stackId="a" fill="#3b82f6" name="Gross Amount" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="commission" stackId="a" fill="#f59e0b" name="Commission" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="net" stackId="a" fill="#10b981" name="Net Amount" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payment history available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Credit Trend */}
            <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30">
              <CardHeader className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-100">
                    <LineChartIcon className="h-4 w-4 text-cyan-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-gray-900">Credit Trend</CardTitle>
                    <CardDescription className="text-xs text-gray-600">Monthly credit flow and performance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="expected"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Expected"
                      dot={{ fill: '#3b82f6', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="received"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Received"
                      dot={{ fill: '#10b981', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      name="Net (After Commission)"
                      dot={{ fill: '#8b5cf6', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Professional Manufacturer Comparison */}
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
              <CardHeader className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-100">
                    <Building2 className="h-4 w-4 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-gray-900">Manufacturer Comparison</CardTitle>
                    <CardDescription className="text-xs text-gray-600">Detailed breakdown by manufacturer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {manufacturerData.map((mfg, index) => {
                    const recoveryRate = mfg.expected > 0 ? (mfg.received / mfg.expected) * 100 : 0;
                    return (
                      <div key={index} className="p-3 border-2 border-teal-200 rounded-lg bg-gradient-to-br from-white to-teal-50/30 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-teal-100">
                              <Building2 className="h-3 w-3 text-teal-600" />
                            </div>
                            <h4 className="font-bold text-gray-900">{mfg.name}</h4>
                            <Badge variant="secondary" className="text-xs border-2 bg-cyan-100 text-cyan-700 border-cyan-300">{mfg.count} credits</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-2 rounded bg-cyan-50 border border-cyan-200">
                            <p className="text-xs text-cyan-700 font-medium mb-1">Expected</p>
                            <p className="font-bold text-cyan-900">{formatCurrency(mfg.expected)}</p>
                          </div>
                          <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                            <p className="text-xs text-emerald-700 font-medium mb-1">Received</p>
                            <p className="font-bold text-emerald-900">{formatCurrency(mfg.received)}</p>
                          </div>
                          <div className="p-2 rounded bg-teal-50 border border-teal-200">
                            <p className="text-xs text-teal-700 font-medium mb-1">Recovery Rate</p>
                            <p className="font-bold text-teal-900">{recoveryRate.toFixed(1)}%</p>
                          </div>
                          <div className="p-2 rounded bg-amber-50 border border-amber-200">
                            <p className="text-xs text-amber-700 font-medium mb-1">Pending</p>
                            <p className="font-bold text-amber-900">
                              {formatCurrency(mfg.expected - mfg.received)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                            style={{ width: `${Math.min(100, recoveryRate)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-2">
            {/* Professional Search and Filters */}
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-teal-500" />
                    <Input placeholder="Search..." className="pl-7 h-7 text-xs border-teal-200 focus:border-teal-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <div className="flex gap-1">
                    {[
                      { value: 'all', label: 'All', color: 'bg-slate-100 text-slate-700 border-slate-300' },
                      { value: 'expected', label: 'Expected', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
                      { value: 'received', label: 'Received', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                      { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-700 border-red-300' },
                    ].map((status) => (
                      <Button 
                        key={status.value} 
                        variant={filterStatus === status.value ? 'primary' : 'outline'} 
                        size="sm" 
                        className={`h-7 text-xs px-2 border-2 ${filterStatus === status.value ? status.color : 'border-gray-300'}`}
                        onClick={() => setFilterStatus(status.value as any)}
                      >
                        {status.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Credits Table */}
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
              <CardContent className="p-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b-2 border-teal-200">
                      <tr>
                        <th className="text-left p-2 font-bold text-teal-900">Drug Name</th>
                        <th className="text-left p-2 font-bold text-teal-900">Manufacturer</th>
                        <th className="text-left p-2 font-bold text-teal-900">Return ID</th>
                        <th className="text-left p-2 font-bold text-teal-900">Expected</th>
                        <th className="text-left p-2 font-bold text-teal-900">Received</th>
                        <th className="text-left p-2 font-bold text-teal-900">Variance</th>
                        <th className="text-left p-2 font-bold text-teal-900">Commission</th>
                        <th className="text-left p-2 font-bold text-teal-900">Net Amount</th>
                        <th className="text-left p-2 font-bold text-teal-900">Expected Date</th>
                        <th className="text-left p-2 font-bold text-teal-900">Actual Date</th>
                        <th className="text-left p-2 font-bold text-teal-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCredits.length === 0 ? (
                        <tr><td colSpan={11} className="p-4 text-center text-gray-500 text-sm bg-gray-50">No credits found</td></tr>
                      ) : (
                        filteredCredits.map((credit, idx) => {
                          const daysUntil = getDaysUntilPayment(credit.expectedPaymentDate);
                          const daysOverdue = credit.status === 'overdue' ? getDaysOverdue(credit.expectedPaymentDate) : 0;
                          const commission = credit.actualAmount ? calculateCommission(credit.actualAmount) : null;
                          const netAmount = credit.actualAmount ? (credit.actualAmount - (commission?.amount || 0)) : null;
                          return (
                            <tr key={credit.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50 transition-colors`}>
                              <td className="p-2 font-medium">{credit.drugName}</td>
                              <td className="p-2">{credit.manufacturer}</td>
                              <td className="p-2 font-mono"><Link href={`/returns/${credit.returnId}`} className="text-primary">{credit.returnId}</Link></td>
                              <td className="p-2">{formatCurrency(credit.expectedAmount)}</td>
                              <td className="p-2 font-bold text-emerald-700">{credit.actualAmount ? formatCurrency(credit.actualAmount) : '-'}</td>
                              <td className={`p-2 font-bold ${credit.variance !== undefined ? (credit.variance >= 0 ? 'text-emerald-700' : 'text-red-700') : 'text-gray-500'}`}>
                                {credit.variance !== undefined ? `${credit.variance >= 0 ? '+' : ''}${formatCurrency(credit.variance)}` : '-'}
                              </td>
                              <td className="p-2 font-bold text-amber-600">{commission ? `-${formatCurrency(commission.amount)}` : '-'}</td>
                              <td className="p-2 font-bold text-emerald-700">{netAmount ? formatCurrency(netAmount) : '-'}</td>
                              <td className="p-2">
                                {formatDate(credit.expectedPaymentDate)}
                                {credit.status === 'expected' && daysUntil > 0 && <span className="text-cyan-600 text-xs ml-1 font-medium">({daysUntil}d)</span>}
                              </td>
                              <td className="p-2">{credit.actualPaymentDate ? formatDate(credit.actualPaymentDate) : '-'}</td>
                              <td className="p-2">
                                <Badge variant={getStatusVariant(credit.status)} className={`text-xs border-2 ${
                                  credit.status === 'received' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                                  credit.status === 'overdue' ? 'bg-red-100 text-red-700 border-red-300' :
                                  'bg-cyan-100 text-cyan-700 border-cyan-300'
                                }`}>
                                  {getStatusLabel(credit.status)}
                                  {credit.status === 'overdue' && daysOverdue > 0 && ` (${daysOverdue}d)`}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Professional Aging Report */}
            <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-cyan-100">
                    <Calendar className="h-4 w-4 text-cyan-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Aging Report</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gradient-to-r from-cyan-100 to-teal-100 border-b-2 border-cyan-200">
                      <tr>
                        <th className="text-left p-2 font-bold text-cyan-900">Period</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Count</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { 
                          label: 'Current (0-30 days)', 
                          amount: mockCredits.filter(c => c.status === 'expected' && getDaysUntilPayment(c.expectedPaymentDate) <= 30).reduce((sum, c) => sum + c.expectedAmount, 0), 
                          count: mockCredits.filter(c => c.status === 'expected' && getDaysUntilPayment(c.expectedPaymentDate) <= 30).length
                        },
                        { 
                          label: '31-60 days', 
                          amount: mockCredits.filter(c => c.status === 'expected' && getDaysUntilPayment(c.expectedPaymentDate) > 30 && getDaysUntilPayment(c.expectedPaymentDate) <= 60).reduce((sum, c) => sum + c.expectedAmount, 0), 
                          count: mockCredits.filter(c => c.status === 'expected' && getDaysUntilPayment(c.expectedPaymentDate) > 30 && getDaysUntilPayment(c.expectedPaymentDate) <= 60).length
                        },
                        { 
                          label: '61-90 days', 
                          amount: mockCredits.filter(c => c.status === 'expected' && getDaysUntilPayment(c.expectedPaymentDate) > 60 && getDaysUntilPayment(c.expectedPaymentDate) <= 90).reduce((sum, c) => sum + c.expectedAmount, 0), 
                          count: mockCredits.filter(c => c.status === 'expected' && getDaysUntilPayment(c.expectedPaymentDate) > 60 && getDaysUntilPayment(c.expectedPaymentDate) <= 90).length
                        },
                        { 
                          label: '90+ days (Overdue)', 
                          amount: overdueCredits, 
                          count: mockCredits.filter(c => c.status === 'overdue').length
                        },
                      ].map((bucket, idx) => (
                        <tr key={bucket.label} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-cyan-50 transition-colors`}>
                          <td className="p-2 font-medium">{bucket.label}</td>
                          <td className="p-2">{bucket.count}</td>
                          <td className="p-2 font-bold">{formatCurrency(bucket.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
