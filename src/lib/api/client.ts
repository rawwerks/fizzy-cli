/**
 * Fizzy API Client
 *
 * HTTP client for the Fizzy API with:
 * - Bearer token OR session cookie authentication
 * - Account slug in URL path
 * - JSON content type handling
 * - ETag caching support
 * - Link header pagination support
 */

import {
  ApiError,
  RateLimitError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from './errors.js';
import { parseLinkHeader, PaginationLinks, PaginatedResponse } from './pagination.js';

const DEFAULT_BASE_URL = 'https://app.fizzy.do';

export type AuthMethod =
  | { type: 'bearer'; token: string }
  | { type: 'session'; token: string };

export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number;
  /**
   * Initial delay in milliseconds (default: 1000)
   */
  initialDelay?: number;
  /**
   * Maximum delay in milliseconds (default: 32000)
   */
  maxDelay?: number;
  /**
   * Backoff multiplier (default: 2 for exponential backoff)
   */
  backoffFactor?: number;
}

export interface ClientOptions {
  /**
   * Authentication method: Bearer token or session cookie
   */
  auth: AuthMethod;
  /**
   * Account slug for URL path (e.g., /:account_slug/boards)
   */
  accountSlug: string;
  /**
   * Base URL for the API (default: https://app.fizzy.do)
   */
  baseUrl?: string;
  /**
   * User-Agent header
   */
  userAgent?: string;
  /**
   * Retry configuration for rate limiting and transient errors
   */
  retry?: RetryOptions;
  /**
   * Request timeout in milliseconds (default: 30000 / 30 seconds)
   */
  timeout?: number;
}

export interface PaginationOptions {
  /**
   * Page number (1-indexed)
   */
  page?: number;
  /**
   * Number of items per page
   */
  perPage?: number;
  /**
   * Fetch all pages automatically (ignores page and perPage)
   */
  all?: boolean;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * ETag value for conditional requests (If-None-Match)
   */
  etag?: string;
  /**
   * FormData for multipart/form-data requests
   */
  formData?: FormData;
  /**
   * Pagination options for GET requests
   */
  pagination?: PaginationOptions;
}

export interface ApiResponse<T> {
  data: T;
  headers: Headers;
  status: number;
  /**
   * ETag value from response for caching
   */
  etag?: string;
}

/**
 * In-memory ETag cache
 */
interface CacheEntry {
  etag: string;
  data: unknown;
  timestamp: number;
}

export class FizzyClient {
  private readonly auth: AuthMethod;
  private readonly accountSlug: string;
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly cache: Map<string, CacheEntry>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly retryConfig: Required<RetryOptions>;

  constructor(options: ClientOptions) {
    this.auth = options.auth;
    this.accountSlug = options.accountSlug;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.userAgent = options.userAgent ?? 'fizzy-cli';
    this.cache = new Map();

    // Merge retry options with defaults and environment variables
    const envMaxRetries = process.env.FIZZY_MAX_RETRIES
      ? parseInt(process.env.FIZZY_MAX_RETRIES, 10)
      : undefined;
    const envRetryDelay = process.env.FIZZY_RETRY_DELAY
      ? parseInt(process.env.FIZZY_RETRY_DELAY, 10)
      : undefined;

    this.retryConfig = {
      maxRetries: options.retry?.maxRetries ?? envMaxRetries ?? 3,
      initialDelay: options.retry?.initialDelay ?? envRetryDelay ?? 1000,
      maxDelay: options.retry?.maxDelay ?? 32000,
      backoffFactor: options.retry?.backoffFactor ?? 2,
    };
  }

  /**
   * Build the full URL for an API request
   */
  private buildUrl(path: string): string {
    // If it's already a full URL (e.g., from pagination), use it directly
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // If path already starts with account slug (e.g., from Location header), use it directly
    if (path.startsWith(`/${this.accountSlug}/`) || path.startsWith(`${this.accountSlug}/`)) {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `${this.baseUrl}/${cleanPath}`;
    }

    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    // Special handling for /my/* endpoints which don't require account slug
    if (cleanPath.startsWith('my/')) {
      return `${this.baseUrl}/${cleanPath}`;
    }

    return `${this.baseUrl}/${this.accountSlug}/${cleanPath}`;
  }

  /**
   * Get cached response if available and not stale
   */
  private getCached(url: string): CacheEntry | undefined {
    const cached = this.cache.get(url);
    if (!cached) {
      return undefined;
    }

    // Check if cache is stale
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(url);
      return undefined;
    }

