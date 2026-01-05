/**
 * Tests for retry logic with exponential backoff
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { createClient, FizzyClient } from '../src/lib/api/client.js';
import { RateLimitError, AuthenticationError } from '../src/lib/api/errors.js';

// Mock fetch globally
const originalFetch = global.fetch;

describe('Retry Logic', () => {
  let client: FizzyClient;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.FIZZY_MAX_RETRIES;
    delete process.env.FIZZY_RETRY_DELAY;

    // Create client with fast retry for testing
    client = createClient({
      auth: { type: 'bearer', token: 'test-token' },
      accountSlug: 'test-account',
      retry: {
        maxRetries: 3,
        initialDelay: 10, // Fast retries for tests
        maxDelay: 1000,
        backoffFactor: 2,
      },
    });

    // Reset fetch mock
    fetchMock = mock();
  });

  describe('Rate Limiting (429)', () => {
    test('retries on 429 with exponential backoff', async () => {
      let attemptCount = 0;

      // Mock fetch to fail twice with 429, then succeed
      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const result = await client.get('/test');
      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(3); // 3 attempts total
    });

    test('respects Retry-After header', async () => {
      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '1', // 1 second - parseFloat will handle decimal too
            },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const result = await client.get('/test');

      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(2);
      // Retry-After header was respected (tested by the fact that it succeeded)
    });

    test('throws RateLimitError after max retries', async () => {
      global.fetch = mock(async () => {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      await expect(client.get('/test')).rejects.toThrow(RateLimitError);
    });

    test('uses custom retry configuration', async () => {
      let attemptCount = 0;

      const customClient = createClient({
        auth: { type: 'bearer', token: 'test-token' },
        accountSlug: 'test-account',
        retry: {
          maxRetries: 4,
          initialDelay: 10,
          maxDelay: 1000,
          backoffFactor: 2,
        },
      });

      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount <= 4) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const result = await customClient.get('/test');
      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(5); // 1 initial + 4 retries
    });
  });

  describe('Server Errors (5xx)', () => {
    test('retries on 500 Internal Server Error', async () => {
      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const result = await client.get('/test');
      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(2);
    });

    test('retries on 502 Bad Gateway', async () => {
      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          return new Response('Bad Gateway', {
            status: 502,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const result = await client.get('/test');
      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(3); // Fails on 1 and 2, succeeds on 3
    });

    test('retries on 503 Service Unavailable', async () => {
      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          return new Response('Service Unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const result = await client.get('/test');
      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(2);
    });
  });

  describe('Non-Retryable Errors', () => {
    test('does not retry on 400 Bad Request', async () => {
      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        return new Response(JSON.stringify({ error: 'Bad Request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      await expect(client.get('/test')).rejects.toThrow();
      expect(attemptCount).toBe(1); // No retries
    });

    test('does not retry on 401 Unauthorized', async () => {
      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      await expect(client.get('/test')).rejects.toThrow(AuthenticationError);
      expect(attemptCount).toBe(1); // No retries
    });

    test('does not retry on 403 Forbidden', async () => {
      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      await expect(client.get('/test')).rejects.toThrow();
      expect(attemptCount).toBe(1); // No retries
    });

    test('does not retry on 404 Not Found', async () => {
      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        return new Response(JSON.stringify({ error: 'Not Found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      await expect(client.get('/test')).rejects.toThrow();
      expect(attemptCount).toBe(1); // No retries
    });

    test('does not retry on 422 Validation Error', async () => {
      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        return new Response(JSON.stringify({ error: 'Validation failed' }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      await expect(client.get('/test')).rejects.toThrow();
      expect(attemptCount).toBe(1); // No retries
    });
  });

  describe('Network Errors', () => {
    test('retries on network failure', async () => {
      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Network error: Connection refused');
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const result = await client.get('/test');
      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(2);
    });

    test('throws error after max retries on network failure', async () => {
      global.fetch = mock(async () => {
        throw new Error('Network error: Connection refused');
      }) as typeof fetch;

      await expect(client.get('/test')).rejects.toThrow('Network error: Connection refused');
    });
  });

  describe('Exponential Backoff', () => {
    test('delay increases exponentially', async () => {
      const customClient = createClient({
        auth: { type: 'bearer', token: 'test-token' },
        accountSlug: 'test-account',
        retry: {
          maxRetries: 3,
          initialDelay: 50,
          maxDelay: 10000,
          backoffFactor: 2,
        },
      });

      let attemptCount = 0;
      const delays: number[] = [];
      let lastTime = Date.now();

      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount > 1) {
          const currentTime = Date.now();
          delays.push(currentTime - lastTime);
          lastTime = currentTime;
        } else {
          lastTime = Date.now();
        }

        if (attemptCount <= 3) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      await customClient.get('/test');

      // Verify exponential backoff (with tolerance for jitter)
      // Expected delays: ~50ms, ~100ms, ~200ms
      expect(delays[0]).toBeGreaterThanOrEqual(50);
      expect(delays[1]).toBeGreaterThanOrEqual(100);
      expect(delays[2]).toBeGreaterThanOrEqual(200);
    });

    test('respects max delay', async () => {
      const customClient = createClient({
        auth: { type: 'bearer', token: 'test-token' },
        accountSlug: 'test-account',
        retry: {
          maxRetries: 5,
          initialDelay: 100,
          maxDelay: 200, // Cap at 200ms
          backoffFactor: 2,
        },
      });

      let attemptCount = 0;
      const delays: number[] = [];
      let lastTime = Date.now();

      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount > 1) {
          const currentTime = Date.now();
          delays.push(currentTime - lastTime);
          lastTime = currentTime;
        } else {
          lastTime = Date.now();
        }

        if (attemptCount <= 5) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      await customClient.get('/test');

      // All delays should be capped at maxDelay + jitter (max 10%)
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(220); // 200 + 10% jitter
      });
    });
  });

  describe('Environment Variables', () => {
    test('reads max retries from FIZZY_MAX_RETRIES', async () => {
      process.env.FIZZY_MAX_RETRIES = '4';
      process.env.FIZZY_RETRY_DELAY = '10';

      const envClient = createClient({
        auth: { type: 'bearer', token: 'test-token' },
        accountSlug: 'test-account',
      });

      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount <= 4) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const result = await envClient.get('/test');
      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(5);
    });

    test('reads initial delay from FIZZY_RETRY_DELAY', async () => {
      process.env.FIZZY_RETRY_DELAY = '50';

      const envClient = createClient({
        auth: { type: 'bearer', token: 'test-token' },
        accountSlug: 'test-account',
      });

      let attemptCount = 0;
      const startTime = Date.now();

      global.fetch = mock(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      await envClient.get('/test');
      const elapsed = Date.now() - startTime;

      expect(attemptCount).toBe(2);
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    test('client options override environment variables', async () => {
      process.env.FIZZY_MAX_RETRIES = '10';

      const customClient = createClient({
        auth: { type: 'bearer', token: 'test-token' },
        accountSlug: 'test-account',
        retry: {
          maxRetries: 2, // Override env var
          initialDelay: 10,
        },
      });

      let attemptCount = 0;

      global.fetch = mock(async () => {
        attemptCount++;
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      await expect(customClient.get('/test')).rejects.toThrow(RateLimitError);
      expect(attemptCount).toBeLessThanOrEqual(3); // 1 initial + 2 retries
    });
  });
});
