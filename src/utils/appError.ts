export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  code?: string; // Optional error code for specific error types (e.g., TOKEN_EXPIRED, TOKEN_INVALID)

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    if (code) {
      this.code = code;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

