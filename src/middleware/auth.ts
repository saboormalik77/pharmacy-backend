import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import jwt from 'jsonwebtoken';

// JWT secret (must match the one used in authService.ts)
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-secret-key-change-in-production';

/**
 * Verify and decode a JWT token using jsonwebtoken
 * This verifies the signature and checks expiration
 */
function verifyJwt(token: string): { sub: string; exp: number; aud: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Validate required fields
    if (!decoded.sub || !decoded.exp) return null;
    
    return {
      sub: decoded.sub,
      exp: decoded.exp,
      aud: decoded.aud || 'authenticated',
      role: decoded.role || 'authenticated',
    };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      console.log('[Auth] JWT expired');
    } else {
      console.log('[Auth] JWT verification failed:', error.message);
    }
    return null;
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      pharmacyId?: string;
      pharmacyStatus?: string;
      parentPharmacyId?: string;
      isPharmacyAdmin?: boolean;
    }
  }
}

/**
 * Error messages for different pharmacy statuses
 */
const STATUS_ERROR_MESSAGES: Record<string, { message: string; code: number }> = {
  suspended: {
    message: 'Your pharmacy account has been suspended. Please contact support for more information.',
    code: 403,
  },
  blacklisted: {
    message: 'Your pharmacy account has been permanently blocked. Access to the platform is denied.',
    code: 403,
  },
  pending: {
    message: 'Your pharmacy account is pending approval. Please wait for account activation.',
    code: 403,
  },
};

/**
 * Check if pharmacy status allows access
 * Returns null if access is allowed, or an AppError if access should be denied
 */
export const checkPharmacyStatus = (status: string | null): AppError | null => {
  if (!status) {
    // If status is null, treat as pending
    return new AppError(STATUS_ERROR_MESSAGES.pending.message, STATUS_ERROR_MESSAGES.pending.code);
  }

  const statusLower = status.toLowerCase();

  if (statusLower === 'active') {
    return null; // Access allowed
  }

  const errorInfo = STATUS_ERROR_MESSAGES[statusLower];
  if (errorInfo) {
    return new AppError(errorInfo.message, errorInfo.code);
  }

  // Unknown status - deny access by default
  return new AppError('Your pharmacy account status is invalid. Please contact support.', 403);
};

/**
 * Verify pharmacy status by pharmacy ID
 * Used by routes that take pharmacy_id as a query parameter
 */
export const verifyPharmacyStatus = async (pharmacyId: string): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data: pharmacy, error } = await supabaseAdmin
    .from('pharmacy')
    .select('id, status')
    .eq('id', pharmacyId)
    .single();

  if (error || !pharmacy) {
    throw new AppError('Pharmacy not found', 404);
  }

  const statusError = checkPharmacyStatus(pharmacy.status);
  if (statusError) {
    throw statusError;
  }
};

/**
 * Main authentication middleware for pharmacy users
 * Verifies JWT token and checks pharmacy status
 * 
 * Status codes:
 * - 401 + code: 'TOKEN_EXPIRED' - Token is expired, client should refresh
 * - 401 + code: 'TOKEN_INVALID' - Token is invalid, client should re-login
 * - 401 + code: 'TOKEN_MISSING' - No token provided
 * - 503 - Service unavailable (Supabase connection issues), client should retry
 * - 403 - Account status issue (suspended, blacklisted, etc.)
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token is required', 401, 'TOKEN_MISSING');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AppError('Authorization token is required', 401, 'TOKEN_MISSING');
    }

    // Verify token and get user
    if (!supabaseAdmin) {
      throw new AppError('Supabase admin client not configured', 500);
    }

    // Step 1: Verify and decode the JWT using jsonwebtoken
    // This verifies the signature AND checks expiration in one step
    const decoded = verifyJwt(token);
    
    if (!decoded) {
      throw new AppError('Invalid or expired token', 401, 'TOKEN_INVALID');
    }
    
    // Validate the token is for authenticated users
    if (decoded.role !== 'authenticated' && decoded.aud !== 'authenticated') {
      throw new AppError('Invalid token', 401, 'TOKEN_INVALID');
    }

    const userId = decoded.sub;

    // Step 2: Verify that the user exists in the pharmacy table and get status
    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from('pharmacy')
      .select('id, status, parent_pharmacy_id, can_manage_branches')
      .eq('id', userId)
      .single();

    if (pharmacyError || !pharmacy) {
      throw new AppError('Pharmacy profile not found. Access denied.', 403);
    }

    // Step 3: Check pharmacy status - BLOCK suspended/blacklisted pharmacies
    const statusError = checkPharmacyStatus(pharmacy.status);
    if (statusError) {
      throw statusError;
    }

    // Step 4: Set pharmacy_id and status for use in controllers
    req.pharmacyId = userId;
    req.pharmacyStatus = pharmacy.status;
    req.isPharmacyAdmin = !pharmacy.parent_pharmacy_id && pharmacy.can_manage_branches === true;

    next();
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else if (error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || 
               error?.message?.includes('fetch failed') ||
               error?.message?.includes('timeout')) {
      // Network timeout - return 503
      next(new AppError('Authentication service temporarily unavailable. Please retry.', 503));
    } else {
      // Unknown error - treat as invalid token
      next(new AppError('Authentication failed', 401, 'TOKEN_INVALID'));
    }
  }
};

