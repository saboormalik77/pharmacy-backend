/**
 * Notification Cron Service
 * 
 * Runs daily to check for expiring products and send notifications to pharmacies.
 * 
 * Logic:
 * - Check all pharmacy_inventory_items where expiration_date <= 30 days from now
 * - For each expiring product, create a notification:
 *   "Hey if you still have that product return it now. Click here to see the price you can earn"
 * - Save full_units, partial_units, full_price, partial_price, total_potential_value in notification
 */

import { supabaseAdmin } from '../config/supabase';
import { getPricingForNDCs, PricingRequest } from './pricingService';
import { sendEmail } from './emailService';
import { sendPushNotification } from './firebaseService';

// ============================================================
// Types
// ============================================================

interface ExpiringItem {
  id: string;
  pharmacy_id: string;
  ndc_code: string;
  ndc_normalized: string;
  product_name: string;
  full_units: number;
  partial_units: number;
  expiration_date: string;
  recommended_distributor_id?: string;
  recommended_distributor_name?: string;
  best_full_price: number;
  best_partial_price: number;
  estimated_return_value: number;
}

interface PharmacyInfo {
  id: string;
  name: string;
  email: string;
  fcm_token?: string | null;
}

// ============================================================
// Main Cron Function
// ============================================================

/**
 * Check for expiring products and create notifications
 * Runs every 30 minutes via cron job (with duplicate prevention)
 */
