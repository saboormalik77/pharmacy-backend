import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';

const db = supabaseAdmin!;

export const getAdminBrandingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { pharmacy_id } = req.query;

    if (!pharmacy_id) {
      return res.status(200).json({
        status: 'success',
        data: { logoUrl: null, businessName: null },
      });
    }

    // Check if pharmacy exists and get created_by
    const { data: pharmacy, error: pharmacyError } = await db
      .from('pharmacy')
      .select('created_by')
      .eq('id', pharmacy_id as string)
      .single();

    if (pharmacyError || !pharmacy) {
      console.log('Pharmacy not found or error:', pharmacyError);
      return res.status(200).json({
        status: 'success',
        data: { logoUrl: null, businessName: null },
      });
    }

    if (!pharmacy.created_by) {
      console.log('Pharmacy has no created_by admin');
      return res.status(200).json({
        status: 'success',
        data: { logoUrl: null, businessName: null },
      });
    }

    // Fetch admin settings directly (global settings table, id = 1)
    const { data: settings, error: settingsError } = await db
      .from('admin_settings')
      .select('logo_url, business_name')
      .eq('id', 1)
      .single();

    if (settingsError) {
      console.error('Error fetching admin settings:', settingsError);
      return res.status(200).json({
        status: 'success',
        data: { logoUrl: null, businessName: null },
      });
    }

    console.log('Fetched settings:', settings);

    res.status(200).json({
      status: 'success',
      data: {
        logoUrl: settings?.logo_url || null,
        businessName: settings?.business_name || null,
      },
    });
  } catch (error) {
    console.error('Error in getAdminBrandingHandler:', error);
    next(error);
  }
};
