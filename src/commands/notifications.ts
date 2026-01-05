/**
 * Notifications commands for fizzy-cli
 *
 * Notifications inform users about events that happened in the account,
 * such as comments, assignments, and card updates.
 * API Reference: /fizzy-api/docs/API.md - Notifications section
 */

import { Command } from 'commander';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '../lib/api/client.js';
import { NotificationSchema, parseApiResponse } from '../schemas/api.js';
import { formatOutput, detectFormat, printError, printStatus } from '../lib/output/formatter.js';
import { z } from 'zod';
import { filterNotifications, type NotificationFilters } from '../lib/filters.js';
import chalk from 'chalk';

/**
 * Notifications list command - list notifications for the current user
 */
function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('List notifications for the current user')
    .option('--read', 'Show only read notifications')
    .option('--unread', 'Show only unread notifications')
    .option('--search <query>', 'Search notification title and body')
    .option('--sort <field>', 'Sort by: created_at (default: created_at)')
    .option('--order <order>', 'Sort order: asc, desc (default: desc)')
    .option('--json', 'Output in JSON format')
    .option('--unread-only', 'Show only unread notifications (deprecated, use --unread)')
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

        // Fetch notifications
        const rawNotifications = await client.getAll('/notifications');

        // Validate API response
        const allNotifications = parseApiResponse(
          z.array(NotificationSchema),
          rawNotifications,
          'notifications list'
        );

        // Apply client-side filters
        const filters: NotificationFilters = {};
        // Support both --unread and --unread-only (deprecated) flags
        if (options.unread || options.unreadOnly) filters.unread = true;
        if (options.read) filters.read = true;
        if (options.search) filters.search = options.search;
        if (options.sort) filters.sort = options.sort;
        if (options.order) filters.order = options.order;

        const notifications = Object.keys(filters).length > 0 ? filterNotifications(allNotifications, filters) : allNotifications;
        const totalNotifications = allNotifications.length;
        const filteredCount = notifications.length;

        // Determine output format
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput(notifications, format));
        } else {
          // Show filter summary if filtering was applied
          if (filteredCount < totalNotifications) {
            console.log(chalk.gray(`Showing ${filteredCount} of ${totalNotifications} notifications (filtered)\n`));
          }

          // Transform data for table display
          const tableData = notifications.map((notification) => ({
            ID: notification.id,
            Title: notification.title,
            Body: notification.body,
            Read: notification.read ? 'Yes' : 'No',
            Card: notification.card.title,
            'Created At': new Date(notification.created_at).toLocaleDateString(),
          }));

          if (tableData.length === 0) {
            console.log(options.unreadOnly ? 'No unread notifications' : 'No notifications found');
          } else {
            console.log(formatOutput(tableData, format, {
              columns: ['ID', 'Title', 'Body', 'Read', 'Card', 'Created At'],
              headers: ['ID', 'Title', 'Body', 'Read', 'Card', 'Created At'],
            }));
          }
        }
      } catch (error) {
        printError(error instanceof Error ? error : new Error('Failed to fetch notifications'));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Notifications read command - mark a notification as read
 */
function createReadCommand(): Command {
  const command = new Command('read');

  command
    .description('Mark a notification as read')
    .argument('<id>', 'Notification ID')
    .option('--account <slug>', 'Account slug (optional, uses default if not provided)')
    .action(async (id, options) => {
      try {
        // Get authentication
        const auth = await requireAuth({ accountSlug: options.account });

        // Create API client
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
        });

        // Mark notification as read
        await client.post(`/notifications/${id}/reading`, {});

        printStatus(`Marked notification ${id} as read`);
      } catch (error) {
        printError(error instanceof Error ? error : new Error('Failed to mark notification as read'));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Notifications unread command - mark a notification as unread
 */
function createUnreadCommand(): Command {
  const command = new Command('unread');

  command
    .description('Mark a notification as unread')
    .argument('<id>', 'Notification ID')
    .option('--account <slug>', 'Account slug (optional, uses default if not provided)')
    .action(async (id, options) => {
      try {
        // Get authentication
        const auth = await requireAuth({ accountSlug: options.account });

        // Create API client
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
        });

        // Mark notification as unread
        await client.delete(`/notifications/${id}/reading`);

        printStatus(`Marked notification ${id} as unread`);
      } catch (error) {
        printError(error instanceof Error ? error : new Error('Failed to mark notification as unread'));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Notifications mark-all-read command - mark all notifications as read
 */
function createMarkAllReadCommand(): Command {
  const command = new Command('mark-all-read');

  command
    .description('Mark all notifications as read')
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

        // Mark all notifications as read
        await client.post('/notifications/bulk_reading', {});

        // Determine output format
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput({ success: true }, format));
        } else {
          printStatus('Marked all notifications as read');
        }
      } catch (error) {
        printError(error instanceof Error ? error : new Error('Failed to mark all notifications as read'));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Notifications command group
 */
export function createNotificationsCommand(): Command {
  const command = new Command('notifications');

  command
    .description('Manage notifications')
    .addCommand(createListCommand())
    .addCommand(createReadCommand())
    .addCommand(createUnreadCommand())
    .addCommand(createMarkAllReadCommand())
    .addHelpText('after', `
Examples:
  # List all notifications
  $ fizzy notifications list

  # List only unread notifications
  $ fizzy notifications list --unread

  # Mark notification as read
  $ fizzy notifications read notification-id

  # Mark notification as unread
  $ fizzy notifications unread notification-id

  # Mark all notifications as read
  $ fizzy notifications mark-all-read
`);

  return command;
}
