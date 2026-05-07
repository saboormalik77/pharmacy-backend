"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Package, DollarSign, Calendar, FileText, Building2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { getDistributorById } from '@/data/mockDistributors';
import { calculateCommission } from '@/lib/utils/commission';
import Link from 'next/link';
import type { SupplierPayment, PaymentItem } from '@/types';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<SupplierPayment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, fetch from API
    // Mock data for now
    const reverseDist1 = getDistributorById('DIST-001');
    const reverseDist2 = getDistributorById('DIST-002');
    const reverseDist3 = getDistributorById('DIST-003');
    
    // Convert ReverseDistributor to Distributor format
    const convertToDistributor = (rd: typeof reverseDist1) => {
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

    const mockOrder: SupplierPayment = {
      id: orderId,
      supplierId: 'SUP-001',
      supplierName: 'Pfizer Pharmaceuticals',
      distributorId: 'DIST-001',
      distributor: convertToDistributor(reverseDist1),
      orderId: orderId,
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
          distributor: convertToDistributor(reverseDist1),
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
          distributor: convertToDistributor(reverseDist2),
          commission: calculateCommission(975.00),
        },
        {
          id: 'pay-item-3',
          itemId: 'item-3',
          ndc: '00006-0019-58',
          productName: 'Lisinopril 10mg',
          lotNumber: 'LOT789',
          quantity: 90,
          expectedAmount: 850.00,
          actualAmount: 850.00,
          variance: 0,
          packageId: 'PKG-002',
          paymentDate: new Date().toISOString(),
          distributorId: 'DIST-003',
          distributor: convertToDistributor(reverseDist3),
          commission: calculateCommission(850.00),
        },
      ],
    };

    setTimeout(() => {
      setOrder(mockOrder);
      setLoading(false);
    }, 500);
  }, [orderId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold">Order not found</h1>
          <Link href="/payments">
            <Button className="mt-4">Back to Payments</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Group items by package
  const itemsByPackage = order.items.reduce((acc, item) => {
    const packageId = item.packageId || 'UNKNOWN';
    if (!acc[packageId]) {
      acc[packageId] = [];
    }
    acc[packageId].push(item);
    return acc;
  }, {} as Record<string, PaymentItem[]>);

  const getStatusVariant = (status: SupplierPayment['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'partial':
        return 'warning';
      case 'pending':
        return 'secondary';
      case 'disputed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Professional Medical Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div className="flex items-center gap-3">
            <Link href="/payments">
              <Button variant="outline" size="sm" className="bg-white">
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back
              </Button>
            </Link>
            <div className="p-2 rounded-lg bg-teal-100">
              <Package className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">Order {order.orderId}</h1>
                <Badge variant={getStatusVariant(order.status)} className={`text-xs border-2 ${
                  order.status === 'completed' ? 'bg-emerald-100 text-black border-emerald-300' :
                  order.status === 'partial' ? 'bg-amber-100 text-black border-amber-300' :
                  order.status === 'pending' ? 'bg-cyan-100 text-black border-cyan-300' :
                  'bg-gray-100 text-black border-gray-300'
                }`}>
                  {order.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {order.supplierName} • {order.distributor?.name || 'No distributor'} • {formatDate(order.paymentDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Professional Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3 w-3 text-cyan-600" />
              <p className="text-xs text-cyan-700 font-medium">Total Amount</p>
            </div>
            <p className="text-xl font-bold text-cyan-900">{formatCurrency(order.totalAmount)}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
            <div className="flex items-center gap-1 mb-1">
              <Package className="h-3 w-3 text-teal-600" />
              <p className="text-xs text-teal-700 font-medium">Items</p>
            </div>
            <p className="text-xl font-bold text-teal-900">{order.items.length}</p>
            <p className="text-xs text-teal-700 mt-1">{Object.keys(itemsByPackage).length} package(s)</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3 w-3 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">Net Amount</p>
            </div>
            <p className="text-lg font-bold text-emerald-900">{formatCurrency(order.commission?.netAmount || order.totalAmount)}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
            <div className="flex items-center gap-1 mb-1">
              <FileText className="h-3 w-3 text-amber-600" />
              <p className="text-xs text-amber-700 font-medium">Commission</p>
            </div>
            <p className="text-lg font-bold text-amber-900">-{formatCurrency(order.commission?.amount || 0)}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3 w-3 text-cyan-600" />
              <p className="text-xs text-cyan-700 font-medium">Payment Method</p>
            </div>
            <p className="text-sm font-bold text-cyan-900">{order.paymentMethod}</p>
          </div>
          {order.transactionId && (
            <div className="p-3 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
              <div className="flex items-center gap-1 mb-1">
                <FileText className="h-3 w-3 text-teal-600" />
                <p className="text-xs text-teal-700 font-medium">Transaction ID</p>
              </div>
              <p className="text-xs font-mono font-bold text-teal-900">{order.transactionId}</p>
            </div>
          )}
        </div>

        {/* Professional Order Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-teal-100">
                  <Building2 className="h-4 w-4 text-teal-600" />
                </div>
                <h3 className="font-bold text-base text-gray-900">Order Information</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Supplier:</span><span className="font-bold text-teal-900">{order.supplierName}</span></div>
                {order.distributor && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Distributor:</span><span className="font-bold text-teal-900">{order.distributor.name}</span></div>}
                {order.returnId && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Return ID:</span><Link href={`/returns/${order.returnId}`} className="font-bold text-teal-700 hover:text-teal-900 hover:underline">{order.returnId}</Link></div>}
                <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Payment Date:</span><span className="font-bold text-teal-900">{formatDate(order.paymentDate)}</span></div>
                {order.transactionId && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Transaction ID:</span><span className="font-mono font-bold text-teal-900">{order.transactionId}</span></div>}
              </div>
            </CardContent>
          </Card>
          {order.distributor && (
            <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-cyan-100">
                    <Building2 className="h-4 w-4 text-cyan-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Distributor Details</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-white/50"><span className="font-bold text-cyan-900">{order.distributor.name}</span></div>
                  {order.distributor.contactPerson && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-cyan-700 font-medium">Contact:</span><span className="font-bold text-cyan-900">{order.distributor.contactPerson}</span></div>}
                  {order.distributor.email && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-cyan-700 font-medium">Email:</span><span className="font-bold text-cyan-900">{order.distributor.email}</span></div>}
                  {order.distributor.phone && <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-cyan-700 font-medium">Phone:</span><span className="font-bold text-cyan-900">{order.distributor.phone}</span></div>}
                  {order.distributor.address && <div className="p-2 rounded bg-white/50"><span className="text-cyan-700 font-medium">Address: </span><span className="font-bold text-cyan-900">{order.distributor.address}</span></div>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Professional Package Breakdown Table */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-teal-100">
                <Package className="h-4 w-4 text-teal-600" />
              </div>
              <h3 className="font-bold text-base text-gray-900">Payment Items ({order.items.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b-2 border-teal-200">
                    <th className="text-left p-2 font-bold text-teal-900">Product</th>
                    <th className="text-left p-2 font-bold text-teal-900">NDC</th>
                    <th className="text-left p-2 font-bold text-teal-900">Lot</th>
                    <th className="text-left p-2 font-bold text-teal-900">Qty</th>
                    <th className="text-left p-2 font-bold text-teal-900">Expected</th>
                    <th className="text-left p-2 font-bold text-teal-900">Actual</th>
                    <th className="text-left p-2 font-bold text-teal-900">Variance</th>
                    <th className="text-left p-2 font-bold text-teal-900">Commission</th>
                    <th className="text-left p-2 font-bold text-teal-900">Net</th>
                    <th className="text-left p-2 font-bold text-teal-900">Distributor</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => {
                    const packageVariance = item.variance || 0;
                    return (
                      <tr key={item.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50 transition-colors`}>
                        <td className="p-2 font-semibold text-gray-900">{item.productName}</td>
                        <td className="p-2 font-mono text-gray-700">{item.ndc}</td>
                        <td className="p-2 text-gray-700">{item.lotNumber}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-700 font-medium">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="p-2 text-gray-700">{formatCurrency(item.expectedAmount)}</td>
                        <td className="p-2 font-bold text-cyan-700">{formatCurrency(item.actualAmount)}</td>
                        <td className={`p-2 font-bold ${packageVariance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {packageVariance >= 0 ? '+' : ''}{formatCurrency(packageVariance)}
                        </td>
                        <td className="p-2 font-bold text-amber-600">-{formatCurrency(item.commission?.amount || 0)}</td>
                        <td className="p-2 font-bold text-emerald-700">{formatCurrency(item.commission?.netAmount || item.actualAmount)}</td>
                        <td className="p-2 text-gray-700">{item.distributor?.name || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-to-r from-teal-50 to-cyan-50 border-t-2 border-teal-200">
                    <td colSpan={4} className="p-2 font-bold text-teal-900">Total</td>
                    <td className="p-2 font-bold text-teal-900">{formatCurrency(order.items.reduce((sum, item) => sum + item.expectedAmount, 0))}</td>
                    <td className="p-2 font-bold text-cyan-700">{formatCurrency(order.items.reduce((sum, item) => sum + item.actualAmount, 0))}</td>
                    <td className={`p-2 font-bold ${order.items.reduce((sum, item) => sum + (item.variance || 0), 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {order.items.reduce((sum, item) => sum + (item.variance || 0), 0) >= 0 ? '+' : ''}{formatCurrency(order.items.reduce((sum, item) => sum + (item.variance || 0), 0))}
                    </td>
                    <td className="p-2 font-bold text-amber-600">-{formatCurrency(order.items.reduce((sum, item) => sum + (item.commission?.amount || 0), 0))}</td>
                    <td className="p-2 font-bold text-emerald-700">{formatCurrency(order.commission?.netAmount || order.items.reduce((sum, item) => sum + (item.commission?.netAmount || item.actualAmount), 0))}</td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Professional Summary & Actions */}
        {order.returnId && (
          <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-100">
                    <FileText className="h-4 w-4 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-xs text-cyan-700 font-medium">Related Return</p>
                    <Link href={`/returns/${order.returnId}`} className="font-bold text-cyan-900 hover:text-cyan-700 hover:underline">
                      {order.returnId}
                    </Link>
                  </div>
                </div>
                <Link href={`/returns/${order.returnId}`}>
                  <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white border-0">
                    <FileText className="mr-1 h-3 w-3" />
                    View Return
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

