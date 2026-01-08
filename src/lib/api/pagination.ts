/**
 * Pagination utilities for Fizzy API
 *
 * Fizzy uses Link header pagination (RFC 5988)
 * Example Link header:
 * Link: <https://app.fizzy.do/account/boards?page=2>; rel="next"
 */

/**
 * Pagination links extracted from the Link header
 */
export interface PaginationLinks {
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T;
  pagination: {
    links: PaginationLinks;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse the Link header from an HTTP response
 *
 * @param linkHeader - The raw Link header value
 * @returns Parsed pagination links
 *
 * @example
 * ```typescript
 * const header = '<https://api.example.com/items?page=2>; rel="next", <https://api.example.com/items?page=1>; rel="prev"';
 * const links = parseLinkHeader(header);
 * // { next: 'https://api.example.com/items?page=2', prev: 'https://api.example.com/items?page=1' }
 * ```
 */
export function parseLinkHeader(linkHeader: string | null | undefined): PaginationLinks {
  if (!linkHeader) {
    return {};
  }

  const links: PaginationLinks = {};

  // Split by comma to get individual link entries
  const parts = linkHeader.split(',').map(part => part.trim());

  for (const part of parts) {
    // Match pattern: <URL>; rel="relation" (with optional whitespace)
    const match = part.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);

    if (match) {
      const [, url, rel] = match;

      // Only capture known pagination relations
      if (rel === 'next' || rel === 'prev' || rel === 'first' || rel === 'last') {
        links[rel] = url;
      }
    }
  }

  return links;
}

/**
 * Extract the next page URL from pagination links
 *
 * @param links - Pagination links object
 * @returns The next page URL, or undefined if there is no next page
 */
export function getNextPageUrl(links: PaginationLinks): string | undefined {
  return links.next;
}

/**
 * Extract the previous page URL from pagination links
 *
 * @param links - Pagination links object
 * @returns The previous page URL, or undefined if there is no previous page
 */
export function getPrevPageUrl(links: PaginationLinks): string | undefined {
  return links.prev;
}

/**
 * Extract page number from a URL
 *
 * @param url - The URL to parse
 * @returns The page number, or undefined if not found
 *
 * @example
 * ```typescript
 * const pageNum = getPageFromUrl('https://api.example.com/items?page=3');
 * // 3
 * ```
 */
export function getPageFromUrl(url: string): number | undefined {
  try {
    const urlObj = new URL(url);
    const pageParam = urlObj.searchParams.get('page');

    if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      return isNaN(pageNum) ? undefined : pageNum;
    }

    return undefined;
  } catch {
    // Invalid URL
    return undefined;
  }
}

/**
 * Create a paginated response from data and Link header
 *
 * @param data - The response data
 * @param linkHeader - The Link header value from the response
 * @returns A PaginatedResponse object
 */
export function createPaginatedResponse<T>(
  data: T,
  linkHeader: string | null | undefined
): PaginatedResponse<T> {
  const links = parseLinkHeader(linkHeader);

  return {
    data,
    pagination: {
      links,
      hasNext: !!links.next,
      hasPrev: !!links.prev,
    },
  };
}

/**
 * Async generator for iterating through all pages of a paginated API
 *
 * @param initialUrl - The URL for the first page
 * @param fetchFn - Function to fetch a page and return both data and Link header
 * @yields Each page's data
 *
 * @example
 * ```typescript
 * async function fetchPage(url: string) {
 *   const response = await fetch(url);
 *   const data = await response.json();
 *   const linkHeader = response.headers.get('Link');
 *   return { data, linkHeader };
 * }
 *
 * for await (const page of paginateAll('/api/items', fetchPage)) {
 *   console.log('Page items:', page);
 * }
 * ```
 */
export async function* paginateAll<T>(
  initialUrl: string,
  fetchFn: (url: string) => Promise<{ data: T; linkHeader: string | null }>
): AsyncGenerator<T, void, unknown> {
  let currentUrl: string | undefined = initialUrl;

  while (currentUrl) {
    const { data, linkHeader } = await fetchFn(currentUrl);
    yield data;

    const links = parseLinkHeader(linkHeader);
    currentUrl = getNextPageUrl(links);
  }
}

/**
 * Fetch all pages and return as a single array
 *
 * @param initialUrl - The URL for the first page
 * @param fetchFn - Function to fetch a page and return both data and Link header
 * @returns Array of all items from all pages
 *
 * @example
 * ```typescript
 * async function fetchPage(url: string) {
 *   const response = await fetch(url);
 *   const data = await response.json();
 *   const linkHeader = response.headers.get('Link');
 *   return { data, linkHeader };
 * }
 *
 * const allItems = await fetchAllPages('/api/items', fetchPage);
 * ```
 */
export async function fetchAllPages<T>(
  initialUrl: string,
  fetchFn: (url: string) => Promise<{ data: T[]; linkHeader: string | null }>
): Promise<T[]> {
  const allItems: T[] = [];

  for await (const pageData of paginateAll(initialUrl, fetchFn)) {
    if (Array.isArray(pageData)) {
      allItems.push(...pageData);
    } else {
      // If data is not an array, push it as-is
      allItems.push(pageData as T);
    }
  }

  return allItems;
}
