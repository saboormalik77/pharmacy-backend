/**
 * Inventory Upload Middleware
 * 
 * Handles file uploads for inventory analysis.
 * Supports CSV, TXT, and PDF files.
 */

import multer from 'multer';
import { Request } from 'express';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Allowed MIME types for inventory files
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'text/plain',
  'application/pdf',
  'application/vnd.ms-excel', // Some systems send CSV as this
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.csv', '.txt', '.pdf', '.xlsx'];

// File filter to only accept supported file types
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check MIME type
  const mimeTypeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
  
  // Check file extension
  const originalName = file.originalname.toLowerCase();
  const extensionAllowed = ALLOWED_EXTENSIONS.some(ext => originalName.endsWith(ext));
  
  if (mimeTypeAllowed || extensionAllowed) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: CSV, TXT, PDF`));
  }
};

// Configure multer
export const inventoryUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

