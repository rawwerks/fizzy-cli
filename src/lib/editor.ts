/**
 * Editor utility for opening text in the user's default editor
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Opens the user's default editor with initial content and returns the edited result
 * @param initialContent - The initial text to populate the editor with
 * @param fileType - The file type for syntax highlighting (markdown or text)
 * @returns The edited content after the user closes the editor
 */
export async function createEditor(
  initialContent: string,
  fileType: 'markdown' | 'text' = 'text'
): Promise<string> {
  const extension = fileType === 'markdown' ? '.md' : '.txt';
  const tmpFile = join(tmpdir(), `fizzy-edit-${Date.now()}${extension}`);

  try {
    // Write initial content to temporary file
    writeFileSync(tmpFile, initialContent, 'utf-8');

    // Get editor from environment variables or use sensible defaults
    const editor = process.env.EDITOR || process.env.VISUAL || 'vim';

    // Open editor (blocking until user closes it)
    execSync(`${editor} "${tmpFile}"`, { stdio: 'inherit' });

    // Read the edited content
    const content = readFileSync(tmpFile, 'utf-8');

    return content;
  } finally {
    // Cleanup temporary file
    try {
      unlinkSync(tmpFile);
    } catch {
      // Ignore cleanup errors - file might not exist or already deleted
    }
  }
}
