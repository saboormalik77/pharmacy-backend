import { Request, Response, NextFunction } from 'express';
import {
  getPharmaciesList,
  getPharmacyById,
  updatePharmacy,
  updatePharmacyStatus,
  getPharmacyStoreSettings,
  updatePharmacyStoreSettings,
} from '../services/adminPharmaciesService';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';

const db = supabaseAdmin!;

/**
 * Get list of pharmacies
 * GET /api/admin/pharmacies
 */
export const getPharmaciesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, status = 'all', page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 10, 100); // Max 100

    // Normalize search parameter: trim whitespace, decode URL encoding, and collapse multiple spaces
    let normalizedSearch: string | undefined = undefined;
    if (search && typeof search === 'string') {
      // Decode URL encoding (e.g., %20 -> space, %09 -> tab)
      const decoded = decodeURIComponent(search);
      // Trim leading/trailing whitespace and collapse multiple spaces/tabs into single space
      normalizedSearch = decoded.trim().replace(/\s+/g, ' ');
      // Set to undefined if empty after normalization
      if (normalizedSearch === '') {
        normalizedSearch = undefined;
      }
    }

    const result = await getPharmaciesList(
      normalizedSearch,
      status as string,
      pageNum,
      limitNum,
      req.adminBuyingGroupId ?? null
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single pharmacy by ID
 * GET /api/admin/pharmacies/:id
 */
export const getPharmacyByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const result = await getPharmacyById(id, req.adminBuyingGroupId ?? null);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update pharmacy details
 * PUT /api/admin/pharmacies/:id
 */
export const updatePharmacyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    // Validate that at least one field is being updated
    const allowedFields = [
      'businessName',
      'owner',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'zipCode',
      'licenseNumber',
      'stateLicenseNumber',
      'licenseExpiryDate',
      'npiNumber',
      'deaNumber',
      'secondaryWholesaler',
      'physicalAddress',
      'billingAddress',
      'subscriptionTier',
      'subscriptionStatus',
    ];

    const hasValidUpdates = Object.keys(updates).some((key) =>
      allowedFields.includes(key)
    );

    if (!hasValidUpdates) {
      throw new AppError(
        'No valid fields to update. Allowed fields: ' + allowedFields.join(', '),
        400
      );
    }

    // Validate subscription fields if provided
    if (updates.subscriptionTier) {
      const validTiers = ['free', 'basic', 'premium', 'enterprise'];
      if (!validTiers.includes(updates.subscriptionTier)) {
        throw new AppError(
          `Invalid subscription tier. Must be one of: ${validTiers.join(', ')}`,
          400
        );
      }
    }

    if (updates.subscriptionStatus) {
      const validStatuses = ['active', 'trial', 'expired', 'cancelled', 'past_due'];
      if (!validStatuses.includes(updates.subscriptionStatus)) {
        throw new AppError(
          `Invalid subscription status. Must be one of: ${validStatuses.join(', ')}`,
          400
        );
      }
    }

    // Validate license expiry date format if provided
    if (updates.licenseExpiryDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updates.licenseExpiryDate)) {
        throw new AppError(
          'Invalid license expiry date format. Must be YYYY-MM-DD',
          400
        );
      }
    }

    const result = await updatePharmacy(id, updates, req.adminBuyingGroupId ?? null);

    res.status(200).json({
      status: 'success',
      message: 'Pharmacy updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update pharmacy status (blacklist/restore/suspend)
 * PUT /api/admin/pharmacies/:id/status
 */
export const updatePharmacyStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    if (!status) {
      throw new AppError('Status is required', 400);
    }

    const validStatuses = ['pending', 'active', 'suspended', 'blacklisted'];
    if (!validStatuses.includes(status)) {
      throw new AppError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400
      );
    }

    const result = await updatePharmacyStatus(id, status, req.adminBuyingGroupId ?? null);

    res.status(200).json({
      status: 'success',
      message: `Pharmacy status updated to ${status}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pharmacy store settings (FCR fields)
 * GET /api/admin/pharmacies/:id/store-settings
 */
export const getPharmacyStoreSettingsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const settings = await getPharmacyStoreSettings(id, req.adminBuyingGroupId ?? null);

    res.status(200).json({
      status: 'success',
      data: { storeSettings: settings },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update pharmacy store settings (FCR fields)
 * PATCH /api/admin/pharmacies/:id/store-settings
 */
export const updatePharmacyStoreSettingsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const allowedFields = [
      'storeNumber',
      'primaryWholesaler',
      'wholesalerAccountNumber',
      'secondaryWholesaler',
      'gpoAffiliation',
      'serviceType',
      'assignedProcessorId',
      'assignedSalesPersonId',
      'lastVisitDate',
      'nextVisitDate',
      'daysBetweenVisits',
      'deaExpirationDate',
      'faxNumber',
    ];

    const filtered: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filtered[key] = updates[key];
      }
    }

    if (Object.keys(filtered).length === 0) {
      throw new AppError(
        'No valid fields to update. Allowed fields: ' + allowedFields.join(', '),
        400
      );
    }

    if (filtered.deaExpirationDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(filtered.deaExpirationDate)) {
        throw new AppError('Invalid DEA expiration date format. Must be YYYY-MM-DD', 400);
      }
    }

    if (filtered.lastVisitDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(filtered.lastVisitDate)) {
        throw new AppError('Invalid last visit date format. Must be YYYY-MM-DD', 400);
      }
    }

    if (filtered.nextVisitDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(filtered.nextVisitDate)) {
        throw new AppError('Invalid next visit date format. Must be YYYY-MM-DD', 400);
      }
    }

    if (filtered.daysBetweenVisits !== undefined) {
      const days = Number(filtered.daysBetweenVisits);
      if (isNaN(days) || days < 1 || days > 365) {
        throw new AppError('Days between visits must be a number between 1 and 365', 400);
      }
      filtered.daysBetweenVisits = days;
    }

    const settings = await updatePharmacyStoreSettings(id, filtered, req.adminBuyingGroupId ?? null);

    res.status(200).json({
      status: 'success',
      message: 'Pharmacy store settings updated successfully',
      data: { storeSettings: settings },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new pharmacy (admin-initiated)
 * POST /api/admin/pharmacies
 */
export const createPharmacyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      pharmacyName, email, contactName, phone, fax,
      street, city, state, zip,
      wholesaler, wholesalerAccount, secondaryWholesaler,
      deaNumber, deaExpiration,
      serviceType, daysBetweenVisits,
      lastVisitDate, nextVisitDate,
      processorId, salesPersonId,
    } = req.body;

    if (!pharmacyName || !email) {
      throw new AppError('Pharmacy name and email are required', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Use the buying group ID from the authenticated admin so that the
    // new pharmacy is owned by the correct tenant. For MainAdmin
    // (no tenant), fall back to the legacy behaviour.
    const createdBy = req.adminBuyingGroupId || req.adminId || (req as any).user?.email || null;

    // Call the RPC function to create pharmacy + invite
    const { data: rpcResult, error: rpcError } = await db.rpc('admin_create_pharmacy', {
      p_pharmacy_name: pharmacyName,
      p_email: email,
      p_contact_name: contactName || null,
      p_phone: phone || null,
      p_fax: fax || null,
      p_street: street || null,
      p_city: city || null,
      p_state: state || null,
      p_zip: zip || null,
      p_wholesaler: wholesaler || null,
      p_wholesaler_account: wholesalerAccount || null,
      p_secondary_wholesaler: secondaryWholesaler || null,
      p_dea_number: deaNumber || null,
      p_dea_expiration: deaExpiration || null,
      p_service_type: serviceType || 'full_service',
      p_days_between_visits: daysBetweenVisits ? parseInt(daysBetweenVisits) : 120,
      p_last_visit_date: lastVisitDate || null,
      p_next_visit_date: nextVisitDate || null,
      p_processor_id: processorId || null,
      p_sales_person_id: salesPersonId || null,
      p_created_by: createdBy,
    });

    if (rpcError) {
      throw new AppError(rpcError.message || 'Failed to create pharmacy', 500);
    }

    if (rpcResult?.error) {
      throw new AppError(rpcResult.message, rpcResult.code || 400);
    }

    const { inviteId, inviteToken, email: pharmacyEmail, pharmacyName: name } = rpcResult.data;

    // Resolve the pharmacy portal URL from the admin's buying group domain.
    // req.adminBuyingGroupId is set by authenticateAdmin middleware for all admin routes.
    let portalBaseUrl = process.env.PHARMACY_PORTAL_URL || 'http://localhost:3002';
    const buyingGroupId = req.adminBuyingGroupId || null;
    if (buyingGroupId) {
      const { getBuyingGroupHostnames } = await import('../services/tenantService');
      const hostnames = await getBuyingGroupHostnames(buyingGroupId);
      if (hostnames?.pharmacyHostname) {
        portalBaseUrl = `https://${hostnames.pharmacyHostname}`;
      }
    }

    // Send invite email via Edge Function
    let emailSent = false;
    let emailErrorMsg: string | null = null;
    try {
      console.log(`📧 Invoking send-pharmacy-invite for ${pharmacyEmail}...`);
      const { data: emailResult, error: emailError } = await db.functions.invoke('send-pharmacy-invite', {
        body: {
          to: pharmacyEmail,
          pharmacyName: name,
          contactName: contactName || name,
          inviteToken,
          portalBaseUrl,
        },
      });

      if (emailError) {
        emailErrorMsg = emailError.message || JSON.stringify(emailError);
        console.error('❌ Edge Function error:', emailErrorMsg);
        console.error('❌ Full error:', JSON.stringify(emailError, null, 2));
      } else if (emailResult?.success === false) {
        emailErrorMsg = emailResult.error || 'Edge function returned success=false';
        console.error('❌ Edge Function returned error:', emailErrorMsg);
      } else {
        emailSent = true;
        console.log(`✅ Invite email sent to ${pharmacyEmail}, messageId: ${emailResult?.messageId}`);
      }
    } catch (emailErr: any) {
      emailErrorMsg = emailErr.message;
      console.error('❌ Exception invoking Edge Function:', emailErr.message);
      console.error('❌ Stack:', emailErr.stack);
    }

    res.status(201).json({
      status: 'success',
      message: emailSent
        ? 'Pharmacy created successfully. Invite email has been sent.'
        : `Pharmacy created successfully. Email failed: ${emailErrorMsg}`,
      emailSent,
      data: {
        inviteId,
        email: pharmacyEmail,
        pharmacyName: name,
        inviteToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending pharmacy invites
 * GET /api/admin/pharmacies/invites
 */
export const getPendingInvitesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let invitesQuery = db
      .from('pharmacy_invites')
      .select('id, email, pharmacy_name, contact_name, created_at, expires_at, created_by')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    // Scope to the admin's buying group (MainAdmin sees all).
    if (req.adminBuyingGroupId) {
      invitesQuery = invitesQuery.eq('created_by', req.adminBuyingGroupId);
    }

    const { data, error } = await invitesQuery.order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message || 'Failed to fetch pending invites', 500);
    }

    res.status(200).json({
      status: 'success',
      data: { invites: data || [] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a pending pharmacy invite
 * DELETE /api/admin/pharmacies/invites/:id
 */
export const cancelInviteHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Invite ID is required', 400);
    }

    // Update the invite status to cancelled (scoped to the admin's BG)
    let updateQuery = db
      .from('pharmacy_invites')
      .update({
        status: 'expired',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'pending');

    if (req.adminBuyingGroupId) {
      updateQuery = updateQuery.eq('created_by', req.adminBuyingGroupId);
    }

    const { data, error } = await updateQuery
      .select('email, pharmacy_name')
      .single();

    if (error) {
      throw new AppError(error.message || 'Failed to cancel invite', 500);
    }

    if (!data) {
      throw new AppError('Invite not found or already processed', 404);
    }

    res.status(200).json({
      status: 'success',
      message: `Invite for ${data.pharmacy_name} (${data.email}) has been cancelled`,
      data: { cancelledInvite: data },
    });
  } catch (error) {
    next(error);
  }
};

