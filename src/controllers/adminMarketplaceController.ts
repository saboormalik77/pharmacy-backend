import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as adminMarketplaceService from '../services/adminMarketplaceService';

// ============================================================
// Extended Request interface for admin authentication
// ============================================================
interface AdminRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminName?: string;
  adminRole?: string;
}

// ============================================================
// GET /api/admin/marketplace - Get list of marketplace deals
// ============================================================
export const getMarketplaceDealsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      page = '1',
      limit = '12',
      search,
      category,
      status,
      sortBy = 'posted_date',
      sortOrder = 'desc',
    } = req.query;

    const result = await adminMarketplaceService.getMarketplaceDeals(
      parseInt(page as string, 10),
      parseInt(limit as string, 10),
      search as string,
      category as string,
      status as string,
      sortBy as string,
      sortOrder as string
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

// ============================================================
// GET /api/admin/marketplace/stats - Get marketplace statistics
// ============================================================
export const getMarketplaceStatsHandler = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const stats = await adminMarketplaceService.getMarketplaceStats();

    res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
  }
);

// ============================================================
// GET /api/admin/marketplace/categories - Get all categories
// ============================================================
export const getMarketplaceCategoriesHandler = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const categories = await adminMarketplaceService.getMarketplaceCategories();

    res.status(200).json({
      status: 'success',
      data: {
        categories,
      },
    });
  }
);

// ============================================================
// GET /api/admin/marketplace/:id - Get deal by ID
// ============================================================
export const getMarketplaceDealByIdHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Deal ID is required', 400);
    }

    const deal = await adminMarketplaceService.getMarketplaceDealById(id);

    res.status(200).json({
      status: 'success',
      data: {
        deal,
      },
    });
  }
);

// ============================================================
// POST /api/admin/marketplace - Create new deal
// ============================================================
export const createMarketplaceDealHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    // Handle both field name variations (distributor vs distributorName)
    const distributorName = req.body.distributorName || req.body.distributor;
    
    // Parse form data - multipart/form-data sends everything as strings
    const productName = req.body.productName;
    const category = req.body.category;
    const quantity = req.body.quantity ? parseInt(req.body.quantity, 10) : undefined;
    const minimumBuyQuantity = req.body.minimumBuyQuantity ? parseInt(req.body.minimumBuyQuantity, 10) : undefined;
    const unit = req.body.unit;
    const originalPrice = req.body.originalPrice ? parseFloat(req.body.originalPrice) : undefined;
    const dealPrice = req.body.dealPrice ? parseFloat(req.body.dealPrice) : undefined;
    const expiryDate = req.body.expiryDate;
    const ndc = req.body.ndc;
    const distributorId = req.body.distributorId;
    const notes = req.body.notes;

    // Validate required fields
    if (!productName || !category || !quantity || !unit || !originalPrice || !dealPrice || !distributorName || !expiryDate) {
      throw new AppError(
        'Product name, category, quantity, unit, original price, deal price, distributor name, and expiry date are required',
        400
      );
    }

    // Validate numeric values
    if (isNaN(quantity) || quantity <= 0) {
      throw new AppError('Quantity must be a valid positive number', 400);
    }
    if (minimumBuyQuantity !== undefined && (isNaN(minimumBuyQuantity) || minimumBuyQuantity < 1)) {
      throw new AppError('Minimum buy quantity must be at least 1', 400);
    }
    if (isNaN(originalPrice) || originalPrice <= 0) {
      throw new AppError('Original price must be a valid positive number', 400);
    }
    if (isNaN(dealPrice) || dealPrice <= 0) {
      throw new AppError('Deal price must be a valid positive number', 400);
    }

    // Handle image upload if provided
    let imageUrl: string | undefined;
    if (req.file) {
      const { uploadImageToStorage } = await import('../utils/uploadImageToStorage');
      imageUrl = await uploadImageToStorage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    }

    const deal = await adminMarketplaceService.createMarketplaceDeal({
      productName,
      category,
      quantity,
      unit,
      originalPrice,
      dealPrice,
      distributorName,
      expiryDate,
      ndc,
      distributorId,
      notes,
      imageUrl,
      createdBy: req.adminId,
      minimumBuyQuantity,
    });

    res.status(201).json({
      status: 'success',
      message: 'Deal created successfully',
      data: {
        deal,
      },
    });
  }
);

