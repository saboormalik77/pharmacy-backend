import { Request, Response, NextFunction } from 'express';
import {
  getDistributorsList,
  getDistributorById,
  createDistributor,
  updateDistributor,
  updateDistributorStatus,
  deleteDistributor,
  getDistributorUniqueProducts,
} from '../services/adminDistributorsService';
import { getReverseDistributors } from '../services/reverseDistributorsService';
import { AppError } from '../utils/appError';

/**
 * Get list of distributors with stats included
 * GET /api/admin/distributors
 */
export const getDistributorsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, status = 'all', page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100); // Max 100

    // Normalize search parameter: trim whitespace, decode URL encoding, collapse multiple spaces
    let normalizedSearch: string | undefined = undefined;
    if (search && typeof search === 'string') {
      const decoded = decodeURIComponent(search);
      normalizedSearch = decoded.trim().replace(/\s+/g, ' ');
      if (normalizedSearch === '') {
        normalizedSearch = undefined;
      }
    }

    const result = await getDistributorsList(
      normalizedSearch,
      status as string,
      pageNum,
      limitNum
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single distributor by ID
 * GET /api/admin/distributors/:id
 */
export const getDistributorByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Distributor ID is required', 400);
    }

    const result = await getDistributorById(id);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new distributor
 * POST /api/admin/distributors
 */
export const createDistributorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      companyName,
      contactPerson,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      licenseNumber,
      specializations,
    } = req.body;

    // Validate required field
    if (!companyName || typeof companyName !== 'string' || companyName.trim() === '') {
      throw new AppError('Company name is required', 400);
    }

    // Validate email format if provided
    if (email && typeof email === 'string' && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError('Invalid email format', 400);
      }
    }

    // Validate specializations is array if provided
    if (specializations && !Array.isArray(specializations)) {
      throw new AppError('Specializations must be an array of strings', 400);
    }

    const result = await createDistributor({
      companyName: companyName.trim(),
      contactPerson: contactPerson?.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      zipCode: zipCode?.trim(),
      licenseNumber: licenseNumber?.trim(),
      specializations: specializations || [],
    });

    res.status(201).json({
      status: 'success',
      message: 'Distributor created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update distributor details
 * PUT /api/admin/distributors/:id
 */
export const updateDistributorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      throw new AppError('Distributor ID is required', 400);
    }

    // Validate that at least one field is being updated
    const allowedFields = [
      'companyName',
      'contactPerson',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'zipCode',
      'licenseNumber',
      'specializations',
    ];

    const hasValidUpdates = Object.keys(updates).some((key) =>
      allowedFields.includes(key)
    );

    if (!hasValidUpdates) {
      throw new AppError(
        'No valid fields to update. Allowed fields: ' + allowedFields.join(', '),
        400
      );
    }

    // Validate email format if provided
    if (updates.email && typeof updates.email === 'string' && updates.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        throw new AppError('Invalid email format', 400);
      }
    }

    // Validate specializations is array if provided
    if (updates.specializations && !Array.isArray(updates.specializations)) {
      throw new AppError('Specializations must be an array of strings', 400);
    }

    const result = await updateDistributor(id, {
      companyName: updates.companyName?.trim(),
      contactPerson: updates.contactPerson,
      email: updates.email,
      phone: updates.phone,
      address: updates.address,
      city: updates.city,
      state: updates.state,
      zipCode: updates.zipCode,
      licenseNumber: updates.licenseNumber,
      specializations: updates.specializations,
    });

    res.status(200).json({
      status: 'success',
      message: 'Distributor updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update distributor status (activate/deactivate)
 * PUT /api/admin/distributors/:id/status
 */
export const updateDistributorStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      throw new AppError('Distributor ID is required', 400);
    }

    if (!status) {
      throw new AppError('Status is required', 400);
    }

    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
      throw new AppError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400
      );
    }

    const result = await updateDistributorStatus(id, status);

    res.status(200).json({
      status: 'success',
      message: `Distributor ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a distributor
 * DELETE /api/admin/distributors/:id
 */
export const deleteDistributorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Distributor ID is required', 400);
    }

    const result = await deleteDistributor(id);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unique products for a distributor
 * GET /api/admin/distributors/:id/products
 */
export const getDistributorProductsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '50' } = req.query;

    if (!id) {
      throw new AppError('Distributor ID is required', 400);
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100); // Max 100

    const result = await getDistributorUniqueProducts(id, pageNum, limitNum);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all active reverse distributors (name + contact_email) for dropdown population
 * GET /api/admin/reverse-distributors
 */
export const listReverseDistributorsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const distributors = await getReverseDistributors();
    const payload = distributors.map(d => ({
      id: d.id,
      name: d.name,
      email: d.contact_email || '',
    }));
    res.status(200).json({ status: 'success', data: payload });
  } catch (error) {
    next(error);
  }
};
