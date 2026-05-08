import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { verifyPharmacyStatus } from '../middleware/auth';

export interface UploadedDocument {
  id: string;
  pharmacy_id: string;
  file_name: string;
  file_size: number;
  file_type?: string;
  file_url?: string;
  reverse_distributor_id?: string;
  source: 'manual_upload' | 'email_forward' | 'portal_fetch' | 'api';
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'needs_review';
  uploaded_at: string;
  processed_at?: string;
  error_message?: string;
  extracted_items: number;
  total_credit_amount?: number;
  processing_progress?: number;
  report_date?: string; // Date of the return report (YYYY-MM-DD format)
}

export const getDocuments = async (
  pharmacyId: string,
  filters?: {
    status?: UploadedDocument['status'];
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ documents: UploadedDocument[]; total: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  // Join with reverse_distributors to get distributor name
  let query = db
    .from('uploaded_documents')
    .select(`
      *,
      reverse_distributors (
        id,
        name,
        code
      )
    `, { count: 'exact' })
    .eq('pharmacy_id', pharmacyId)
    .order('uploaded_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`file_name.ilike.%${filters.search}%`);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(`Failed to fetch documents: ${error.message}`, 400);
  }

  // Transform data to include distributor name
  const documents = (data || []).map((doc: any) => ({
    ...doc,
    reverse_distributor_name: doc.reverse_distributors?.name || null,
  }));

  return {
    documents,
    total: count || 0,
  };
};

export const getDocumentById = async (
  pharmacyId: string,
  documentId: string
): Promise<UploadedDocument> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  const { data, error } = await db
    .from('uploaded_documents')
    .select(`
      *,
      reverse_distributors (
        id,
        name,
        code
      )
    `)
    .eq('id', documentId)
    .eq('pharmacy_id', pharmacyId)
    .single();

  if (error) {
    throw new AppError(`Failed to fetch document: ${error.message}`, 404);
  }

  // Transform data to include distributor name
  return {
    ...data,
    reverse_distributor_name: data.reverse_distributors?.name || null,
  };
};

export const deleteDocument = async (pharmacyId: string, documentId: string): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  const { error } = await db
    .from('uploaded_documents')
    .delete()
    .eq('id', documentId)
    .eq('pharmacy_id', pharmacyId);

  if (error) {
    throw new AppError(`Failed to delete document: ${error.message}`, 400);
  }
};

export interface CreateDocumentInput {
  pharmacy_id: string;
  file_name: string;
  file_size: number;
  file_type?: string;
  file_url?: string;
  reverse_distributor_id?: string;
  source?: 'manual_upload' | 'email_forward' | 'portal_fetch' | 'api';
  extracted_items?: number;
  total_credit_amount?: number;
  status?: 'uploading' | 'processing' | 'completed' | 'failed' | 'needs_review';
  report_date?: string; // Date of the return report (YYYY-MM-DD format)
}

export interface UploadFileToStorageInput {
  fileBuffer: Buffer;
  fileName: string;
  pharmacyId: string;
  fileType?: string;
}

export const uploadFileToStorage = async (
  input: UploadFileToStorageInput
): Promise<string> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(input.pharmacyId);

  const storage = supabaseAdmin.storage;
  const bucketName = 'documents'; // Storage bucket name

  // Generate a unique file path: pharmacy_id/timestamp-filename
  const timestamp = Date.now();
  const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${input.pharmacyId}/${timestamp}-${sanitizedFileName}`;

  // Upload file to Supabase Storage
  const { data, error } = await storage.from(bucketName).upload(filePath, input.fileBuffer, {
    contentType: input.fileType || 'application/pdf',
    upsert: false, // Don't overwrite existing files
  });

  if (error) {
    throw new AppError(`Failed to upload file to storage: ${error.message}`, 400);
  }

  // Get public URL for the uploaded file
  const { data: urlData } = storage.from(bucketName).getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new AppError('Failed to get public URL for uploaded file', 500);
  }

  return urlData.publicUrl;
};

export const createDocument = async (input: CreateDocumentInput): Promise<UploadedDocument> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(input.pharmacy_id);

  const db = supabaseAdmin;

  const documentData = {
    pharmacy_id: input.pharmacy_id,
    file_name: input.file_name,
    file_size: input.file_size,
    file_type: input.file_type || 'application/pdf',
    file_url: input.file_url,
    reverse_distributor_id: input.reverse_distributor_id,
    source: input.source || 'manual_upload',
    status: input.status || 'completed',
    extracted_items: input.extracted_items || 0,
    total_credit_amount: input.total_credit_amount,
    report_date: input.report_date, // Save report date from extracted data
    processed_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from('uploaded_documents')
    .insert(documentData)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to create document: ${error.message}`, 400);
  }

  return data;
};

/**
 * Download file from Supabase Storage
 */
export const downloadFileFromStorage = async (
  pharmacyId: string,
  documentId: string
): Promise<{ buffer: Buffer; fileName: string; contentType: string }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;
  const storage = supabaseAdmin.storage;
  const bucketName = 'documents';

  // First, get document info to verify ownership and get file path
  const { data: document, error: docError } = await db
    .from('uploaded_documents')
    .select('id, file_name, file_url, file_type, pharmacy_id')
    .eq('id', documentId)
    .eq('pharmacy_id', pharmacyId)
    .single();

  if (docError || !document) {
    throw new AppError('Document not found', 404);
  }

  if (!document.file_url) {
    throw new AppError('File URL not found for this document', 404);
  }

  // Extract file path from URL
  // URL format: https://[project].supabase.co/storage/v1/object/public/documents/[pharmacyId]/[timestamp]-[filename]
  // Or: https://[project].supabase.co/storage/v1/object/sign/documents/[path]?token=...
  let filePath: string;
  
  try {
    const url = new URL(document.file_url);
    const pathParts = url.pathname.split('/');
    const documentsIndex = pathParts.findIndex((part: string) => part === 'documents');
    
    if (documentsIndex === -1 || documentsIndex === pathParts.length - 1) {
      throw new AppError('Invalid file URL format', 400);
    }
    
    // Get path after 'documents' folder
    filePath = pathParts.slice(documentsIndex + 1).join('/');
  } catch (error) {
    // If URL parsing fails, try simple string extraction
    const urlParts = document.file_url.split('/');
    const pathIndex = urlParts.findIndex((part: string) => part === 'documents');
    if (pathIndex === -1 || pathIndex === urlParts.length - 1) {
      throw new AppError('Invalid file URL format', 400);
    }
    filePath = urlParts.slice(pathIndex + 1).join('/');
    // Remove query parameters if any
    filePath = filePath.split('?')[0];
  }

  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await storage
    .from(bucketName)
    .download(filePath);

  if (downloadError || !fileData) {
    throw new AppError(`Failed to download file: ${downloadError?.message || 'Unknown error'}`, 400);
  }

  // Convert Blob to Buffer
  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    fileName: document.file_name,
    contentType: document.file_type || 'application/pdf',
  };
};

