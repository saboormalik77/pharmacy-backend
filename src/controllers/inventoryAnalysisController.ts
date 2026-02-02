/**
 * Inventory Analysis Controller
 * 
 * Handles API requests for inventory file uploads, analysis, and recommendations.
 */

import { Request, Response, NextFunction } from 'express';
import {
  analyzeInventoryFile,
  getInventorySummary,
  getInventoryItems,
  getUploadHistory,
  markItemsAsReturned,
  dismissItems,
  getReminders,
  cancelReminder,
  refreshRecommendations,
} from '../services/inventoryAnalysisService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

/**
 * Upload and analyze inventory file
 * POST /api/inventory-analysis/upload
 */
export const uploadAndAnalyzeHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    if (!req.file) {
      throw new AppError('Please upload a file (CSV, TXT, or PDF)', 400);
    }

    // Determine file type
    const originalName = req.file.originalname.toLowerCase();
    const mimeType = req.file.mimetype;
    
    let fileType: string;
    if (originalName.endsWith('.csv') || mimeType === 'text/csv') {
      fileType = 'csv';
    } else if (originalName.endsWith('.txt') || mimeType === 'text/plain') {
      fileType = 'txt';
    } else if (originalName.endsWith('.pdf') || mimeType === 'application/pdf') {
      fileType = 'pdf';
    } else {
      throw new AppError(
        `Unsupported file type: ${mimeType}. Supported types: CSV, TXT, PDF`,
        400
      );
    }

    const result = await analyzeInventoryFile(
      pharmacyId,
      req.file.buffer,
      req.file.originalname,
      fileType
    );

    res.status(200).json({
      status: 'success',
      message: `Successfully analyzed ${result.totalItems} inventory items`,
      data: result,
    });
  }
);

/**
 * Get inventory summary/dashboard
 * GET /api/inventory-analysis/summary
 */
export const getSummaryHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const summary = await getInventorySummary(pharmacyId);

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  }
);

/**
 * Get inventory items with filters
 * GET /api/inventory-analysis/items
 */
export const getItemsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const {
      status,
      recommendation_type,
      upload_id,
      search,
      limit,
      offset,
      sort_by,
      sort_order,
    } = req.query;

    const result = await getInventoryItems(pharmacyId, {
      status: status as string,
      recommendationType: recommendation_type as string,
      uploadId: upload_id as string,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
      sortBy: sort_by as string,
      sortOrder: (sort_order as 'asc' | 'desc') || 'desc',
    });

    res.status(200).json({
      status: 'success',
      data: {
        items: result.items,
        pagination: {
          total: result.total,
          limit: limit ? parseInt(limit as string, 10) : 50,
          offset: offset ? parseInt(offset as string, 10) : 0,
        },
      },
    });
  }
);

/**
 * Get items to return (recommendation_type = 'return_now')
 * GET /api/inventory-analysis/items/return
 */
export const getItemsToReturnHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { limit, offset, sort_by, sort_order } = req.query;

    const result = await getInventoryItems(pharmacyId, {
      status: 'active',
      recommendationType: 'return_now',
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0,
      sortBy: sort_by as string || 'estimated_return_value',
      sortOrder: (sort_order as 'asc' | 'desc') || 'desc',
    });

    // Calculate total potential value
    const totalPotentialValue = result.items.reduce(
      (sum, item) => sum + (parseFloat(item.estimated_return_value) || 0),
      0
    );

    res.status(200).json({
      status: 'success',
      message: `You have ${result.total} products recommended for return with a total potential value of $${totalPotentialValue.toFixed(2)}`,
      data: {
        items: result.items,
        totalPotentialValue: Math.round(totalPotentialValue * 100) / 100,
        pagination: {
          total: result.total,
          limit: limit ? parseInt(limit as string, 10) : 100,
          offset: offset ? parseInt(offset as string, 10) : 0,
        },
      },
    });
  }
);

/**
 * Get items to keep (recommendation_type = 'keep' or 'monitor')
 * GET /api/inventory-analysis/items/keep
 */
export const getItemsToKeepHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { limit, offset } = req.query;

    // Get items with 'keep' recommendation
    const keepResult = await getInventoryItems(pharmacyId, {
      status: 'active',
      recommendationType: 'keep',
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.status(200).json({
      status: 'success',
      data: {
        items: keepResult.items,
        pagination: {
          total: keepResult.total,
          limit: limit ? parseInt(limit as string, 10) : 100,
          offset: offset ? parseInt(offset as string, 10) : 0,
        },
      },
    });
  }
);

/**
 * Get upload history
 * GET /api/inventory-analysis/uploads
 */
export const getUploadsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { limit, offset } = req.query;

    const result = await getUploadHistory(
      pharmacyId,
      limit ? parseInt(limit as string, 10) : 20,
      offset ? parseInt(offset as string, 10) : 0
    );

    res.status(200).json({
      status: 'success',
      data: {
        uploads: result.uploads,
        pagination: {
          total: result.total,
          limit: limit ? parseInt(limit as string, 10) : 20,
          offset: offset ? parseInt(offset as string, 10) : 0,
        },
      },
    });
  }
);

/**
 * Mark items as returned
 * POST /api/inventory-analysis/items/mark-returned
 */
export const markReturnedHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { itemIds, distributorId, actualReturnValue } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      throw new AppError('itemIds array is required', 400);
    }

    if (!distributorId) {
      throw new AppError('distributorId is required', 400);
    }

    const result = await markItemsAsReturned(
      pharmacyId,
      itemIds,
      distributorId,
      actualReturnValue
    );

    res.status(200).json({
      status: 'success',
      message: `Successfully marked ${result.updated} items as returned`,
      data: result,
    });
  }
);

/**
 * Dismiss items from recommendations
 * POST /api/inventory-analysis/items/dismiss
 */
export const dismissItemsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      throw new AppError('itemIds array is required', 400);
    }

    const result = await dismissItems(pharmacyId, itemIds);

    res.status(200).json({
      status: 'success',
      message: `Successfully dismissed ${result.dismissed} items`,
      data: result,
    });
  }
);

/**
 * Get reminders
 * GET /api/inventory-analysis/reminders
 */
export const getRemindersHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { status } = req.query;
    const reminders = await getReminders(pharmacyId, status as string);

    res.status(200).json({
      status: 'success',
      data: {
        reminders,
        total: reminders.length,
      },
    });
  }
);

/**
 * Cancel a reminder
 * DELETE /api/inventory-analysis/reminders/:id
 */
export const cancelReminderHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    if (!id) {
      throw new AppError('Reminder ID is required', 400);
    }

    await cancelReminder(pharmacyId, id);

    res.status(200).json({
      status: 'success',
      message: 'Reminder cancelled successfully',
    });
  }
);

/**
 * Refresh recommendations with latest pricing
 * POST /api/inventory-analysis/refresh
 */
export const refreshRecommendationsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { uploadId } = req.body;

    const result = await refreshRecommendations(pharmacyId, uploadId);

    res.status(200).json({
      status: 'success',
      message: `Successfully refreshed ${result.updated} items with latest pricing`,
      data: result,
    });
  }
);

