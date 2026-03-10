"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, DollarSign, Package, AlertTriangle, Calendar } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

// Types based on API response
interface Notification {
  id: string;
  pharmacy_id: string;
  title: string;
  message: string;
  notification_type: 'expiring_product' | 'order_status' | 'credit_received' | 'system';
  ndc_code?: string;
  product_name?: string;
  expiration_date?: string;
  days_until_expiration?: number;
  full_units?: number;
  partial_units?: number;
  full_price?: number;
  partial_price?: number;
  total_potential_value?: number;
  recommended_distributor_id?: string;
  recommended_distributor_name?: string;
  status: 'unread' | 'read' | 'dismissed';
  read_at: string | null;
  dismissed_at: string | null;
  inventory_item_id?: string;
  created_at: string;
  updated_at: string;
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasFetched, setHasFetched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get<Notification[]>('/notifications');
      if (response.status === 'success' && response.data) {
        setNotifications(response.data);
        // Update unread count from data
        const unread = response.data.filter(n => n.status === 'unread').length;
        setUnreadCount(unread);
        setHasFetched(true);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setHasFetched(true);
    }
  }, []);

  // Mark all notifications as read (called when dropdown opens)
  const markAllAsReadOnOpen = useCallback(async (notificationsList: Notification[]) => {
    const unreadNotifications = notificationsList.filter(n => n.status === 'unread');
    if (unreadNotifications.length === 0) return;

    // Mark all as read in parallel
    const promises = unreadNotifications.map(notification => 
      apiClient.put(`/notifications/${notification.id}/read`).catch(err => {
        console.error('Failed to mark notification as read:', err);
      })
    );

    await Promise.all(promises);

    // Update local state
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, status: 'read' as const, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
  }, []);

  // Fetch notifications on mount (once only)
  useEffect(() => {
    if (!hasFetched) {
      fetchNotifications();
    }
  }, [fetchNotifications, hasFetched]);

  // Listen for custom event to refresh notifications (e.g., after inventory upload)
  useEffect(() => {
    const handleRefreshNotifications = () => {
      fetchNotifications();
    };

    window.addEventListener('refreshNotifications', handleRefreshNotifications);
    return () => {
      window.removeEventListener('refreshNotifications', handleRefreshNotifications);
    };
  }, [fetchNotifications]);

  // Auto mark all as read when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length > 0) {
      const unreadNotifications = notifications.filter(n => n.status === 'unread');
      if (unreadNotifications.length > 0) {
        markAllAsReadOnOpen(notifications);
      }
    }
  }, [isOpen, notifications, markAllAsReadOnOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expiring_product':
        return <Calendar className="h-4 w-4 text-orange-600" />;
      case 'credit_received':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'order_status':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'system':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get notification background color based on type
  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'expiring_product':
        return 'bg-orange-100';
      case 'credit_received':
        return 'bg-green-100';
      case 'order_status':
        return 'bg-blue-100';
      case 'system':
        return 'bg-yellow-100';
      default:
        return 'bg-gray-100';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const recentNotifications = notifications.slice(0, 10);

  // Custom scrollbar styles for webkit browsers (Safari/Chrome on Mac)
  const scrollbarStyles = `
    .notification-scroll::-webkit-scrollbar {
      width: 6px;
    }
    .notification-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .notification-scroll::-webkit-scrollbar-thumb {
      background-color: #cbd5e1;
      border-radius: 3px;
    }
    .notification-scroll::-webkit-scrollbar-thumb:hover {
      background-color: #94a3b8;
    }
  `;

  return (
    <div className="relative" ref={dropdownRef}>
      <style>{scrollbarStyles}</style>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[320px] sm:w-[360px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[70vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-teal-600" />
              <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
            </div>
            <span className="text-xs text-gray-500">{notifications.length} total</span>
          </div>

          {/* Notifications List */}
          <div 
            className="notification-scroll overflow-y-auto flex-1"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 transparent'
            }}
          >
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div>
                {recentNotifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                      index !== recentNotifications.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${getNotificationBgColor(notification.notification_type)}`}>
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <p className="font-medium text-sm text-gray-900 leading-snug">
                          {notification.title}
                        </p>
                        
                        {/* Message */}
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2">
                          {notification.message}
                        </p>
                        
                        {/* Potential value for expiring products */}
                        {notification.notification_type === 'expiring_product' && notification.total_potential_value && notification.total_potential_value > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-200">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-700">
                              {formatCurrency(notification.total_potential_value)}
                            </span>
                            {notification.recommended_distributor_name && (
                              <span className="text-xs text-emerald-600">
                                • {notification.recommended_distributor_name}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer: time and expiration badge */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">
                            {formatDate(notification.created_at)}
                          </span>
                          {notification.days_until_expiration !== undefined && (
                            <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                              notification.days_until_expiration < 0 
                                ? 'bg-red-100 text-red-700' 
                                : notification.days_until_expiration <= 30 
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {notification.days_until_expiration < 0 
                                ? `Expired ${Math.abs(notification.days_until_expiration)}d ago`
                                : `${notification.days_until_expiration}d left`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
                Showing 10 of {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
