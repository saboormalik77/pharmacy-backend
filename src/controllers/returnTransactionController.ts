import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as rtService from '../services/returnTransactionService';
import { generateManifestPdf, generateManifestHtml, generateDeaForm222Pdf } from '../services/manifestService';

// ============================================================
// POST /api/return-transactions — Create new return
// ============================================================
export const createHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { pharmacyId, pharmacy_id, serviceType, service_type, notes, forceCreate, force_create } = req.body;
    const resolvedPharmacyId = pharmacyId || pharmacy_id;

    if (!resolvedPharmacyId) {
      throw new AppError('pharmacyId is required', 400);
    }

    // If caller is a processor, enforce store-access check
    if (req.processorId && req.assignedStoreIds && !req.assignedStoreIds.includes(resolvedPharmacyId)) {
      throw new AppError('You are not assigned to this store', 403);
    }

    const transaction = await rtService.createReturnTransaction({
      pharmacyId: resolvedPharmacyId,
      processorId: req.processorId || undefined,
      serviceType: serviceType || service_type,
      notes,
      forceCreate: forceCreate || force_create || false,
    });

    res.status(201).json({
      status: 'success',
      data: transaction,
    });
  }
);

// ============================================================
// GET /api/return-transactions — List returns
// ============================================================
export const listHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      pharmacy_id,
      pharmacyId,
      processor_id,
      processorId: qProcessorId,
      status,
      date_from,
      dateFrom,
      date_to,
      dateTo,
      search,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    // If caller is a processor, restrict to their assigned stores
    let filterPharmacyId = pharmacy_id || pharmacyId;
    let filterProcessorId = processor_id || qProcessorId;
    if (req.processorId) {
      filterProcessorId = req.processorId;
    }

    const result = await rtService.listReturnTransactions({
      pharmacyId: filterPharmacyId,
      processorId: filterProcessorId,
      status,
      dateFrom: date_from || dateFrom,
      dateTo: date_to || dateTo,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/return-transactions/:id — Get single return
// ============================================================
export const getByIdHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    const transaction = await rtService.getReturnTransactionById(id);

    // If processor, verify they have access to this pharmacy
    if (req.processorId && req.assignedStoreIds && !req.assignedStoreIds.includes(transaction.pharmacyId)) {
      throw new AppError('You do not have access to this return transaction', 403);
    }

    res.status(200).json({ status: 'success', data: transaction });
  }
);

// ============================================================
// PATCH /api/return-transactions/:id — Update return
// ============================================================
export const updateHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { fedexTracking, fedex_tracking, fedexPickupConfirmation, fedex_pickup_confirmation, notes, serviceType, service_type } = req.body;

    const transaction = await rtService.updateReturnTransaction(id, {
      fedexTracking: fedexTracking || fedex_tracking,
      fedexPickupConfirmation: fedexPickupConfirmation || fedex_pickup_confirmation,
      notes,
      serviceType: serviceType || service_type,
    });

    res.status(200).json({ status: 'success', data: transaction });
  }
);

// ============================================================
// POST /api/return-transactions/:id/pause
// ============================================================
export const pauseHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const transaction = await rtService.pauseReturnTransaction(req.params.id);
    res.status(200).json({ status: 'success', data: transaction });
  }
);

// ============================================================
// POST /api/return-transactions/:id/resume
// ============================================================
export const resumeHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const transaction = await rtService.resumeReturnTransaction(req.params.id);
    res.status(200).json({ status: 'success', data: transaction });
  }
);

// ============================================================
// POST /api/return-transactions/:id/complete
// ============================================================
export const completeHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const transaction = await rtService.completeReturnTransaction(req.params.id);
    res.status(200).json({ status: 'success', data: transaction });
  }
);

// ============================================================
// POST /api/return-transactions/:id/finalize
// ============================================================
export const finalizeHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      fedexTracking, fedex_tracking,
      boxCount, box_count,
      prpNumber, prp_number,
      packageTracking, package_tracking,
    } = req.body;

    const transaction = await rtService.finalizeReturnTransaction(
      req.params.id,
      fedexTracking || fedex_tracking,
      boxCount ?? box_count,
      prpNumber || prp_number,
      packageTracking || package_tracking
    );

    res.status(200).json({ status: 'success', data: transaction });
  }
);

// ============================================================
// GET /api/return-transactions/:id/manifest — Generate manifest PDF
// ============================================================
export const manifestHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    const manifestData = await rtService.getManifestData(id);

    const pdfBuffer = await generateManifestPdf(manifestData);

    const filename = `manifest_${manifestData.transaction.licensePlate || id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }
);

// ============================================================
// GET /api/return-transactions/:id/manifest-html — Itemized manifest as HTML (browser print)
// ============================================================
export const manifestHtmlHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    const manifestData = await rtService.getManifestData(id);
    const html = generateManifestHtml(manifestData);

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="manifest-${manifestData.transaction.licensePlate || id}.html"`,
    });
    res.send(html);
  }
);

// ============================================================
// GET /api/return-transactions/:id/dea-form-222 — Generate DEA Form 222 PDF
// ============================================================
export const deaForm222Handler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    const deaData = await rtService.getDeaForm222Data(id);

    const pdfBuffer = await generateDeaForm222Pdf(deaData);

    const filename = `dea_form_222_${deaData.transaction.licensePlate || id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }
);

// ============================================================
// GET /api/return-transactions/:id/manifest-data — Get raw manifest data (JSON)
// ============================================================
export const manifestDataHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const manifestData = await rtService.getManifestData(req.params.id);
    res.status(200).json({ status: 'success', data: manifestData });
  }
);

// ============================================================
// DELETE /api/return-transactions/:id
// ============================================================
export const deleteHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    await rtService.deleteReturnTransaction(req.params.id);
    res.status(200).json({ status: 'success', message: 'Return transaction deleted' });
  }
);

// ============================================================
// PATCH /api/return-transactions/:id/finalize-steps
// ============================================================
export const updateFinalizeStepsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { steps } = req.body;

    if (!steps || typeof steps !== 'object') {
      throw new AppError('steps object is required', 400);
    }

    const transaction = await rtService.updateFinalizeSteps(id, steps);
    res.status(200).json({ status: 'success', data: transaction });
  }
);
