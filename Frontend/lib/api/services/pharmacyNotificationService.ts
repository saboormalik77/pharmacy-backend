import { apiClient } from '../client';

export interface PharmacyServiceNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface PharmacyNotificationsResponse {
  notifications: PharmacyServiceNotification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  unread_count: number;
}

export const pharmacyNotificationService = {
  /**
   * List service request notifications for the authenticated pharmacy
   */
  async listNotifications(options: {
    limit?: number;
    offset?: number;
    only_unread?: boolean;
  } = {}): Promise<PharmacyNotificationsResponse> {
    const queryParams: Record<string, string> = {};
    if (options.limit) queryParams.limit = options.limit.toString();
    if (options.offset) queryParams.offset = options.offset.toString();
    if (options.only_unread) queryParams.only_unread = 'true';

    const response = await apiClient.get<PharmacyNotificationsResponse>(
      '/pharmacy/notifications',
      queryParams
    );

    if (response.status === 'success') {
      return response.data;
    }
    
    throw new Error('Failed to fetch pharmacy notifications');
  },

  /**
   * Mark a single notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    const response = await apiClient.post(
      `/pharmacy/notifications/${notificationId}/read`,
      {}
    );

    if (response.status !== 'success') {
      throw new Error('Failed to mark notification as read');
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<void> {
    const response = await apiClient.post(
      '/pharmacy/notifications/mark-all-read',
      {}
    );

    if (response.status !== 'success') {
      throw new Error('Failed to mark all notifications as read');
    }
  },
};