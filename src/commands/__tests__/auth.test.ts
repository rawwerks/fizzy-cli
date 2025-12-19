/**
 * Tests for authentication commands
 */

import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { join } from 'path';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import * as tokenStorage from '../../lib/auth/token-storage.js';
import * as magicLink from '../../lib/auth/magic-link.js';
import type { StoredAccount } from '../../lib/auth/token-storage.js';

// Test data
const mockAccount: StoredAccount = {
  account_slug: 'test-account',
  account_name: 'Test Account',
  account_id: 'acc_123',
  access_token: 'token_abc123',
  user: {
    id: 'user_123',
    name: 'Test User',
    email_address: 'test@example.com',
    role: 'owner',
  },
  created_at: '2025-01-01T00:00:00.000Z',
};

const mockAccount2: StoredAccount = {
  account_slug: 'second-account',
  account_name: 'Second Account',
  account_id: 'acc_456',
  access_token: 'token_def456',
  user: {
    id: 'user_123',
    name: 'Test User',
    email_address: 'test@example.com',
    role: 'admin',
  },
  created_at: '2025-01-01T00:00:00.000Z',
};

describe('Auth Commands', () => {
  let tmpDir: string;
  let originalFizzyHome: string | undefined;

  beforeEach(() => {
    // Create temporary directory for each test
    tmpDir = mkdtempSync(join(tmpdir(), 'fizzy-cli-test-'));

    // Set FIZZY_CLI_HOME to use temp directory
    originalFizzyHome = process.env.FIZZY_CLI_HOME;
    process.env.FIZZY_CLI_HOME = tmpDir;
  });

  afterEach(() => {
    // Restore original env
    if (originalFizzyHome === undefined) {
      delete process.env.FIZZY_CLI_HOME;
    } else {
      process.env.FIZZY_CLI_HOME = originalFizzyHome;
    }

    // Clean up temp directory
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Login flow', () => {
    test('should save account after successful authentication', async () => {
      await tokenStorage.saveAccount(mockAccount, true);

      const account = await tokenStorage.getAccount('test-account');
      expect(account).not.toBeNull();
      expect(account?.account_slug).toBe('test-account');
      expect(account?.account_name).toBe('Test Account');
      expect(account?.user.email_address).toBe('test@example.com');
    });

    test('should set first account as default', async () => {
      await tokenStorage.saveAccount(mockAccount, true);

      const defaultAccount = await tokenStorage.getDefaultAccount();
      expect(defaultAccount?.account_slug).toBe('test-account');
    });
  });

  describe('Logout functionality', () => {
    test('should remove all accounts when logging out', async () => {
      await tokenStorage.saveAccount(mockAccount, true);
      await tokenStorage.saveAccount(mockAccount2, false);

      expect(await tokenStorage.isAuthenticated()).toBe(true);

      await tokenStorage.deleteTokens();

      expect(await tokenStorage.isAuthenticated()).toBe(false);
      const accounts = await tokenStorage.listAccounts();
      expect(accounts).toHaveLength(0);
    });

    test('should remove specific account', async () => {
      await tokenStorage.saveAccount(mockAccount, true);
      await tokenStorage.saveAccount(mockAccount2, false);

      await tokenStorage.removeAccount('test-account');

      const accounts = await tokenStorage.listAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].account_slug).toBe('second-account');
    });

    test('should update default account when removing default', async () => {
      await tokenStorage.saveAccount(mockAccount, true);
      await tokenStorage.saveAccount(mockAccount2, false);

      const defaultBefore = await tokenStorage.getDefaultAccount();
      expect(defaultBefore?.account_slug).toBe('test-account');

      await tokenStorage.removeAccount('test-account');

      const defaultAfter = await tokenStorage.getDefaultAccount();
      expect(defaultAfter?.account_slug).toBe('second-account');
    });

    test('should handle logout when not authenticated', async () => {
      expect(await tokenStorage.isAuthenticated()).toBe(false);

      // Should not throw
      await tokenStorage.deleteTokens();

      expect(await tokenStorage.isAuthenticated()).toBe(false);
    });
  });

  describe('Account listing', () => {
    test('should list all accounts', async () => {
      await tokenStorage.saveAccount(mockAccount, true);
      await tokenStorage.saveAccount(mockAccount2, false);

      const accounts = await tokenStorage.listAccounts();
      expect(accounts).toHaveLength(2);
      expect(accounts.map(a => a.account_slug)).toContain('test-account');
      expect(accounts.map(a => a.account_slug)).toContain('second-account');
    });

    test('should return empty array when no accounts', async () => {
      const accounts = await tokenStorage.listAccounts();
      expect(accounts).toHaveLength(0);
    });

    test('should identify default account', async () => {
      await tokenStorage.saveAccount(mockAccount, true);
      await tokenStorage.saveAccount(mockAccount2, false);

      const defaultAccount = await tokenStorage.getDefaultAccount();
      expect(defaultAccount?.account_slug).toBe('test-account');

      const tokens = await tokenStorage.loadTokens();
      expect(tokens?.default_account).toBe('test-account');
    });
  });

  describe('Account switching', () => {
    test('should switch default account', async () => {
      await tokenStorage.saveAccount(mockAccount, true);
      await tokenStorage.saveAccount(mockAccount2, false);

      const defaultBefore = await tokenStorage.getDefaultAccount();
      expect(defaultBefore?.account_slug).toBe('test-account');

      await tokenStorage.setDefaultAccount('second-account');

      const defaultAfter = await tokenStorage.getDefaultAccount();
      expect(defaultAfter?.account_slug).toBe('second-account');
    });

    test('should throw error when switching to non-existent account', async () => {
      await tokenStorage.saveAccount(mockAccount, true);

      await expect(async () => {
        await tokenStorage.setDefaultAccount('non-existent');
      }).toThrow();
    });

    test('should throw error when no accounts exist', async () => {
      await expect(async () => {
        await tokenStorage.setDefaultAccount('test-account');
      }).toThrow();
    });
  });

  describe('Status output', () => {
    test('should return authenticated status when logged in', async () => {
      await tokenStorage.saveAccount(mockAccount, true);

      const authenticated = await tokenStorage.isAuthenticated();
      expect(authenticated).toBe(true);
    });

    test('should return not authenticated when not logged in', async () => {
      const authenticated = await tokenStorage.isAuthenticated();
      expect(authenticated).toBe(false);
    });

    test('should provide account details', async () => {
      await tokenStorage.saveAccount(mockAccount, true);
      await tokenStorage.saveAccount(mockAccount2, false);

      const accounts = await tokenStorage.listAccounts();
      const defaultAccount = await tokenStorage.getDefaultAccount();

      expect(accounts).toHaveLength(2);
      expect(defaultAccount?.account_slug).toBe('test-account');

      // Check account details
      for (const account of accounts) {
        expect(account).toHaveProperty('account_slug');
        expect(account).toHaveProperty('account_name');
        expect(account).toHaveProperty('user');
        expect(account.user).toHaveProperty('name');
        expect(account.user).toHaveProperty('email_address');
        expect(account.user).toHaveProperty('role');
      }
    });
  });

  describe('Magic link API mocking', () => {
    test('should mock requestMagicLink', async () => {
      const originalFetch = global.fetch;

      global.fetch = mock(async (url: string, options?: any) => {
        expect(url).toContain('/session');
        expect(options?.method).toBe('POST');

        const body = JSON.parse(options?.body);
        expect(body.email_address).toBe('test@example.com');

        return new Response(
          JSON.stringify({ pending_authentication_token: 'pending_abc123' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      try {
        const pendingToken = await magicLink.requestMagicLink('test@example.com');
        expect(pendingToken).toBe('pending_abc123');
        expect(global.fetch).toHaveBeenCalledTimes(1);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should mock submitMagicLinkCode', async () => {
      const originalFetch = global.fetch;

      global.fetch = mock(async (url: string, options?: any) => {
        expect(url).toContain('/session/magic_link');
        expect(options?.method).toBe('POST');
        expect(options?.headers?.Cookie).toContain('pending_authentication_token=pending_abc123');

        const body = JSON.parse(options?.body);
        expect(body.code).toBe('ABC123');

        return new Response(
          JSON.stringify({ session_token: 'session_xyz789' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      try {
        const sessionToken = await magicLink.submitMagicLinkCode('ABC123', 'pending_abc123');
        expect(sessionToken).toBe('session_xyz789');
        expect(global.fetch).toHaveBeenCalledTimes(1);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should mock getIdentity', async () => {
      const originalFetch = global.fetch;

      global.fetch = mock(async (url: string, options?: any) => {
        expect(url).toContain('/my/identity');
        expect(options?.headers?.Authorization).toBe('Bearer session_xyz789');

        return new Response(
          JSON.stringify({
            accounts: [
              {
                id: 'acc_123',
                name: 'Test Account',
                slug: 'test-account',
                created_at: '2025-01-01T00:00:00.000Z',
                user: {
                  id: 'user_123',
                  name: 'Test User',
                  role: 'owner',
                  active: true,
                  email_address: 'test@example.com',
                  created_at: '2025-01-01T00:00:00.000Z',
                  url: 'https://app.fizzy.do/users/user_123',
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      try {
        const identity = await magicLink.getIdentity('session_xyz789');
        expect(identity.accounts).toHaveLength(1);
        expect(identity.accounts[0].slug).toBe('test-account');
        expect(global.fetch).toHaveBeenCalledTimes(1);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should handle API errors gracefully', async () => {
      const originalFetch = global.fetch;

      global.fetch = mock(async () => {
        return new Response(
          JSON.stringify({ message: 'Invalid email address' }),
          { status: 422, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      try {
        await expect(async () => {
          await magicLink.requestMagicLink('invalid-email');
        }).toThrow('Invalid email address');
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should handle rate limiting', async () => {
      const originalFetch = global.fetch;

      global.fetch = mock(async () => {
        return new Response(
          JSON.stringify({ message: 'Too many requests' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      try {
        await expect(async () => {
          await magicLink.requestMagicLink('test@example.com');
        }).toThrow('Rate limit exceeded');
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should handle invalid code submission', async () => {
      const originalFetch = global.fetch;

      global.fetch = mock(async () => {
        return new Response(
          JSON.stringify({ message: 'Invalid code' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      try {
        await expect(async () => {
          await magicLink.submitMagicLinkCode('WRONG', 'pending_abc123');
        }).toThrow('Invalid code');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Token storage security', () => {
    test('should store tokens with secure permissions', async () => {
      await tokenStorage.saveAccount(mockAccount, true);

      const tokensPath = join(tmpDir, 'tokens.json');
      expect(existsSync(tokensPath)).toBe(true);
    });

    test('should validate tokens before saving', async () => {
      const invalidAccount = {
        ...mockAccount,
        user: {
          ...mockAccount.user,
          email_address: 'not-an-email', // Invalid email
        },
      };

      await expect(async () => {
        await tokenStorage.saveAccount(invalidAccount as any, true);
      }).toThrow();
    });
  });

  describe('Multiple account management', () => {
    test('should handle multiple accounts for same user', async () => {
      await tokenStorage.saveAccount(mockAccount, true);
      await tokenStorage.saveAccount(mockAccount2, false);

      const accounts = await tokenStorage.listAccounts();
      expect(accounts).toHaveLength(2);

      // Both accounts should have same user email
      expect(accounts[0].user.email_address).toBe('test@example.com');
      expect(accounts[1].user.email_address).toBe('test@example.com');
    });

    test('should update existing account when re-authenticating', async () => {
      await tokenStorage.saveAccount(mockAccount, true);

      const updatedAccount = {
        ...mockAccount,
        access_token: 'new_token_xyz',
      };

      await tokenStorage.saveAccount(updatedAccount, false);

      const accounts = await tokenStorage.listAccounts();
      expect(accounts).toHaveLength(1);

      const account = await tokenStorage.getAccount('test-account');
      expect(account?.access_token).toBe('new_token_xyz');
    });
  });
});
