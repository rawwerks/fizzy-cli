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
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * ETag value for conditional requests (If-None-Match)
   */
  etag?: string;
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

  constructor(options: ClientOptions) {
    this.auth = options.auth;
    this.accountSlug = options.accountSlug;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.userAgent = options.userAgent ?? 'fizzy-cli';
    this.cache = new Map();
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
   * Make an API request
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, etag } = options;

    const url = this.buildUrl(path);

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

    // Add Content-Type for requests with body
    if (body !== undefined) {
      requestHeaders['Content-Type'] = 'application/json; charset=utf-8';
    }

    // Add If-None-Match header for ETag caching
    const etagToUse = etag ?? cachedEntry?.etag;
    if (etagToUse) {
      requestHeaders['If-None-Match'] = etagToUse;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

    // Handle error responses
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    // Handle empty responses (201 Created, 204 No Content)
    const contentLength = response.headers.get('Content-Length');
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
      data = await response.json() as T;
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
   */
  async get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
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
}

/**
 * Create a new Fizzy client
 */
export function createClient(options: ClientOptions): FizzyClient {
  return new FizzyClient(options);
}
