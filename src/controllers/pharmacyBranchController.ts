import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { loginAsBranch } from '../services/authService';

const db = supabaseAdmin!;

export const createBranchHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parentPharmacyId = req.pharmacyId;
    const {
      pharmacyName, email, contactName, phone, fax,
      street, city, state, zip,
      wholesaler, wholesalerAccount, secondaryWholesaler,
      deaNumber, deaExpiration,
      serviceType, daysBetweenVisits,
      lastVisitDate, nextVisitDate,
      processorId, salesPersonId,
      roleIds,
    } = req.body;

    if (!pharmacyName || !email) {
      throw new AppError('Pharmacy name and email are required', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    const { data: rpcResult, error: rpcError } = await db.rpc('pharmacy_admin_create_branch', {
      p_parent_pharmacy_id: parentPharmacyId,
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
      p_pending_role_ids:
        Array.isArray(roleIds) && roleIds.length > 0 ? roleIds : null,
    });

    if (rpcError) throw new AppError(rpcError.message || 'Failed to create branch', 500);
    if (rpcResult?.error) throw new AppError(rpcResult.message, rpcResult.code || 400);

    const { inviteToken, email: branchEmail, pharmacyName: name, parentPharmacyName } = rpcResult.data;

    // Resolve the pharmacy portal URL from the parent pharmacy's buying group domain
    let portalBaseUrl = process.env.PHARMACY_PORTAL_URL || 'http://localhost:3002';
    const buyingGroupId = req.tenant?.buyingGroupId || await (async () => {
      if (!parentPharmacyId) return null;
      const { data: row } = await db.from('pharmacy').select('buying_group_id').eq('id', parentPharmacyId).single();
      return row?.buying_group_id || null;
    })();
    if (buyingGroupId) {
      const { getBuyingGroupHostnames } = await import('../services/tenantService');
      const hostnames = await getBuyingGroupHostnames(buyingGroupId);
      if (hostnames?.pharmacyHostname) {
        portalBaseUrl = `https://${hostnames.pharmacyHostname}`;
      }
    }

    try {
      const { error: emailError } = await db.functions.invoke('send-branch-invite', {
        body: {
          to: branchEmail,
          pharmacyName: name,
          contactName: contactName || name,
          inviteToken,
          portalBaseUrl,
          parentPharmacyName,
        },
      });
      if (emailError) console.error('Failed to send branch invite email:', emailError);
    } catch (emailErr: any) {
      console.error('Failed to send branch invite email:', emailErr.message);
    }

    res.status(201).json({
      status: 'success',
      message: 'Branch pharmacy created successfully. Invite email has been sent.',
      data: rpcResult.data,
    });
  } catch (error) {
    next(error);
  }
};

export const listBranchesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status = 'all', page = '1', limit = '20' } = req.query;

    const { data, error } = await db.rpc('get_pharmacy_branches', {
      p_parent_pharmacy_id: req.pharmacyId,
      p_search: search ? String(search).trim() : null,
      p_status: String(status),
      p_page: parseInt(String(page), 10) || 1,
      p_limit: Math.min(parseInt(String(limit), 10) || 20, 100),
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', data: data.data });
  } catch (error) {
    next(error);
  }
};

export const getBranchDetailHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new AppError('Branch ID is required', 400);

    const { data, error } = await db.rpc('get_branch_pharmacy_detail', {
      p_parent_pharmacy_id: req.pharmacyId,
      p_branch_pharmacy_id: id,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', data: data.data });
  } catch (error) {
    next(error);
  }
};

export const updateBranchStatusHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) throw new AppError('Branch ID is required', 400);
    if (!status) throw new AppError('Status is required', 400);

    const { data, error } = await db.rpc('update_branch_pharmacy_status', {
      p_parent_pharmacy_id: req.pharmacyId,
      p_branch_pharmacy_id: id,
      p_status: status,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', message: `Branch status updated to ${status}`, data: data.data });
  } catch (error) {
    next(error);
  }
};

export const getPendingBranchInvitesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await db.rpc('get_pending_branch_invites', {
      p_parent_pharmacy_id: req.pharmacyId,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', data: data.data });
  } catch (error) {
    next(error);
  }
};

export const resendBranchInviteHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new AppError('Invite ID is required', 400);

    const { data, error } = await db.rpc('resend_branch_invite', {
      p_parent_pharmacy_id: req.pharmacyId,
      p_invite_id: id,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    const { inviteToken, email, pharmacyName } = data.data;

    // Resolve the pharmacy portal URL from the pharmacy's buying group domain
    let portalBaseUrl = process.env.PHARMACY_PORTAL_URL || 'http://localhost:3002';
    const buyingGroupId = req.tenant?.buyingGroupId || await (async () => {
      if (!req.pharmacyId) return null;
      const { data: row } = await db.from('pharmacy').select('buying_group_id').eq('id', req.pharmacyId).single();
      return row?.buying_group_id || null;
    })();
    if (buyingGroupId) {
      const { getBuyingGroupHostnames } = await import('../services/tenantService');
      const hostnames = await getBuyingGroupHostnames(buyingGroupId);
      if (hostnames?.pharmacyHostname) {
        portalBaseUrl = `https://${hostnames.pharmacyHostname}`;
      }
    }

    try {
      await db.functions.invoke('send-branch-invite', {
        body: { to: email, pharmacyName, contactName: pharmacyName, inviteToken, portalBaseUrl },
      });
    } catch (emailErr: any) {
      console.error('Failed to resend branch invite email:', emailErr.message);
    }

    res.status(200).json({ status: 'success', message: 'Invite email resent successfully' });
  } catch (error) {
    next(error);
  }
};

export const getPharmacyContextHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await db.rpc('get_pharmacy_context', {
      p_pharmacy_id: req.pharmacyId,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', data: data.data });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns the exact same response shape as /auth/signin so the frontend
 * can treat it as a real login into the branch pharmacy.
 */
export const switchToBranchHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.params;
    if (!branchId) throw new AppError('Branch ID is required', 400);

    const result = await loginAsBranch(req.pharmacyId!, branchId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
