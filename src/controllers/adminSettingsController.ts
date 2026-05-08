import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as adminSettingsService from '../services/adminSettingsService';
import multer from 'multer';

// ============================================================
// Extended Request interface for admin authentication
// ============================================================
interface AdminRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminName?: string;
  adminRole?: string;
  adminBuyingGroupId?: string | null;
}

// ============================================================
// GET /api/admin/settings - Get admin settings
// ============================================================
export const getAdminSettingsHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    const buyingGroupId = req.adminBuyingGroupId ?? null;
    const settings = await adminSettingsService.getAdminSettings(buyingGroupId);

    res.status(200).json({
      status: 'success',
      data: {
        settings,
      },
    });
  }
);

// ============================================================
// PATCH /api/admin/settings - Update admin settings
// ============================================================
export const updateAdminSettingsHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    const {
      siteName,
      siteEmail,
      timezone,
      language,
      emailNotifications,
      documentApprovalNotif,
      paymentNotif,
      shipmentNotif,
      warehouseName,
      warehouseStreet,
      warehouseCity,
      warehouseState,
      warehouseZip,
      warehouseCountry,
      warehousePhone,
      warehouseContactName,
      warehouse_name,
      warehouse_street,
      warehouse_city,
      warehouse_state,
      warehouse_zip,
      warehouse_country,
      warehouse_phone,
      warehouse_contact_name,
      businessName,
      business_name,
      logoUrl,
      logo_url,
    } = req.body;

    const buyingGroupId = req.adminBuyingGroupId ?? null;
    
    const settings = await adminSettingsService.updateAdminSettings({
      siteName,
      siteEmail,
      timezone,
      language,
      emailNotifications,
      documentApprovalNotif,
      paymentNotif,
      shipmentNotif,
      warehouseName: warehouseName ?? warehouse_name,
      warehouseStreet: warehouseStreet ?? warehouse_street,
      warehouseCity: warehouseCity ?? warehouse_city,
      warehouseState: warehouseState ?? warehouse_state,
      warehouseZip: warehouseZip ?? warehouse_zip,
      warehouseCountry: warehouseCountry ?? warehouse_country,
      warehousePhone: warehousePhone ?? warehouse_phone,
      warehouseContactName: warehouseContactName ?? warehouse_contact_name,
      businessName: businessName ?? business_name,
      logoUrl: logoUrl ?? logo_url,
    }, buyingGroupId);

    // Clear tenant cache if branding info (logo or business name) was updated
    if ((logoUrl || logo_url || businessName || business_name) && buyingGroupId) {
      try {
        const { clearTenantCacheForBuyingGroup } = await import('../services/tenantService');
        clearTenantCacheForBuyingGroup(buyingGroupId);
      } catch { /* non-critical */ }
    }

    res.status(200).json({
      status: 'success',
      message: 'Settings updated successfully',
      data: {
        settings,
      },
    });
  }
);

// ============================================================
// Multer config for logo upload (in-memory)
// ============================================================
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400) as any, false);
    }
  },
}).single('logo');

export const uploadLogoMiddleware = logoUpload;

// ============================================================
// POST /api/admin/settings/upload-logo - Upload logo
// ============================================================
export const uploadLogoHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    if (!req.file) {
      throw new AppError('No logo file provided', 400);
    }

    const buyingGroupId = req.adminBuyingGroupId ?? null;

    const logoUrl = await adminSettingsService.uploadLogo(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      buyingGroupId
    );

    const settings = await adminSettingsService.updateAdminSettings({ logoUrl }, buyingGroupId);

    // Clear tenant cache so logo changes take effect immediately
    if (buyingGroupId) {
      try {
        const { clearTenantCacheForBuyingGroup } = await import('../services/tenantService');
        clearTenantCacheForBuyingGroup(buyingGroupId);
      } catch { /* non-critical */ }
    }

    res.status(200).json({
      status: 'success',
      message: 'Logo uploaded successfully',
      data: {
        logoUrl,
        settings,
      },
    });
  }
);

// ============================================================
// GET /api/admin/settings/timezones - Get available timezones
// ============================================================
export const getTimezonesHandler = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const timezones = await adminSettingsService.getAvailableTimezones();

    res.status(200).json({
      status: 'success',
      data: {
        timezones,
      },
    });
  }
);

// ============================================================
// GET /api/admin/settings/languages - Get available languages
// ============================================================
export const getLanguagesHandler = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const languages = await adminSettingsService.getAvailableLanguages();

    res.status(200).json({
      status: 'success',
      data: {
        languages,
      },
    });
  }
);

// ============================================================
// GET /api/admin/settings/profile - Get current admin profile
// ============================================================
export const getAdminProfileHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    const adminId = req.adminId;

    if (!adminId) {
      throw new AppError('Authentication required', 401);
    }

    const admin = await adminSettingsService.getAdminProfile(adminId);

    res.status(200).json({
      status: 'success',
      data: {
        admin,
      },
    });
  }
);

// ============================================================
// POST /api/admin/settings/reset-password - Reset own password
// ============================================================
export const resetPasswordHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    const adminId = req.adminId;

    if (!adminId) {
      throw new AppError('Authentication required', 401);
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new AppError(
        'Current password, new password, and confirm password are required',
        400
      );
    }

    await adminSettingsService.resetAdminPassword(adminId, {
      currentPassword,
      newPassword,
      confirmPassword,
    }, (req as AdminRequest).adminRole);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
    });
  }
);

