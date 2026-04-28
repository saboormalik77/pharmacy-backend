import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import * as batchService from '../services/batchService';
import { generateDebitMemoPdf } from '../services/debitMemoPdfService';

// ============================================================
// GET /api/admin/debit-memos — List debit memos
// ============================================================
export const listDebitMemosHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { batch_id, pharmacy_id, destination, payment_status, search, page, limit } =
      req.query as Record<string, string>;

    const result = await batchService.listDebitMemos({
      batchId: batch_id,
      pharmacyId: pharmacy_id,
      destination,
      paymentStatus: payment_status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/debit-memos/:id — Get debit memo with items
// ============================================================
export const getDebitMemoHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await batchService.getDebitMemo(req.params.id);

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// PATCH /api/admin/debit-memos/:id — Update debit memo
// ============================================================
export const updateDebitMemoHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const body = req.body;

    const memo = await batchService.updateDebitMemo(req.params.id, {
      raNumber: body.raNumber,
      raRequestedAt: body.raRequestedAt,
      raReceivedAt: body.raReceivedAt,
      ticklerDate: body.ticklerDate,
      baggieManifest: body.baggieManifest,
      outboundTracking: body.outboundTracking,
      shippedAt: body.shippedAt,
      paymentStatus: body.paymentStatus,
      amountRequested: body.amountRequested != null ? Number(body.amountRequested) : undefined,
      amountReceived: body.amountReceived != null ? Number(body.amountReceived) : undefined,
    });

    res.status(200).json({ status: 'success', data: memo });
  }
);

// ============================================================
// GET /api/admin/debit-memos/:id/download — Download debit memo PDF
// ============================================================
export const downloadDebitMemoPdfHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const memoId = req.params.id;

    // Get debit memo PDF data
    const pdfData = await batchService.getDebitMemoPdfData(memoId);

    // Generate PDF
    const pdfBuffer = await generateDebitMemoPdf(pdfData);

    // Set headers for PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Debit_Memo_${pdfData.memo.memoNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.end(pdfBuffer);
  }
);
