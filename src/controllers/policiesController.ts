import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as policiesService from '../services/policiesService';
import { checkReturnability } from '../services/policyEngineService';

// ============================================================
// Manufacturer Policies CRUD
// ============================================================

export const listPoliciesHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.listPolicies({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      search: req.query.search as string,
      labelerType: req.query.labelerType as string,
      destination: req.query.destination as string,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
    });

    res.status(200).json({ status: 'success', data: result });
  }
);

export const getPolicyByIdHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.getPolicyById(req.params.id);
    res.status(200).json({ status: 'success', data: result });
  }
);

export const createPolicyHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.createPolicy(req.body);
    res.status(201).json({ status: 'success', data: result });
  }
);

export const updatePolicyHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.updatePolicy(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: result });
  }
);

export const deletePolicyHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.deletePolicy(req.params.id);
    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// Return Policies (sub-records)
// ============================================================

export const addReturnPolicyHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.addReturnPolicy(req.params.id, req.body);
    res.status(201).json({ status: 'success', data: result });
  }
);

export const updateReturnPolicyHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.updateReturnPolicy(req.params.returnPolicyId, req.body);
    res.status(200).json({ status: 'success', data: result });
  }
);

export const deleteReturnPolicyHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.deleteReturnPolicy(req.params.returnPolicyId);
    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// Exceptions (non-returnable products)
// ============================================================

export const getExceptionsHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.getExceptions(req.params.id);
    res.status(200).json({ status: 'success', data: result });
  }
);

export const addExceptionHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.addException(req.params.id, req.body);
    res.status(201).json({ status: 'success', data: result });
  }
);

export const deleteExceptionHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.deleteException(req.params.exceptionId);
    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// Notes
// ============================================================

export const getNotesHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.getNotes(req.params.id);
    res.status(200).json({ status: 'success', data: result });
  }
);

export const addNoteHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.addNote(req.params.id, req.body);
    res.status(201).json({ status: 'success', data: result });
  }
);

export const deleteNoteHandler = catchAsync(
  async (req: Request, res: Response) => {
    const result = await policiesService.deleteNote(req.params.noteId);
    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// Bulk Import
// ============================================================

export const bulkImportHandler = catchAsync(
  async (req: Request, res: Response) => {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows)) {
      throw new AppError('Request body must contain a "rows" array', 400);
    }
    const result = await policiesService.bulkImport(rows);
    res.status(200).json({ status: 'success', data: result });
  }
);

// ============================================================
// Policy Check (used by adding products / barcode scan)
// ============================================================

export const checkReturnabilityHandler = catchAsync(
  async (req: Request, res: Response) => {
    const { ndc, expirationDate, isPartial, dosageForm } = req.body;

    if (!ndc || !expirationDate) {
      throw new AppError('ndc and expirationDate are required', 400);
    }

    // Debug logging to understand the difference between pharmacy and processor calls
    console.log('🔍 Policy Check Debug:', {
      ndc,
      expirationDate,
      isPartial,
      dosageForm,
      userAgent: req.headers['user-agent'],
      authHeader: req.headers.authorization ? 'Present' : 'Missing',
      requestBody: req.body,
    });

    const result = await checkReturnability({
      ndc,
      expirationDate,
      isPartial: isPartial === true || isPartial === 'true',
      dosageForm,
    });

    console.log('🔍 Policy Check Result:', {
      ndc,
      isPartial: isPartial === true || isPartial === 'true',
      status: result.status,
      reason: result.reason,
      partialsAccepted: result.partialsAccepted,
    });

    res.status(200).json({ status: 'success', data: result });
  }
);
