import { getDefaultAccount, getAccount, isAuthenticated, listAccounts } from '../lib/auth/token-storage.js';
import type { StoredAccount } from '../lib/auth/token-storage.js';

/**
 * Auth middleware error
 */
export class AuthenticationRequiredError extends Error {
  constructor(message: string = 'Authentication required. Please run the login command first.') {
    super(message);
    this.name = 'AuthenticationRequiredError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Account selection error
 */
export class AccountSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountSelectionError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Options for requireAuth middleware
 */
export interface RequireAuthOptions {
  /**
   * Account slug to use (overrides auto-selection)
   */
  accountSlug?: string;

  /**
   * If true, throws error when multiple accounts exist but none is selected
   * If false, auto-selects default account
   */
  requireExplicitAccountSelection?: boolean;
}

/**
 * Authentication result
 */
export interface AuthResult {
  /**
   * The authenticated account
   */
  account: StoredAccount;

  /**
   * Authorization header value
   */
  authHeader: string;

  /**
   * Base URL for account-scoped API calls
   * Format: https://app.fizzy.do/{account_slug}
   */
  accountBaseUrl: string;
}

/**
 * Require authentication middleware
 * Checks for valid token and returns account information
 *
 * Usage in commands:
 * ```
 * const auth = await requireAuth({ accountSlug: options.account });
 * const response = await fetch(`${auth.accountBaseUrl}/boards`, {
 *   headers: { Authorization: auth.authHeader }
 * });
 * ```
 *
 * @param options - Authentication options
 * @returns Authentication result with account and headers
 * @throws AuthenticationRequiredError if not authenticated
 * @throws AccountSelectionError if account selection is ambiguous
 */
export async function requireAuth(options: RequireAuthOptions = {}): Promise<AuthResult> {
  // Check if user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    throw new AuthenticationRequiredError();
  }

  let account: StoredAccount | null = null;

  // If account slug is explicitly provided, use it
  if (options.accountSlug) {
    account = await getAccount(options.accountSlug);
    if (!account) {
      throw new AccountSelectionError(
        `Account "${options.accountSlug}" not found. Use the accounts command to list available accounts.`
      );
    }
  } else {
    // Auto-select account
    const accounts = await listAccounts();

    if (accounts.length === 0) {
      throw new AuthenticationRequiredError('No accounts found. Please login again.');
    }

    if (accounts.length === 1) {
      // Only one account - auto-select it
      account = accounts[0];
    } else {
      // Multiple accounts
      if (options.requireExplicitAccountSelection) {
        const accountList = accounts.map((a) => `  - ${a.account_slug} (${a.account_name})`).join('\n');
        throw new AccountSelectionError(
          `Multiple accounts found. Please specify which account to use with --account:\n${accountList}`
        );
      } else {
        // Use default account
        account = await getDefaultAccount();
        if (!account) {
          const accountList = accounts.map((a) => `  - ${a.account_slug} (${a.account_name})`).join('\n');
          throw new AccountSelectionError(
            `Multiple accounts found. Please specify which account to use with --account:\n${accountList}`
          );
        }
      }
    }
  }

  if (!account) {
    throw new AuthenticationRequiredError('Unable to determine account. Please login again.');
  }

  // Build the account base URL
  const baseUrl = process.env.FIZZY_BASE_URL || 'https://app.fizzy.do';
  const accountBaseUrl = `${baseUrl.replace(/\/$/, '')}/${account.account_slug}`;

  return {
    account,
    authHeader: `Bearer ${account.access_token}`,
    accountBaseUrl,
  };
}

/**
 * Check if user is authenticated (without throwing)
 *
 * @returns True if user has at least one stored account
 */
export async function checkAuth(): Promise<boolean> {
  return isAuthenticated();
}

/**
 * Get authentication header for a specific account
 *
 * @param accountSlug - Account slug (optional, uses default if not provided)
 * @returns Authorization header value
 * @throws AuthenticationRequiredError if not authenticated
 * @throws AccountSelectionError if account not found
 */
export async function getAuthHeader(accountSlug?: string): Promise<string> {
  const auth = await requireAuth({ accountSlug });
  return auth.authHeader;
}

/**
 * Get account base URL for API calls
 *
 * @param accountSlug - Account slug (optional, uses default if not provided)
 * @returns Base URL for account-scoped API calls
 * @throws AuthenticationRequiredError if not authenticated
 * @throws AccountSelectionError if account not found
 */
export async function getAccountBaseUrl(accountSlug?: string): Promise<string> {
  const auth = await requireAuth({ accountSlug });
  return auth.accountBaseUrl;
}
