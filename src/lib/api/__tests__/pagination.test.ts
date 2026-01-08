/**
 * Tests for pagination utilities
 *
 * Tests Link header parsing, pagination helpers, and async iterators
 */

import { describe, test, expect } from 'bun:test';
import {
  parseLinkHeader,
  getNextPageUrl,
  getPrevPageUrl,
  getPageFromUrl,
  createPaginatedResponse,
  paginateAll,
  fetchAllPages,
  type PaginationLinks,
} from '../pagination.js';

describe('parseLinkHeader', () => {
  test('should parse single next link', () => {
    const header = '<https://api.example.com/items?page=2>; rel="next"';
    const links = parseLinkHeader(header);
    expect(links.next).toBe('https://api.example.com/items?page=2');
    expect(links.prev).toBeUndefined();
  });

  test('should parse single prev link', () => {
    const header = '<https://api.example.com/items?page=1>; rel="prev"';
    const links = parseLinkHeader(header);
    expect(links.prev).toBe('https://api.example.com/items?page=1');
    expect(links.next).toBeUndefined();
  });

  test('should parse both next and prev links', () => {
    const header =
      '<https://api.example.com/items?page=2>; rel="next", <https://api.example.com/items?page=1>; rel="prev"';
    const links = parseLinkHeader(header);
    expect(links.next).toBe('https://api.example.com/items?page=2');
    expect(links.prev).toBe('https://api.example.com/items?page=1');
  });

  test('should parse all four link types', () => {
    const header = [
      '<https://api.example.com/items?page=1>; rel="first"',
      '<https://api.example.com/items?page=2>; rel="prev"',
      '<https://api.example.com/items?page=4>; rel="next"',
      '<https://api.example.com/items?page=10>; rel="last"',
    ].join(', ');
    const links = parseLinkHeader(header);
    expect(links.first).toBe('https://api.example.com/items?page=1');
    expect(links.prev).toBe('https://api.example.com/items?page=2');
    expect(links.next).toBe('https://api.example.com/items?page=4');
    expect(links.last).toBe('https://api.example.com/items?page=10');
  });

  test('should handle null header', () => {
    const links = parseLinkHeader(null);
    expect(links).toEqual({});
  });

  test('should handle undefined header', () => {
    const links = parseLinkHeader(undefined);
    expect(links).toEqual({});
  });

  test('should handle empty string header', () => {
    const links = parseLinkHeader('');
    expect(links).toEqual({});
  });

  test('should ignore unknown relation types', () => {
    const header = '<https://api.example.com/items>; rel="unknown"';
    const links = parseLinkHeader(header);
    expect(links).toEqual({});
  });

  test('should handle URLs with multiple query parameters', () => {
    const header = '<https://api.example.com/items?page=2&per_page=50&sort=created_at>; rel="next"';
    const links = parseLinkHeader(header);
    expect(links.next).toBe('https://api.example.com/items?page=2&per_page=50&sort=created_at');
  });

  test('should handle malformed link headers gracefully', () => {
    const header = 'not a valid link header';
    const links = parseLinkHeader(header);
    expect(links).toEqual({});
  });

  test('should handle extra whitespace', () => {
    const header = '  <https://api.example.com/items?page=2>  ;  rel="next"  ';
    const links = parseLinkHeader(header);
    expect(links.next).toBe('https://api.example.com/items?page=2');
  });
});

describe('getNextPageUrl', () => {
  test('should return next URL when present', () => {
    const links: PaginationLinks = {
      next: 'https://api.example.com/items?page=2',
    };
    expect(getNextPageUrl(links)).toBe('https://api.example.com/items?page=2');
  });

  test('should return undefined when next is not present', () => {
    const links: PaginationLinks = {};
    expect(getNextPageUrl(links)).toBeUndefined();
  });
});

describe('getPrevPageUrl', () => {
  test('should return prev URL when present', () => {
    const links: PaginationLinks = {
      prev: 'https://api.example.com/items?page=1',
    };
    expect(getPrevPageUrl(links)).toBe('https://api.example.com/items?page=1');
  });

  test('should return undefined when prev is not present', () => {
    const links: PaginationLinks = {};
    expect(getPrevPageUrl(links)).toBeUndefined();
  });
});

describe('getPageFromUrl', () => {
  test('should extract page number from URL', () => {
    expect(getPageFromUrl('https://api.example.com/items?page=3')).toBe(3);
  });

  test('should handle page=1', () => {
    expect(getPageFromUrl('https://api.example.com/items?page=1')).toBe(1);
  });

  test('should handle large page numbers', () => {
    expect(getPageFromUrl('https://api.example.com/items?page=999')).toBe(999);
  });

  test('should return undefined when page param is missing', () => {
    expect(getPageFromUrl('https://api.example.com/items')).toBeUndefined();
  });

  test('should return undefined for non-numeric page value', () => {
    expect(getPageFromUrl('https://api.example.com/items?page=abc')).toBeUndefined();
  });

  test('should return undefined for invalid URL', () => {
    expect(getPageFromUrl('not-a-valid-url')).toBeUndefined();
  });

  test('should handle URL with multiple query params', () => {
    expect(getPageFromUrl('https://api.example.com/items?sort=name&page=5&filter=active')).toBe(5);
  });
});

