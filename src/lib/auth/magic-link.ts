import { z } from 'zod';
import { getBaseUrl } from './config.js';
import { saveAccount } from './token-storage.js';
import type { StoredAccount } from './token-storage.js';

/**
 * Magic link request response schema
 */
export const MagicLinkRequestResponseSchema = z.object({
  pending_authentication_token: z.string(),
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
 * @returns Pending authentication token to use in step 2
 */
export async function requestMagicLink(email: string): Promise<string> {
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
      throw new Error('Rate limit exceeded. Try again later.');
    }

    if (response.status === 422) {
      const message = errorInfo.success && errorInfo.data.message
        ? errorInfo.data.message
        : 'Invalid email address';
      throw new Error(message);
    }

    const message = errorInfo.success && (errorInfo.data.message || errorInfo.data.error)
      ? errorInfo.data.message || errorInfo.data.error
      : `Failed to request magic link: ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const parsed = MagicLinkRequestResponseSchema.parse(data);

  return parsed.pending_authentication_token;
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
        : 'Invalid code. Please check and try again.';
      throw new Error(message);
    }

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Try again in 15 minutes.');
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
 * @returns List of saved accounts
 */
export async function authenticateWithMagicLink(
  email: string,
  onCodeRequest: () => Promise<string>
): Promise<StoredAccount[]> {
  // Step 1: Request magic link
  const pendingToken = await requestMagicLink(email);

  // Step 2: Get code from user
  const code = await onCodeRequest();

  // Step 3: Submit code and get session token
  const sessionToken = await submitMagicLinkCode(code, pendingToken);

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

  return savedAccounts;
}
