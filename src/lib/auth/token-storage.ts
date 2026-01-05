import { z } from 'zod';
import { homedir } from 'os';
import { join } from 'path';
import { mkdir, readFile, writeFile, unlink, chmod } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * User information schema
 */
export const UserInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  email_address: z.string().email(),
  role: z.enum(['owner', 'admin', 'member', 'system']),
});

/**
 * User info type
 */
export type UserInfo = z.infer<typeof UserInfoSchema>;

/**
 * Stored account schema
 */
export const StoredAccountSchema = z.object({
  account_slug: z.string(),
  account_name: z.string(),
  account_id: z.string(),
  access_token: z.string(),
  user: UserInfoSchema,
  created_at: z.string().datetime(), // ISO 8601 timestamp when token was stored
});

/**
 * Stored account type
 */
export type StoredAccount = z.infer<typeof StoredAccountSchema>;

/**
 * Tokens file schema - stores multiple accounts
 */
export const TokensFileSchema = z.object({
  accounts: z.array(StoredAccountSchema),
  default_account: z.string().optional(), // slug of default account
});

/**
 * Tokens file type
 */
export type TokensFile = z.infer<typeof TokensFileSchema>;

/**
 * Get the tokens file path
 * Returns ~/.fizzy-cli/tokens.json (or FIZZY_CLI_HOME/tokens.json if set)
 */
export function getTokensPath(): string {
  const base = process.env.FIZZY_CLI_HOME || join(homedir(), '.fizzy-cli');
  return join(base, 'tokens.json');
}

/**
 * Load tokens from disk
 * Returns null if tokens file doesn't exist or is invalid
 */
export async function loadTokens(): Promise<TokensFile | null> {
  const tokensPath = getTokensPath();

  if (!existsSync(tokensPath)) {
    return null;
  }

  try {
    const data = await readFile(tokensPath, 'utf-8');

    // Parse JSON with better error handling
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (jsonError) {
      console.error(`Error: Your authentication file is corrupted (${tokensPath})`);
      console.error('Please run "fizzy auth login" to authenticate again.');
      return null;
    }

    // Validate schema
    try {
      return TokensFileSchema.parse(parsed);
    } catch (schemaError) {
      console.error(`Error: Your authentication file has an invalid format (${tokensPath})`);
      console.error('Please run "fizzy auth login" to authenticate again.');
      return null;
    }
  } catch (error) {
    // File read error (permissions, etc.)
    console.error(`Error reading authentication file: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Save tokens to disk with secure permissions
 * Creates parent directory if it doesn't exist
 */
export async function saveTokens(tokens: TokensFile): Promise<void> {
  const tokensPath = getTokensPath();
  const tokensDir = join(tokensPath, '..');

  // Create parent directory if it doesn't exist with 0o700 permissions
  if (!existsSync(tokensDir)) {
    await mkdir(tokensDir, { recursive: true, mode: 0o700 });
  }

  // Validate tokens before saving
  const validatedTokens = TokensFileSchema.parse(tokens);

  // Write tokens file
  await writeFile(tokensPath, JSON.stringify(validatedTokens, null, 2), 'utf-8');

  // Set secure file permissions (owner read/write only)
  await chmod(tokensPath, 0o600);
}

/**
 * Delete tokens file from disk
 */
export async function deleteTokens(): Promise<void> {
  const tokensPath = getTokensPath();

  if (existsSync(tokensPath)) {
    await unlink(tokensPath);
  }
}

/**
 * Add or update an account in the tokens file
 */
export async function saveAccount(account: StoredAccount, setAsDefault: boolean = false): Promise<void> {
  const tokens = (await loadTokens()) || { accounts: [] };

  // Remove existing account with same slug if it exists
  tokens.accounts = tokens.accounts.filter((a) => a.account_slug !== account.account_slug);

  // Add the new account
  tokens.accounts.push(account);

  // Set as default if requested or if it's the only account
  if (setAsDefault || tokens.accounts.length === 1) {
    tokens.default_account = account.account_slug;
  }

  await saveTokens(tokens);
}

/**
 * Get account by slug
 */
export async function getAccount(slug: string): Promise<StoredAccount | null> {
  const tokens = await loadTokens();
  if (!tokens) {
    return null;
  }

  return tokens.accounts.find((a) => a.account_slug === slug) || null;
}

/**
 * Get default account
 * Returns the default account if set, otherwise the first account
 */
export async function getDefaultAccount(): Promise<StoredAccount | null> {
  const tokens = await loadTokens();
  if (!tokens || tokens.accounts.length === 0) {
    return null;
  }

  if (tokens.default_account) {
    const defaultAccount = tokens.accounts.find((a) => a.account_slug === tokens.default_account);
    if (defaultAccount) {
      return defaultAccount;
    }
  }

  // Fallback to first account
  return tokens.accounts[0] || null;
}

/**
 * Set default account by slug
 */
export async function setDefaultAccount(slug: string): Promise<void> {
  const tokens = await loadTokens();
  if (!tokens) {
    throw new Error('No tokens file found');
  }

  const account = tokens.accounts.find((a) => a.account_slug === slug);
  if (!account) {
    throw new Error(`Account with slug "${slug}" not found`);
  }

  tokens.default_account = slug;
  await saveTokens(tokens);
}

/**
 * List all stored accounts
 */
export async function listAccounts(): Promise<StoredAccount[]> {
  const tokens = await loadTokens();
  return tokens?.accounts || [];
}

/**
 * Remove an account by slug
 */
export async function removeAccount(slug: string): Promise<void> {
  const tokens = await loadTokens();
  if (!tokens) {
    return;
  }

  tokens.accounts = tokens.accounts.filter((a) => a.account_slug !== slug);

  // Clear default if it was the removed account
  if (tokens.default_account === slug) {
    tokens.default_account = tokens.accounts.length > 0 ? tokens.accounts[0].account_slug : undefined;
  }

  if (tokens.accounts.length === 0) {
    // Delete the file if no accounts remain
    await deleteTokens();
  } else {
    await saveTokens(tokens);
  }
}

/**
 * Check if user is authenticated (has at least one account)
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokens = await loadTokens();
  return tokens !== null && tokens.accounts.length > 0;
}
