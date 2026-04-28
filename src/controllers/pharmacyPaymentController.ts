import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as pharmacyPaymentService from '../services/pharmacyPaymentService';
import { generateCheckPdf } from '../services/checkPdfService';

// ============================================================
// POST /api/admin/pharmacy-payments/calculate — Calculate payout
// ============================================================
export const calculatePayoutHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { pharmacyId, batchId, companyFeePercent, gpoSharePercent } = req.body;

    if (!pharmacyId) throw new AppError('pharmacyId is required', 400);
    if (!batchId) throw new AppError('batchId is required', 400);

    const result = await pharmacyPaymentService.calculatePayout(
      pharmacyId,
      batchId,
      companyFeePercent ? Number(companyFeePercent) : undefined,
      gpoSharePercent ? Number(gpoSharePercent) : undefined
    );

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/admin/pharmacy-payments — List all payments
// ============================================================
export const listPaymentsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { status, pharmacy, batch_id, search, page, limit } =
      req.query as Record<string, string>;

    const result = await pharmacyPaymentService.listPayments({
      status,
      pharmacy,
      batchId: batch_id,
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
// GET /api/pharmacy-payments/check-pdf/:checkNumber — Generate check PDF
// ============================================================
export const checkPdfHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { checkNumber } = req.params;
    
    if (!checkNumber) {
      throw new AppError('Check number is required', 400);
    }

    // Get check data
    const checkData = await pharmacyPaymentService.getCheckPdfData(checkNumber);
    
    // Generate PDF
    const pdfBuffer = await generateCheckPdf(checkData);
    
    // Set headers for PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="RSI_Check_${checkNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.end(pdfBuffer);
  }
);

// ============================================================
// POST /api/admin/pharmacy-payments — Create payment record
// ============================================================
export const createPaymentHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      pharmacyId, batchId, totalCreditReceived,
      companyFeePercent, companyFee, gpoShare,
      pharmacyPayout, paymentMethod, paymentReference, notes,
    } = req.body;

    if (!pharmacyId) throw new AppError('pharmacyId is required', 400);

    const result = await pharmacyPaymentService.createPaymentRecord({
      pharmacyId,
      batchId,
      totalCreditReceived: totalCreditReceived ? Number(totalCreditReceived) : undefined,
      companyFeePercent: companyFeePercent ? Number(companyFeePercent) : undefined,
      companyFee: companyFee ? Number(companyFee) : undefined,
      gpoShare: gpoShare ? Number(gpoShare) : undefined,
      pharmacyPayout: pharmacyPayout ? Number(pharmacyPayout) : undefined,
      paymentMethod,
      paymentReference,
      notes,
      createdBy: req.adminId,
    });

    res.status(201).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/admin/pharmacy-payments/summary — Summary by pharmacy
// ============================================================
export const paymentSummaryHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { search, page, limit } = req.query as Record<string, string>;

    const result = await pharmacyPaymentService.paymentSummary(
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
// GET /api/admin/pharmacy-payments/:id — Get payment details
// ============================================================
export const getPaymentHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const result = await pharmacyPaymentService.getPayment(req.params.id);

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// PATCH /api/admin/pharmacy-payments/:id — Update payment
// ============================================================
export const updatePaymentHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      status, paymentMethod, paymentReference, paidAt,
      notes, companyFee, companyFeePercent, gpoShare,
      pharmacyPayout, totalCreditReceived,
    } = req.body;

    const result = await pharmacyPaymentService.updatePaymentRecord(
      req.params.id,
      {
        status,
        paymentMethod,
        paymentReference,
        paidAt,
        notes,
        companyFee: companyFee != null ? Number(companyFee) : undefined,
        companyFeePercent: companyFeePercent != null ? Number(companyFeePercent) : undefined,
        gpoShare: gpoShare != null ? Number(gpoShare) : undefined,
        pharmacyPayout: pharmacyPayout != null ? Number(pharmacyPayout) : undefined,
        totalCreditReceived: totalCreditReceived != null ? Number(totalCreditReceived) : undefined,
      }
    );

    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// GET /api/pharmacy-payments/my-payments — Pharmacy's own payments
// ============================================================
export const myPaymentsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = req.pharmacyId;
    if (!pharmacyId) throw new AppError('Authentication required', 401);

    const { status, dateRange, startDate, endDate, page, limit } = req.query as Record<string, string>;

    const result = await pharmacyPaymentService.myPayments(pharmacyId, {
      status,
      dateRange,
      startDate,
      endDate,
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
