import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

/**
 * Pharmacy-specific in-app notifications.
 *
 * Backed by the `pharmacy_notifications` table and three RPCs:
 *   - list_pharmacy_notifications
 *   - mark_pharmacy_notification_read
 *   - mark_all_pharmacy_notifications_read
 *
 * This service is used by the pharmacy portal's notification system.
 * Pharmacies can only see notifications for their own service requests.
 */

export interface PharmacyNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ListPharmacyNotificationsResponse {
  notifications: PharmacyNotification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  unread_count: number;
}

const ensureAdmin = () => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }
  return supabaseAdmin;
};

const mapRpcError = (error: any, fallbackStatus = 400): AppError => {
  const msg = error?.message || 'Pharmacy notification operation failed';
  const code = error?.code;
  if (code === '42501') return new AppError(msg, 403);
  if (code === '02000') return new AppError(msg, 404);
  if (code === '22023') return new AppError(msg, 400);
  return new AppError(msg, fallbackStatus);
};

export const listPharmacyNotifications = async (
  pharmacyId: string,
  opts: { limit?: number; offset?: number; onlyUnread?: boolean } = {}
): Promise<ListPharmacyNotificationsResponse> => {
  const admin = ensureAdmin();

  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const onlyUnread = opts.onlyUnread ?? false;

  const { data, error } = await admin.rpc('list_pharmacy_notifications', {
    p_pharmacy_id: pharmacyId,
    p_limit: limit,
    p_offset: offset,
    p_only_unread: onlyUnread,
  });

  if (error) {
    throw mapRpcError(error);
  }

  const payload = (data || {}) as Partial<ListPharmacyNotificationsResponse>;
  return {
    notifications: payload.notifications || [],
    pagination: payload.pagination || {
      total: 0,
      limit,
      offset,
      has_more: false,
    },
    unread_count: payload.unread_count ?? 0,
  };
};

export const markPharmacyNotificationRead = async (
  notificationId: string,
  pharmacyId: string
): Promise<{ success: boolean; updated_count: number }> => {
  const admin = ensureAdmin();

  const { data, error } = await admin.rpc('mark_pharmacy_notification_read', {
    p_notification_id: notificationId,
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    throw mapRpcError(error);
  }

  return (data || { success: false, updated_count: 0 }) as {
    success: boolean;
    updated_count: number;
  };
};

export const markAllPharmacyNotificationsRead = async (
  pharmacyId: string
): Promise<{ success: boolean; updated_count: number }> => {
  const admin = ensureAdmin();

  const { data, error } = await admin.rpc('mark_all_pharmacy_notifications_read', {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    throw mapRpcError(error);
  }

  return (data || { success: true, updated_count: 0 }) as {
    success: boolean;
    updated_count: number;
  };
};