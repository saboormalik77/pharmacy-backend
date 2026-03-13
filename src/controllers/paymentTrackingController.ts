import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
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
// ============================================================
export const recordPaymentHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { amountReceived, paymentDate, reference, notes } = req.body;

    const result = await paymentTrackingService.recordPayment(
      req.params.id,
      Number(amountReceived),
      paymentDate,
      reference,
      notes
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
