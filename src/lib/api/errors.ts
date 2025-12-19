/**
 * Base class for all API errors
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly responseBody?: unknown;

  constructor(status: number, message: string, responseBody?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.responseBody = responseBody;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes the error for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      responseBody: this.responseBody,
      stack: this.stack,
    };
  }
}

/**
 * Error for 429 Rate Limit responses
 */
export class RateLimitError extends ApiError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, responseBody?: unknown) {
    super(429, message, responseBody);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Error for 401 Authentication failures
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed', responseBody?: unknown) {
    super(401, message, responseBody);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error for 404 Not Found responses
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', responseBody?: unknown) {
    super(404, message, responseBody);
    this.name = 'NotFoundError';
  }
}

/**
 * Error for 422 Validation failures
 */
export class ValidationError extends ApiError {
  public readonly validationDetails?: Record<string, unknown>;

  constructor(message: string, validationDetails?: Record<string, unknown>, responseBody?: unknown) {
    super(422, message, responseBody);
    this.name = 'ValidationError';
    this.validationDetails = validationDetails;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      validationDetails: this.validationDetails,
    };
  }
}
