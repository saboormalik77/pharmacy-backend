"use client";

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Search, MapPin, Package, Truck, Calendar, CheckCircle } from 'lucide-react';
import { mockShipments } from '@/data/mockShipments';
import { formatDate, formatDateTime } from '@/lib/utils/format';
import Link from 'next/link';

export default function ShipmentsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShipments = mockShipments.filter(shipment =>
    !searchQuery ||
    shipment.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.returnId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'in_transit':
      case 'picked_up': return 'info';
      case 'exception': return 'error';
      case 'label_created': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-2">
        {/* Compact Header */}
        <div>
          <h1 className="text-xl font-bold">Shipments</h1>
          <p className="text-xs text-muted-foreground">Track your pharmaceutical shipments</p>
        </div>

        {/* Compact Search */}
        <Card>
          <CardContent className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by tracking number or return ID..." className="pl-7 h-7 text-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Compact Table */}
        <Card>
          <CardContent className="p-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2 font-medium">Shipment ID</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Return ID</th>
                    <th className="text-left p-2 font-medium">Tracking #</th>
                    <th className="text-left p-2 font-medium">Carrier</th>
                    <th className="text-left p-2 font-medium">Service</th>
                    <th className="text-left p-2 font-medium">Created</th>
                    <th className="text-left p-2 font-medium">Est. Delivery</th>
                    <th className="text-left p-2 font-medium">Actual Delivery</th>
                    <th className="text-left p-2 font-medium">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.length === 0 ? (
                    <tr><td colSpan={10} className="p-4 text-center text-muted-foreground text-sm">No shipments found</td></tr>
                  ) : (
                    filteredShipments.map((shipment) => (
                      <tr key={shipment.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{shipment.id}</td>
                        <td className="p-2">
                          <Badge variant={getStatusVariant(shipment.status)} className="text-xs">
                            {getStatusLabel(shipment.status)}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono">
                          <Link href={`/returns/${shipment.returnId}`} className="text-primary hover:underline">
                            {shipment.returnId}
                          </Link>
                        </td>
                        <td className="p-2 font-mono">{shipment.trackingNumber}</td>
                        <td className="p-2">{shipment.carrier}</td>
                        <td className="p-2">{shipment.serviceLevel}</td>
                        <td className="p-2">{formatDate(shipment.createdAt)}</td>
                        <td className="p-2">{shipment.estimatedDelivery ? formatDate(shipment.estimatedDelivery) : '-'}</td>
                        <td className="p-2 text-green-600">{shipment.actualDelivery ? formatDate(shipment.actualDelivery) : '-'}</td>
                        <td className="p-2">
                          <div className="space-y-0.5">
                            {shipment.events.slice(0, 2).map((event, idx) => (
                              <div key={idx} className="text-xs text-muted-foreground">
                                {event.status} - {formatDate(event.timestamp)}
                              </div>
                            ))}
                            {shipment.events.length > 2 && (
                              <div className="text-xs text-muted-foreground">+{shipment.events.length - 2} more</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
