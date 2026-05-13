import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';
import * as paymentTrackingService from '../services/paymentTrackingService';
import { analyzeAndMatchCreditMemo } from '../services/creditMemoMatchingService';
import { recordCreditMemoAnalysis } from '../services/ndcPricingIntelligenceService';

/**
 * Best-effort AI analysis of a credit memo PDF after a payment is recorded.
 * Always resolves — never throws — so the user-facing payment flow is not
 * blocked by Azure outages or document-parse edge cases.
 *
 * Returns a small summary the frontend can display alongside the payment
 * confirmation, e.g. "AI extracted 12 NDC line items (94% confidence)".
 */
async function analyzeAndPersistCreditMemo(input: {
  debitMemoId: string;
  creditMemoUrl: string | null;
  pdfBuffer: Buffer;
  filename?: string;
  pharmacyName?: string | null;
}): Promise<{
  analysisId: string | null;
  status: string;
  confidence: number;
  itemsExtracted: number;
  itemsInserted: number;
  itemsSkipped: number;
  manufacturerName: string | null;
  totalAmount: number | null;
  distinctNdcs: string[];
  errorMessage?: string | null;
}> {
  try {
    const result = await analyzeAndMatchCreditMemo({
      debitMemoId: input.debitMemoId,
      pdfBuffer:   input.pdfBuffer,
      filename:    input.filename,
      pharmacyName: input.pharmacyName,
    });

    const itemsForRpc = result.lineItems.map(it => ({
      ...it,
      pharmacyName: it.pharmacyName ?? input.pharmacyName ?? null,
    }));

    const persisted = await recordCreditMemoAnalysis({
      debitMemoId: input.debitMemoId,
      creditMemoUrl: input.creditMemoUrl,
      status: result.status,
      confidence: result.confidence,
      extractedTotal: result.totalAmount,
      items: itemsForRpc,
      errorMessage: result.errorMessage ?? null,
    });

    return {
      analysisId: persisted.analysisId,
      status: result.status,
      confidence: result.confidence,
      itemsExtracted: result.lineItems.length,
      itemsInserted: persisted.inserted,
      itemsSkipped: persisted.skipped,
      manufacturerName: result.manufacturerName,
      totalAmount: result.totalAmount,
      distinctNdcs: persisted.distinctNdcs,
      errorMessage: result.errorMessage ?? null,
    };
  } catch (err: any) {
    console.error('Credit memo AI analysis failed (non-blocking):', err?.message || err);
    return {
      analysisId: null,
      status: 'failed',
      confidence: 0,
      itemsExtracted: 0,
      itemsInserted: 0,
      itemsSkipped: 0,
      manufacturerName: null,
      totalAmount: null,
      distinctNdcs: [],
      errorMessage: err?.message || 'Unknown error during AI analysis',
    };
  }
}

// ============================================================
// GET /api/admin/debit-memos/unpaid — List unpaid debit memos
// ============================================================
export const listUnpaidHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { manufacturer, destination, search, page, limit } =
      req.query as Record<string, string>;

    const result = await paymentTrackingService.listUnpaid({
      manufacturer,
      destination,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
    });
  }
);

