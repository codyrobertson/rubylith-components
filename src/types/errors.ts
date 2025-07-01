export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationError {
  code: string;
  message: string;
  details: ValidationErrorDetail[];
}

export interface ApiErrorResponse {
  error: ValidationError | string;
}

export interface ErrorOptions {
  code?: string;
  details?: ValidationErrorDetail[];
}