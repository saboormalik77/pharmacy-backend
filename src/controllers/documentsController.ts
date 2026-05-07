import { Request, Response, NextFunction } from 'express';
import { getDocuments, getDocumentById, deleteDocument, downloadFileFromStorage } from '../services/documentsService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

const getPharmacyId = (req: Request): string => {
  return (req.body.pharmacy_id || req.query.pharmacy_id) as string;
};

export const getDocumentsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId || getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const status = req.query.status as any;
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const result = await getDocuments(pharmacyId, {
      status,
      search,
      limit,
      offset,
    });

    res.status(200).json({
      status: 'success',
      data: result.documents,
      total: result.total,
    });
  }
);

export const getDocumentByIdHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId || getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    const document = await getDocumentById(pharmacyId, id);

    res.status(200).json({
      status: 'success',
      data: document,
    });
  }
);

export const deleteDocumentHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId || getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    await deleteDocument(pharmacyId, id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  }
);

// View document (opens in browser)
export const viewDocumentHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId || getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    const fileData = await downloadFileFromStorage(pharmacyId, id);

    // Set headers for viewing in browser
    res.setHeader('Content-Type', fileData.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileData.fileName}"`);
    res.setHeader('Content-Length', fileData.buffer.length);

    res.status(200).send(fileData.buffer);
  }
);

// Download document (forces download)
export const downloadDocumentHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const pharmacyId = req.pharmacyId || getPharmacyId(req);
    if (!pharmacyId) {
      throw new AppError('Pharmacy ID is required', 400);
    }

    const { id } = req.params;
    const fileData = await downloadFileFromStorage(pharmacyId, id);

    // Set headers for download
    res.setHeader('Content-Type', fileData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
    res.setHeader('Content-Length', fileData.buffer.length);

    res.status(200).send(fileData.buffer);
  }
);

