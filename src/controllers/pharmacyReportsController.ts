import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as svc from '../services/pharmacyReportsService';

const getPharmacyId = (req: Request): string => {
  const id = req.pharmacyId;
  if (!id) throw new AppError('Not authenticated', 401);
  return id;
};

const getRefNum = (req: Request): string => {
  const raw = (req.params.refNum || req.query.refNum || req.query.ref_num) as
    | string
    | undefined;
  const value = (raw || '').trim();
  if (!value) throw new AppError('refNum is required', 400);
  return value;
};

// GET /api/pharmacy-reports/returns
export const listReturnsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    const rawLimit = parseInt(String(req.query.limit ?? '200'), 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 1000) : 200;
    const returns = await svc.listPharmacyReportReturns(pharmacyId, limit);
    res.status(200).json({ status: 'success', data: { returns } });
  },
);

// GET /api/pharmacy-reports/returns/:refNum/return-packet
export const returnPacketHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    const refNum = getRefNum(req);
    const report = await svc.getReturnPacket(pharmacyId, refNum);
    res.status(200).json({ status: 'success', data: report });
  },
);

// GET /api/pharmacy-reports/returns/:refNum/controlled-substance
export const controlledSubstanceHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    const refNum = getRefNum(req);
    const report = await svc.getControlledSubstanceReport(pharmacyId, refNum);
    res.status(200).json({ status: 'success', data: report });
  },
);

// GET /api/pharmacy-reports/returns/:refNum/destruction-controls
export const destructionControlsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    const refNum = getRefNum(req);
    const report = await svc.getDestructionControls(pharmacyId, refNum);
    res.status(200).json({ status: 'success', data: report });
  },
);

// GET /api/pharmacy-reports/returns/:refNum/destruction-non-controls
export const destructionNonControlsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const pharmacyId = getPharmacyId(req);
    const refNum = getRefNum(req);
    const report = await svc.getDestructionNonControls(pharmacyId, refNum);
    res.status(200).json({ status: 'success', data: report });
  },
);
