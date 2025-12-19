/**
 * Tags commands for fizzy-cli
 *
 * Tags are labels that can be applied to cards for organization and filtering.
 * API Reference: /fizzy-api/docs/API.md - Tags section
 */

import { Command } from 'commander';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '../lib/api/client.js';
import { TagSchema, parseApiResponse } from '../schemas/api.js';
import { formatOutput, detectFormat, printError } from '../lib/output/formatter.js';
import { z } from 'zod';

/**
 * Tags list command - list all tags in the account
 */
function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('List all tags in the account')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug (optional, uses default if not provided)')
    .action(async (options) => {
      try {
        // Get authentication
        const auth = await requireAuth({ accountSlug: options.account });

        // Create API client
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
        });

        // Fetch tags
        const rawTags = await client.getAll('/tags');

        // Validate API response
        const tags = parseApiResponse(
          z.array(TagSchema),
          rawTags,
          'tags list'
        );

        // Determine output format
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput(tags, format));
        } else {
          // Transform data for table display
          const tableData = tags.map((tag) => ({
            ID: tag.id,
            Title: tag.title,
            'Created At': new Date(tag.created_at).toLocaleDateString(),
          }));

          if (tableData.length === 0) {
            console.log('No tags found');
          } else {
            console.log(formatOutput(tableData, format, {
              columns: ['ID', 'Title', 'Created At'],
              headers: ['ID', 'Title', 'Created At'],
            }));
          }
        }
      } catch (error) {
        printError(error instanceof Error ? error : new Error('Failed to fetch tags'));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Tags command group
 */
export function createTagsCommand(): Command {
  const command = new Command('tags');

  command
    .description('Manage tags')
    .addCommand(createListCommand());

  return command;
}
