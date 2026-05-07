import { supabaseAdmin } from '../config/supabase';
import { AppError } from './appError';

/**
 * Upload image to Supabase Storage for marketplace deals
 * @param fileBuffer - The image file buffer
 * @param fileName - Original file name
 * @param fileType - MIME type of the image
 * @returns Public URL of the uploaded image
 */
export const uploadImageToStorage = async (
  fileBuffer: Buffer,
  fileName: string,
  fileType: string
): Promise<string> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const storage = supabaseAdmin.storage;
  const bucketName = 'marketplace-images'; // Storage bucket name for marketplace images

  // Generate a unique file path: marketplace/timestamp-filename
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileExtension = fileName.split('.').pop() || 'jpg';
  const filePath = `marketplace/${timestamp}-${sanitizedFileName}`;

  // Upload file to Supabase Storage
  const { data, error } = await storage.from(bucketName).upload(filePath, fileBuffer, {
    contentType: fileType,
    upsert: false, // Don't overwrite existing files
  });

  if (error) {
    // If bucket doesn't exist, try to create it (this might fail if user doesn't have permissions)
    if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
      throw new AppError(
        `Storage bucket '${bucketName}' not found. Please create it in Supabase Storage settings.`,
        500
      );
    }
    throw new AppError(`Failed to upload image to storage: ${error.message}`, 400);
  }

  // Get public URL for the uploaded file
  const { data: urlData } = storage.from(bucketName).getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new AppError('Failed to get public URL for uploaded image', 500);
  }

  return urlData.publicUrl;
};
