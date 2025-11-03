/**
 * API Response Types
 * Standard response formats for all API endpoints
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMetadata;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  metadata: ResponseMetadata & {
    pagination: PaginationMetadata;
  };
}

/**
 * Common API error codes
 */
export enum ApiErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // External services
  SUPABASE_ERROR = 'SUPABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
}

/**
 * Helper functions for creating API responses
 */
export const ApiResponseHelper = {
  success: <T>(data: T, metadata?: Partial<ResponseMetadata>): ApiResponse<T> => ({
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  }),

  error: (
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): ApiResponse => ({
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  }),

  paginated: <T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<T> => ({
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        limit,
        total,
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    },
  }),
};
