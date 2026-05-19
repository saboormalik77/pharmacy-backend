import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

const db = supabaseAdmin!;

export const getAdminBrandingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { pharmacy_id, email } = req.query;
    const pharmacyId = typeof pharmacy_id === 'string' ? pharmacy_id.trim() : '';
    const pharmacyEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!pharmacyId && !pharmacyEmail) {
      return res.status(200).json({
        status: 'success',
        data: { logoUrl: null, businessName: null },
      });
    }

    // Resolve the pharmacy to its owning buying group. The brand lives on the
    // buying group's admin_settings row, not the global settings row.
    let pharmacyQuery = db
      .from('pharmacy')
      .select('created_by, parent_pharmacy_id');

    if (pharmacyId) {
      pharmacyQuery = pharmacyQuery.eq('id', pharmacyId);
    } else {
      pharmacyQuery = pharmacyQuery.ilike('email', pharmacyEmail);
    }

    const { data: pharmacy, error: pharmacyError } = await pharmacyQuery
      .limit(1)
      .maybeSingle();

    if (pharmacyError || !pharmacy) {
      console.log('Pharmacy not found or error:', pharmacyError);
      return res.status(200).json({
        status: 'success',
        data: { logoUrl: null, businessName: null },
      });
    }

    let createdBy = pharmacy.created_by as string | null;

    if (!createdBy && pharmacy.parent_pharmacy_id) {
      const { data: parentPharmacy } = await db
        .from('pharmacy')
        .select('created_by')
        .eq('id', pharmacy.parent_pharmacy_id as string)
        .single();

      createdBy = parentPharmacy?.created_by || null;
    }

    if (!createdBy) {
      console.log('Pharmacy has no buying group admin');
      return res.status(200).json({
        status: 'success',
        data: { logoUrl: null, businessName: null },
      });
    }

    const { data: admin, error: adminError } = await db
      .from('admin')
      .select('id, name, buying_group_id')
      .eq('id', createdBy)
      .single();

    if (adminError || !admin) {
      console.log('Buying group admin not found or error:', adminError);
      return res.status(200).json({
        status: 'success',
        data: { logoUrl: null, businessName: null },
      });
    }

    const buyingGroupId = admin.buying_group_id || admin.id;
    let fallbackBusinessName = admin.name || null;

    if (buyingGroupId !== admin.id) {
      const { data: buyingGroupAdmin } = await db
        .from('admin')
        .select('name')
        .eq('id', buyingGroupId)
        .single();

      fallbackBusinessName = buyingGroupAdmin?.name || fallbackBusinessName;
    }

    const { data: settings, error: settingsError } = await db
      .from('admin_settings')
      .select('logo_url, business_name')
      .eq('buying_group_id', buyingGroupId)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching admin settings:', settingsError);
      return res.status(200).json({
        status: 'success',
        data: { logoUrl: null, businessName: null },
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        logoUrl: settings?.logo_url || null,
        businessName: settings?.business_name || fallbackBusinessName,
      },
    });
  } catch (error) {
    console.error('Error in getAdminBrandingHandler:', error);
    next(error);
  }
};