    return cached;
  }

  /**
   * Store response in cache
   */
  private setCache(url: string, etag: string, data: unknown): void {
    this.cache.set(url, {
      etag,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(
    attempt: number,
    retryAfter: string | null
  ): number {
    // Use Retry-After header if present
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }

    // Exponential backoff with jitter
    const exponentialDelay =
      this.retryConfig.initialDelay *
      Math.pow(this.retryConfig.backoffFactor, attempt);
    const jitter = Math.random() * exponentialDelay * 0.1;
    const delay = Math.min(
      exponentialDelay + jitter,
      this.retryConfig.maxDelay
    );

    return delay;
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(status: number): boolean {
    // Don't retry auth errors or client errors
    if (status === 401 || status === 403 || status === 404 || status === 422) {
      return false;
    }
    // Retry rate limits and server errors
    if (status === 429 || (status >= 500 && status < 600)) {
      return true;
    }
    return false;
  }

  /**
   * Make an API request
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, etag, formData, pagination } = options;

    // Build URL with pagination query parameters
    let url = this.buildUrl(path);

    // Add pagination query parameters for GET requests
    if (method === 'GET' && pagination && !pagination.all) {
      const urlObj = new URL(url);
      if (pagination.page) {
        urlObj.searchParams.set('page', String(pagination.page));
      }
      if (pagination.perPage) {
        urlObj.searchParams.set('per_page', String(pagination.perPage));
      }
      url = urlObj.toString();
    }

    // Check cache for GET requests
    let cachedEntry: CacheEntry | undefined;
    if (method === 'GET') {
      cachedEntry = this.getCached(url);
    }

    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': this.userAgent,
      ...headers,
    };

    // Add authentication header or cookie
    if (this.auth.type === 'bearer') {
      requestHeaders['Authorization'] = `Bearer ${this.auth.token}`;
    } else {
      requestHeaders['Cookie'] = `session_token=${this.auth.token}`;
    }

    // Add Content-Type for requests with body (but not for FormData - fetch handles that automatically)
    if (body !== undefined && !formData) {
      requestHeaders['Content-Type'] = 'application/json; charset=utf-8';
    }

    // Add If-None-Match header for ETag caching
    const etagToUse = etag ?? cachedEntry?.etag;
    if (etagToUse) {
      requestHeaders['If-None-Match'] = etagToUse;
    }

    let lastError: Error | null = null;

    // Retry loop
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
        });

        // Handle 304 Not Modified - return cached data
        if (response.status === 304 && cachedEntry) {
          return {
            data: cachedEntry.data as T,
            headers: response.headers,
            status: 304,
            etag: cachedEntry.etag,
          };
        }

        // Handle retryable errors (429, 5xx)
        if (!response.ok && this.isRetryableError(response.status)) {
          if (attempt >= this.retryConfig.maxRetries) {
            // Last attempt, throw the error
            await this.handleErrorResponse(response);
          }

          // Calculate delay and retry
          const delay = this.calculateRetryDelay(
            attempt,
            response.headers.get('Retry-After')
          );

          if (response.status === 429) {
            console.error(
              `Rate limited. Retrying in ${(delay / 1000).toFixed(1)}s... (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`
            );
          } else if (response.status >= 500) {
            console.error(
              `Server error (${response.status}). Retrying in ${(delay / 1000).toFixed(1)}s... (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`
            );
          }

          await this.sleep(delay);
          continue;
        }

        // Handle non-retryable error responses
        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        // Handle empty responses (201 Created, 204 No Content)
        const contentLength = response.headers.get('Content-Length');
        const contentType = response.headers.get('Content-Type');
        let data: T;

        if (contentLength === '0' || response.status === 204) {
          // For 201 with Location header, fetch the created resource
          const location = response.headers.get('Location');
          if (response.status === 201 && location) {
            // Follow Location header to get created resource
            const createdResponse = await this.get<T>(location);
            data = createdResponse;
          } else {
            data = null as T;
          }
        } else {
          // Check if response body is empty before parsing JSON
          const text = await response.text();
          if (!text || text.trim() === '') {
            data = null as T;
          } else {
            try {
              data = JSON.parse(text) as T;
            } catch (error) {
              throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}. Response body: ${text.substring(0, 200)}`);
            }
          }
        }

        // Store in cache if ETag is present
        const responseEtag = response.headers.get('ETag');
        if (method === 'GET' && responseEtag) {
          this.setCache(url, responseEtag, data);
        }

        return {
          data,
          headers: response.headers,
          status: response.status,
          etag: responseEtag ?? undefined,
        };
      } catch (error) {
        lastError = error as Error;

        // Don't retry auth errors or client errors (non-retryable ApiErrors)
        if (
          error instanceof AuthenticationError ||
          error instanceof NotFoundError ||
          error instanceof ValidationError ||
          (error instanceof ApiError && !this.isRetryableError(error.status))
        ) {
          throw error;
        }

        // Check if we've exhausted retries
        if (attempt >= this.retryConfig.maxRetries) {
          throw error;
        }

        // Retry network errors
        const delay = this.calculateRetryDelay(attempt, null);
        console.error(
          `Network error. Retrying in ${(delay / 1000).toFixed(1)}s... (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`
        );
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Handle error responses and throw appropriate errors
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      // Response may not be JSON
      responseBody = await response.text().catch(() => null);
    }

    // Extract error message from response body if available
    const rawMessage = typeof responseBody === 'object' && responseBody !== null
      ? (responseBody as Record<string, unknown>).error as string ?? response.statusText
      : response.statusText;

    switch (response.status) {
      case 400:
        throw new ApiError(400, 'Bad Request: Invalid parameters provided', responseBody);

      case 401:
        throw new AuthenticationError('Unauthorized: Authentication failed or session expired', responseBody);

      case 404:
        throw new NotFoundError('Not Found: The requested resource does not exist', responseBody);

      case 422:
        throw new ValidationError(
          `Validation failed: ${rawMessage}`,
          typeof responseBody === 'object' ? responseBody as Record<string, unknown> : undefined,
          responseBody
        );

      case 429: {
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        throw new RateLimitError(
          'Rate limit exceeded. Please wait before making more requests.',
          retryAfterSeconds,
          responseBody
        );
      }

      default:
        throw new ApiError(response.status, `Request failed (${response.status}): ${rawMessage}`, responseBody);
    }
  }

  /**
   * GET request helper
   * If pagination.all is true, fetches all pages and returns as array
   */
  async get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    // If --all flag is set, fetch all pages
    if (options?.pagination?.all) {
      // Remove pagination from options to avoid conflicts in getAll
      const { pagination, ...restOptions } = options;
      return this.getAll<T extends Array<infer U> ? U : T>(path, restOptions) as Promise<T>;
    }

    const response = await this.request<T>(path, { ...options, method: 'GET' });
    return response.data;
  }

  /**
   * GET request with full response (including headers and ETag)
   */
  async getWithResponse<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * GET request with pagination support
   */
  async getPaginated<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<PaginatedResponse<T>> {
    const response = await this.request<T>(path, { ...options, method: 'GET' });
    const linkHeader = response.headers.get('Link');
    const links = parseLinkHeader(linkHeader);

    return {
      data: response.data,
      pagination: {
        links,
        hasNext: !!links.next,
        hasPrev: !!links.prev,
      },
    };
  }

  /**
   * Async generator to iterate through all pages
   */
  async *getAllPages<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): AsyncGenerator<T, void, unknown> {
    let currentPath: string | undefined = path;

    while (currentPath) {
      const response: PaginatedResponse<T[]> = await this.getPaginated<T[]>(currentPath, options);

      for (const item of response.data) {
        yield item;
      }

      currentPath = response.pagination.links.next;
    }
  }

  /**
   * Fetch all pages and return as a single array
   * @param path API path
   * @param limitOrOptions Either a number (max items) or RequestOptions
   */
  async getAll<T>(path: string, limitOrOptions?: number | Omit<RequestOptions, 'method' | 'body'>): Promise<T[]> {
    const limit = typeof limitOrOptions === 'number' ? limitOrOptions : undefined;
    const options = typeof limitOrOptions === 'object' ? limitOrOptions : undefined;

    const items: T[] = [];
    for await (const item of this.getAllPages<T>(path, options)) {
      items.push(item);
      if (limit && items.length >= limit) {
        return items.slice(0, limit);
      }
    }
    return items;
  }

  /**
   * POST request helper
   */
  async post<T>(path: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const response = await this.request<T>(path, { ...options, method: 'POST', body });
    return response.data;
  }

  /**
   * PUT request helper
   */
  async put<T>(path: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const response = await this.request<T>(path, { ...options, method: 'PUT', body });
    return response.data;
  }

  /**
   * DELETE request helper
   */
  async delete<T = void>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const response = await this.request<T>(path, { ...options, method: 'DELETE' });
    return response.data;
  }

  /**
   * Get the account slug
   */
  getAccountSlug(): string {
    return this.accountSlug;
  }

  /**
   * Clear the ETag cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Upload a file with multipart/form-data
   * @param path API path
   * @param filePath Path to the file to upload
   * @param fieldName Form field name (e.g., 'image', 'avatar')
   * @param additionalFields Additional form fields to include
   * @param method HTTP method (POST or PUT)
   */
  async uploadFile<T>(
    path: string,
    filePath: string,
    fieldName: string,
    additionalFields?: Record<string, unknown>,
    method: 'POST' | 'PUT' = 'POST'
  ): Promise<T> {
    const fs = await import('fs/promises');

    // Read the file
    const fileBuffer = await fs.readFile(filePath);
    const fileName = filePath.split('/').pop() || 'file';

    // Determine MIME type from file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream';

    // Create FormData
    const formData = new FormData();

    // Add the file
    const blob = new Blob([fileBuffer], { type: contentType });
    formData.append(fieldName, blob, fileName);

    // Add additional fields if provided
    if (additionalFields) {
      for (const [key, value] of Object.entries(additionalFields)) {
        if (typeof value === 'object' && value !== null) {
          // For nested objects, we need to flatten them with Rails parameter syntax
          for (const [nestedKey, nestedValue] of Object.entries(value)) {
            formData.append(`${key}[${nestedKey}]`, String(nestedValue));
          }
        } else {
          formData.append(key, String(value));
        }
      }
    }

    const response = await this.request<T>(path, { method, formData });
    return response.data;
  }
}

/**
 * Create a new Fizzy client
 */
export function createClient(options: ClientOptions): FizzyClient {
  return new FizzyClient(options);
}
