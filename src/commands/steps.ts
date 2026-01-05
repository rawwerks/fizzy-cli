/**
 * Steps commands for fizzy-cli
 */

import { Command } from 'commander';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '../lib/api/client.js';
import { StepSchema, parseApiResponse } from '../schemas/api.js';
import {
  printOutput,
  printError,
  printStatus,
  detectFormat,
  startSpinner,
  type OutputFormat
} from '../lib/output/formatter.js';
import type { Step } from '../schemas/api.js';
import { confirmDelete } from '../lib/prompts.js';

/**
 * Global options interface
 */
interface GlobalOptions {
  json?: boolean;
  account?: string;
  baseUrl?: string;
}

/**
 * Steps list command - list all steps on a card
 */
function createListCommand(): Command {
  const cmd = new Command('list');

  cmd
    .description('List steps for a card')
    .requiredOption('--card <number>', 'Card number')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Use specific Fizzy account')
    .action(async (options: { card: string } & GlobalOptions) => {
      const spinner = startSpinner('Fetching steps...');

      try {
        const auth = await requireAuth({ accountSlug: options.account });
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          baseUrl: options.baseUrl,
        });

        const rawSteps = await client.get<Step[]>(
          `/cards/${options.card}/steps`
        );

        const steps = rawSteps.map((step) =>
          parseApiResponse(StepSchema, step, 'step')
        );

        spinner.succeed(`Found ${steps.length} step(s)`);

        const format = detectFormat(options);

        if (format === 'json') {
          printOutput(steps, format);
        } else {
          // Transform data for table display
          const tableData = steps.map((step) => ({
            ID: step.id,
            Content: step.content,
            Completed: step.completed ? 'Yes' : 'No',
          }));

          printOutput(tableData, format, {
            columns: ['ID', 'Content', 'Completed'],
            headers: ['ID', 'Content', 'Completed'],
          });
        }
      } catch (error) {
        spinner.fail('Failed to fetch steps');
        printError(error instanceof Error ? error : new Error('Failed to fetch steps'));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Steps get command - get details of a specific step
 */
function createGetCommand(): Command {
  const cmd = new Command('get');

  cmd
    .description('Get step details')
    .argument('<id>', 'Step ID')
    .requiredOption('--card <number>', 'Card number')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Use specific Fizzy account')
    .action(async (id: string, options: { card: string } & GlobalOptions) => {
      const spinner = startSpinner('Fetching step details...');

      try {
        const auth = await requireAuth({ accountSlug: options.account });
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          baseUrl: options.baseUrl,
        });

        const rawStep = await client.get<Step>(
          `/cards/${options.card}/steps/${id}`
        );

        const step = parseApiResponse(StepSchema, rawStep, 'step details');

        spinner.succeed('Step details fetched');

        const format = detectFormat(options);

        if (format === 'json') {
          printOutput(step, format);
        } else {
          // Transform data for table display (key-value pairs)
          const tableData = {
            ID: step.id,
            Content: step.content,
            Completed: step.completed ? 'Yes' : 'No',
          };

          printOutput(tableData, 'table');
        }
      } catch (error) {
        spinner.fail('Failed to fetch step details');
        printError(error instanceof Error ? error : new Error('Failed to fetch step details'));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Steps create command - create a new step on a card
 */
function createCreateCommand(): Command {
  const cmd = new Command('create');

  cmd
    .description('Create a new step on a card')
    .requiredOption('--card <number>', 'Card number')
    .requiredOption('--content <content>', 'Step content')
    .option('--completed', 'Mark step as completed', false)
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Use specific Fizzy account')
    .action(async (options: { card: string; content: string; completed?: boolean } & GlobalOptions) => {
      const spinner = startSpinner('Creating step...');

      try {
        const auth = await requireAuth({ accountSlug: options.account });
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          baseUrl: options.baseUrl,
        });

        const requestBody: { step: { content: string; completed?: boolean } } = {
          step: {
            content: options.content,
          },
        };

        if (options.completed !== undefined) {
          requestBody.step.completed = options.completed;
        }

        const rawStep = await client.post<Step>(
          `/cards/${options.card}/steps`,
          requestBody
        );

        const step = parseApiResponse(StepSchema, rawStep, 'created step');

        spinner.succeed('Step created successfully');

        const format = detectFormat(options);

        if (format === 'json') {
          printOutput(step, format);
        } else {
          printStatus(`Step "${step.content}" created with ID: ${step.id}`);

          const tableData = {
            ID: step.id,
            Content: step.content,
            Completed: step.completed ? 'Yes' : 'No',
          };

          printOutput(tableData, 'table');
        }
      } catch (error) {
        spinner.fail('Failed to create step');
        printError(error instanceof Error ? error : new Error('Failed to create step'));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Steps update command - update an existing step
 */
function createUpdateCommand(): Command {
  const cmd = new Command('update');

  cmd
    .description('Update a step')
    .argument('<id>', 'Step ID')
    .requiredOption('--card <number>', 'Card number')
    .option('--content <content>', 'New step content')
    .option('--completed <completed>', 'Set completed status (true/false)')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Use specific Fizzy account')
    .action(async (id: string, options: { card: string; content?: string; completed?: string } & GlobalOptions) => {
      // Validate at least one update field is provided
      if (!options.content && options.completed === undefined) {
        printError('At least one of --content or --completed must be provided');
        process.exit(1);
      }

      const spinner = startSpinner('Updating step...');

      try {
        const auth = await requireAuth({ accountSlug: options.account });
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          baseUrl: options.baseUrl,
        });

        const requestBody: { step: { content?: string; completed?: boolean } } = {
          step: {},
        };

        if (options.content) {
          requestBody.step.content = options.content;
        }

        if (options.completed !== undefined) {
          // Parse boolean from string
          const completedValue = options.completed.toLowerCase();
          if (completedValue !== 'true' && completedValue !== 'false') {
            printError('--completed must be "true" or "false"');
            process.exit(1);
          }
          requestBody.step.completed = completedValue === 'true';
        }

        // PUT returns 204 No Content, so we need to fetch the updated step
        await client.put<void>(
          `/cards/${options.card}/steps/${id}`,
          requestBody
        );

        // Fetch the updated step
        const rawStep = await client.get<Step>(
          `/cards/${options.card}/steps/${id}`
        );

        const step = parseApiResponse(StepSchema, rawStep, 'updated step');

        spinner.succeed('Step updated successfully');

        const format = detectFormat(options);

        if (format === 'json') {
          printOutput(step, format);
        } else {
          printStatus(`Step "${step.content}" updated`);

          const tableData = {
            ID: step.id,
            Content: step.content,
            Completed: step.completed ? 'Yes' : 'No',
          };

          printOutput(tableData, 'table');
        }
      } catch (error) {
        spinner.fail('Failed to update step');
        printError(error instanceof Error ? error : new Error('Failed to update step'));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Steps delete command - delete a step
 */
function createDeleteCommand(): Command {
  const cmd = new Command('delete');

  cmd
    .description('Delete a step')
    .argument('<id>', 'Step ID')
    .requiredOption('--card <number>', 'Card number')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Use specific Fizzy account')
    .action(async (id: string, options: { card: string } & GlobalOptions) => {
      const spinner = startSpinner('Deleting step...');

      try {
        const auth = await requireAuth({ accountSlug: options.account });
        const client = createClient({
          auth: { type: 'bearer', token: auth.account.access_token },
          accountSlug: auth.account.account_slug,
          baseUrl: options.baseUrl,
        });

        await client.delete<void>(
          `/cards/${options.card}/steps/${id}`
        );

        spinner.succeed('Step deleted successfully');

        const format = detectFormat(options);

        if (format === 'json') {
          printOutput({ success: true, message: 'Step deleted' }, format);
        } else {
          printStatus(`Step ${id} deleted`);
        }
      } catch (error) {
        spinner.fail('Failed to delete step');
        printError(error instanceof Error ? error : new Error('Failed to delete step'));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Main steps command
 */
export const stepsCommand = new Command('steps')
  .description('Manage steps on cards')
  .addCommand(createListCommand())
  .addCommand(createGetCommand())
  .addCommand(createCreateCommand())
  .addCommand(createUpdateCommand())
  .addCommand(createDeleteCommand())
  .addHelpText('after', `
Examples:
  # List all steps on a card
  $ fizzy steps list --card 42

  # Get step details
  $ fizzy steps get step-id --card 42

  # Create a new step
  $ fizzy steps create --card 42 --content "Review code"

  # Update step content
  $ fizzy steps update step-id --card 42 --content "Review and approve code"

  # Mark step as completed
  $ fizzy steps update step-id --card 42 --completed true

  # Delete a step
  $ fizzy steps delete step-id --card 42
`);
