/**
 * Columns commands for fizzy-cli
 */

import { Command } from 'commander';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '../lib/api/client.js';
import { ColumnSchema, parseApiResponse } from '../schemas/api.js';
import {
  printOutput,
  printError,
  printStatus,
  detectFormat,
  startSpinner,
  type OutputFormat
} from '../lib/output/formatter.js';
import type { Column } from '../schemas/api.js';

/**
 * Global options interface
 */
interface GlobalOptions {
  json?: boolean;
  account?: string;
  baseUrl?: string;
}

/**
 * Columns list command - list all columns on a board
 */
function createListCommand(): Command {
  const cmd = new Command('list');

  cmd
    .description('List columns for a board')
    .requiredOption('--board <id>', 'Board ID')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Use specific Fizzy account')
    .action(async (options: { board: string } & GlobalOptions) => {
      const spinner = startSpinner('Fetching columns...');

      try {
        const auth = await requireAuth({ accountSlug: options.account });
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          baseUrl: options.baseUrl,
        });

        const rawColumns = await client.get<Column[]>(
          `/boards/${options.board}/columns`
        );

        const columns = rawColumns.map((col) =>
          parseApiResponse(ColumnSchema, col, 'column')
        );

        spinner.succeed(`Found ${columns.length} column(s)`);

        const format = detectFormat(options);

        if (format === 'json') {
          printOutput(columns, format);
        } else {
          // Transform data for table display
          const tableData = columns.map((column) => ({
            ID: column.id,
            Name: column.name,
            Color: column.color,
            'Created At': column.created_at,
          }));

          printOutput(tableData, format, {
            columns: ['ID', 'Name', 'Color', 'Created At'],
            headers: ['ID', 'Name', 'Color', 'Created At'],
          });
        }
      } catch (error) {
        spinner.fail('Failed to fetch columns');
        printError(error instanceof Error ? error : new Error('Failed to fetch columns'));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Columns get command - get details of a specific column
 */
function createGetCommand(): Command {
  const cmd = new Command('get');

  cmd
    .description('Get column details')
    .argument('<id>', 'Column ID')
    .requiredOption('--board <id>', 'Board ID')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Use specific Fizzy account')
    .action(async (id: string, options: { board: string } & GlobalOptions) => {
      const spinner = startSpinner('Fetching column details...');

      try {
        const auth = await requireAuth({ accountSlug: options.account });
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          baseUrl: options.baseUrl,
        });

        const rawColumn = await client.get<Column>(
          `/boards/${options.board}/columns/${id}`
        );

        const column = parseApiResponse(ColumnSchema, rawColumn, 'column details');

        spinner.succeed('Column details fetched');

        const format = detectFormat(options);

        if (format === 'json') {
          printOutput(column, format);
        } else {
          // Transform data for table display (key-value pairs)
          const tableData = {
            ID: column.id,
            Name: column.name,
            Color: column.color,
            'Created At': column.created_at,
          };

          printOutput(tableData, 'table');
        }
      } catch (error) {
        spinner.fail('Failed to fetch column details');
        printError(error instanceof Error ? error : new Error('Failed to fetch column details'));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Columns create command - create a new column on a board
 */
function createCreateCommand(): Command {
  const cmd = new Command('create');

  cmd
    .description('Create a new column on a board')
    .requiredOption('--board <id>', 'Board ID')
    .requiredOption('--name <name>', 'Column name')
    .option('--color <color>', 'Column color (e.g., var(--color-card-default))')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Use specific Fizzy account')
    .action(async (options: { board: string; name: string; color?: string } & GlobalOptions) => {
      const spinner = startSpinner('Creating column...');

      try {
        const auth = await requireAuth({ accountSlug: options.account });
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          baseUrl: options.baseUrl,
        });

        const requestBody: { column: { name: string; color?: string } } = {
          column: {
            name: options.name,
          },
        };

        if (options.color) {
          requestBody.column.color = options.color;
        }

        const rawColumn = await client.post<Column>(
          `/boards/${options.board}/columns`,
          requestBody
        );

        const column = parseApiResponse(ColumnSchema, rawColumn, 'created column');

        spinner.succeed('Column created successfully');

        const format = detectFormat(options);

        if (format === 'json') {
          printOutput(column, format);
        } else {
          printStatus(`Column "${column.name}" created with ID: ${column.id}`);

          const tableData = {
            ID: column.id,
            Name: column.name,
            Color: column.color,
            'Created At': column.created_at,
          };

          printOutput(tableData, 'table');
        }
      } catch (error) {
        spinner.fail('Failed to create column');
        printError(error instanceof Error ? error : new Error('Failed to create column'));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Columns update command - update an existing column
 */
function createUpdateCommand(): Command {
  const cmd = new Command('update');

  cmd
    .description('Update a column')
    .argument('<id>', 'Column ID')
    .requiredOption('--board <id>', 'Board ID')
    .option('--name <name>', 'New column name')
    .option('--color <color>', 'New column color')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Use specific Fizzy account')
    .action(async (id: string, options: { board: string; name?: string; color?: string } & GlobalOptions) => {
      // Validate at least one update field is provided
      if (!options.name && !options.color) {
        printError('At least one of --name or --color must be provided');
        process.exit(1);
      }

      const spinner = startSpinner('Updating column...');

      try {
        const auth = await requireAuth({ accountSlug: options.account });
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          baseUrl: options.baseUrl,
        });

        const requestBody: { column: { name?: string; color?: string } } = {
          column: {},
        };

        if (options.name) {
          requestBody.column.name = options.name;
        }

        if (options.color) {
          requestBody.column.color = options.color;
        }

        // PUT returns 204 No Content, so we need to fetch the updated column
        await client.put<void>(
          `/boards/${options.board}/columns/${id}`,
          requestBody
        );

        // Fetch the updated column
        const rawColumn = await client.get<Column>(
          `/boards/${options.board}/columns/${id}`
        );

        const column = parseApiResponse(ColumnSchema, rawColumn, 'updated column');

        spinner.succeed('Column updated successfully');

        const format = detectFormat(options);

        if (format === 'json') {
          printOutput(column, format);
        } else {
          printStatus(`Column "${column.name}" updated`);

          const tableData = {
            ID: column.id,
            Name: column.name,
            Color: column.color,
            'Created At': column.created_at,
          };

          printOutput(tableData, 'table');
        }
      } catch (error) {
        spinner.fail('Failed to update column');
        printError(error instanceof Error ? error : new Error('Failed to update column'));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Columns delete command - delete a column
 */
function createDeleteCommand(): Command {
  const cmd = new Command('delete');

  cmd
    .description('Delete a column')
    .argument('<id>', 'Column ID')
    .requiredOption('--board <id>', 'Board ID')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Use specific Fizzy account')
    .action(async (id: string, options: { board: string } & GlobalOptions) => {
      const spinner = startSpinner('Deleting column...');

      try {
        const auth = await requireAuth({ accountSlug: options.account });
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          baseUrl: options.baseUrl,
        });

        await client.delete<void>(
          `/boards/${options.board}/columns/${id}`
        );

        spinner.succeed('Column deleted successfully');

        const format = detectFormat(options);

        if (format === 'json') {
          printOutput({ success: true, message: 'Column deleted' }, format);
        } else {
          printStatus(`Column ${id} deleted`);
        }
      } catch (error) {
        spinner.fail('Failed to delete column');
        printError(error instanceof Error ? error : new Error('Failed to delete column'));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Main columns command
 */
export const columnsCommand = new Command('columns')
  .description('Manage columns on boards')
  .addCommand(createListCommand())
  .addCommand(createGetCommand())
  .addCommand(createCreateCommand())
  .addCommand(createUpdateCommand())
  .addCommand(createDeleteCommand());
