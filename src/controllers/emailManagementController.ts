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
// Sends a test email via Supabase Edge Function
// ============================================================
export const sendTestEmailHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { to, templateType = 'ra-request' } = req.body;

    if (!to) {
      throw new AppError('Recipient email is required', 400);
    }

    const { supabaseAdmin } = await import('../config/supabase');
    
    if (!supabaseAdmin) {
      throw new AppError('Supabase admin client not configured', 500);
    }

    // Prepare test data
    const testData = templateType === 'ra-reminder' ? {
      memoNumber: 'TEST-001',
      pharmacyName: 'Test Pharmacy',
      requestCount: 2,
      daysSinceRequest: 14,
      originalDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      destination: 'Test Destination',
      labelerName: 'Test Manufacturer',
      totalItems: 3,
      totalAskValue: 1250.0,
      items: [
        { ndc: '12345-678-90', productName: 'Test Product A', quantity: 2, askPrice: 500.0, lotNumber: 'LOT123', expirationDate: '12/2026' },
        { ndc: '98765-432-10', productName: 'Test Product B', quantity: 1, askPrice: 750.0, lotNumber: 'LOT456', expirationDate: '06/2027' },
      ],
    } : {
      memoNumber: 'TEST-001',
      pharmacyName: 'Test Pharmacy',
      destination: 'Test Destination',
      labelerName: 'Test Manufacturer',
      totalItems: 3,
      totalAskValue: 1250.0,
      items: [
        { ndc: '12345-678-90', productName: 'Test Product A', quantity: 2, askPrice: 500.0, lotNumber: 'LOT123', expirationDate: '12/2026' },
        { ndc: '98765-432-10', productName: 'Test Product B', quantity: 1, askPrice: 750.0, lotNumber: 'LOT456', expirationDate: '06/2027' },
      ],
    };

    const contactInfo = {
      name: process.env.CONTACT_NAME || 'Returns Department',
      email: process.env.CONTACT_EMAIL || 'returns@fcr-system.com',
      phone: process.env.CONTACT_PHONE || '+1-555-0123',
    };

    const { data, error } = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to,
        templateType,
        templateData: testData,
        recipientName: 'Test Recipient',
        contactInfo
      }
    });

    if (error) {
      throw new AppError(`Failed to send test email via Edge Function: ${error.message}`, 500);
    }

    if (!data?.success) {
      throw new AppError(`Test email failed: ${data?.error || 'Unknown error'}`, 500);
    }

    res.status(200).json({
      status: 'success',
      message: `Test ${templateType} email sent successfully via Edge Function`,
      data: {
        messageId: data.messageId,
        recipient: to,
        templateType,
      },
    });
  }
);
