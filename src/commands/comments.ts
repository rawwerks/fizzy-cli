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
import {
  validateCardIdentifier,
  validateCommentId,
  validateReactionId,
  validateRequiredString,
  validateEmoji,
  validatePositiveInteger,
} from '../lib/validation.js';
import { filterComments, parseDate, type CommentFilters } from '../lib/filters.js';
import { confirmDelete } from '../lib/prompts.js';

/**
 * List comments for a card
 */
async function listComments(options: {
  card: string;
  json?: boolean;
  account?: string;
  search?: string;
  user?: string;
  createdAfter?: string;
  createdBefore?: string;
  sort?: 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}): Promise<void> {
    // Validate card number
    validatePositiveInteger(options.card, 'Card number');
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const commentsData = await client.get(`cards/${options.card}/comments`);
    const allComments = parseApiResponse(CommentSchema.array(), commentsData, 'comments list');

    // Apply client-side filters
    const filters: CommentFilters = {};
    if (options.search) filters.search = options.search;
    if (options.user) filters.user = options.user;
    if (options.createdAfter) filters.createdAfter = parseDate(options.createdAfter);
    if (options.createdBefore) filters.createdBefore = parseDate(options.createdBefore);
    if (options.sort) filters.sort = options.sort;
    if (options.order) filters.order = options.order;

    const comments = Object.keys(filters).length > 0 ? filterComments(allComments, filters) : allComments;
    const totalComments = allComments.length;
    const filteredCount = comments.length;

    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(comments, format);
    } else {
      // Show filter summary if filtering was applied
      if (filteredCount < totalComments) {
        console.log(chalk.gray(`Showing ${filteredCount} of ${totalComments} comments (filtered)\n`));
      }

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
async function getComment(commentId: string, options: { card: string; json?: boolean; account?: string }): Promise<void> {
    // Validate inputs
    validatePositiveInteger(options.card, 'Card number');
    validateCommentId(commentId);
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const commentData = await client.get(`cards/${options.card}/comments/${commentId}`);
    const comment = parseApiResponse(CommentSchema, commentData, 'comment');
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(comment, format);
    } else {
      // Display comment details
      console.log(chalk.bold.cyan('Comment Details'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('ID:')} ${comment.id}`);
      console.log(`${chalk.bold('Creator:')} ${comment.creator.name}${comment.creator.email_address ? ` (${comment.creator.email_address})` : ''}`);
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
async function createComment(options: { card: string; body: string; json?: boolean; account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const commentData = await client.post(`cards/${options.card}/comments`, {
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
async function updateComment(commentId: string, options: { card: string; body: string; json?: boolean; account?: string }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    // PUT returns 204 No Content, so we need to fetch the comment after update
    await client.put(`cards/${options.card}/comments/${commentId}`, {
      comment: {
        body: options.body,
      },
    });

    // Fetch the updated comment
    const commentData = await client.get(`cards/${options.card}/comments/${commentId}`);
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
async function deleteComment(commentId: string, options: { card: string; account?: string; force?: boolean; json?: boolean }): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    // Fetch comment details to get preview for confirmation
    const commentData = await client.get(`cards/${options.card}/comments/${commentId}`);
    const comment = parseApiResponse(CommentSchema, commentData, 'comment');

    // Confirm deletion
    const preview = comment.body.plain_text.substring(0, 50) + (comment.body.plain_text.length > 50 ? '...' : '');
    const confirmed = await confirmDelete('comment', preview, options.force);
    if (!confirmed) {
      const format = detectFormat(options);
      if (format === 'json') {
        printOutput({ success: false, message: 'Delete cancelled' }, format);
      } else {
        console.log('Delete cancelled');
      }
      return;
    }

    // Delete the comment
    await client.delete(`cards/${options.card}/comments/${commentId}`);
    const format = detectFormat(options);
    if (format === 'json') {
      printOutput({ success: true, message: 'Comment deleted successfully' }, format);
    } else {
      console.log(chalk.green('✓ Comment deleted successfully'));
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to delete comment'));
    process.exit(1);
  }
}

/**
 * Add a reaction to a comment
 */
async function addReaction(commentId: string, options: { card: string; emoji: string; json?: boolean; account?: string }): Promise<void> {
    // Validate inputs
    validatePositiveInteger(options.card, 'Card number');
    validateCommentId(commentId);
    validateEmoji(options.emoji);
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    // POST returns 201 with no body, so we just confirm success
    await client.post(`cards/${options.card}/comments/${commentId}/reactions`, {
      reaction: {
        content: options.emoji,
      },
    });
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput({ success: true, content: options.emoji, commentId }, format);
    } else {
      console.log(chalk.green('✓ Reaction added successfully'));
      console.log();
      console.log(`${chalk.bold('Content:')} ${options.emoji}`);
      console.log(`${chalk.bold('Comment ID:')} ${commentId}`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to add reaction'));
    process.exit(1);
  }
}

/**
 * Remove a reaction from a comment
 */
async function removeReaction(commentId: string, reactionId: string, options: { card: string; account?: string }): Promise<void> {
    // Validate inputs
    validatePositiveInteger(options.card, 'Card number');
    validateCommentId(commentId);
    validateReactionId(reactionId);
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    await client.delete(`cards/${options.card}/comments/${commentId}/reactions/${reactionId}`);
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
      .requiredOption('--card <number>', 'Card number')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(listComments)
  )
  .addCommand(
    new Command('get')
      .description('Get comment details')
      .argument('<comment-id>', 'Comment ID')
      .requiredOption('--card <number>', 'Card number')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(getComment)
  )
  .addCommand(
    new Command('create')
      .description('Create a new comment')
      .requiredOption('--card <number>', 'Card number')
      .requiredOption('--body <text>', 'Comment body')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(createComment)
  )
  .addCommand(
    new Command('update')
      .description('Update a comment')
      .argument('<comment-id>', 'Comment ID')
      .requiredOption('--card <number>', 'Card number')
      .requiredOption('--body <text>', 'Updated comment body')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(updateComment)
  )
  .addCommand(
    new Command('delete')
      .description('Delete a comment')
      .argument('<comment-id>', 'Comment ID')
      .requiredOption('--card <number>', 'Card number')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .option('--force', 'Skip confirmation prompt', false)
      .action(deleteComment)
  )
  .addCommand(
    new Command('react')
      .description('Add a reaction to a comment')
      .argument('<comment-id>', 'Comment ID')
      .requiredOption('--card <number>', 'Card number')
      .requiredOption('--emoji <emoji>', 'Reaction emoji or text')
      .option('--json', 'Output in JSON format')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(addReaction)
  )
  .addCommand(
    new Command('unreact')
      .description('Remove a reaction from a comment')
      .argument('<comment-id>', 'Comment ID')
      .argument('<reaction-id>', 'Reaction ID')
      .requiredOption('--card <number>', 'Card number')
      .option('--account <slug>', 'Use specific Fizzy account')
      .action(removeReaction)
  )
  .addHelpText('after', `
Examples:
  # List all comments on a card
  $ fizzy comments list --card 42

  # Get specific comment
  $ fizzy comments get comment-id --card 42

  # Create a comment
  $ fizzy comments create --card 42 --body "Great work!"

  # Update a comment
  $ fizzy comments update comment-id --card 42 --body "Updated comment"

  # Delete a comment
  $ fizzy comments delete comment-id --card 42

  # Add reaction to comment
  $ fizzy comments react comment-id --card 42 --emoji "👍"

  # Remove reaction
  $ fizzy comments unreact comment-id reaction-id --card 42
`);
