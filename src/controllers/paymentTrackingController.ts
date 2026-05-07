import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';
import * as paymentTrackingService from '../services/paymentTrackingService';

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

    res.status(200).json({ status: 'success', data: result });
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

    res.status(200).json({ status: 'success', data: result });
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
    const { group_by, period } = req.query as Record<string, string>;

    const result = await paymentTrackingService.askVsReceived(group_by, period);

    res.status(200).json({
      status: 'success',
      data: result.data,
      totals: result.totals,
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
      limit ? Number(limit) : undefined
    );

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  }
);
