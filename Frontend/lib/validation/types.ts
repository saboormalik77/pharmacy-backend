export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export interface FileValidationOptions {
  allowedTypes?: string[];   // e.g. ['image/jpeg', 'image/png', 'image/webp']
  maxSizeBytes?: number;     // e.g. 5 * 1024 * 1024 for 5MB
  allowedExtensions?: string[]; // e.g. ['.csv', '.xlsx']
}

export interface PasswordStrengthResult {
  score: number;             // 0-5
  level: 'weak' | 'medium' | 'strong';
  suggestions: string[];
}
