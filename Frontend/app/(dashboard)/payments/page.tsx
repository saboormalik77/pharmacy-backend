"use client";

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { DollarSign, Search, FileText, TrendingUp, Package, Calendar, Info, Building2, ChevronDown, ChevronUp, Receipt, CreditCard, Clock, AlertCircle, Download, Filter, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { calculateCommission, DEFAULT_COMMISSION_RATE } from '@/lib/utils/commission';
import { getDistributorById } from '@/data/mockDistributors';
import { mockCredits } from '@/data/mockCredits';
import type { SupplierPayment, PaymentItem, Credit } from '@/types';
import Link from 'next/link';

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'partial' | 'completed' | 'disputed' | 'expected' | 'overdue'>('all');
  const [activeTab, setActiveTab] = useState<'payments' | 'credits'>('payments');
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  const [expandedCredits, setExpandedCredits] = useState<Set<string>>(new Set());

  // Convert ReverseDistributor to Distributor format
  const convertToDistributor = (rd: ReturnType<typeof getDistributorById>) => {
    if (!rd) return undefined;
    return {
      id: rd.id,
      name: rd.name,
      contactPerson: rd.contactEmail ? 'Contact' : undefined,
      email: rd.contactEmail,
      phone: rd.contactPhone,
      address: rd.address ? `${rd.address.street || ''}, ${rd.address.city || ''}, ${rd.address.state || ''} ${rd.address.zipCode || ''}`.trim() : undefined,
    };
  };

  const mockPayments: SupplierPayment[] = [
    {
      id: 'PAY-001',
      supplierId: 'SUP-001',
      supplierName: 'Pfizer Pharmaceuticals',
      distributorId: 'DIST-001',
      distributor: convertToDistributor(getDistributorById('DIST-001')),
      orderId: 'ORD-001',
      returnId: 'RET-2024-001',
      paymentDate: new Date().toISOString(),
      totalAmount: 1250.00,
      status: 'completed',
      paymentMethod: 'Wire Transfer',
      transactionId: 'TXN-123456',
      commission: calculateCommission(1250.00),
      items: [
        {
          id: 'pay-item-1',
          itemId: 'item-1',
          ndc: '00071-0156-23',
          productName: 'Lipitor 20mg',
          lotNumber: 'LOT123',
          quantity: 50,
          expectedAmount: 275.00,
          actualAmount: 275.00,
          variance: 0,
          packageId: 'PKG-001',
          paymentDate: new Date().toISOString(),
          distributorId: 'DIST-001',
          distributor: convertToDistributor(getDistributorById('DIST-001')),
          commission: calculateCommission(275.00),
        },
        {
          id: 'pay-item-2',
          itemId: 'item-2',
          ndc: '00093-7214-01',
          productName: 'Metformin 500mg',
          lotNumber: 'LOT456',
          quantity: 100,
          expectedAmount: 975.00,
          actualAmount: 975.00,
          variance: 0,
          packageId: 'PKG-001',
          paymentDate: new Date().toISOString(),
          distributorId: 'DIST-002',
          distributor: convertToDistributor(getDistributorById('DIST-002')),
          commission: calculateCommission(975.00),
        },
      ],
    },
    {
      id: 'PAY-002',
      supplierId: 'SUP-002',
      supplierName: 'Merck & Co',
      distributorId: 'DIST-003',
      distributor: convertToDistributor(getDistributorById('DIST-003')),
      orderId: 'ORD-002',
      returnId: 'RET-2024-002',
      paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      totalAmount: 850.00,
      status: 'partial',
      paymentMethod: 'ACH',
      transactionId: 'TXN-123457',
      commission: calculateCommission(425.00),
      items: [
        {
          id: 'pay-item-3',
          itemId: 'item-3',
          ndc: '00006-0019-58',
          productName: 'Lisinopril 10mg',
          lotNumber: 'LOT789',
          quantity: 90,
          expectedAmount: 850.00,
          actualAmount: 425.00,
          variance: -425.00,
          packageId: 'PKG-002',
          paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          distributorId: 'DIST-003',
          distributor: convertToDistributor(getDistributorById('DIST-003')),
          commission: calculateCommission(425.00),
        },
      ],
    },
  ];

  const filteredPayments = mockPayments.filter(payment => {
    const matchesSearch = !searchQuery ||
      payment.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.returnId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || payment.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalReceived = mockPayments.filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.commission?.netAmount || p.totalAmount), 0);
  const totalCommission = mockPayments.filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.commission?.amount || 0), 0);
  const totalPending = mockPayments.filter(p => p.status === 'pending' || p.status === 'partial')
    .reduce((sum, p) => sum + (p.totalAmount - p.items.reduce((s, i) => s + i.actualAmount, 0)), 0);

  const expectedCredits = mockCredits.filter(c => c.status === 'expected')
    .reduce((sum, c) => sum + c.expectedAmount, 0);
  const receivedCredits = mockCredits.filter(c => c.status === 'received')
    .reduce((sum, c) => sum + (c.actualAmount || 0), 0);
  const overdueCredits = mockCredits.filter(c => c.status === 'overdue')
    .reduce((sum, c) => sum + c.expectedAmount, 0);

  const filteredCredits = mockCredits.filter(credit => {
    const matchesSearch = !searchQuery ||
      credit.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      credit.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      credit.returnId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'expected' && credit.status === 'expected') ||
      (filterStatus === 'overdue' && credit.status === 'overdue') ||
      (filterStatus === 'completed' && credit.status === 'received');
    return matchesSearch && matchesFilter;
  });

  const getStatusVariant = (status: SupplierPayment['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'partial': return 'warning';
      case 'pending': return 'secondary';
      case 'disputed': return 'error';
      default: return 'default';
    }
  };

  const togglePayment = (paymentId: string) => {
    const newExpanded = new Set(expandedPayments);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
    }
    setExpandedPayments(newExpanded);
  };

  const toggleCredit = (creditId: string) => {
    const newExpanded = new Set(expandedCredits);
    if (newExpanded.has(creditId)) {
      newExpanded.delete(creditId);
    } else {
      newExpanded.add(creditId);
    }
    setExpandedCredits(newExpanded);
  };

  return (
    <DashboardLayout>
      <PermissionGuard permission="payments:view">
      <div className="space-y-2">
        {/* Professional Medical Header */}
        <div className="flex items-center justify-between p-4 rounded-[4px] bg-[#f5f2f1] border-2 border-[#e2e2e2]">
          <div>
            <h1 className="text-xl font-bold text-[#000000]">Payments & Credits</h1>
            <p className="text-xs text-[#505454] mt-0.5">Track expected credits and received payments from suppliers</p>
          </div>
          <Button variant="outline" size="sm" className="border-[#e2e2e2] text-[#516057] hover:bg-[#f5f2f1]">
            <Download className="mr-1 h-3 w-3" />
            Export
          </Button>
        </div>

        {/* Professional Tabs */}
        <div className="flex gap-2 border-b-2 border-[#e2e2e2] bg-white rounded-t-lg p-1">
          <button onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 text-sm font-medium rounded-[4px] border-2 transition-all ${
              activeTab === 'payments' 
                ? 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2] shadow-md scale-105' 
                : 'bg-white text-[#505454] border-[#e2e2e2] hover:bg-[#f5f2f1]'
            }`}>
            Payments ({mockPayments.length})
          </button>
          <button onClick={() => setActiveTab('credits')}
            className={`px-3 py-1.5 text-sm font-medium rounded-[4px] border-2 transition-all ${
              activeTab === 'credits' 
                ? 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2] shadow-md scale-105' 
                : 'bg-white text-[#505454] border-[#e2e2e2] hover:bg-[#f5f2f1]'
            }`}>
            Credits ({mockCredits.length})
          </button>
        </div>

        {/* Professional Metrics */}
        {activeTab === 'payments' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1]">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="h-3 w-3 text-[#516057]" />
                <p className="text-xs text-[#516057] font-medium">Net Received</p>
              </div>
              <p className="text-xl font-bold text-[#000000]">{formatCurrency(totalReceived)}</p>
              <p className="text-xs text-[#516057] mt-1">After {DEFAULT_COMMISSION_RATE}% commission</p>
            </div>
            <div className="p-3 rounded-[4px] border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-amber-600" />
                <p className="text-xs text-amber-700 font-medium">Commission</p>
              </div>
              <p className="text-xl font-bold text-amber-900">{formatCurrency(totalCommission)}</p>
              <p className="text-xs text-amber-700 mt-1">Platform fees</p>
            </div>
            <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1]">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3 text-[#516057]" />
                <p className="text-xs text-[#516057] font-medium">Pending</p>
              </div>
              <p className="text-xl font-bold text-[#000000]">{formatCurrency(totalPending)}</p>
              <p className="text-xs text-[#516057] mt-1">Awaiting payment</p>
            </div>
            <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1]">
              <div className="flex items-center gap-1 mb-1">
                <Receipt className="h-3 w-3 text-[#516057]" />
                <p className="text-xs text-[#516057] font-medium">Total</p>
              </div>
              <p className="text-xl font-bold text-[#000000]">{mockPayments.length}</p>
              <p className="text-xs text-[#516057] mt-1">Payment records</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1]">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3 text-[#516057]" />
                <p className="text-xs text-[#516057] font-medium">Expected</p>
              </div>
              <p className="text-xl font-bold text-[#000000]">{formatCurrency(expectedCredits)}</p>
              <p className="text-xs text-[#516057] mt-1">{mockCredits.filter(c => c.status === 'expected').length} pending</p>
            </div>
            <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1]">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle2 className="h-3 w-3 text-[#516057]" />
                <p className="text-xs text-[#516057] font-medium">Received</p>
              </div>
              <p className="text-xl font-bold text-[#000000]">{formatCurrency(receivedCredits)}</p>
              <p className="text-xs text-[#516057] mt-1">{mockCredits.filter(c => c.status === 'received').length} completed</p>
            </div>
            <div className="p-3 rounded-[4px] border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100">
              <div className="flex items-center gap-1 mb-1">
                <AlertCircle className="h-3 w-3 text-red-600" />
                <p className="text-xs text-red-700 font-medium">Overdue</p>
              </div>
              <p className="text-xl font-bold text-red-900">{formatCurrency(overdueCredits)}</p>
              <p className="text-xs text-red-700 mt-1">{mockCredits.filter(c => c.status === 'overdue').length} overdue</p>
            </div>
            <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1]">
              <div className="flex items-center gap-1 mb-1">
                <Package className="h-3 w-3 text-[#516057]" />
                <p className="text-xs text-[#516057] font-medium">Total</p>
              </div>
              <p className="text-xl font-bold text-[#000000]">{mockCredits.length}</p>
              <p className="text-xs text-[#516057] mt-1">Credit records</p>
            </div>
          </div>
        )}

        {/* Professional Filters */}
        <Card className="border-2 border-[#e2e2e2] bg-[#f5f2f1]">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6b7280]" />
                <Input placeholder={activeTab === 'payments' ? "Search payments..." : "Search credits..."} className="pl-7 h-7 text-xs border-[#e2e2e2] focus:border-[#e2e2e2]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex gap-1">
                {[
                  { value: 'all', label: 'All', color: 'bg-slate-100 text-slate-700 border-slate-300' },
                  { value: 'pending', label: 'Pending', color: 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2]' },
                  { value: 'partial', label: 'Partial', color: 'bg-amber-100 text-amber-700 border-amber-300' },
                  { value: 'completed', label: 'Completed', color: 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2]' },
                ].map((status) => (
                  <Button 
                    key={status.value} 
                    variant={filterStatus === status.value ? 'primary' : 'outline'} 
                    size="sm" 
                    className={`h-7 text-xs px-2 border-2 ${filterStatus === status.value ? status.color : 'border-[#e2e2e2]'}`}
                    onClick={() => setFilterStatus(status.value as any)}
                  >
                    {status.label}
                  </Button>
                ))}
                {activeTab === 'credits' && (
                  <>
                    <Button variant={filterStatus === 'expected' ? 'primary' : 'outline'} size="sm" className={`h-7 text-xs px-2 border-2 ${filterStatus === 'expected' ? 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2]' : 'border-[#e2e2e2]'}`}
                      onClick={() => setFilterStatus('expected')}>Expected</Button>
                    <Button variant={filterStatus === 'overdue' ? 'primary' : 'outline'} size="sm" className={`h-7 text-xs px-2 border-2 ${filterStatus === 'overdue' ? 'bg-red-100 text-red-700 border-red-300' : 'border-[#e2e2e2]'}`}
                      onClick={() => setFilterStatus('overdue')}>Overdue</Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table - Professional */}
        {activeTab === 'payments' && (
          <Card className="border-2 border-[#e2e2e2] bg-[#f5f2f1]">
            <CardContent className="p-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#f5f2f1] border-b-2 border-[#e2e2e2]">
                    <tr>
                      <th className="text-left p-2 font-bold text-[#000000] w-6"></th>
                      <th className="text-left p-2 font-bold text-[#000000]">Payment ID</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Date</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Supplier</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Distributor</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Return ID</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Items</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Total Paid</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Commission</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Net Amount</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Status</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr><td colSpan={12} className="p-4 text-center text-[#6b7280] text-sm bg-[#f5f2f1]">No payments found</td></tr>
                    ) : (
                      filteredPayments.map((payment, idx) => {
                        const isExpanded = expandedPayments.has(payment.id);
                        const totalPaid = payment.items.reduce((sum, item) => sum + item.actualAmount, 0);
                        const totalCommissionAmount = payment.commission?.amount || payment.items.reduce((sum, item) => sum + (item.commission?.amount || 0), 0);
                        const netAmount = payment.commission?.netAmount || payment.items.reduce((sum, item) => sum + (item.commission?.netAmount || item.actualAmount), 0);
                        return (
                          <>
                            <tr key={payment.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]/50'} hover:bg-[#f5f2f1] transition-colors`}>
                              <td className="p-2">
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => togglePayment(payment.id)}>
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </Button>
                              </td>
                              <td className="p-2 font-medium">{payment.id}</td>
                              <td className="p-2">{formatDate(payment.paymentDate)}</td>
                              <td className="p-2">{payment.supplierName}</td>
                              <td className="p-2">{payment.distributor?.name || '-'}</td>
                              <td className="p-2 font-mono">{payment.returnId}</td>
                              <td className="p-2">{payment.items.length}</td>
                              <td className="p-2 font-medium text-[#516057]">{formatCurrency(totalPaid)}</td>
                              <td className="p-2 font-bold text-amber-600">-{formatCurrency(totalCommissionAmount)}</td>
                              <td className="p-2 font-bold text-[#516057]">{formatCurrency(netAmount)}</td>
                              <td className="p-2">
                                <Badge variant={getStatusVariant(payment.status)} className={`text-xs border-2 ${
                                  payment.status === 'completed' ? 'bg-[#f5f2f1] text-black border-[#e2e2e2]' :
                                  payment.status === 'partial' ? 'bg-amber-100 text-black border-amber-300' :
                                  payment.status === 'pending' ? 'bg-[#f5f2f1] text-black border-[#e2e2e2]' :
                                  'bg-[#f5f2f1] text-black border-[#e2e2e2]'
                                }`}>
                                  {payment.status}
                                </Badge>
                              </td>
                              <td className="p-2">{payment.paymentMethod}</td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={12} className="p-3 bg-[#f5f2f1]">
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                      <div><span className="text-muted-foreground">Transaction ID:</span> <span className="font-mono">{payment.transactionId}</span></div>
                                      <div><span className="text-muted-foreground">Order ID:</span> <Link href={`/orders/${payment.orderId}`} className="text-primary">{payment.orderId}</Link></div>
                                    </div>
                                    <div className="text-xs font-medium mb-1">Payment Items:</div>
                                    <table className="w-full text-xs">
                                      <thead className="bg-white"><tr>
                                        <th className="text-left p-1 font-medium">Product</th>
                                        <th className="text-left p-1 font-medium">NDC</th>
                                        <th className="text-left p-1 font-medium">Lot</th>
                                        <th className="text-left p-1 font-medium">Qty</th>
                                        <th className="text-left p-1 font-medium">Expected</th>
                                        <th className="text-left p-1 font-medium">Paid</th>
                                        <th className="text-left p-1 font-medium">Variance</th>
                                        <th className="text-left p-1 font-medium">Commission</th>
                                        <th className="text-left p-1 font-medium">Net</th>
                                      </tr></thead>
                                      <tbody>
                                        {payment.items.map((item) => (
                                          <tr key={item.id} className="border-b">
                                            <td className="p-1">{item.productName}</td>
                                            <td className="p-1 font-mono">{item.ndc}</td>
                                            <td className="p-1">{item.lotNumber}</td>
                                            <td className="p-1">{item.quantity}</td>
                                            <td className="p-1">{formatCurrency(item.expectedAmount)}</td>
                                            <td className={`p-1 ${item.variance === 0 ? 'text-green-600' : item.variance < 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatCurrency(item.actualAmount)}</td>
                                            <td className={`p-1 ${item.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{item.variance >= 0 ? '+' : ''}{formatCurrency(item.variance)}</td>
                                            <td className="p-1 text-orange-600">-{formatCurrency(item.commission?.amount || 0)}</td>
                                            <td className="p-1 font-medium text-green-600">{formatCurrency(item.commission?.netAmount || item.actualAmount)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credits Table - Professional */}
        {activeTab === 'credits' && (
          <Card className="border-2 border-[#e2e2e2] bg-[#f5f2f1]">
            <CardContent className="p-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#f5f2f1] border-b-2 border-[#e2e2e2]">
                    <tr>
                      <th className="text-left p-2 font-bold text-[#000000] w-6"></th>
                      <th className="text-left p-2 font-bold text-[#000000]">Drug Name</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Manufacturer</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Return ID</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Expected</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Received</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Variance</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Commission</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Net Amount</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Expected Date</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Actual Date</th>
                      <th className="text-left p-2 font-bold text-[#000000]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCredits.length === 0 ? (
                      <tr><td colSpan={12} className="p-4 text-center text-[#6b7280] text-sm bg-[#f5f2f1]">No credits found</td></tr>
                    ) : (
                      filteredCredits.map((credit, idx) => {
                        const isExpanded = expandedCredits.has(credit.id);
                        const commission = credit.actualAmount ? calculateCommission(credit.actualAmount) : null;
                        const netAmount = credit.actualAmount ? (credit.actualAmount - (commission?.amount || 0)) : null;
                        return (
                          <>
                            <tr key={credit.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]/50'} hover:bg-[#f5f2f1] transition-colors`}>
                              <td className="p-2">
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => toggleCredit(credit.id)}>
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </Button>
                              </td>
                              <td className="p-2 font-medium">{credit.drugName}</td>
                              <td className="p-2">{credit.manufacturer}</td>
                              <td className="p-2 font-mono"><Link href={`/returns/${credit.returnId}`} className="text-primary">{credit.returnId}</Link></td>
                              <td className="p-2">{formatCurrency(credit.expectedAmount)}</td>
                              <td className="p-2 font-bold text-[#516057]">{credit.actualAmount ? formatCurrency(credit.actualAmount) : '-'}</td>
                              <td className={`p-2 font-bold ${credit.variance !== undefined ? (credit.variance >= 0 ? 'text-[#516057]' : 'text-red-700') : 'text-[#6b7280]'}`}>
                                {credit.variance !== undefined ? `${credit.variance >= 0 ? '+' : ''}${formatCurrency(credit.variance)}` : '-'}
                              </td>
                              <td className="p-2 font-bold text-amber-600">{commission ? `-${formatCurrency(commission.amount)}` : '-'}</td>
                              <td className="p-2 font-bold text-[#516057]">{netAmount ? formatCurrency(netAmount) : '-'}</td>
                              <td className="p-2">{formatDate(credit.expectedPaymentDate)}</td>
                              <td className="p-2">{credit.actualPaymentDate ? formatDate(credit.actualPaymentDate) : '-'}</td>
                              <td className="p-2">
                                <Badge variant={credit.status === 'received' ? 'success' : credit.status === 'overdue' ? 'error' : 'secondary'} className={`text-xs border-2 ${
                                  credit.status === 'received' ? 'bg-[#f5f2f1] text-black border-[#e2e2e2]' :
                                  credit.status === 'overdue' ? 'bg-red-100 text-black border-red-300' :
                                  'bg-[#f5f2f1] text-black border-[#e2e2e2]'
                                }`}>
                                  {credit.status}
                                </Badge>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={12} className="p-3 bg-[#f5f2f1]">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div><span className="text-muted-foreground">Item ID:</span> <span>{credit.itemId}</span></div>
                                    <div><span className="text-muted-foreground">Return ID:</span> <Link href={`/returns/${credit.returnId}`} className="text-primary">{credit.returnId}</Link></div>
                                    {credit.actualAmount && (
                                      <>
                                        <div><span className="text-muted-foreground">Gross Amount:</span> <span className="font-medium">{formatCurrency(credit.actualAmount)}</span></div>
                                        <div><span className="text-muted-foreground">Commission ({DEFAULT_COMMISSION_RATE}%):</span> <span className="font-medium text-orange-600">-{formatCurrency(commission?.amount || 0)}</span></div>
                                        <div><span className="text-muted-foreground">Net Amount:</span> <span className="font-medium text-green-600">{formatCurrency(netAmount || 0)}</span></div>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </PermissionGuard>
    </DashboardLayout>
  );
}
