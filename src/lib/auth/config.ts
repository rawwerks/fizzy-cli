import { z } from 'zod';
import { homedir } from 'os';
import { join } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Default Fizzy configuration
 */
const DEFAULTS = {
  baseUrl: 'https://app.fizzy.do',
};

/**
 * Get the base URL for Fizzy API
 * Default: https://app.fizzy.do
 * Override: Set FIZZY_BASE_URL env var (e.g., http://localhost:3006 for local dev)
 */
export function getBaseUrl(): string {
  return process.env.FIZZY_BASE_URL || DEFAULTS.baseUrl;
}

/**
 * Get the API base URL (base URL + /my)
 * All authenticated API calls use /my or /{account_slug} prefix
 */
export function getApiBaseUrl(): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl.replace(/\/$/, '')}`;
}

/**
 * Check if running in local development mode
 */
export function isLocalMode(): boolean {
  const baseUrl = getBaseUrl();
  return baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
}

/**
 * User configuration schema
 */
export const UserConfigSchema = z.object({
  default_account: z.string().optional(),
  output_format: z.enum(['json', 'table', 'text']).default('table'),
  base_url: z.string().url().optional(),
});

/**
 * User configuration type
 */
export type UserConfig = z.infer<typeof UserConfigSchema>;

/**
 * Get the configuration file path
 * Uses XDG_CONFIG_HOME if set, otherwise defaults to ~/.config/fizzy-cli
 */
export function getConfigPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(configHome, 'fizzy-cli', 'config.json');
}

/**
 * Load configuration from disk
 * Returns null if config file doesn't exist or is invalid
 */
export async function loadConfig(): Promise<UserConfig | null> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const data = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(data);
    return UserConfigSchema.parse(parsed);
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

/**
 * Save configuration to disk
 * Creates parent directories if they don't exist
 */
export async function saveConfig(config: UserConfig): Promise<void> {
  const configPath = getConfigPath();
  const configDir = join(configPath, '..');

  // Create parent directories if they don't exist
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }

  // Validate config before saving
  const validatedConfig = UserConfigSchema.parse(config);

  await writeFile(configPath, JSON.stringify(validatedConfig, null, 2), 'utf-8');
}

/**
 * Get a specific configuration value by key
 * Supports dot notation (e.g., 'default_account', 'output_format')
 */
export async function getConfig(key: string): Promise<string | undefined> {
  const config = await loadConfig();

  if (!config) {
    return undefined;
  }

  const keys = key.split('.');
  let value: any = config;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }

  return typeof value === 'string' ? value : undefined;
}

/**
 * Set a specific configuration value by key
 * Supports dot notation (e.g., 'default_account', 'output_format')
 */
export async function setConfig(key: string, value: string): Promise<void> {
  const config = (await loadConfig()) || { output_format: 'table' as const };
  const keys = key.split('.');

  // Navigate to the parent object and set the value
  let current: any = config;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k];
  }

  // Set the final value
  current[keys[keys.length - 1]] = value;

  await saveConfig(config);
}

/**
 * Get the effective base URL
 * Priority: ENV var > config file > default
 */
export async function getEffectiveBaseUrl(): Promise<string> {
  if (process.env.FIZZY_BASE_URL) {
    return process.env.FIZZY_BASE_URL;
  }

  const config = await loadConfig();
  if (config?.base_url) {
    return config.base_url;
  }

  return DEFAULTS.baseUrl;
}
