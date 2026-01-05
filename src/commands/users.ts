/**
 * Users commands for fizzy-cli
 *
 * Users represent people who have access to an account.
 * API Reference: /fizzy-api/docs/API.md - Users section
 */

import { Command } from 'commander';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '../lib/api/client.js';
import { UserSchema, parseApiResponse } from '../schemas/api.js';
import { formatOutput, detectFormat, printError } from '../lib/output/formatter.js';
import { z } from 'zod';

/**
 * Users list command - list all users in the account
 */
function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('List all users in the account')
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

        // Fetch users
        const rawUsers = await client.getAll('/users');

        // Validate API response
        const users = parseApiResponse(
          z.array(UserSchema),
          rawUsers,
          'users list'
        );

        // Determine output format
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput(users, format));
        } else {
          // Transform data for table display
          const tableData = users.map((user) => ({
            ID: user.id,
            Name: user.name,
            Email: user.email_address,
            Role: user.role,
            Active: user.active ? 'Yes' : 'No',
          }));

          if (tableData.length === 0) {
            console.log('No users found');
          } else {
            console.log(formatOutput(tableData, format, {
              columns: ['ID', 'Name', 'Email', 'Role', 'Active'],
              headers: ['ID', 'Name', 'Email', 'Role', 'Active'],
            }));
          }
        }
      } catch (error) {
        printError(error instanceof Error ? error : new Error('Failed to fetch users'));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Users get command - get user details by ID
 */
function createGetCommand(): Command {
  const command = new Command('get');

  command
    .description('Get user details by ID')
    .argument('<id>', 'User ID')
    .option('--json', 'Output in JSON format')
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

        // Fetch user
        const rawUser = await client.get(`/users/${id}`);

        // Validate API response
        const user = parseApiResponse(
          UserSchema,
          rawUser,
          'user details'
        );

        // Determine output format
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput(user, format));
        } else {
          // Transform data for table display
          const tableData = {
            ID: user.id,
            Name: user.name,
            Email: user.email_address,
            Role: user.role,
            Active: user.active ? 'Yes' : 'No',
            'Created At': new Date(user.created_at).toLocaleDateString(),
          };

          console.log(formatOutput(tableData, format));
        }
      } catch (error) {
        printError(error instanceof Error ? error : new Error('Failed to fetch user details'));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Users me command - get current user profile
 */
function createMeCommand(): Command {
  const command = new Command('me');

  command
    .description('Get current user profile')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug (optional, uses default if not provided)')
    .action(async (options) => {
      try {
        // Get authentication
        const auth = await requireAuth({ accountSlug: options.account });

        // For the 'me' endpoint, we can use the user info from the stored account
        // or fetch from the API. Since the account already has user info, we'll use that
        // but also show how to fetch from API if needed.

        // Using the stored user info from authentication
        const user = auth.account.user;

        // Determine output format
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput(user, format));
        } else {
          // Transform data for table display
          const tableData = {
            ID: user.id,
            Name: user.name,
            Email: user.email_address,
            Role: user.role,
          };

          console.log(formatOutput(tableData, format));
        }
      } catch (error) {
        printError(error instanceof Error ? error : new Error('Failed to fetch user profile'));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Users update command - update user details
 */
function createUpdateCommand(): Command {
  const command = new Command('update');

  command
    .description('Update user details')
    .argument('<id>', 'User ID')
    .option('--name <name>', 'User display name')
    .option('--avatar <path>', 'Path to avatar image (jpg, png, gif, webp)')
    .option('--json', 'Output in JSON format')
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

        // Build payload
        const payload: Record<string, unknown> = {};
        if (options.name) {
          payload.name = options.name;
        }

        if (!options.name && !options.avatar) {
          printError(new Error('No update parameters provided. Use --name or --avatar'));
          process.exit(1);
        }

        // If avatar is provided, use multipart/form-data upload
        if (options.avatar) {
          // Validate file exists
          const fs = await import('fs/promises');
          try {
            await fs.access(options.avatar);
          } catch {
            throw new Error(`Avatar file not found: ${options.avatar}`);
          }

          // Validate file extension
          const ext = options.avatar.split('.').pop()?.toLowerCase();
          const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          if (!ext || !validExtensions.includes(ext)) {
            throw new Error(`Invalid image format. Supported formats: ${validExtensions.join(', ')}`);
          }

          await client.uploadFile(
            `/users/${id}`,
            options.avatar,
            'user[avatar]',
            { user: payload },
            'PUT'
          );
        } else {
          // Regular JSON request
          await client.put(`/users/${id}`, { user: payload });
        }

        // Determine output format
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput({ success: true, message: 'User updated successfully' }, format));
        } else {
          console.log('User updated successfully');
        }
      } catch (error) {
        printError(error instanceof Error ? error : new Error('Failed to update user'));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Users deactivate command - deactivate a user
 */
function createDeactivateCommand(): Command {
  const command = new Command('deactivate');

  command
    .description('Deactivate a user')
    .argument('<id>', 'User ID')
    .option('--json', 'Output in JSON format')
    .option('--force', 'Skip confirmation prompt')
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

        // Prompt for confirmation unless --force is used
        if (!options.force) {
          const { confirm } = await import('@inquirer/prompts');
          const shouldContinue = await confirm({
            message: `Are you sure you want to deactivate user ${id}?`,
            default: false,
          });

          if (!shouldContinue) {
            console.log('Deactivation cancelled');
            process.exit(0);
          }
        }

        // Deactivate user
        await client.delete(`/users/${id}`);

        // Determine output format
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput({ success: true, message: 'User deactivated successfully' }, format));
        } else {
          console.log('User deactivated successfully');
        }
      } catch (error) {
        printError(error instanceof Error ? error : new Error('Failed to deactivate user'));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Users command group
 */
export function createUsersCommand(): Command {
  const command = new Command('users');

  command
    .description('Manage users')
    .addCommand(createListCommand())
    .addCommand(createGetCommand())
    .addCommand(createMeCommand())
    .addCommand(createUpdateCommand())
    .addCommand(createDeactivateCommand());

  return command;
}
