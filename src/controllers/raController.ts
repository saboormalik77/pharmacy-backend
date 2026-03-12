import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as raService from '../services/raService';

// ============================================================
// POST /api/admin/debit-memos/:id/request-ra
// ============================================================
export const requestRAHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { sentBy, emailOverride } = req.body;

    const result = await raService.sendRARequest(
      req.params.id,
      sentBy,
      emailOverride
    );

    res.status(200).json({
      status: 'success',
      message: 'RA request sent successfully',
      data: result,
    });
  }
);

// ============================================================
// POST /api/admin/debit-memos/:id/receive-ra
// ============================================================
export const receiveRAHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { raNumber, pdfUrl } = req.body;

    if (!raNumber) throw new AppError('raNumber is required', 400);

    const memo = await raService.receiveRA(
      req.params.id,
      raNumber,
      pdfUrl
    );

    res.status(200).json({
      status: 'success',
      message: 'RA received recorded successfully',
      data: memo,
    });
  }
);

// ============================================================
// POST /api/admin/debit-memos/:id/resend-ra
// ============================================================
export const resendRAHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { sentBy, emailOverride } = req.body;

    const result = await raService.resendRARequest(
      req.params.id,
      sentBy,
      emailOverride
    );

    res.status(200).json({
      status: 'success',
      message: 'RA reminder sent successfully',
      data: result,
    });
  }
);

// ============================================================
// POST /api/admin/debit-memos/:id/ship
// ============================================================
export const shipDebitMemoHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { outboundTracking, shippedAt } = req.body;

    if (!outboundTracking) throw new AppError('outboundTracking is required', 400);

    const memo = await raService.shipDebitMemo(
      req.params.id,
      outboundTracking,
      shippedAt
    );

    res.status(200).json({
      status: 'success',
      message: 'Shipment recorded successfully',
      data: memo,
    });
  }
);

// ============================================================
// GET /api/admin/debit-memos/:id/email-preview
// ============================================================
export const emailPreviewHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { type, emailOverride } = req.query as Record<string, string>;

    let template;
    if (type === 'reminder') {
      template = await raService.generateReminderEmail(req.params.id, emailOverride);
    } else {
      template = await raService.generateRequestEmail(req.params.id, emailOverride);
    }

    res.status(200).json({
      status: 'success',
      data: template,
    });
  }
);

// ============================================================
// GET /api/admin/ra-tracking
// ============================================================
export const raTrackingDashboardHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { ra_status, destination, date_from, date_to, search, page, limit } =
      req.query as Record<string, string>;

    const result = await raService.listRATracking({
      raStatus: ra_status,
      destination,
      dateFrom: date_from,
      dateTo: date_to,
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
// GET /api/admin/ra-tracking/outstanding
// ============================================================
export const raOutstandingHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await raService.listOutstandingRAs(
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

// ============================================================
// GET /api/admin/ra-tracking/overdue
// ============================================================
export const raOverdueHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await raService.listOverdueRAs(
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

// ============================================================
// GET /api/admin/shipments/outbound
// ============================================================
export const outboundShipmentsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await raService.listOutboundShipments(
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
