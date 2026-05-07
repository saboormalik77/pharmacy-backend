import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Interfaces
// ============================================================

export interface DocumentListItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string | null;
  fileUrl: string | null;
  source: string;
  status: string;
  uploadedAt: string;
  processedAt: string | null;
  errorMessage: string | null;
  extractedItems: number;
  totalCreditAmount: number | null;
  processingProgress: number | null;
  reportDate: string | null;
  pharmacyId: string;
  pharmacyName: string | null;
  pharmacyOwner: string | null;
  pharmacyEmail: string | null;
  reverseDistributorId: string | null;
  reverseDistributorName: string | null;
  reverseDistributorCode: string | null;
}

export interface DocumentDetails extends DocumentListItem {
  pharmacyPhone: string | null;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DocumentsStats {
  totalDocuments: number;
  totalFileSize: number;
  totalCreditAmount: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  recentUploads: number;
}

export interface DocumentsListResponse {
  documents: DocumentListItem[];
  pagination: PaginationInfo;
  filters: {
    search: string | null;
    pharmacyId: string | null;
  };
  stats: DocumentsStats;
  generatedAt: string;
}

export interface DocumentDetailsResponse {
  document: DocumentDetails;
  generatedAt: string;
}

export interface DeleteDocumentResponse {
  success: boolean;
  message: string;
  deletedDocument: {
    id: string;
    fileName: string;
    pharmacyName: string | null;
  };
  deletedAt: string;
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Get list of documents with search, filter, pagination AND stats
 * Uses PostgreSQL RPC function - no custom JS logic
 * Stats are included in the response
 */
export const getDocumentsList = async (
  search?: string,
  pharmacyId?: string,
  page: number = 1,
  limit: number = 20
): Promise<DocumentsListResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_admin_documents_list', {
    p_search: search || null,
    p_pharmacy_id: pharmacyId || null,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    throw new AppError(`Failed to fetch documents: ${error.message}`, 400);
  }

  if (!data) {
    throw new AppError('No data returned from documents list', 500);
  }

  return {
    documents: data.documents || [],
    pagination: data.pagination,
    filters: data.filters,
    stats: data.stats,
    generatedAt: data.generatedAt,
  };
};

/**
 * Get single document details by ID
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const getDocumentById = async (
  documentId: string
): Promise<DocumentDetailsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_admin_document_by_id', {
    p_document_id: documentId,
  });

  if (error) {
    throw new AppError(`Failed to fetch document: ${error.message}`, 400);
  }

  if (!data) {
    throw new AppError('No data returned from document details', 500);
  }

  // Check for RPC-level errors
  if (data.error) {
    throw new AppError(data.message || 'Document not found', data.code || 404);
  }

  return {
    document: data.document,
    generatedAt: data.generatedAt,
  };
};

/**
 * Delete document by ID
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const deleteDocument = async (
  documentId: string
): Promise<DeleteDocumentResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('delete_admin_document', {
    p_document_id: documentId,
  });

  if (error) {
    throw new AppError(`Failed to delete document: ${error.message}`, 400);
  }

  if (!data) {
    throw new AppError('No data returned from document deletion', 500);
  }

  // Check for RPC-level errors
  if (data.error) {
    throw new AppError(data.message || 'Failed to delete document', data.code || 400);
  }

  return {
    success: data.success,
    message: data.message,
    deletedDocument: data.deletedDocument,
    deletedAt: data.deletedAt,
  };
};
