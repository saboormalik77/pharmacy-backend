"use client";

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Bell, Check, CheckCheck, Search, Filter, DollarSign, Truck, Package, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/format';
import { mockNotifications } from '@/data/mockNotifications';
import type { Notification } from '@/types';
import Link from 'next/link';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | Notification['type']>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = !searchQuery ||
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || notif.type === filterType;
    
    const matchesRead = filterRead === 'all' ||
      (filterRead === 'read' && notif.read) ||
      (filterRead === 'unread' && !notif.read);
    
    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'credit_received': return DollarSign;
      case 'shipment_update': return Truck;
      case 'order_status': return Package;
      case 'system': return AlertCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'credit_received': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'shipment_update': return 'bg-cyan-100 text-cyan-600 border-cyan-200';
      case 'order_status': return 'bg-teal-100 text-teal-600 border-teal-200';
      case 'system': return 'bg-amber-100 text-amber-600 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'credit_received': return 'Credit';
      case 'shipment_update': return 'Shipment';
      case 'order_status': return 'Order';
      case 'system': return 'System';
      default: return type;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Professional Medical Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100">
              <Bell className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All caught up!'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0">
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* Professional Filters */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-teal-500" />
                <Input placeholder="Search notifications..." className="pl-7 h-7 text-xs border-teal-200 focus:border-teal-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="h-7 px-2 text-xs border rounded border-teal-200"
              >
                <option value="all">All Types</option>
                <option value="credit_received">Credit Received</option>
                <option value="shipment_update">Shipment Update</option>
                <option value="order_status">Order Status</option>
                <option value="system">System</option>
              </select>
              <select
                value={filterRead}
                onChange={(e) => setFilterRead(e.target.value as any)}
                className="h-7 px-2 text-xs border rounded border-teal-200"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
              <Button variant="outline" size="sm" className="h-7 text-xs border-slate-300 hover:bg-slate-100" onClick={() => { setFilterType('all'); setFilterRead('all'); setSearchQuery(''); }}>
                <Filter className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Professional Notifications Table */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b-2 border-teal-200">
                    <th className="text-left p-2 font-bold text-teal-900 w-12">Type</th>
                    <th className="text-left p-2 font-bold text-teal-900">Title</th>
                    <th className="text-left p-2 font-bold text-teal-900">Message</th>
                    <th className="text-left p-2 font-bold text-teal-900">Date</th>
                    <th className="text-left p-2 font-bold text-teal-900">Status</th>
                    <th className="text-left p-2 font-bold text-teal-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotifications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500 text-sm bg-gray-50">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredNotifications.map((notification, idx) => {
                      const Icon = getNotificationIcon(notification.type);
                      const colorClass = getNotificationColor(notification.type);
                      return (
                        <tr key={notification.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${!notification.read ? 'bg-teal-50/50' : ''} hover:bg-teal-50 transition-colors`}>
                          <td className="p-2">
                            <div className={`p-1.5 rounded-lg border-2 ${colorClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{notification.title}</span>
                              {!notification.read && (
                                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-gray-700">{notification.message}</td>
                          <td className="p-2 text-gray-600">{formatDateTime(notification.createdAt)}</td>
                          <td className="p-2">
                            <Badge className={`text-xs border-2 ${colorClass}`}>
                              {getTypeLabel(notification.type)}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              {!notification.read && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              {notification.actionUrl && (
                                <Link href={notification.actionUrl}>
                                  <Button variant="outline" size="sm" className="h-6 px-2 text-xs border-cyan-300 text-cyan-700 hover:bg-cyan-50">
                                    View
                                  </Button>
                                </Link>
                              )}
                            </div>
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
      </div>
    </DashboardLayout>
  );
}
