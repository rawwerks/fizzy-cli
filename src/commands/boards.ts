/**
 * Boards commands for fizzy-cli
 *
 * Implements CRUD operations for Fizzy boards:
 * - list: List all boards with pagination
 * - get: Get board details by ID
 * - create: Create a new board
 * - update: Update an existing board
 * - delete: Delete a board
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '../lib/api/client.js';
import { BoardSchema, parseApiResponse } from '../schemas/api.js';
import type { Board } from '../schemas/api.js';
import {
  formatOutput,
  formatBoard,
  printError,
  printStatus,
  startSpinner,
  detectFormat,
  type OutputFormat
} from '../lib/output/formatter.js';
import { z } from 'zod';

/**
 * Boards list command - list all boards
 */
function createListCommand(): Command {
  const command = new Command('list')
    .description('List all boards')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .option('--limit <number>', 'Maximum number of boards to return', (value) => parseInt(value, 10))
    .action(async (options) => {
      const spinner = startSpinner('Fetching boards...');

      try {
        // Authenticate and get account info
        const auth = await requireAuth({ accountSlug: options.account });

        // Create API client
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          userAgent: 'fizzy-cli',
        });

        // Fetch boards
        let boards: Board[];
        if (options.limit) {
          boards = await client.getAll<Board>('boards', options.limit);
        } else {
          boards = await client.getAll<Board>('boards');
        }

        // Validate API response
        const validatedBoards = parseApiResponse(
          z.array(BoardSchema),
          boards,
          'boards list'
        );

        spinner.succeed(`Found ${validatedBoards.length} board(s)`);

        // Format output
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput(validatedBoards, format));
        } else {
          // Table format
          const tableData = validatedBoards.map((board) => ({
            ID: board.id,
            Name: board.name,
            'All Access': board.all_access ? '✓' : '✗',
            Creator: board.creator.name,
            Created: new Date(board.created_at).toLocaleDateString(),
          }));

          console.log(formatOutput(tableData, 'table', {
            columns: ['ID', 'Name', 'All Access', 'Creator', 'Created'],
            headers: ['ID', 'Name', 'All Access', 'Creator', 'Created'],
          }));
        }
      } catch (error) {
        spinner.fail('Failed to fetch boards');
        printError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Boards get command - get board details
 */
function createGetCommand(): Command {
  const command = new Command('get')
    .description('Get board details')
    .argument('<id>', 'Board ID')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (id: string, options) => {
      const spinner = startSpinner(`Fetching board ${id}...`);

      try {
        // Authenticate and get account info
        const auth = await requireAuth({ accountSlug: options.account });

        // Create API client
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          userAgent: 'fizzy-cli',
        });

        // Fetch board
        const rawBoard = await client.get<Board>(`boards/${id}`);

        // Validate API response
        const board = parseApiResponse(BoardSchema, rawBoard, 'board details');

        spinner.succeed(`Board: ${board.name}`);

        // Format output
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput(board, format));
        } else {
          // Display board details
          console.log('');
          console.log(chalk.bold.cyan(board.name));
          console.log(chalk.gray(`ID: ${board.id}`));
          console.log(chalk.gray(`All Access: ${board.all_access ? 'Yes' : 'No'}`));
          console.log(chalk.gray(`Creator: ${board.creator.name}`));
          console.log(chalk.gray(`Created: ${new Date(board.created_at).toLocaleString()}`));
          console.log('');
          console.log(chalk.bold('Links:'));
          console.log(chalk.blue(`Board URL: ${board.url}`));
          console.log('');
        }
      } catch (error) {
        spinner.fail('Failed to fetch board');
        printError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Boards create command - create a new board
 */
function createCreateCommand(): Command {
  const command = new Command('create')
    .description('Create a new board')
    .argument('<name>', 'Board name')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .option('--all-access <boolean>', 'Whether any user in the account can access this board (default: true)', (value) => value === 'true')
    .option('--auto-postpone-period <days>', 'Number of days of inactivity before cards are automatically postponed', (value) => parseInt(value, 10))
    .option('--public-description <text>', 'Rich text description shown on the public board page')
    .action(async (name: string, options) => {
      const spinner = startSpinner('Creating board...');

      try {
        // Authenticate and get account info
        const auth = await requireAuth({ accountSlug: options.account });

        // Create API client
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          userAgent: 'fizzy-cli',
        });

        // Build request body
        const body: {
          board: {
            name: string;
            all_access?: boolean;
            auto_postpone_period?: number;
            public_description?: string;
          };
        } = {
          board: {
            name,
          },
        };

        if (options.allAccess !== undefined) {
          body.board.all_access = options.allAccess;
        }

        if (options.autoPostponePeriod !== undefined) {
          body.board.auto_postpone_period = options.autoPostponePeriod;
        }

        if (options.publicDescription) {
          body.board.public_description = options.publicDescription;
        }

        // Create board
        const rawBoard = await client.post<Board>('boards', body);

        // Validate API response
        const board = parseApiResponse(BoardSchema, rawBoard, 'board creation');

        spinner.succeed(`Board created: ${board.name}`);

        // Format output
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput(board, format));
        } else {
          console.log('');
          console.log(chalk.bold.green('Board Created Successfully!'));
          console.log('');
          console.log(chalk.bold.cyan(board.name));
          console.log(chalk.gray(`ID: ${board.id}`));
          console.log(chalk.gray(`All Access: ${board.all_access ? 'Yes' : 'No'}`));
          console.log(chalk.gray(`Creator: ${board.creator.name}`));
          console.log('');
          console.log(chalk.bold('Links:'));
          console.log(chalk.blue(`Board URL: ${board.url}`));
          console.log('');
        }
      } catch (error) {
        spinner.fail('Failed to create board');
        printError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Boards update command - update an existing board
 */
function createUpdateCommand(): Command {
  const command = new Command('update')
    .description('Update an existing board')
    .argument('<id>', 'Board ID')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .option('--name <name>', 'Board name')
    .option('--all-access <boolean>', 'Whether any user in the account can access this board', (value) => value === 'true')
    .option('--auto-postpone-period <days>', 'Number of days of inactivity before cards are automatically postponed', (value) => parseInt(value, 10))
    .option('--public-description <text>', 'Rich text description shown on the public board page')
    .action(async (id: string, options) => {
      const spinner = startSpinner('Updating board...');

      try {
        // Authenticate and get account info
        const auth = await requireAuth({ accountSlug: options.account });

        // Create API client
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          userAgent: 'fizzy-cli',
        });

        // Build request body
        const body: {
          board: {
            name?: string;
            all_access?: boolean;
            auto_postpone_period?: number;
            public_description?: string;
          };
        } = {
          board: {},
        };

        if (options.name) {
          body.board.name = options.name;
        }

        if (options.allAccess !== undefined) {
          body.board.all_access = options.allAccess;
        }

        if (options.autoPostponePeriod !== undefined) {
          body.board.auto_postpone_period = options.autoPostponePeriod;
        }

        if (options.publicDescription) {
          body.board.public_description = options.publicDescription;
        }

        // Check if any options were provided
        if (Object.keys(body.board).length === 0) {
          spinner.fail('No update options provided');
          printError('Please provide at least one option to update (--name, --all-access, etc.)');
          process.exit(1);
        }

        // Update board
        await client.put(`boards/${id}`, body);

        spinner.succeed('Board updated successfully');

        // Format output
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput({ success: true, message: 'Board updated successfully' }, format));
        } else {
          printStatus('');
          printStatus(chalk.bold.green('Board Updated Successfully!'));
          printStatus(chalk.gray(`Board ID: ${id}`));
          printStatus('');
        }
      } catch (error) {
        spinner.fail('Failed to update board');
        printError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Boards delete command - delete a board
 */
function createDeleteCommand(): Command {
  const command = new Command('delete')
    .description('Delete a board')
    .argument('<id>', 'Board ID')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (id: string, options) => {
      const spinner = startSpinner('Deleting board...');

      try {
        // Authenticate and get account info
        const auth = await requireAuth({ accountSlug: options.account });

        // Create API client
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          userAgent: 'fizzy-cli',
        });

        // Delete board
        await client.delete(`boards/${id}`);

        spinner.succeed('Board deleted successfully');

        // Format output
        const format = detectFormat(options);

        if (format === 'json') {
          console.log(formatOutput({ success: true, message: 'Board deleted successfully' }, format));
        } else {
          printStatus('');
          printStatus(chalk.bold.green('Board Deleted Successfully!'));
          printStatus(chalk.gray(`Board ID: ${id}`));
          printStatus('');
        }
      } catch (error) {
        spinner.fail('Failed to delete board');
        printError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Boards command group
 */
export function createBoardsCommand(): Command {
  const command = new Command('boards')
    .description('Manage boards')
    .addCommand(createListCommand())
    .addCommand(createGetCommand())
    .addCommand(createCreateCommand())
    .addCommand(createUpdateCommand())
    .addCommand(createDeleteCommand());

  return command;
}
