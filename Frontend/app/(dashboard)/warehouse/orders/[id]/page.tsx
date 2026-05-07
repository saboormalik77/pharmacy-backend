"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Package, Truck, CheckCircle, XCircle, AlertTriangle, Clock, User, FileText,
  Download, ArrowLeft, Activity, Shield, Calendar, BarChart3, Info, Eye, CheckCircle2, X, Warehouse, Send, ClipboardCheck, DollarSign
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { WarehouseOrder, WarehouseOrderEvent, QualityCheck, ComplianceCheck } from '@/types';

export default function WarehouseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<WarehouseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'timeline' | 'quality' | 'compliance'>('overview');

  useEffect(() => {
    const mockOrder: WarehouseOrder = {
      id: orderId,
      orderNumber: `WO-${orderId}`,
      packageId: `PKG-${orderId}`,
      returnId: `RET-${orderId}`,
      clientId: 'client-1',
      clientName: 'HealthCare Pharmacy',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: undefined,
      status: 'processing',
      packages: [
        {
          id: 'pkg-1',
          packageNumber: 'PKG-001',
          items: [
            {
              id: 'item-1',
              ndc: '00071-0156-23',
              drugName: 'Lipitor 40mg Tablets',
              manufacturer: 'Pfizer',
              lotNumber: 'LOT123',
              expirationDate: '2024-12-31',
              quantity: 50,
              unit: 'TABLET',
              reason: 'Expired',
              estimatedCredit: 0,
              classification: 'destruction',
            },
            {
              id: 'item-2',
              ndc: '00093-7214-01',
              drugName: 'Metformin 500mg Tablets',
              manufacturer: 'Teva',
              lotNumber: 'LOT456',
              expirationDate: '2024-11-15',
              quantity: 100,
              unit: 'TABLET',
              reason: 'Expired',
              estimatedCredit: 0,
              classification: 'destruction',
            },
          ],
          condition: 'good',
          receivedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          inspectedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          inspectedBy: 'John Doe',
          weight: 2.5,
          dimensions: { length: 12, width: 8, height: 6 },
          photos: [],
          notes: 'Package received in good condition',
        },
      ],
      totalItems: 150,
      refundableItems: 0,
      nonRefundableItems: 150,
      totalEstimatedCredit: 0,
      actualCredit: 0,
      variance: 0,
      receivedBy: 'Jane Smith',
      inspectedBy: 'John Doe',
      processedBy: undefined,
      notes: 'All items expired, marked for destruction',
      timeline: [
        {
          id: 'event-1',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'received',
          performedBy: 'Jane Smith',
          description: 'Package received at warehouse receiving dock',
          metadata: { location: 'Dock A', temperature: '72°F' },
        },
        {
          id: 'event-2',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'inspected',
          performedBy: 'John Doe',
          description: 'Initial inspection completed - package integrity verified',
          metadata: { condition: 'good', weight: '2.5 lbs' },
        },
        {
          id: 'event-3',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'classified',
          performedBy: 'John Doe',
          description: 'All items classified as expired - marked for destruction',
          metadata: { items: 2, classification: 'destruction' },
        },
        {
          id: 'event-4',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'processed',
          performedBy: 'Sarah Johnson',
          description: 'Processing for destruction - documentation completed',
          metadata: { status: 'in_progress' },
        },
      ],
      qualityChecks: [
        {
          id: 'qc-1',
          checkType: 'integrity',
          status: 'pass',
          performedBy: 'John Doe',
          performedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Package seal intact, no visible damage',
        },
        {
          id: 'qc-2',
          checkType: 'labeling',
          status: 'pass',
          performedBy: 'John Doe',
          performedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'All labels legible and accurate',
        },
        {
          id: 'qc-3',
          checkType: 'expiration',
          status: 'fail',
          performedBy: 'John Doe',
          performedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'All items confirmed expired - as expected',
        },
        {
          id: 'qc-4',
          checkType: 'quantity',
          status: 'pass',
          performedBy: 'John Doe',
          performedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Quantity matches documentation: 150 units',
        },
      ],
      complianceChecks: [
        {
          id: 'cc-1',
          checkType: 'fda_compliance',
          status: 'pass',
          performedBy: 'Sarah Johnson',
          performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'FDA destruction requirements met',
          reference: '21 CFR Part 1317',
        },
        {
          id: 'cc-2',
          checkType: 'documentation',
          status: 'pass',
          performedBy: 'Sarah Johnson',
          performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'All required documentation present and complete',
          reference: 'DEA Form 41',
        },
        {
          id: 'cc-3',
          checkType: 'state_regulations',
          status: 'pass',
          performedBy: 'Sarah Johnson',
          performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'State disposal regulations complied with',
          reference: 'State Code 123.45',
        },
      ],
    };
    setTimeout(() => {
      setOrder(mockOrder);
      setLoading(false);
    }, 500);
  }, [orderId]);

  const getStatusVariant = (status: WarehouseOrder['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing':
      case 'classifying': return 'info';
      case 'inspecting': return 'warning';
      case 'received': return 'secondary';
      case 'exception': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status: WarehouseOrder['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'processing': return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      case 'classifying': return 'bg-teal-100 text-teal-700 border-teal-300';
      case 'inspecting': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'received': return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      case 'exception': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: WarehouseOrder['status']) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getEventIcon = (type: WarehouseOrderEvent['type']) => {
    switch (type) {
      case 'received': return Package;
      case 'inspected': return Eye;
      case 'classified': return FileText;
      case 'processed': return Activity;
      case 'completed': return CheckCircle2;
      case 'exception': return AlertTriangle;
      default: return Clock;
    }
  };

  const statusSteps = [
    { key: 'pending', label: 'Pending', icon: Clock, color: 'bg-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-300' },
    { key: 'received', label: 'Received', icon: Package, color: 'bg-cyan-500', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', borderColor: 'border-cyan-300' },
    { key: 'inspecting', label: 'Inspecting', icon: Eye, color: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-300' },
    { key: 'classifying', label: 'Classifying', icon: FileText, color: 'bg-teal-500', bgColor: 'bg-teal-50', textColor: 'text-teal-700', borderColor: 'border-teal-300' },
    { key: 'processing', label: 'Processing', icon: Activity, color: 'bg-cyan-500', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', borderColor: 'border-cyan-300' },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-300' },
  ];

  const currentStatusIndex = statusSteps.findIndex(step => step.key === order?.status) || 0;
  const statusProgress = order ? ((currentStatusIndex + 1) / statusSteps.length) * 100 : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Activity className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500 text-sm">Order not found</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Professional Medical Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="bg-white" onClick={() => router.back()}>
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back
            </Button>
            <div className="p-2 rounded-lg bg-teal-100">
              <Warehouse className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{order.orderNumber}</h1>
                <Badge variant={getStatusVariant(order.status)} className={`text-xs border-2 ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">Comprehensive order tracking and process visibility</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
            <Download className="mr-1 h-3 w-3" />
            Export
          </Button>
        </div>

        {/* Professional Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <div className="p-3 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
            <div className="flex items-center gap-1 mb-1">
              <Package className="h-3 w-3 text-teal-600" />
              <p className="text-xs text-teal-700 font-medium">Total Items</p>
            </div>
            <p className="text-xl font-bold text-teal-900">{order.totalItems}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
            <div className="flex items-center gap-1 mb-1">
              <Package className="h-3 w-3 text-cyan-600" />
              <p className="text-xs text-cyan-700 font-medium">Packages</p>
            </div>
            <p className="text-xl font-bold text-cyan-900">{order.packages.length}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">Refundable</p>
            </div>
            <p className="text-xl font-bold text-emerald-900">{order.refundableItems}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100">
            <div className="flex items-center gap-1 mb-1">
              <XCircle className="h-3 w-3 text-red-600" />
              <p className="text-xs text-red-700 font-medium">Non-Refund</p>
            </div>
            <p className="text-xl font-bold text-red-900">{order.nonRefundableItems}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3 w-3 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">Est. Credit</p>
            </div>
            <p className="text-lg font-bold text-emerald-900">{formatCurrency(order.totalEstimatedCredit)}</p>
          </div>
          {order.actualCredit !== undefined && (
            <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="h-3 w-3 text-cyan-600" />
                <p className="text-xs text-cyan-700 font-medium">Actual Credit</p>
              </div>
              <p className="text-lg font-bold text-cyan-900">{formatCurrency(order.actualCredit)}</p>
            </div>
          )}
          {order.variance !== undefined && (
            <div className={`p-3 rounded-lg border-2 ${order.variance >= 0 ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100' : 'border-red-200 bg-gradient-to-br from-red-50 to-red-100'}`}>
              <div className="flex items-center gap-1 mb-1">
                <BarChart3 className={`h-3 w-3 ${order.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                <p className={`text-xs font-medium ${order.variance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Variance</p>
              </div>
              <p className={`text-lg font-bold ${order.variance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {order.variance >= 0 ? '+' : ''}{formatCurrency(order.variance)}
              </p>
            </div>
          )}
        </div>

        {/* Enhanced Status Timeline */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900">Status Timeline</h3>
              <div className="flex items-center gap-2">
                <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${statusProgress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600">{Math.round(statusProgress)}%</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${statusProgress}%` }}
                />
              </div>
              <div className="relative flex items-start justify-between">
                {statusSteps.map((step, index) => {
                  const isActive = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300
                        ${isActive 
                          ? `${step.bgColor} ${step.borderColor} border-4 shadow-lg scale-110` 
                          : 'bg-white border-gray-300'
                        }
                        ${isCurrent ? 'ring-4 ring-offset-2 ring-opacity-50 ' + step.color.replace('bg-', 'ring-') : ''}
                      `}>
                        <Icon className={`h-5 w-5 ${isActive ? step.textColor : 'text-gray-400'}`} />
                      </div>
                      <div className={`mt-2 text-center ${isActive ? step.textColor : 'text-gray-400'}`}>
                        <p className={`text-xs font-semibold ${isCurrent ? 'font-bold' : ''}`}>{step.label}</p>
                        {isCurrent && (
                          <p className="text-xs mt-0.5 font-medium animate-pulse">Current</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colorful Tabs */}
        <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1">
          {[
            { id: 'overview', label: 'Overview', count: null, color: 'bg-teal-100 text-teal-700 border-teal-300' },
            { id: 'packages', label: 'Packages', count: order.packages.length, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
            { id: 'timeline', label: 'Timeline', count: order.timeline.length, color: 'bg-teal-100 text-teal-700 border-teal-300' },
            { id: 'quality', label: 'Quality', count: order.qualityChecks.length, color: 'bg-amber-100 text-amber-700 border-amber-300' },
            { id: 'compliance', label: 'Compliance', count: order.complianceChecks.length, color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                activeTab === tab.id
                  ? `${tab.color} shadow-md scale-105`
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count !== null && <span className={`ml-1 font-bold ${activeTab === tab.id ? '' : 'text-gray-400'}`}>({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Overview Tab - Colorful */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-teal-100">
                    <Info className="h-4 w-4 text-teal-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Order Information</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Order #:</span><span className="font-bold text-teal-900">{order.orderNumber}</span></div>
                  <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Package ID:</span><span className="font-bold text-teal-900">{order.packageId}</span></div>
                  {order.returnId && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Return ID:</span><span className="font-bold text-teal-900">{order.returnId}</span></div>}
                  <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Client:</span><span className="font-bold text-teal-900">{order.clientName}</span></div>
                  <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Created:</span><span className="font-bold text-teal-900">{formatDate(order.createdAt)}</span></div>
                  {order.receivedAt && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Received:</span><span className="font-bold text-teal-900">{formatDate(order.receivedAt)}</span></div>}
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-cyan-100">
                    <User className="h-4 w-4 text-cyan-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Processing Team</h3>
                </div>
                <div className="space-y-2 text-xs">
                  {order.receivedBy && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-cyan-700 font-medium">Received By:</span><span className="font-bold text-cyan-900">{order.receivedBy}</span></div>}
                  {order.inspectedBy && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-cyan-700 font-medium">Inspected By:</span><span className="font-bold text-cyan-900">{order.inspectedBy}</span></div>}
                  {order.processedBy && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-cyan-700 font-medium">Processed By:</span><span className="font-bold text-cyan-900">{order.processedBy}</span></div>}
                </div>
                {order.notes && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-50 border-2 border-amber-200 text-xs">
                    <strong className="text-amber-900">Notes:</strong> <span className="text-amber-800">{order.notes}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Packages Tab - Colorful Table */}
        {activeTab === 'packages' && (
          <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-cyan-100">
                  <Package className="h-4 w-4 text-cyan-600" />
                </div>
                <h3 className="font-bold text-base text-gray-900">Packages ({order.packages.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-cyan-100 to-teal-100 border-b-2 border-cyan-200">
                      <th className="text-left p-2 font-bold text-cyan-900">Package</th>
                      <th className="text-left p-2 font-bold text-cyan-900">Condition</th>
                      <th className="text-left p-2 font-bold text-cyan-900">Items</th>
                      <th className="text-left p-2 font-bold text-cyan-900">Weight</th>
                      <th className="text-left p-2 font-bold text-cyan-900">Dimensions</th>
                      <th className="text-left p-2 font-bold text-cyan-900">Received</th>
                      <th className="text-left p-2 font-bold text-cyan-900">Inspected By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.packages.map((pkg, idx) => (
                      <tr key={pkg.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-cyan-50 transition-colors`}>
                        <td className="p-2 font-semibold text-cyan-700">{pkg.packageNumber}</td>
                        <td className="p-2">
                          <Badge variant={pkg.condition === 'good' ? 'success' : 'warning'} className="text-xs border-2">
                            {pkg.condition}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 font-medium">
                            {pkg.items.length}
                          </span>
                        </td>
                        <td className="p-2 text-gray-700">{pkg.weight ? `${pkg.weight} lbs` : '-'}</td>
                        <td className="p-2 text-gray-700">{pkg.dimensions ? `${pkg.dimensions.length}"×${pkg.dimensions.width}"×${pkg.dimensions.height}"` : '-'}</td>
                        <td className="p-2 text-gray-600">{formatDate(pkg.receivedDate)}</td>
                        <td className="p-2 text-gray-700">{pkg.inspectedBy || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Package Items Detail */}
              {order.packages.map((pkg) => (
                <div key={pkg.id} className="mt-3 p-3 rounded-lg border-2 border-cyan-200 bg-cyan-50">
                  <div className="font-bold text-sm mb-2 text-cyan-900">Package {pkg.packageNumber} - Items</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gradient-to-r from-cyan-100 to-teal-100 border-b-2 border-cyan-200">
                          <th className="text-left p-2 font-bold text-cyan-900">Drug Name</th>
                          <th className="text-left p-2 font-bold text-cyan-900">NDC</th>
                          <th className="text-left p-2 font-bold text-cyan-900">Lot</th>
                          <th className="text-left p-2 font-bold text-cyan-900">Qty</th>
                          <th className="text-left p-2 font-bold text-cyan-900">Expiration</th>
                          <th className="text-left p-2 font-bold text-cyan-900">Classification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pkg.items.map((item, idx) => (
                          <tr key={item.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-cyan-50`}>
                            <td className="p-2 font-medium text-gray-900">{item.drugName}</td>
                            <td className="p-2 font-mono text-gray-700">{item.ndc}</td>
                            <td className="p-2 text-gray-700">{item.lotNumber}</td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 font-medium">
                                {item.quantity} {item.unit}
                              </span>
                            </td>
                            <td className="p-2 text-gray-700">{formatDate(item.expirationDate)}</td>
                            <td className="p-2">
                              <Badge variant={item.classification === 'returnable' ? 'success' : 'error'} className="text-xs border-2">
                                {item.classification}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Timeline Tab - Enhanced */}
        {activeTab === 'timeline' && (
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-blue-100">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-base text-gray-900">Timeline ({order.timeline.length} events)</h3>
              </div>
              <div className="space-y-3">
                {order.timeline.map((event, index) => {
                  const Icon = getEventIcon(event.type);
                  const eventColors: Record<WarehouseOrderEvent['type'], string> = {
                    received: 'bg-cyan-100 text-cyan-700 border-cyan-300',
                    inspected: 'bg-amber-100 text-amber-700 border-amber-300',
                    classified: 'bg-teal-100 text-teal-700 border-teal-300',
                    processed: 'bg-cyan-100 text-cyan-700 border-cyan-300',
                    completed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                    exception: 'bg-red-100 text-red-700 border-red-300',
                  };
                  return (
                    <div key={event.id} className="flex gap-3 p-3 rounded-lg border-2 bg-white hover:shadow-md transition-all">
                      <div className={`p-2 rounded-lg ${eventColors[event.type] || 'bg-gray-100 text-gray-700'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm capitalize text-gray-900">{event.type}</span>
                          <span className="text-xs text-gray-600">{formatDate(event.timestamp)}</span>
                        </div>
                        <p className="text-xs text-gray-700 mb-1">{event.description}</p>
                        <p className="text-xs text-gray-600">By: <span className="font-medium">{event.performedBy}</span></p>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="mt-2 p-2 rounded bg-gray-50 border border-gray-200 text-xs">
                            {Object.entries(event.metadata).map(([key, value]) => (
                              <span key={key} className="mr-3"><strong className="text-gray-700">{key}:</strong> <span className="text-gray-600">{String(value)}</span></span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quality Checks Tab - Colorful Table */}
        {activeTab === 'quality' && (
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-orange-100">
                  <ClipboardCheck className="h-4 w-4 text-orange-600" />
                </div>
                <h3 className="font-bold text-base text-gray-900">Quality Checks ({order.qualityChecks.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-orange-100 to-amber-100 border-b-2 border-orange-200">
                      <th className="text-left p-2 font-bold text-orange-900">Check Type</th>
                      <th className="text-left p-2 font-bold text-orange-900">Status</th>
                      <th className="text-left p-2 font-bold text-orange-900">Performed By</th>
                      <th className="text-left p-2 font-bold text-orange-900">Date</th>
                      <th className="text-left p-2 font-bold text-orange-900">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.qualityChecks.map((check, idx) => (
                      <tr key={check.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-orange-50 transition-colors`}>
                        <td className="p-2 font-medium text-gray-900 capitalize">{check.checkType.replace('_', ' ')}</td>
                        <td className="p-2">
                          <Badge variant={check.status === 'pass' ? 'success' : check.status === 'fail' ? 'error' : 'warning'} className="text-xs border-2">
                            {check.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-2 text-gray-700">{check.performedBy}</td>
                        <td className="p-2 text-gray-600">{formatDate(check.performedAt)}</td>
                        <td className="p-2 text-gray-700">{check.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compliance Tab - Colorful Table */}
        {activeTab === 'compliance' && (
          <Card className="border-2 border-green-200 bg-gradient-to-br from-white to-green-50/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-green-100">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="font-bold text-base text-gray-900">Compliance Checks ({order.complianceChecks.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-100 to-emerald-100 border-b-2 border-green-200">
                      <th className="text-left p-2 font-bold text-green-900">Check Type</th>
                      <th className="text-left p-2 font-bold text-green-900">Status</th>
                      <th className="text-left p-2 font-bold text-green-900">Reference</th>
                      <th className="text-left p-2 font-bold text-green-900">Performed By</th>
                      <th className="text-left p-2 font-bold text-green-900">Date</th>
                      <th className="text-left p-2 font-bold text-green-900">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.complianceChecks.map((check, idx) => (
                      <tr key={check.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-green-50 transition-colors`}>
                        <td className="p-2 font-medium text-gray-900 capitalize">{check.checkType.replace('_', ' ')}</td>
                        <td className="p-2">
                          <Badge variant={check.status === 'pass' ? 'success' : check.status === 'fail' ? 'error' : 'warning'} className="text-xs border-2">
                            {check.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono text-xs text-gray-700">{check.reference || '-'}</td>
                        <td className="p-2 text-gray-700">{check.performedBy}</td>
                        <td className="p-2 text-gray-600">{formatDate(check.performedAt)}</td>
                        <td className="p-2 text-gray-700">{check.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
