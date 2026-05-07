/**
 * NDC Search Controller
 * Handles requests for fast NDC search and index retrieval
 * This is a NEW controller - does NOT modify existing functionality
 */

import { Request, Response, NextFunction } from 'express';
import { 
  searchNDC, 
  getNDCIndex, 
  getCacheStats, 
  clearCache 
} from '../services/ndcSearchService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

/**
 * Search NDCs with instant results
 * GET /api/ndc-search?q=search_term&limit=50
 */
export const searchNDCHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const searchTerm = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    if (!searchTerm) {
      return res.status(200).json({
        status: 'success',
        data: {
          results: [],
          count: 0,
          searchTerm: ''
        }
      });
    }

    const result = await searchNDC(searchTerm, limit);

    res.status(200).json({
      status: 'success',
      data: result
    });
  }
);

/**
 * Get NDC pricing index for client-side caching
 * GET /api/ndc-search/index?limit=10000&offset=0&updatedAfter=2024-01-01
 */
export const getNDCIndexHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 10000, 50000);
    const offset = parseInt(req.query.offset as string) || 0;
    const updatedAfterStr = req.query.updatedAfter as string;
    
    let updatedAfter: Date | undefined;
    if (updatedAfterStr) {
      updatedAfter = new Date(updatedAfterStr);
      if (isNaN(updatedAfter.getTime())) {
        throw new AppError('Invalid updatedAfter date format', 400);
      }
    }

    const result = await getNDCIndex(limit, offset, updatedAfter);

    res.status(200).json({
      status: 'success',
      data: result
    });
  }
);

/**
 * Get cache statistics (admin endpoint)
 * GET /api/ndc-search/cache-stats
 */
export const getCacheStatsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const stats = getCacheStats();

    res.status(200).json({
      status: 'success',
      data: stats
    });
  }
);

/**
 * Clear server cache (admin endpoint)
 * POST /api/ndc-search/clear-cache
 */
export const clearCacheHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = clearCache();

    res.status(200).json({
      status: 'success',
      data: result
    });
  }
);

