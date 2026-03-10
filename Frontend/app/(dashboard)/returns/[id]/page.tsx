"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Package, Truck, DollarSign, Calendar, FileText, CheckCircle2, Clock, AlertCircle, XCircle, Eye, Warehouse, Send } from 'lucide-react';
import { mockReturns } from '@/data/mockReturns';
import { mockShipments } from '@/data/mockShipments';
import { formatCurrency, formatDate, formatNDC } from '@/lib/utils/format';
import { ChainOfCustodyTracker } from '@/components/controlled-substance/ChainOfCustody';
import { DEAForm222GeneratorComponent } from '@/components/dea/DEAForm222Generator';
import { ReturnActionButtons } from '@/components/returns/ReturnActionButtons';
import Link from 'next/link';

export default function ReturnDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [returnItem, setReturnItem] = useState(mockReturns.find(r => r.id === id));

  useEffect(() => {
    setReturnItem(mockReturns.find(r => r.id === id));
  }, [id]);

  if (!returnItem) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-xl font-bold">Return not found</h1>
          <Link href="/returns">
            <Button size="sm" className="mt-2">Back to Returns</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const shipment = returnItem.shipmentId ? mockShipments.find(s => s.id === returnItem.shipmentId) : null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_transit':
      case 'processing': return 'info';
      case 'draft': return 'secondary';
      case 'ready_to_ship': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const statusSteps = [
    { key: 'draft', label: 'Draft', icon: FileText, color: 'bg-slate-500', bgColor: 'bg-slate-50', textColor: 'text-slate-700', borderColor: 'border-slate-300' },
    { key: 'ready_to_ship', label: 'Ready to Ship', icon: Send, color: 'bg-cyan-500', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', borderColor: 'border-cyan-300' },
    { key: 'in_transit', label: 'In Transit', icon: Truck, color: 'bg-teal-500', bgColor: 'bg-teal-50', textColor: 'text-teal-700', borderColor: 'border-teal-300' },
    { key: 'processing', label: 'Processing', icon: Warehouse, color: 'bg-cyan-500', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', borderColor: 'border-cyan-300' },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-300' },
  ];

  const currentStatusIndex = statusSteps.findIndex(step => step.key === returnItem.status);
  const statusProgress = ((currentStatusIndex + 1) / statusSteps.length) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Professional Medical Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div className="flex items-center gap-3">
            <Link href="/returns">
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
                <h1 className="text-xl font-bold text-gray-900">{returnItem.id}</h1>
                <Badge variant={getStatusVariant(returnItem.status)} className="text-xs">
                  {getStatusLabel(returnItem.status)}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Created {formatDate(returnItem.createdAt)} • Updated {formatDate(returnItem.updatedAt)}
              </p>
            </div>
          </div>
          <ReturnActionButtons />
        </div>

        {/* Professional Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="p-3 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-teal-600" />
              <p className="text-xs text-teal-700 font-medium">Total Items</p>
            </div>
            <p className="text-2xl font-bold text-teal-900">{returnItem.items.length}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-cyan-600" />
              <p className="text-xs text-cyan-700 font-medium">Client</p>
            </div>
            <p className="text-lg font-bold text-cyan-900 truncate">{returnItem.clientName}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">Est. Credit</p>
            </div>
            <p className="text-2xl font-bold text-emerald-900">{formatCurrency(returnItem.totalEstimatedCredit)}</p>
          </div>
          {shipment ? (
            <div className="p-3 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="h-4 w-4 text-teal-600" />
                <p className="text-xs text-teal-700 font-medium">Tracking</p>
              </div>
              <p className="text-sm font-bold text-teal-900 font-mono truncate">{shipment.trackingNumber}</p>
            </div>
          ) : (
            <div className="p-3 rounded-lg border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="h-4 w-4 text-slate-400" />
                <p className="text-xs text-slate-500 font-medium">No Shipment</p>
              </div>
              <p className="text-sm font-bold text-slate-400">-</p>
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

        {/* Professional Items Section */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-100">
                  <Package className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Return Items</h3>
                  <p className="text-xs text-gray-600">{returnItem.items.length} items • Total: {formatCurrency(returnItem.totalEstimatedCredit)}</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b-2 border-teal-200">
                    <th className="text-left p-2 font-bold text-teal-900">NDC</th>
                    <th className="text-left p-2 font-bold text-teal-900">Drug Name</th>
                    <th className="text-left p-2 font-bold text-teal-900">Manufacturer</th>
                    <th className="text-left p-2 font-bold text-teal-900">Lot #</th>
                    <th className="text-left p-2 font-bold text-teal-900">Expiration</th>
                    <th className="text-left p-2 font-bold text-teal-900">Quantity</th>
                    <th className="text-left p-2 font-bold text-teal-900">Est. Credit</th>
                    <th className="text-left p-2 font-bold text-teal-900">Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {returnItem.items.map((item, idx) => {
                    const isEven = idx % 2 === 0;
                    const classificationColor = item.classification === 'returnable' 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : item.classification === 'destruction' 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-amber-50 border-amber-200';
                    
                    return (
                      <tr key={item.id} className={`border-b ${isEven ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50 transition-colors`}>
                        <td className="p-2 font-mono text-gray-700">{formatNDC(item.ndc)}</td>
                        <td className="p-2 font-semibold text-gray-900">{item.drugName}</td>
                        <td className="p-2 text-gray-700">{item.manufacturer}</td>
                        <td className="p-2 font-mono text-gray-600">{item.lotNumber}</td>
                        <td className="p-2 text-gray-700">{item.expirationDate}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-700 font-medium">
                            {item.quantity} {item.unit}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="font-bold text-emerald-700">{formatCurrency(item.estimatedCredit)}</span>
                        </td>
                        <td className="p-2">
                          <Badge 
                            variant={item.classification === 'returnable' ? 'success' : item.classification === 'destruction' ? 'error' : 'warning'} 
                            className={`text-xs border-2 ${classificationColor}`}
                          >
                            {item.classification || 'Pending'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-to-r from-emerald-100 to-teal-100 border-t-2 border-emerald-300">
                    <td colSpan={6} className="p-2 text-right font-bold text-emerald-900">Total Estimated Credit:</td>
                    <td className="p-2 font-bold text-lg text-emerald-900">{formatCurrency(returnItem.totalEstimatedCredit)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Professional Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {shipment && (
            <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-cyan-100">
                    <Truck className="h-4 w-4 text-cyan-600" />
                  </div>
                  <h3 className="font-bold text-base text-cyan-900">Shipment Information</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded bg-white/50">
                    <span className="text-cyan-700 font-medium">Shipment ID:</span>
                    <Link href={`/shipments/${shipment.id}`} className="font-bold text-cyan-900 hover:underline">{shipment.id}</Link>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white/50">
                    <span className="text-cyan-700 font-medium">Carrier:</span>
                    <span className="font-semibold text-cyan-900">{shipment.carrier} - {shipment.serviceLevel}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white/50">
                    <span className="text-cyan-700 font-medium">Tracking:</span>
                    <span className="font-mono font-semibold text-cyan-900">{shipment.trackingNumber}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white/50">
                    <span className="text-cyan-700 font-medium">Status:</span>
                    <Badge variant={getStatusVariant(shipment.status)} className="text-xs">{getStatusLabel(shipment.status)}</Badge>
                  </div>
                  {shipment.estimatedDelivery && (
                    <div className="flex justify-between p-2 rounded bg-white/50">
                      <span className="text-cyan-700 font-medium">Est. Delivery:</span>
                      <span className="font-semibold text-cyan-900">{formatDate(shipment.estimatedDelivery)}</span>
                    </div>
                  )}
                  {shipment.actualDelivery && (
                    <div className="flex justify-between p-2 rounded bg-emerald-100 border border-emerald-300">
                      <span className="text-emerald-700 font-medium">Delivered:</span>
                      <span className="font-bold text-emerald-900">{formatDate(shipment.actualDelivery)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {returnItem.notes && (
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <h3 className="font-bold text-base text-amber-900">Notes</h3>
                </div>
                <p className="text-xs text-amber-800 bg-white/50 p-2 rounded">{returnItem.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* DEA Form 222 Generator */}
        {returnItem.items.some(item => 
          item.classification === 'destruction' || 
          item.drugName.toLowerCase().includes('controlled')
        ) && (
          <DEAForm222GeneratorComponent
            returnId={returnItem.id}
            items={returnItem.items
              .filter(item => item.classification === 'destruction' || item.drugName.toLowerCase().includes('controlled'))
              .map(item => ({
                ndc: item.ndc,
                drugName: item.drugName,
                manufacturer: item.manufacturer,
                quantity: item.quantity,
                lotNumber: item.lotNumber,
                expirationDate: item.expirationDate,
              }))}
          />
        )}

        {/* Chain of Custody */}
        {returnItem.items.some(item => 
          item.classification === 'destruction' || 
          item.drugName.toLowerCase().includes('controlled')
        ) && (
          <ChainOfCustodyTracker
            returnId={returnItem.id}
            items={returnItem.items
              .filter(item => item.classification === 'destruction')
              .map(item => ({
                ndc: item.ndc,
                productName: item.drugName,
                quantity: item.quantity,
                lotNumber: item.lotNumber,
                deaSchedule: 'CII',
              }))}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