describe('createPaginatedResponse', () => {
  test('should create response with pagination info', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const linkHeader = '<https://api.example.com/items?page=2>; rel="next"';
    const response = createPaginatedResponse(data, linkHeader);

    expect(response.data).toEqual(data);
    expect(response.pagination.hasNext).toBe(true);
    expect(response.pagination.hasPrev).toBe(false);
    expect(response.pagination.links.next).toBe('https://api.example.com/items?page=2');
  });

  test('should handle null link header', () => {
    const data = [{ id: 1 }];
    const response = createPaginatedResponse(data, null);

    expect(response.data).toEqual(data);
    expect(response.pagination.hasNext).toBe(false);
    expect(response.pagination.hasPrev).toBe(false);
    expect(response.pagination.links).toEqual({});
  });

  test('should set hasPrev when prev link exists', () => {
    const data = [{ id: 1 }];
    const linkHeader = '<https://api.example.com/items?page=1>; rel="prev"';
    const response = createPaginatedResponse(data, linkHeader);

    expect(response.pagination.hasNext).toBe(false);
    expect(response.pagination.hasPrev).toBe(true);
  });

  test('should handle both next and prev links', () => {
    const data = [{ id: 1 }];
    const linkHeader = '<https://api.example.com/items?page=3>; rel="next", <https://api.example.com/items?page=1>; rel="prev"';
    const response = createPaginatedResponse(data, linkHeader);

    expect(response.pagination.hasNext).toBe(true);
    expect(response.pagination.hasPrev).toBe(true);
  });
});

describe('paginateAll', () => {
  test('should iterate through all pages', async () => {
    const pages = [
      { data: [1, 2], linkHeader: '<https://api.example.com?page=2>; rel="next"' },
      { data: [3, 4], linkHeader: '<https://api.example.com?page=3>; rel="next"' },
      { data: [5], linkHeader: null },
    ];

    let pageIndex = 0;
    const fetchFn = async (_url: string) => {
      const page = pages[pageIndex++];
      return { data: page.data, linkHeader: page.linkHeader };
    };

    const allPages: number[][] = [];
    for await (const page of paginateAll('https://api.example.com?page=1', fetchFn)) {
      allPages.push(page);
    }

    expect(allPages).toEqual([[1, 2], [3, 4], [5]]);
  });

  test('should handle single page', async () => {
    const fetchFn = async (_url: string) => ({
      data: [1, 2, 3],
      linkHeader: null,
    });

    const allPages: number[][] = [];
    for await (const page of paginateAll('https://api.example.com?page=1', fetchFn)) {
      allPages.push(page);
    }

    expect(allPages).toEqual([[1, 2, 3]]);
  });

  test('should handle empty first page', async () => {
    const fetchFn = async (_url: string) => ({
      data: [],
      linkHeader: null,
    });

    const allPages: unknown[][] = [];
    for await (const page of paginateAll('https://api.example.com?page=1', fetchFn)) {
      allPages.push(page);
    }

    expect(allPages).toEqual([[]]);
  });
});

describe('fetchAllPages', () => {
  test('should fetch and combine all pages', async () => {
    const pages = [
      { data: [{ id: 1 }, { id: 2 }], linkHeader: '<https://api.example.com?page=2>; rel="next"' },
      { data: [{ id: 3 }, { id: 4 }], linkHeader: '<https://api.example.com?page=3>; rel="next"' },
      { data: [{ id: 5 }], linkHeader: null },
    ];

    let pageIndex = 0;
    const fetchFn = async (_url: string) => {
      const page = pages[pageIndex++];
      return { data: page.data, linkHeader: page.linkHeader };
    };

    const allItems = await fetchAllPages('https://api.example.com?page=1', fetchFn);

    expect(allItems).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
  });

  test('should handle single page response', async () => {
    const fetchFn = async (_url: string) => ({
      data: [{ id: 1 }],
      linkHeader: null,
    });

    const allItems = await fetchAllPages('https://api.example.com?page=1', fetchFn);

    expect(allItems).toEqual([{ id: 1 }]);
  });

  test('should handle empty response', async () => {
    const fetchFn = async (_url: string) => ({
      data: [],
      linkHeader: null,
    });

    const allItems = await fetchAllPages('https://api.example.com?page=1', fetchFn);

    expect(allItems).toEqual([]);
  });
});

describe('pagination edge cases', () => {
  test('should handle URLs with encoded characters', () => {
    const header = '<https://api.example.com/items?filter=tag%3Dbug&page=2>; rel="next"';
    const links = parseLinkHeader(header);
    expect(links.next).toBe('https://api.example.com/items?filter=tag%3Dbug&page=2');
  });

  test('should handle URLs with fragments', () => {
    const url = 'https://api.example.com/items?page=3#section';
    expect(getPageFromUrl(url)).toBe(3);
  });

  test('should parse complex real-world Link headers', () => {
    // Real-world example from Fizzy API
    const header = '<https://app.fizzy.do/account/boards?page=2>; rel="next"';
    const links = parseLinkHeader(header);
    expect(links.next).toBe('https://app.fizzy.do/account/boards?page=2');
  });
});
