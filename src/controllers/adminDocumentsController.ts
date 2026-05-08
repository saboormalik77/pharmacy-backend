import { Request, Response, NextFunction } from 'express';
import {
  getDocumentsList,
  getDocumentById,
  deleteDocument,
} from '../services/adminDocumentsService';
import { AppError } from '../utils/appError';

/**
 * Get list of documents with stats included
 * GET /api/admin/documents
 */
export const getDocumentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, pharmacy_id, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100); // Max 100

    // Normalize search parameter: trim whitespace, decode URL encoding
    let normalizedSearch: string | undefined = undefined;
    if (search && typeof search === 'string') {
      const decoded = decodeURIComponent(search);
      normalizedSearch = decoded.trim().replace(/\s+/g, ' ');
      if (normalizedSearch === '') {
        normalizedSearch = undefined;
      }
    }

    const result = await getDocumentsList(
      normalizedSearch,
      pharmacy_id as string | undefined,
      pageNum,
      limitNum
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
 * Get single document by ID
 * GET /api/admin/documents/:id
 */
export const getDocumentByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Document ID is required', 400);
    }

    const result = await getDocumentById(id);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete document
 * DELETE /api/admin/documents/:id
 */
export const deleteDocumentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Document ID is required', 400);
    }

    const result = await deleteDocument(id);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