// ============================================================
// PATCH /api/admin/marketplace/:id - Update deal
// ============================================================
export const updateMarketplaceDealHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Deal ID is required', 400);
    }

    // Handle both field name variations (distributor vs distributorName)
    const distributorName = req.body.distributorName || req.body.distributor;
    
    // Parse form data - multipart/form-data sends everything as strings
    // Only parse if the value exists (for partial updates)
    const productName = req.body.productName;
    const category = req.body.category;
    const quantity = req.body.quantity !== undefined ? parseInt(req.body.quantity, 10) : undefined;
    const minimumBuyQuantity = req.body.minimumBuyQuantity !== undefined ? parseInt(req.body.minimumBuyQuantity, 10) : undefined;
    const unit = req.body.unit;
    const originalPrice = req.body.originalPrice !== undefined ? parseFloat(req.body.originalPrice) : undefined;
    const dealPrice = req.body.dealPrice !== undefined ? parseFloat(req.body.dealPrice) : undefined;
    const expiryDate = req.body.expiryDate;
    const ndc = req.body.ndc;
    const status = req.body.status;
    const notes = req.body.notes;

    // Validate numeric values if provided
    if (quantity !== undefined && (isNaN(quantity) || quantity <= 0)) {
      throw new AppError('Quantity must be a valid positive number', 400);
    }
    if (minimumBuyQuantity !== undefined && (isNaN(minimumBuyQuantity) || minimumBuyQuantity < 1)) {
      throw new AppError('Minimum buy quantity must be at least 1', 400);
    }
    if (originalPrice !== undefined && (isNaN(originalPrice) || originalPrice <= 0)) {
      throw new AppError('Original price must be a valid positive number', 400);
    }
    if (dealPrice !== undefined && (isNaN(dealPrice) || dealPrice <= 0)) {
      throw new AppError('Deal price must be a valid positive number', 400);
    }

    // Handle image upload if provided
    let imageUrl: string | undefined;
    if (req.file) {
      const { uploadImageToStorage } = await import('../utils/uploadImageToStorage');
      imageUrl = await uploadImageToStorage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    }

    const deal = await adminMarketplaceService.updateMarketplaceDeal(id, {
      productName,
      category,
      quantity,
      minimumBuyQuantity,
      unit,
      originalPrice,
      dealPrice,
      distributorName,
      expiryDate,
      ndc,
      status,
      notes,
      imageUrl,
    });

    res.status(200).json({
      status: 'success',
      message: 'Deal updated successfully',
      data: {
        deal,
      },
    });
  }
);

// ============================================================
// PATCH /api/admin/marketplace/:id/sold - Mark deal as sold
// ============================================================
export const markDealAsSoldHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Deal ID is required', 400);
    }

    await adminMarketplaceService.markDealAsSold(id);

    res.status(200).json({
      status: 'success',
      message: 'Deal marked as sold successfully',
    });
  }
);

// ============================================================
// DELETE /api/admin/marketplace/:id - Delete deal
// ============================================================
export const deleteMarketplaceDealHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Deal ID is required', 400);
    }

    await adminMarketplaceService.deleteMarketplaceDeal(id);

    res.status(200).json({
      status: 'success',
      message: 'Deal deleted successfully',
    });
  }
);

// ============================================================
// Featured Deal Handlers (Unified for Day, Week, Month)
// ============================================================

type FeaturedDealType = 'day' | 'week' | 'month';

/**
 * Validate and get featured deal type from request
 */
const getFeaturedDealType = (typeParam: string | undefined): FeaturedDealType => {
  const type = (typeParam || 'day').toLowerCase();
  if (!['day', 'week', 'month'].includes(type)) {
    throw new AppError('Invalid type. Must be day, week, or month', 400);
  }
  return type as FeaturedDealType;
};

/**
 * Set Featured Deal (supports day, week, month via type parameter)
 * POST /api/admin/marketplace/deals/:id/set-deal-of-the-day
 * Body: { type?: "day" | "week" | "month", expiresAt?: string }
 */
export const setDealOfTheDayHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { expiresAt, type } = req.body;

    if (!id) {
      throw new AppError('Deal ID is required', 400);
    }

    const featuredType = getFeaturedDealType(type);
    const result = await adminMarketplaceService.setDealOfTheDay(id, expiresAt, featuredType);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        dealId: result.dealId,
        productName: result.productName,
        type: result.type,
        expiresAt: result.expiresAt,
      },
    });
  }
);

/**
 * Unset Featured Deal (supports day, week, month via type query param)
 * DELETE /api/admin/marketplace/deal-of-the-day?type=day|week|month
 */
export const unsetDealOfTheDayHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const featuredType = getFeaturedDealType(req.query.type as string);
    const result = await adminMarketplaceService.unsetDealOfTheDay(featuredType);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        type: result.type,
        dealsUnset: result.dealsUnset,
      },
    });
  }
);

/**
 * Get Featured Deal info (supports day, week, month via type query param)
 * GET /api/admin/marketplace/deal-of-the-day?type=day|week|month
 */
export const getDealOfTheDayInfoHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const featuredType = getFeaturedDealType(req.query.type as string);
    const info = await adminMarketplaceService.getDealOfTheDayInfo(featuredType);

    res.status(200).json({
      status: 'success',
      data: info,
    });
  }
);

/**
 * Get all featured deals info (day, week, month)
 * GET /api/admin/marketplace/featured-deals
 */
export const getAllFeaturedDealsInfoHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const info = await adminMarketplaceService.getAllFeaturedDealsInfo();

    res.status(200).json({
      status: 'success',
      data: info,
    });
  }
);

