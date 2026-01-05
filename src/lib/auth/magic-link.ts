import { z } from 'zod';
import { getBaseUrl } from './config.js';
import { saveAccount } from './token-storage.js';
import type { StoredAccount } from './token-storage.js';

/**
 * Magic link request response schema
 */
export const MagicLinkRequestResponseSchema = z.object({
  pending_authentication_token: z.string(),
  auth_url: z.string().optional(), // Optional auth URL for browser opening
});

/**
 * Magic link request response type
 */
export type MagicLinkRequestResponse = z.infer<typeof MagicLinkRequestResponseSchema>;

/**
 * Magic link submit response schema
 */
export const MagicLinkSubmitResponseSchema = z.object({
  session_token: z.string(),
});

/**
 * Magic link submit response type
 */
export type MagicLinkSubmitResponse = z.infer<typeof MagicLinkSubmitResponseSchema>;

/**
 * Account from identity response schema
 */
export const IdentityAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  created_at: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    role: z.enum(['owner', 'admin', 'member', 'system']),
    active: z.boolean(),
    email_address: z.string().email(),
    created_at: z.string(),
    url: z.string(),
  }),
});

/**
 * Account from identity response type
 */
export type IdentityAccount = z.infer<typeof IdentityAccountSchema>;

/**
 * Identity response schema
 */
export const IdentityResponseSchema = z.object({
  accounts: z.array(IdentityAccountSchema),
});

/**
 * Identity response type
 */
export type IdentityResponse = z.infer<typeof IdentityResponseSchema>;

/**
 * Error response schema from Fizzy API
 */
export const ApiErrorResponseSchema = z.object({
  message: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Step 1: Request a magic link
 * Sends an email with a 6-character code to the user
 *
 * @param email - User's email address
 * @returns Magic link request response with pending token and optional auth URL
 */
export async function requestMagicLink(email: string): Promise<MagicLinkRequestResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/session`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email_address: email }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorInfo = ApiErrorResponseSchema.safeParse(errorData);

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a few minutes.\n\nTip: Check your spam folder if you did not receive the email.');
    }

    if (response.status === 422) {
      const message = errorInfo.success && errorInfo.data.message
        ? errorInfo.data.message
        : 'Invalid email address. Please check and try again.';
      throw new Error(message);
    }

    const message = errorInfo.success && (errorInfo.data.message || errorInfo.data.error)
      ? errorInfo.data.message || errorInfo.data.error
      : `Failed to request magic link: ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const parsed = MagicLinkRequestResponseSchema.parse(data);

  return parsed;
}

/**
 * Step 2: Submit the magic link code
 * Exchanges the 6-character code for a session token
 *
 * @param code - 6-character code from email
 * @param pendingToken - Pending authentication token from step 1
 * @returns Session token for authenticated API calls
 */
export async function submitMagicLinkCode(code: string, pendingToken: string): Promise<string> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/session/magic_link`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: `pending_authentication_token=${pendingToken}`,
    },
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorInfo = ApiErrorResponseSchema.safeParse(errorData);

    if (response.status === 401) {
      const message = errorInfo.success && errorInfo.data.message
        ? errorInfo.data.message
        : 'Invalid code. Please check your email and try again.\n\nTip: Check your spam folder if you did not receive the email.';
      throw new Error(message);
    }

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in 15 minutes.\n\nIf you need help, contact Fizzy support.');
    }

    const message = errorInfo.success && (errorInfo.data.message || errorInfo.data.error)
      ? errorInfo.data.message || errorInfo.data.error
      : `Failed to verify code: ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const parsed = MagicLinkSubmitResponseSchema.parse(data);

  return parsed.session_token;
}

/**
 * Get user's identity and accounts using a session token
 *
 * @param sessionToken - Session token from magic link authentication
 * @returns Identity with list of accounts
 */
export async function getIdentity(sessionToken: string): Promise<IdentityResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/my/identity`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get identity: ${response.statusText}`);
  }

  const data = await response.json();
  return IdentityResponseSchema.parse(data);
}

/**
 * Check if authentication is complete by polling the identity endpoint
 * This can be used with a pending token to wait for user to complete auth
 *
 * @param pendingToken - Pending authentication token from requestMagicLink
 * @returns Session token if authenticated, null if not yet authenticated
 */
