/**
 * Prompts utility for fizzy-cli
 *
 * Provides interactive confirmation prompts for destructive operations.
 */

import { confirm } from '@inquirer/prompts';

/**
 * Prompt user to confirm a delete operation
 *
 * @param resourceType - The type of resource being deleted (e.g., "board", "card")
 * @param resourceName - The name or identifier of the resource
 * @param force - If true, skip the confirmation prompt
 * @returns Promise that resolves to true if user confirms, false otherwise
 */
export async function confirmDelete(
  resourceType: string,
  resourceName: string,
  force: boolean = false
): Promise<boolean> {
  if (force) {
    return true;
  }

  const answer = await confirm({
    message: `Are you sure you want to delete ${resourceType} "${resourceName}"? This action cannot be undone.`,
    default: false,
  });

  return answer;
}

/**
 * Prompt user to confirm a bulk delete operation
 *
 * @param resourceType - The type of resource being deleted (e.g., "cards", "comments")
 * @param count - The number of items being deleted
 * @param force - If true, skip the confirmation prompt
 * @returns Promise that resolves to true if user confirms, false otherwise
 */
export async function confirmBulkDelete(
  resourceType: string,
  count: number,
  force: boolean = false
): Promise<boolean> {
  if (force) {
    return true;
  }

  const answer = await confirm({
    message: `Are you sure you want to delete ${count} ${resourceType}(s)? This action cannot be undone.`,
    default: false,
  });

  return answer;
}
