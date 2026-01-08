/**
 * Tests for API error classes
 *
 * Tests all error types, their properties, and serialization
 */

import { describe, test, expect } from 'bun:test';
import {
  ApiError,
  RateLimitError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '../errors.js';

describe('ApiError', () => {
  test('should create error with status and message', () => {
    const error = new ApiError(500, 'Internal server error');
    expect(error.status).toBe(500);
    expect(error.message).toBe('Internal server error');
    expect(error.name).toBe('ApiError');
    expect(error.responseBody).toBeUndefined();
  });

  test('should create error with response body', () => {
    const responseBody = { error: 'Something went wrong', details: [] };
    const error = new ApiError(400, 'Bad request', responseBody);
    expect(error.status).toBe(400);
    expect(error.responseBody).toEqual(responseBody);
  });

  test('should be instanceof Error', () => {
    const error = new ApiError(500, 'Error');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });

  test('should have stack trace', () => {
    const error = new ApiError(500, 'Error');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ApiError');
  });

  test('should serialize to JSON correctly', () => {
    const responseBody = { error: 'test' };
    const error = new ApiError(400, 'Bad request', responseBody);
    const json = error.toJSON();
    expect(json.name).toBe('ApiError');
    expect(json.message).toBe('Bad request');
    expect(json.status).toBe(400);
    expect(json.responseBody).toEqual(responseBody);
    expect(json.stack).toBeDefined();
  });
});

describe('RateLimitError', () => {
  test('should create rate limit error with status 429', () => {
    const error = new RateLimitError('Rate limit exceeded');
    expect(error.status).toBe(429);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.name).toBe('RateLimitError');
    expect(error.retryAfter).toBeUndefined();
  });

  test('should include retry after seconds', () => {
    const error = new RateLimitError('Rate limit exceeded', 60);
    expect(error.retryAfter).toBe(60);
  });

  test('should include response body', () => {
    const responseBody = { error: 'Too many requests' };
    const error = new RateLimitError('Rate limit exceeded', 30, responseBody);
    expect(error.responseBody).toEqual(responseBody);
  });

  test('should be instanceof ApiError', () => {
    const error = new RateLimitError('Error');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(RateLimitError);
  });

  test('should serialize to JSON with retryAfter', () => {
    const error = new RateLimitError('Rate limit exceeded', 45);
    const json = error.toJSON();
    expect(json.name).toBe('RateLimitError');
    expect(json.status).toBe(429);
    expect(json.retryAfter).toBe(45);
  });
});

describe('AuthenticationError', () => {
  test('should create auth error with status 401', () => {
    const error = new AuthenticationError();
    expect(error.status).toBe(401);
    expect(error.message).toBe('Authentication failed');
    expect(error.name).toBe('AuthenticationError');
  });

  test('should accept custom message', () => {
    const error = new AuthenticationError('Session expired');
    expect(error.message).toBe('Session expired');
  });

  test('should include response body', () => {
    const responseBody = { error: 'Invalid token' };
    const error = new AuthenticationError('Invalid token', responseBody);
    expect(error.responseBody).toEqual(responseBody);
  });

  test('should be instanceof ApiError', () => {
    const error = new AuthenticationError();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(AuthenticationError);
  });
});

describe('NotFoundError', () => {
  test('should create not found error with status 404', () => {
    const error = new NotFoundError();
    expect(error.status).toBe(404);
    expect(error.message).toBe('Resource not found');
    expect(error.name).toBe('NotFoundError');
  });

  test('should accept custom message', () => {
    const error = new NotFoundError('Card not found');
    expect(error.message).toBe('Card not found');
  });

  test('should include response body', () => {
    const responseBody = { error: 'Board does not exist' };
    const error = new NotFoundError('Not found', responseBody);
    expect(error.responseBody).toEqual(responseBody);
  });

  test('should be instanceof ApiError', () => {
    const error = new NotFoundError();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(NotFoundError);
  });
});

describe('ValidationError', () => {
  test('should create validation error with status 422', () => {
    const error = new ValidationError('Validation failed');
    expect(error.status).toBe(422);
    expect(error.message).toBe('Validation failed');
    expect(error.name).toBe('ValidationError');
    expect(error.validationDetails).toBeUndefined();
  });

  test('should include validation details', () => {
    const details = {
      title: ['cannot be blank'],
      description: ['is too short'],
    };
    const error = new ValidationError('Validation failed', details);
    expect(error.validationDetails).toEqual(details);
  });

  test('should include response body', () => {
    const details = { title: ['required'] };
    const responseBody = { error: 'Validation failed', errors: details };
    const error = new ValidationError('Validation failed', details, responseBody);
    expect(error.responseBody).toEqual(responseBody);
  });

  test('should be instanceof ApiError', () => {
    const error = new ValidationError('Error');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(ValidationError);
  });

  test('should serialize to JSON with validationDetails', () => {
    const details = { field: ['error message'] };
    const error = new ValidationError('Validation failed', details);
    const json = error.toJSON();
    expect(json.name).toBe('ValidationError');
    expect(json.status).toBe(422);
    expect(json.validationDetails).toEqual(details);
  });
});

describe('error type checking', () => {
  test('can distinguish error types', () => {
    const errors = [
      new ApiError(500, 'Server error'),
      new RateLimitError('Rate limited'),
      new AuthenticationError('Auth failed'),
      new NotFoundError('Not found'),
      new ValidationError('Invalid'),
    ];

    // All are ApiErrors
    expect(errors.every((e) => e instanceof ApiError)).toBe(true);

    // Only specific types
    expect(errors.filter((e) => e instanceof RateLimitError)).toHaveLength(1);
    expect(errors.filter((e) => e instanceof AuthenticationError)).toHaveLength(1);
    expect(errors.filter((e) => e instanceof NotFoundError)).toHaveLength(1);
    expect(errors.filter((e) => e instanceof ValidationError)).toHaveLength(1);
  });

  test('can catch by error type', () => {
    const throwAuth = () => {
      throw new AuthenticationError('Test');
    };

    try {
      throwAuth();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        expect(error.status).toBe(401);
      } else {
        throw new Error('Expected AuthenticationError');
      }
    }
  });
});