export async function checkAuthStatus(pendingToken: string): Promise<string | null> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/my/identity`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Cookie: `pending_authentication_token=${pendingToken}`,
      },
    });

    if (response.ok) {
      // Check if we got a session token in response headers
      const setCookie = response.headers.get('set-cookie');
      if (setCookie && setCookie.includes('session_token=')) {
        const match = setCookie.match(/session_token=([^;]+)/);
        if (match) {
          return match[1];
        }
      }
      // If no session token in headers, user hasn't completed auth yet
      return null;
    }

    // Not authenticated yet
    return null;
  } catch (error) {
    // Network error or other issue - treat as not authenticated
    return null;
  }
}

/**
 * Poll for authentication completion
 * Waits for user to complete authentication via magic link
 *
 * @param pendingToken - Pending authentication token from requestMagicLink
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 5 minutes)
 * @param intervalMs - Polling interval in milliseconds (default: 2 seconds)
 * @returns Session token when authentication is complete
 * @throws Error if authentication times out
 */
export async function pollForAuth(
  pendingToken: string,
  timeoutMs: number = 300000,
  intervalMs: number = 2000
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const sessionToken = await checkAuthStatus(pendingToken);

    if (sessionToken) {
      return sessionToken;
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    'Authentication timed out. Please try again.\n\n' +
    'If you are having trouble, make sure to:\n' +
    '  1. Check your email inbox (and spam folder)\n' +
    '  2. Click the magic link or enter the code\n' +
    '  3. Complete the authentication in your browser'
  );
}

/**
 * Complete magic link authentication flow
 * This is a convenience function that handles the full flow:
 * 1. Request magic link
 * 2. Prompt for code
 * 3. Submit code
 * 4. Get identity
 * 5. Save accounts
 *
 * @param email - User's email address
 * @param onCodeRequest - Callback to get the code from user
 * @returns Object containing saved accounts and magic link response
 */
export async function authenticateWithMagicLink(
  email: string,
  onCodeRequest: () => Promise<string>
): Promise<{ accounts: StoredAccount[]; magicLinkResponse: MagicLinkRequestResponse }> {
  // Step 1: Request magic link
  const magicLinkResponse = await requestMagicLink(email);

  // Step 2: Get code from user
  const code = await onCodeRequest();

  // Step 3: Submit code and get session token
  const sessionToken = await submitMagicLinkCode(code, magicLinkResponse.pending_authentication_token);

  // Step 4: Get identity and accounts
  const identity = await getIdentity(sessionToken);

  // Step 5: Save all accounts
  const savedAccounts: StoredAccount[] = [];

  for (const account of identity.accounts) {
    const storedAccount: StoredAccount = {
      account_slug: account.slug,
      account_name: account.name,
      account_id: account.id,
      access_token: sessionToken,
      user: {
        id: account.user.id,
        name: account.user.name,
        email_address: account.user.email_address,
        role: account.user.role,
      },
      created_at: new Date().toISOString(),
    };

    // Set first account as default
    await saveAccount(storedAccount, savedAccounts.length === 0);
    savedAccounts.push(storedAccount);
  }

  return { accounts: savedAccounts, magicLinkResponse };
}

/**
 * Save accounts from identity response
 *
 * @param sessionToken - Session token to use for accounts
 * @param identity - Identity response with accounts
 * @returns List of saved accounts
 */
export async function saveAccountsFromIdentity(
  sessionToken: string,
  identity: IdentityResponse
): Promise<StoredAccount[]> {
  const savedAccounts: StoredAccount[] = [];

  for (const account of identity.accounts) {
    const storedAccount: StoredAccount = {
      account_slug: account.slug,
      account_name: account.name,
      account_id: account.id,
      access_token: sessionToken,
      user: {
        id: account.user.id,
        name: account.user.name,
        email_address: account.user.email_address,
        role: account.user.role,
      },
      created_at: new Date().toISOString(),
    };

    // Set first account as default
    await saveAccount(storedAccount, savedAccounts.length === 0);
    savedAccounts.push(storedAccount);
  }

  return savedAccounts;
}
