/**
 * Comments commands for fizzy-cli
 */

import { Command } from 'commander';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '../lib/api/client.js';
import { CommentSchema, ReactionSchema, parseApiResponse } from '../schemas/api.js';
import type { Comment, Reaction } from '../schemas/api.js';
import { printOutput, printError, detectFormat, formatDate } from '../lib/output/formatter.js';
import chalk from 'chalk';

/**
 * List comments for a card
 */
async function listComments(cardNumber: string, options: { json?: boolean; account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const commentsData = await client.get(`cards/${cardNumber}/comments`);
    const comments = parseApiResponse(CommentSchema.array(), commentsData, 'comments list');
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(comments, format);
    } else {
      // Transform data for table display
      const tableData = comments.map((comment) => ({
        ID: comment.id.substring(0, 13) + '...',
        Creator: comment.creator.name,
        Created: formatDate(comment.created_at),
        Updated: formatDate(comment.updated_at),
        Body: comment.body.plain_text.substring(0, 50) + (comment.body.plain_text.length > 50 ? '...' : ''),
      }));

      printOutput(tableData, format, {
        columns: ['ID', 'Creator', 'Created', 'Updated', 'Body'],
        headers: ['ID', 'Creator', 'Created', 'Updated', 'Body'],
      });
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to fetch comments'));
    process.exit(1);
  }
}

/**
 * Get comment details
 */
async function getComment(cardNumber: string, commentId: string, options: { json?: boolean; account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const commentData = await client.get(`cards/${cardNumber}/comments/${commentId}`);
    const comment = parseApiResponse(CommentSchema, commentData, 'comment');
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(comment, format);
    } else {
      // Display comment details
      console.log(chalk.bold.cyan('Comment Details'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('ID:')} ${comment.id}`);
      console.log(`${chalk.bold('Creator:')} ${comment.creator.name} (${comment.creator.email_address})`);
      console.log(`${chalk.bold('Created:')} ${formatDate(comment.created_at)}`);
      console.log(`${chalk.bold('Updated:')} ${formatDate(comment.updated_at)}`);
      console.log(`${chalk.bold('Reactions URL:')} ${comment.reactions_url}`);
      console.log(`${chalk.bold('URL:')} ${comment.url}`);
      console.log();
      console.log(chalk.bold('Body (Plain Text):'));
      console.log(comment.body.plain_text);
      console.log();
      console.log(chalk.bold('Body (HTML):'));
      console.log(chalk.gray(comment.body.html));
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to fetch comment details'));
    process.exit(1);
  }
}

/**
 * Create a new comment
 */
async function createComment(cardNumber: string, options: { body: string; json?: boolean; account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const commentData = await client.post(`cards/${cardNumber}/comments`, {
      comment: {
        body: options.body,
      },
    });
    const comment = parseApiResponse(CommentSchema, commentData, 'create comment');
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(comment, format);
    } else {
      console.log(chalk.green('✓ Comment created successfully'));
      console.log();
      console.log(`${chalk.bold('ID:')} ${comment.id}`);
      console.log(`${chalk.bold('Creator:')} ${comment.creator.name}`);
      console.log(`${chalk.bold('Created:')} ${formatDate(comment.created_at)}`);
      console.log();
      console.log(chalk.bold('Body:'));
      console.log(comment.body.plain_text);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to create comment'));
    process.exit(1);
  }
}

/**
 * Update a comment
 */
async function updateComment(cardNumber: string, commentId: string, options: { body: string; json?: boolean; account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const commentData = await client.put(`cards/${cardNumber}/comments/${commentId}`, {
      comment: {
        body: options.body,
      },
    });
    const comment = parseApiResponse(CommentSchema, commentData, 'update comment');
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(comment, format);
    } else {
      console.log(chalk.green('✓ Comment updated successfully'));
      console.log();
      console.log(`${chalk.bold('ID:')} ${comment.id}`);
      console.log(`${chalk.bold('Updated:')} ${formatDate(comment.updated_at)}`);
      console.log();
      console.log(chalk.bold('Body:'));
      console.log(comment.body.plain_text);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to update comment'));
    process.exit(1);
  }
}

/**
 * Delete a comment
 */
async function deleteComment(cardNumber: string, commentId: string, options: { account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    await client.delete(`cards/${cardNumber}/comments/${commentId}`);
    console.log(chalk.green('✓ Comment deleted successfully'));
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to delete comment'));
    process.exit(1);
  }
}

/**
 * Add a reaction to a comment
 */
async function addReaction(cardNumber: string, commentId: string, emoji: string, options: { json?: boolean; account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const reactionData = await client.post(`cards/${cardNumber}/comments/${commentId}/reactions`, {
      reaction: {
        content: emoji,
      },
    });
    const reaction = parseApiResponse(ReactionSchema, reactionData, 'create reaction');
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(reaction, format);
    } else {
      console.log(chalk.green('✓ Reaction added successfully'));
      console.log();
      console.log(`${chalk.bold('ID:')} ${reaction.id}`);
      console.log(`${chalk.bold('Content:')} ${reaction.content}`);
      console.log(`${chalk.bold('Reacter:')} ${reaction.reacter.name}`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to add reaction'));
    process.exit(1);
  }
}

/**
 * Remove a reaction from a comment
 */
async function removeReaction(cardNumber: string, commentId: string, reactionId: string, options: { account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    await client.delete(`cards/${cardNumber}/comments/${commentId}/reactions/${reactionId}`);
    console.log(chalk.green('✓ Reaction removed successfully'));
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to remove reaction'));
    process.exit(1);
  }
}

/**
 * Comments command group
 */
export const commentsCommand = new Command('comments')
  .description('Manage comments on cards')
  .addCommand(
    new Command('list')
      .description('List comments for a card')
      .argument('<card-number>', 'Card number')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(listComments)
  )
  .addCommand(
    new Command('get')
      .description('Get comment details')
      .argument('<card-number>', 'Card number')
      .argument('<comment-id>', 'Comment ID')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(getComment)
  )
  .addCommand(
    new Command('create')
      .description('Create a new comment')
      .argument('<card-number>', 'Card number')
      .requiredOption('--body <text>', 'Comment body')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(createComment)
  )
  .addCommand(
    new Command('update')
      .description('Update a comment')
      .argument('<card-number>', 'Card number')
      .argument('<comment-id>', 'Comment ID')
      .requiredOption('--body <text>', 'Updated comment body')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(updateComment)
  )
  .addCommand(
    new Command('delete')
      .description('Delete a comment')
      .argument('<card-number>', 'Card number')
      .argument('<comment-id>', 'Comment ID')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(deleteComment)
  )
  .addCommand(
    new Command('react')
      .description('Add a reaction to a comment')
      .argument('<card-number>', 'Card number')
      .argument('<comment-id>', 'Comment ID')
      .argument('<emoji>', 'Reaction emoji or text')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(addReaction)
  )
  .addCommand(
    new Command('unreact')
      .description('Remove a reaction from a comment')
      .argument('<card-number>', 'Card number')
      .argument('<comment-id>', 'Comment ID')
      .argument('<reaction-id>', 'Reaction ID')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(removeReaction)
  );
