/**
 * Browser opening utilities
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Open a URL in the default browser
 *
 * @param url - URL to open
 * @returns Promise that resolves when browser is opened (or rejects on error)
 */
export async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;

  let command: string;

  switch (platform) {
    case 'darwin': // macOS
      command = `open "${url}"`;
      break;
    case 'win32': // Windows
      command = `start "" "${url}"`;
      break;
    default: // Linux and others
      command = `xdg-open "${url}"`;
      break;
  }

  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`Failed to open browser: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
