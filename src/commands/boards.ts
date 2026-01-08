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
import { confirmDelete } from '../lib/prompts.js';
import { filterBoards, type BoardFilters } from '../lib/filters.js';
import {
  validateBoardId,
  validateBoardName,
} from '../lib/validation.js';

/**
 * List all boards in the current account
 *
 * @example
 * ```bash
 * # List all boards
 * fizzy boards list
 *
 * # List with JSON output
 * fizzy boards list --json
 *
 * # Search boards by name
 * fizzy boards list --search "design"
 *
 * # Paginate results
 * fizzy boards list --page 2 --per-page 50
 * ```
 *
 * @returns Command instance for listing boards
 */
function createListCommand(): Command {
  const command = new Command('list')
    .description('List all boards')
    .option('--search <query>', 'Search board names')
    .option('--sort <field>', 'Sort by: name, created_at (default: name)')
    .option('--order <order>', 'Sort order: asc, desc (default: asc)')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .option('--page <number>', 'Page number (default: 1)', (value) => parseInt(value, 10))
    .option('--per-page <number>', 'Results per page (default: 30)', (value) => parseInt(value, 10))
    .option('--all', 'Fetch all results (auto-paginate)')
    .option('--limit <number>', 'Maximum number of boards to return (deprecated, use --all instead)', (value) => parseInt(value, 10))
    .action(async (options) => {
      const format = detectFormat(options);
      const spinner = format === 'json' ? null : startSpinner('Fetching boards...');

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

        // Handle deprecated --limit flag (for backwards compatibility)
        if (options.limit) {
          boards = await client.getAll<Board>('boards', options.limit);
        } else if (options.all || (!options.page && !options.perPage)) {
          // Use --all or default to fetching all if no pagination specified
          boards = await client.get<Board[]>('boards', {
            pagination: { all: true }
          });
        } else {
          // Use specific page/per-page options
          boards = await client.get<Board[]>('boards', {
            pagination: {
              page: options.page,
              perPage: options.perPage,
            }
          });
        }

        // Validate API response
        const validatedBoards = parseApiResponse(
          z.array(BoardSchema),
          boards,
          'boards list'
        );

        // Apply client-side filters
        const filters: BoardFilters = {};
        if (options.search) filters.search = options.search;
        if (options.sort) filters.sort = options.sort;
        if (options.order) filters.order = options.order;

        const filteredBoards = Object.keys(filters).length > 0 ? filterBoards(validatedBoards, filters) : validatedBoards;
        const totalBoards = validatedBoards.length;
        const filteredCount = filteredBoards.length;

        if (spinner) {
          if (filteredCount < totalBoards) {
            spinner.succeed(`Found ${filteredCount} of ${totalBoards} board(s) (filtered)`);
          } else {
            spinner.succeed(`Found ${filteredCount} board(s)`);
          }
        }

        if (format === 'json') {
          console.log(formatOutput(filteredBoards, format));
        } else {
          // Table format
          const tableData = filteredBoards.map((board) => ({
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
        if (spinner) spinner.fail('Failed to fetch boards');
        printError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Get detailed information about a specific board
 *
 * @example
 * ```bash
 * # Get board by ID
 * fizzy boards get abc123
 *
 * # Get board with JSON output
 * fizzy boards get abc123 --json
 * ```
 *
 * @returns Command instance for getting board details
 */
function createGetCommand(): Command {
  const command = new Command('get')
    .description('Get board details')
    .argument('<id>', 'Board ID')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (id: string, options) => {
      const format = detectFormat(options);
      const spinner = format === 'json' ? null : startSpinner(`Fetching board ${id}...`);

      try {
        // Validate board ID
        validateBoardId(id);
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

        if (spinner) spinner.succeed(`Board: ${board.name}`);

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
        if (spinner) spinner.fail('Failed to fetch board');
        printError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Create a new board with specified options
 *
 * @example
 * ```bash
 * # Create a basic board
 * fizzy boards create "Project Alpha"
 *
 * # Create with all access disabled
 * fizzy boards create "Private Board" --all-access false
 *
 * # Create with auto-postpone period
 * fizzy boards create "My Board" --auto-postpone-period 30
 * ```
 *
 * @returns Command instance for creating boards
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
      const format = detectFormat(options);
      const spinner = format === 'json' ? null : startSpinner('Creating board...');

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

        if (spinner) spinner.succeed(`Board created: ${board.name}`);

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
        if (spinner) spinner.fail('Failed to create board');
        printError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Update an existing board's properties
 *
 * @example
 * ```bash
 * # Update board name
 * fizzy boards update abc123 --name "New Name"
 *
 * # Update all access setting
 * fizzy boards update abc123 --all-access true
 *
 * # Update multiple properties
 * fizzy boards update abc123 --name "Updated" --auto-postpone-period 15
 * ```
 *
 * @returns Command instance for updating boards
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
        // Validate board ID
        validateBoardId(id);
        if (options.name) {
          validateBoardName(options.name);
        }
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
 * Delete a board by ID
 *
 * @example
 * ```bash
 * # Delete with confirmation
 * fizzy boards delete abc123
 *
 * # Delete without confirmation
 * fizzy boards delete abc123 --force
 * ```
 *
 * @returns Command instance for deleting boards
 */
function createDeleteCommand(): Command {
  const command = new Command('delete')
    .description('Delete a board')
    .argument('<id>', 'Board ID')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .option('--force', 'Skip confirmation prompt', false)
    .action(async (id: string, options) => {
      const format = detectFormat(options);
      // Validate board ID
      validateBoardId(id);
      const spinner = format === 'json' ? null : startSpinner('Fetching board details...');

      try {
        // Authenticate and get account info
        const auth = await requireAuth({ accountSlug: options.account });

        // Create API client
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          userAgent: 'fizzy-cli',
        });

        // Fetch board details to get the name for confirmation
        const rawBoard = await client.get<Board>(`boards/${id}`);
        const board = parseApiResponse(BoardSchema, rawBoard, 'board details');

        if (spinner) spinner.succeed(`Found board: ${board.name}`);

        // Confirm deletion
        const confirmed = await confirmDelete('board', board.name, options.force);
        if (!confirmed) {
          if (format === 'json') {
            console.log(formatOutput({ success: false, message: 'Delete cancelled' }, format));
          } else {
            printStatus('Delete cancelled');
          }
          return;
        }

        // Delete board
        const deleteSpinner = format === 'json' ? null : startSpinner('Deleting board...');
        await client.delete(`boards/${id}`);

        if (deleteSpinner) deleteSpinner.succeed('Board deleted successfully');

        // Format output
        if (format === 'json') {
          console.log(formatOutput({ success: true, message: 'Board deleted successfully' }, format));
        } else {
          printStatus('');
          printStatus(chalk.bold.green('Board Deleted Successfully!'));
          printStatus(chalk.gray(`Board: ${board.name}`));
          printStatus(chalk.gray(`Board ID: ${id}`));
          printStatus('');
        }
      } catch (error) {
        if (spinner) spinner.fail('Failed to delete board');
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
    .addCommand(createDeleteCommand())
    .addHelpText('after', `
Examples:
  # List all boards
  $ fizzy boards list

  # List boards in JSON format
  $ fizzy boards list --json

  # Search boards by name
  $ fizzy boards list --search "design"

  # Get specific board details
  $ fizzy boards get abc123

  # Create a new board
  $ fizzy boards create "Project Alpha"

  # Create board with all access disabled
  $ fizzy boards create "Private Board" --all-access false

  # Update board name
  $ fizzy boards update abc123 --name "New Name"

  # Delete a board
  $ fizzy boards delete abc123

  # Delete board without confirmation
  $ fizzy boards delete abc123 --force
`);

  return command;
}
