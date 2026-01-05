/**
 * Reactions commands for fizzy-cli
 */

import { Command } from 'commander';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '../lib/api/client.js';
import { ReactionSchema, parseApiResponse } from '../schemas/api.js';
import type { Reaction } from '../schemas/api.js';
import { printOutput, printError, detectFormat, formatDate } from '../lib/output/formatter.js';
import chalk from 'chalk';

/**
 * List reactions for a comment
 */
async function listReactions(options: { comment: string; card: string; json?: boolean; account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const reactionsData = await client.get(`cards/${options.card}/comments/${options.comment}/reactions`);
    const reactions = parseApiResponse(ReactionSchema.array(), reactionsData, 'reactions list');
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(reactions, format);
    } else {
      // Transform data for table display
      const tableData = reactions.map((reaction) => ({
        ID: reaction.id.substring(0, 13) + '...',
        Content: reaction.content,
        Reacter: reaction.reacter.name,
        URL: reaction.url,
      }));

      printOutput(tableData, format, {
        columns: ['ID', 'Content', 'Reacter', 'URL'],
        headers: ['ID', 'Content', 'Reacter', 'URL'],
      });
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to fetch reactions'));
    process.exit(1);
  }
}

/**
 * Create a reaction on a comment
 */
async function createReaction(options: { comment: string; card: string; content: string; json?: boolean; account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    // POST returns 201 with no body, so we just confirm success
    await client.post(`cards/${options.card}/comments/${options.comment}/reactions`, {
      reaction: {
        content: options.content,
      },
    });
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput({ success: true, content: options.content, commentId: options.comment }, format);
    } else {
      console.log(chalk.green('✓ Reaction added successfully'));
      console.log();
      console.log(`${chalk.bold('Content:')} ${options.content}`);
      console.log(`${chalk.bold('Comment ID:')} ${options.comment}`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to add reaction'));
    process.exit(1);
  }
}

/**
 * Delete a reaction from a comment
 */
async function deleteReaction(reactionId: string, options: { comment: string; card: string; json?: boolean; account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    await client.delete(`cards/${options.card}/comments/${options.comment}/reactions/${reactionId}`);

    const format = detectFormat(options);
    if (format === 'json') {
      printOutput({ success: true, id: reactionId }, format);
    } else {
      console.log(chalk.green('✓ Reaction deleted successfully'));
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to delete reaction'));
    process.exit(1);
  }
}

/**
 * Reactions command group
 */
export const reactionsCommand = new Command('reactions')
  .description('Manage reactions on comments')
  .addCommand(
    new Command('list')
      .description('List reactions for a comment')
      .requiredOption('--comment <id>', 'Comment ID')
      .requiredOption('--card <number>', 'Card number')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(listReactions)
  )
  .addCommand(
    new Command('create')
      .description('Add a reaction to a comment')
      .requiredOption('--comment <id>', 'Comment ID')
      .requiredOption('--card <number>', 'Card number')
      .requiredOption('--content <emoji>', 'Reaction content (emoji or text)')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(createReaction)
  )
  .addCommand(
    new Command('delete')
      .description('Remove a reaction from a comment')
      .argument('<reaction-id>', 'Reaction ID')
      .requiredOption('--comment <id>', 'Comment ID')
      .requiredOption('--card <number>', 'Card number')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(deleteReaction)
  );