export const checkExpiringProductsAndNotify = async (): Promise<{
  processedPharmacies: number;
  notificationsCreated: number;
  emailsSent: number;
  pushNotificationsSent: number;
  errors: string[];
}> => {
  console.log('🔔 Starting expiring products check (runs every 30 minutes)...');
  
  const errors: string[] = [];
  let notificationsCreated = 0;
  let emailsSent = 0;
  let pushNotificationsSent = 0;
  const processedPharmacies = new Set<string>();

    if (!supabaseAdmin) {
    return {
      processedPharmacies: 0,
      notificationsCreated: 0,
      emailsSent: 0,
      pushNotificationsSent: 0,
      errors: ['Supabase admin client not configured'],
    };
  }

  try {
    // Calculate date range: today and 30 days from now
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysFromNowStr = thirtyDaysFromNow.toISOString().split('T')[0];

    console.log(`📅 Checking for products that are:`);
    console.log(`   - Already expired (expiration_date < ${todayStr})`);
    console.log(`   - OR expiring within next 30 days (expiration_date <= ${thirtyDaysFromNowStr})`);

    // 1. First, get all items that already have notifications (to exclude them)
    const { data: processedItems } = await supabaseAdmin
      .from('pharmacy_notifications')
      .select('inventory_item_id')
      .eq('type', 'expiring_product')
      .not('inventory_item_id', 'is', null);

    const processedItemIds = processedItems?.map(item => item.inventory_item_id) || [];
    console.log(`📋 Found ${processedItemIds.length} items already processed (will skip these)`);

    // 2. Find all active inventory items that are expired OR expiring within next 30 days
    // Use two separate conditions with OR logic
    let query = supabaseAdmin
      .from('pharmacy_inventory_items')
      .select(`
        id,
        pharmacy_id,
        ndc_code,
        ndc_normalized,
        product_name,
        full_units,
        partial_units,
        expiration_date,
        recommended_distributor_id,
        recommended_distributor_name,
        best_full_price,
        best_partial_price,
        estimated_return_value
      `)
      .eq('status', 'active')
      .or(`expiration_date.lt.${todayStr},expiration_date.lte.${thirtyDaysFromNowStr}`);

    // Exclude already processed items
    if (processedItemIds.length > 0) {
      query = query.not('id', 'in', `(${processedItemIds.join(',')})`);
    }

    const { data: expiringItems, error: itemsError } = await query;

    if (itemsError) {
      console.error('Error fetching expiring items:', itemsError);
      errors.push(`Error fetching expiring items: ${itemsError.message}`);
      return { processedPharmacies: 0, notificationsCreated: 0, emailsSent: 0, pushNotificationsSent: 0, errors };
    }

    if (!expiringItems || expiringItems.length === 0) {
      console.log('✅ No new expired or expiring products found (all already processed)');
      return { processedPharmacies: 0, notificationsCreated: 0, emailsSent: 0, pushNotificationsSent: 0, errors };
    }

    console.log(`📦 Found ${expiringItems.length} NEW expired/expiring products to process`);

    // 2. Get fresh pricing for all expiring items
    const pricingRequests: PricingRequest[] = expiringItems.map(item => ({
      ndc: item.ndc_code,
      fullCount: item.full_units || 0,
      partialCount: item.partial_units || 0,
    }));

    const pricingMap = await getPricingForNDCs(pricingRequests);

    // 3. Group items by pharmacy
    const pharmacyItems = new Map<string, ExpiringItem[]>();
    for (const item of expiringItems) {
      if (!pharmacyItems.has(item.pharmacy_id)) {
        pharmacyItems.set(item.pharmacy_id, []);
      }
      pharmacyItems.get(item.pharmacy_id)!.push(item as ExpiringItem);
    }

    console.log(`🏥 Processing ${pharmacyItems.size} pharmacies`);

    // 4. Process each pharmacy
    for (const [pharmacyId, items] of pharmacyItems) {
      processedPharmacies.add(pharmacyId);
      
      try {
        // Get pharmacy info for email and push notifications
        const { data: pharmacy } = await supabaseAdmin
          .from('pharmacy')
          .select('id, name, email, fcm_token, buying_group_id')
          .eq('id', pharmacyId)
          .single();

        // 5. Create notifications for each expiring item
        // (No need to check for duplicates since we already filtered them out in the main query)
        const notificationsToInsert: any[] = [];
        
        for (const item of items) {

          // Get fresh pricing
          const ndcNormalized = item.ndc_normalized || item.ndc_code.replace(/-/g, '');
          const pricing = pricingMap.get(ndcNormalized);
          
          let fullPrice = item.best_full_price || 0;
          let partialPrice = item.best_partial_price || 0;
          let distributorName = item.recommended_distributor_name;
          let distributorId = item.recommended_distributor_id;

          // Update with fresh pricing if available
          if (pricing && pricing.recommendedDistributor) {
            fullPrice = pricing.recommendedDistributor.fullPrice || fullPrice;
            partialPrice = pricing.recommendedDistributor.partialPrice || partialPrice;
            distributorName = pricing.recommendedDistributor.distributorName || distributorName;
            distributorId = pricing.recommendedDistributor.distributorId || distributorId;
          }

          // Calculate total potential value
          const fullValue = (item.full_units || 0) * fullPrice;
          const partialValue = (item.partial_units || 0) * partialPrice;
          const totalPotentialValue = Math.round((fullValue + partialValue) * 100) / 100;

          // Calculate days until/since expiration
          const expirationDate = new Date(item.expiration_date);
          const daysUntilExpiration = Math.floor(
            (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Create appropriate message based on expiration status
          let expirationMessage;
          if (daysUntilExpiration < 0) {
            // Already expired
            expirationMessage = `This product EXPIRED ${Math.abs(daysUntilExpiration)} days ago!`;
          } else if (daysUntilExpiration === 0) {
            // Expires today
            expirationMessage = `This product expires TODAY!`;
          } else {
            // Expires soon
            expirationMessage = `This product expires in ${daysUntilExpiration} days.`;
          }

          // Create notification
          const notification = {
            pharmacy_id: pharmacyId,
            title: `Return Reminder: ${item.product_name || item.ndc_code}`,
            message: `Hey! If you still have ${item.product_name || `product ${item.ndc_code}`}, ` +
                     `return it now! You can earn $${totalPotentialValue.toFixed(2)}. ` +
                     `${expirationMessage}`,
            type: 'expiring_product',
            ndc_code: item.ndc_code,
            product_name: item.product_name,
            expiration_date: item.expiration_date,
            days_until_expiration: daysUntilExpiration,
            full_units: item.full_units || 0,
            partial_units: item.partial_units || 0,
            full_price: fullPrice,
            partial_price: partialPrice,
            total_potential_value: totalPotentialValue,
            recommended_distributor_id: distributorId,
            recommended_distributor_name: distributorName,
            inventory_item_id: item.id,
            status: 'unread',
          };

          notificationsToInsert.push(notification);
        }

        // 6. Insert notifications
        if (notificationsToInsert.length > 0) {
          const { error: insertError } = await supabaseAdmin
            .from('pharmacy_notifications')
            .insert(notificationsToInsert);

          if (insertError) {
            console.error(`Error inserting notifications for pharmacy ${pharmacyId}:`, insertError);
            errors.push(`Pharmacy ${pharmacyId}: ${insertError.message}`);
          } else {
            notificationsCreated += notificationsToInsert.length;
            console.log(`✅ Created ${notificationsToInsert.length} notifications for pharmacy ${pharmacyId}`);
          }

          // 7. Send email summary to pharmacy
          if (pharmacy?.email) {
            try {
              const totalValue = notificationsToInsert.reduce((sum, n) => sum + n.total_potential_value, 0);
              
              await sendEmail({
                to: pharmacy.email,
                subject: `📦 ${notificationsToInsert.length} Products Expiring Soon - Potential Return Value: $${totalValue.toFixed(2)}`,
                html: await generateEmailHtml(pharmacy.name, notificationsToInsert, pharmacy.buying_group_id),
                text: await generateEmailText(pharmacy.name, notificationsToInsert, pharmacy.buying_group_id),
              });

              emailsSent++;
              console.log(`📧 Email sent to ${pharmacy.email}`);
            } catch (emailError: any) {
              console.error(`Error sending email to ${pharmacy.email}:`, emailError);
              errors.push(`Email to ${pharmacy.email}: ${emailError.message}`);
            }
          }

          // 8. Send push notification to pharmacy
          if (pharmacy?.fcm_token && typeof pharmacy.fcm_token === 'string' && pharmacy.fcm_token.trim().length > 0) {
            try {
              const totalValue = notificationsToInsert.reduce((sum, n) => sum + n.total_potential_value, 0);
              const title = `📦 ${notificationsToInsert.length} Products Expiring Soon`;
              const body = `Potential return value: $${totalValue.toFixed(2)}. Click to view details.`;
              
              const pushData = {
                type: 'expiring_products',
                notification_count: String(notificationsToInsert.length),
                total_value: totalValue.toFixed(2),
                pharmacy_id: pharmacyId,
              };

              const pushSent = await sendPushNotification(
                pharmacy.fcm_token,
                title,
                body,
                pushData
              );

              if (pushSent) {
                pushNotificationsSent++;
                console.log(`📱 Push notification sent to pharmacy ${pharmacyId}`);
              } else {
                console.warn(`⚠️ Failed to send push notification to pharmacy ${pharmacyId}`);
              }
            } catch (pushError: any) {
              console.error(`Error sending push notification to pharmacy ${pharmacyId}:`, pushError);
              errors.push(`Push notification to pharmacy ${pharmacyId}: ${pushError.message}`);
            }
          } else {
            console.log(`ℹ️ No FCM token found for pharmacy ${pharmacyId}, skipping push notification`);
          }
        }
      } catch (pharmacyError: any) {
        console.error(`Error processing pharmacy ${pharmacyId}:`, pharmacyError);
        errors.push(`Pharmacy ${pharmacyId}: ${pharmacyError.message}`);
      }
    }

    console.log('🔔 Expiring products check completed (runs every 30 minutes)');
    console.log(`   Pharmacies processed: ${processedPharmacies.size}`);
    console.log(`   Notifications created: ${notificationsCreated}`);
    console.log(`   Emails sent: ${emailsSent}`);
    console.log(`   Push notifications sent: ${pushNotificationsSent}`);

    return {
      processedPharmacies: processedPharmacies.size,
      notificationsCreated,
      emailsSent,
      pushNotificationsSent,
      errors,
    };

  } catch (error: any) {
    console.error('Error in daily check:', error);
    errors.push(`Fatal error: ${error.message}`);
    return {
      processedPharmacies: processedPharmacies.size,
      notificationsCreated,
      emailsSent,
      pushNotificationsSent,
      errors,
    };
  }
};

// ============================================================
// Email Helpers
// ============================================================

const generateEmailHtml = async (
  pharmacyName: string,
  notifications: any[],
  buyingGroupId?: string | null
): Promise<string> => {
  const totalValue = notifications.reduce((sum, n) => sum + n.total_potential_value, 0);
  
  // Build the pharmacy portal base URL using the buying group's pharmacy_hostname
  let baseUrl = process.env.FRONTEND_URL || 'https://app.pharmacollect.com';
  if (buyingGroupId) {
    const { getBuyingGroupHostnames } = await import('./tenantService');
    const hostnames = await getBuyingGroupHostnames(buyingGroupId);
    if (hostnames?.pharmacyHostname) {
      baseUrl = `https://${hostnames.pharmacyHostname}`;
    }
  }
  
  let itemsHtml = notifications.map(n => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
        <strong>${n.product_name || n.ndc_code}</strong><br>
        <small style="color: #666;">NDC: ${n.ndc_code}</small>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">
        ${n.full_units} full, ${n.partial_units} partial
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">
        ${n.days_until_expiration} days
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">
        <strong style="color: #2e7d32;">$${n.total_potential_value.toFixed(2)}</strong>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a237e 0%, #4a148c 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Expiring Products Alert</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">
      Hey ${pharmacyName}! You have products that need attention.
    </p>
  </div>
  
  <div style="background: #f5f5f5; padding: 25px; border-radius: 0 0 12px 12px;">
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
      <p style="margin: 0; font-size: 16px; color: #666;">Total Potential Return Value</p>
      <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; color: #2e7d32;">$${totalValue.toFixed(2)}</p>
    </div>
    
    <p style="margin: 0 0 15px 0; font-size: 16px;">
      <strong>If you still have these products, return them now!</strong> 
      They're expiring soon and you can still earn money from them.
    </p>
    
    <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #e3f2fd;">
          <th style="padding: 12px; text-align: left;">Product</th>
          <th style="padding: 12px; text-align: center;">Units</th>
          <th style="padding: 12px; text-align: center;">Expires In</th>
          <th style="padding: 12px; text-align: right;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div style="margin-top: 25px; text-align: center;">
      <a href="${baseUrl}/inventory" 
         style="display: inline-block; background: linear-gradient(135deg, #1a237e 0%, #4a148c 100%); 
                color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; 
                font-weight: bold; font-size: 16px;">
        View & Return Now →
      </a>
    </div>
    
    <p style="margin: 25px 0 0 0; font-size: 12px; color: #999; text-align: center;">
      This is an automated reminder from PharmaCollect. 
      <a href="${baseUrl}/settings/notifications" style="color: #666;">
        Manage notification preferences
      </a>
    </p>
  </div>
</body>
</html>
  `;
};

const generateEmailText = async (
  pharmacyName: string,
  notifications: any[],
  buyingGroupId?: string | null
): Promise<string> => {
  const totalValue = notifications.reduce((sum, n) => sum + n.total_potential_value, 0);
  
  let baseUrl = process.env.FRONTEND_URL || 'https://app.pharmacollect.com';
  if (buyingGroupId) {
    const { getBuyingGroupHostnames } = await import('./tenantService');
    const hostnames = await getBuyingGroupHostnames(buyingGroupId);
    if (hostnames?.pharmacyHostname) {
      baseUrl = `https://${hostnames.pharmacyHostname}`;
    }
  }

  let itemsText = notifications.map(n => 
    `- ${n.product_name || n.ndc_code} (NDC: ${n.ndc_code})\n` +
    `  Units: ${n.full_units} full, ${n.partial_units} partial\n` +
    `  Expires in: ${n.days_until_expiration} days\n` +
    `  Potential value: $${n.total_potential_value.toFixed(2)}\n`
  ).join('\n');

  return `
EXPIRING PRODUCTS ALERT
=======================

Hey ${pharmacyName}!

If you still have these products, return them now! They're expiring soon and you can still earn money from them.

Total Potential Return Value: $${totalValue.toFixed(2)}

PRODUCTS EXPIRING SOON:
${itemsText}

Visit ${baseUrl}/inventory to view and return.

This is an automated reminder from PharmaCollect.
  `;
};

// ============================================================
// API Handlers for Notifications
// ============================================================

/**
 * Get notifications for a pharmacy
 */
export const getPharmacyNotifications = async (
  pharmacyId: string,
  options: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ notifications: any[]; total: number }> => {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured');
  }

  // Only return inventory-style notifications from this endpoint.
  // Service-request notifications live in the same table but are served by
  // /api/pharmacy/notifications — we exclude them here so they don't leak
  // into the inventory feed (which would render them as `${null}d left`).
  const INVENTORY_TYPES = [
    'expiring_product',
    'monthly_reminder',
    'price_update',
    'return_opportunity',
  ];

  let query = supabaseAdmin
    .from('pharmacy_notifications')
    .select('*', { count: 'exact' })
    .eq('pharmacy_id', pharmacyId)
    .in('type', INVENTORY_TYPES)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }
  if (options.type) {
    query = query.eq('type', options.type);
  }
  
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  return {
    notifications: data || [],
    total: count || 0,
  };
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (
  pharmacyId: string,
  notificationId: string
): Promise<void> => {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured');
  }

  const { error } = await supabaseAdmin
    .from('pharmacy_notifications')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('pharmacy_id', pharmacyId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
};

/**
 * Dismiss notification
 */
export const dismissNotification = async (
  pharmacyId: string,
  notificationId: string
): Promise<void> => {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured');
  }

  const { error } = await supabaseAdmin
    .from('pharmacy_notifications')
    .update({
      status: 'dismissed',
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('pharmacy_id', pharmacyId);

  if (error) {
    throw new Error(`Failed to dismiss notification: ${error.message}`);
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (pharmacyId: string): Promise<number> => {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured');
  }

  const { count, error } = await supabaseAdmin
    .from('pharmacy_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('pharmacy_id', pharmacyId)
    .eq('status', 'unread')
    .in('type', [
      'expiring_product',
      'monthly_reminder',
      'price_update',
      'return_opportunity',
    ]);

  if (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }

  return count || 0;
};

