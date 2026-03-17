import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as emailService from '../services/emailManagementService';

// ============================================================
// GET /api/admin/emails/logs
// ============================================================
export const listEmailLogsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      status,
      emailType,
      dateFrom,
      dateTo,
      search,
      page,
      limit
    } = req.query as Record<string, string>;

    const result = await emailService.listEmailLogs({
      status,
      emailType,
      dateFrom,
      dateTo,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination
    });
  }
);

// ============================================================
// GET /api/admin/emails/logs/:id
// ============================================================
export const getEmailLogHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const emailLog = await emailService.getEmailLog(req.params.id);

    res.status(200).json({
      status: 'success',
      data: emailLog
    });
  }
);

// ============================================================
// GET /api/admin/emails/stats
// ============================================================
export const getEmailStatsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { dateFrom, dateTo } = req.query as Record<string, string>;

    const stats = await emailService.getEmailStats(dateFrom, dateTo);

    res.status(200).json({
      status: 'success',
      data: stats
    });
  }
);

// ============================================================
// GET /api/admin/emails/stats/by-type
// ============================================================
export const getEmailStatsByTypeHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { emailType, dateFrom, dateTo } = req.query as Record<string, string>;

    const statsByType = await emailService.getEmailStatsByType(emailType, dateFrom, dateTo);

    res.status(200).json({
      status: 'success',
      data: statsByType
    });
  }
);

// ============================================================
// POST /api/admin/emails/logs/:id/retry
// ============================================================
export const retryEmailHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await emailService.retryFailedEmail(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Email retry initiated successfully',
      data: result
    });
  }
);

// ============================================================
// POST /api/admin/emails/logs/:id/resolve
// ============================================================
export const resolveEmailHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { notes } = req.body;

    await emailService.markEmailAsResolved(req.params.id, notes);

    res.status(200).json({
      status: 'success',
      message: 'Email marked as resolved successfully'
    });
  }
);

// ============================================================
// GET /api/admin/emails/health
// ============================================================
export const getEmailHealthHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const healthReport = await emailService.getEmailHealthReport();

    res.status(200).json({
      status: 'success',
      data: healthReport
    });
  }
);

// ============================================================
// POST /api/admin/emails/test
// Sends via Resend from Node (no Edge Function required)
// ============================================================
export const sendTestEmailHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { to, templateType = 'ra-request' } = req.body;

    if (!to) {
      throw new AppError('Recipient email is required', 400);
    }

    const { sendRaTestEmailFromNode } = await import('../services/resendRaEmailService');

    const result = await sendRaTestEmailFromNode({
      to,
      templateType: templateType === 'ra-reminder' ? 'ra-reminder' : 'ra-request',
    });

    res.status(200).json({
      status: 'success',
      message: `Test ${templateType} email sent successfully`,
      data: {
        emailId: result.emailId,
        recipient: to,
        templateType,
      },
    });
  }
);