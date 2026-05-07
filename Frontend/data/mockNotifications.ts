import type { Notification } from '@/types';

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-1',
    type: 'credit_received',
    title: 'Credit Received',
    message: 'Payment of $1,250.00 received for Return RET-2024-001',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    actionUrl: '/payments',
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    type: 'shipment_update',
    title: 'Shipment Delivered',
    message: 'Shipment SHIP-001 has been delivered to warehouse',
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    actionUrl: '/shipments/SHIP-001',
  },
  {
    id: 'notif-3',
    userId: 'user-1',
    type: 'system',
    title: 'Items Expiring Soon',
    message: '5 items in your inventory are expiring in the next 6 months',
    read: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    actionUrl: '/inventory?filter=expiring_soon',
  },
  {
    id: 'notif-4',
    userId: 'user-1',
    type: 'order_status',
    title: 'Order Status Updated',
    message: 'Order ORD-001 status changed to Completed',
    read: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    actionUrl: '/orders/ORD-001',
  },
  {
    id: 'notif-5',
    userId: 'user-1',
    type: 'credit_received',
    title: 'Partial Payment Received',
    message: 'Partial payment of $425.00 received for Return RET-2024-002',
    read: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    actionUrl: '/payments',
  },
];

export function getUnreadCount(userId: string): number {
  return mockNotifications.filter(n => n.userId === userId && !n.read).length;
}

export function getNotificationsByUser(userId: string): Notification[] {
  return mockNotifications.filter(n => n.userId === userId);
}

