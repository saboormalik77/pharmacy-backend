export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export interface FileValidationOptions {
  allowedTypes?: string[];
  maxSizeBytes?: number;
  allowedExtensions?: string[];
}
