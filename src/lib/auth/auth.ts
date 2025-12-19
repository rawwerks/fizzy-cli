/**
 * Authentication module barrel exports
 * Provides a single entry point for all authentication functionality
 */

// Token storage
export {
  getTokensPath,
  loadTokens,
  saveTokens,
  deleteTokens,
  saveAccount,
  getAccount,
  getDefaultAccount,
  setDefaultAccount,
  listAccounts,
  removeAccount,
  isAuthenticated,
  type StoredAccount,
  type UserInfo,
  type TokensFile,
} from './token-storage.js';

// Configuration
export {
  getBaseUrl,
  getApiBaseUrl,
  isLocalMode,
  getConfigPath,
  loadConfig,
  saveConfig,
  getConfig,
  setConfig,
  getEffectiveBaseUrl,
  type UserConfig,
} from './config.js';

// Magic link authentication
export {
  requestMagicLink,
  submitMagicLinkCode,
  getIdentity,
  authenticateWithMagicLink,
  type MagicLinkRequestResponse,
  type MagicLinkSubmitResponse,
  type IdentityAccount,
  type IdentityResponse,
} from './magic-link.js';
