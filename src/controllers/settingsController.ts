import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import {
  getPharmacySettings,
  updatePharmacySettings,
  changePassword,
  UpdateSettingsData,
  ChangePasswordData,
} from '../services/settingsService';
import {
  getPharmacyStoreSettings,
  updatePharmacyStoreSettings,
  UpdatePharmacyStoreSettingsData,
} from '../services/adminPharmaciesService';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get pharmacy settings/profile
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pharmacy settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/PharmacySettings'
 */
export const getSettings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const pharmacyId = req.pharmacyId;

  if (!pharmacyId) {
    return next(new AppError('Pharmacy ID is required', 400));
  }

  const settings = await getPharmacySettings(pharmacyId);

  res.status(200).json({
    status: 'success',
    data: settings,
  });
});

/**
 * @swagger
 * /api/settings:
 *   patch:
 *     summary: Update pharmacy settings/profile
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               contact_phone:
 *                 type: string
 *               pharmacy_name:
 *                 type: string
 *               npi_number:
 *                 type: string
 *               dea_number:
 *                 type: string
 *               title:
 *                 type: string
 *               state_license_number:
 *                 type: string
 *                 description: State pharmacy license number (e.g., NY-12345, CA-67890)
 *               license_expiry_date:
 *                 type: string
 *                 format: date
 *                 description: Expiration date of the pharmacy license (YYYY-MM-DD)
 *               corporate_name:
 *                 type: string
 *                 description: Corporate name if different from pharmacy/facility name
 *               mailing_address:
 *                 type: string
 *                 description: Mailing address if different from pharmacy address
 *               store_hours:
 *                 type: string
 *                 description: Store operating hours (e.g. M-F 9-7 Sat 10-3)
 *               physical_address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zip:
 *                     type: string
 *               billing_address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zip:
 *                     type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
export const updateSettings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const pharmacyId = req.pharmacyId;

  if (!pharmacyId) {
    return next(new AppError('Pharmacy ID is required', 400));
  }

  // Filter request body to only include allowed fields (exclude id, pharmacy_id, etc.)
  const allowedFields = [
    'name', 'email', 'phone', 'contact_phone', 'pharmacy_name',
    'npi_number', 'dea_number', 'title', 'state_license_number',
    'license_expiry_date', 'corporate_name', 'mailing_address',
    'store_hours', 'dea_file_url', 'license_file_url',
    'physical_address', 'billing_address'
  ];

  const updateData: UpdateSettingsData = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (updateData as any)[field] = req.body[field];
    }
  }

  const updatedSettings = await updatePharmacySettings(pharmacyId, updateData);

  res.status(200).json({
    status: 'success',
    data: updatedSettings,
    message: 'Settings updated successfully',
  });
});

/**
 * @swagger
 * /api/settings/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
export const changePasswordHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;

    if (!pharmacyId) {
      return next(new AppError('Pharmacy ID is required', 400));
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return next(new AppError('All password fields are required', 400));
    }

    await changePassword(pharmacyId, {
      currentPassword,
      newPassword,
      confirmPassword,
    });

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });
  }
);

/**
 * @swagger
 * /api/settings/store-settings:
 *   get:
 *     summary: Get FCR store settings for the authenticated pharmacy
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: FCR store settings
 */
export const getStoreSettings = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;

    if (!pharmacyId) {
      return next(new AppError('Pharmacy ID is required', 400));
    }

    const settings = await getPharmacyStoreSettings(pharmacyId);

    res.status(200).json({
      status: 'success',
      data: { storeSettings: settings },
    });
  }
);

/**
 * @swagger
 * /api/settings/store-settings:
 *   patch:
 *     summary: Update FCR store settings for the authenticated pharmacy
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeNumber:
 *                 type: string
 *               primaryWholesaler:
 *                 type: string
 *               wholesalerAccountNumber:
 *                 type: string
 *               secondaryWholesaler:
 *                 type: string
 *               serviceType:
 *                 type: string
 *                 enum: [full_service, self_service, express]
 *               deaExpirationDate:
 *                 type: string
 *                 format: date
 *               daysBetweenVisits:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *               faxNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Store settings updated successfully
 */
export const updateStoreSettings = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;

    if (!pharmacyId) {
      return next(new AppError('Pharmacy ID is required', 400));
    }

    const allowedFields = [
      'storeNumber', 'primaryWholesaler', 'wholesalerAccountNumber',
      'secondaryWholesaler', 'serviceType',
      'deaExpirationDate', 'daysBetweenVisits', 'faxNumber',
    ];

    const filtered: UpdatePharmacyStoreSettingsData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        (filtered as any)[key] = req.body[key];
      }
    }

    if (Object.keys(filtered).length === 0) {
      return next(new AppError('No valid fields provided for update', 400));
    }

    const settings = await updatePharmacyStoreSettings(pharmacyId, filtered);

    res.status(200).json({
      status: 'success',
      message: 'Store settings updated successfully',
      data: { storeSettings: settings },
    });
  }
);

/**
 * @swagger
 * /api/settings/upload-document:
 *   post:
 *     summary: Upload a DEA or State Pharmacy License document
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - documentType
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 enum: [dea, license]
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 */
export const uploadDocument = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;

    if (!pharmacyId) {
      return next(new AppError('Pharmacy ID is required', 400));
    }

    if (!supabaseAdmin) {
      return next(new AppError('Storage service not configured', 500));
    }

    const file = req.file;
    if (!file) {
      return next(new AppError('No file provided', 400));
    }

    const documentType = req.body.documentType;
    if (!documentType || !['dea', 'license'].includes(documentType)) {
      return next(new AppError('documentType must be "dea" or "license"', 400));
    }

    const ext = file.originalname.split('.').pop() || 'pdf';
    const fileName = `${pharmacyId}/${documentType}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('pharmacy-documents')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      return next(new AppError(`Failed to upload document: ${uploadError.message}`, 500));
    }

    // Use signed URL (works for both private and public buckets)
    const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('pharmacy-documents')
      .createSignedUrl(fileName, TEN_YEARS_IN_SECONDS);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return next(new AppError(`Failed to generate document URL: ${signedUrlError?.message ?? 'unknown error'}`, 500));
    }

    const publicUrl = signedUrlData.signedUrl;

    const columnName = documentType === 'dea' ? 'dea_file_url' : 'license_file_url';

    await updatePharmacySettings(pharmacyId, {
      [columnName]: publicUrl,
    } as any);

    res.status(200).json({
      status: 'success',
      message: 'Document uploaded successfully',
      data: {
        url: publicUrl,
        documentType,
      },
    });
  }
);