// ============================================================
// POST /api/admin/debit-memos/:id/record-payment — Record payment
// Accepts multipart/form-data with optional creditMemo PDF file
// ============================================================
export const recordPaymentHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { amountReceived, paymentDate, reference, notes } = req.body;

    if (!amountReceived) {
      throw new AppError('amountReceived is required', 400);
    }

    // Upload credit memo PDF if provided
    let creditMemoUrl: string | undefined;
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      throw new AppError('Credit memo PDF is required', 400);
    }

    if (!supabaseAdmin) {
      throw new AppError('Supabase admin client not configured', 500);
    }

    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `memo-documents/${req.params.id}/${timestamp}-${sanitizedName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new AppError(`Failed to upload credit memo: ${uploadError.message}`, 400);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(filePath);

    creditMemoUrl = urlData?.publicUrl;

    const result = await paymentTrackingService.recordPayment(
      req.params.id,
      Number(amountReceived),
      paymentDate || undefined,
      reference !== undefined ? (reference || null) : undefined,
      notes !== undefined ? (notes || null) : undefined,
      creditMemoUrl
    );

    // FCR-56: Best-effort AI extraction of ask/received pairs from the credit
    // memo. Failures here are logged but do not roll back the payment record.
    const aiAnalysis = await analyzeAndPersistCreditMemo({
      debitMemoId: req.params.id,
      creditMemoUrl: creditMemoUrl ?? null,
      pdfBuffer: file.buffer,
      filename: file.originalname,
      pharmacyName: result?.pharmacyName ?? null,
    });

    res.status(200).json({ status: 'success', data: result, aiAnalysis });
  }
);

// ============================================================
// PATCH /api/admin/debit-memos/:id/update-payment — Update payment
// Accepts multipart/form-data with optional new creditMemo PDF file
// ============================================================
export const updatePaymentHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { amountReceived, paymentDate, reference, notes } = req.body;

    if (!amountReceived) {
      throw new AppError('amountReceived is required', 400);
    }

    // Upload new credit memo PDF if provided
    let creditMemoUrl: string | undefined;
    const file = (req as any).file as Express.Multer.File | undefined;

    if (file) {
      if (!supabaseAdmin) {
        throw new AppError('Supabase admin client not configured', 500);
      }

      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `memo-documents/${req.params.id}/${timestamp}-${sanitizedName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('documents')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        throw new AppError(`Failed to upload credit memo: ${uploadError.message}`, 400);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('documents')
        .getPublicUrl(filePath);

      creditMemoUrl = urlData?.publicUrl;
    }

    const result = await paymentTrackingService.updatePayment(
      req.params.id,
      Number(amountReceived),
      paymentDate || undefined,
      reference !== undefined ? (reference || null) : undefined,
      notes !== undefined ? (notes || null) : undefined,
      creditMemoUrl
    );

    // FCR-56: Re-run AI extraction only if a NEW credit memo PDF was uploaded
    // during the update; otherwise we already have an analysis on file.
    let aiAnalysis = null;
    if (file && file.buffer) {
      aiAnalysis = await analyzeAndPersistCreditMemo({
        debitMemoId: req.params.id,
        creditMemoUrl: creditMemoUrl ?? null,
        pdfBuffer: file.buffer,
        filename: file.originalname,
        pharmacyName: result?.pharmacyName ?? null,
      });
    }

    res.status(200).json({ status: 'success', data: result, aiAnalysis });
  }
);

// ============================================================
// POST /api/admin/debit-memos/:id/send-reminder — Send payment reminder
// ============================================================
export const sendReminderHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { sentBy, emailOverride } = req.body;

    const result = await paymentTrackingService.sendPaymentReminder(
      req.params.id,
      sentBy,
      emailOverride
    );

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/admin/analytics/ask-vs-received — Ask vs Received analytics
// ============================================================
export const askVsReceivedHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { group_by, period, page, limit } = req.query as Record<string, string>;

    const result = await paymentTrackingService.askVsReceived(
      group_by, 
      period,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      req.adminBuyingGroupId ?? undefined
    );

    res.status(200).json({
      status: 'success',
      data: result.data,
      totals: result.totals,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/analytics/manufacturer-payments — Manufacturer payment summary
// ============================================================
export const manufacturerPaymentsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await paymentTrackingService.manufacturerPaymentSummary(
      search,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      req.adminBuyingGroupId ?? undefined
    );

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  }
);

// ============================================================
// GET /api/admin/debit-memos/unpaid/grouped-by-return — List unpaid memos grouped by return
// ============================================================
export const listUnpaidGroupedByReturnHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { manufacturer, destination, search, page, limit } =
      req.query as Record<string, string>;

    const result = await paymentTrackingService.listUnpaidGroupedByReturn({
      manufacturer,
      destination,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
    });
  }
);

// ============================================================
// GET /api/admin/debit-memos/paid/grouped-by-return — List paid memos grouped by return
// ============================================================
export const listPaidGroupedByReturnHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { destination, search, page, limit } =
      req.query as Record<string, string>;

    const result = await paymentTrackingService.listPaidGroupedByReturn({
      destination,
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
