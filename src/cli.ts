/**
 * CLI setup for fizzy-cli using Commander framework
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

// Import commands
import { authCommand } from './commands/auth.js';
import { createBoardsCommand } from './commands/boards.js';
import { createCardsCommand } from './commands/cards.js';
import { columnsCommand } from './commands/columns.js';
import { commentsCommand } from './commands/comments.js';
import { createTagsCommand } from './commands/tags.js';
import { createUsersCommand } from './commands/users.js';
import { createNotificationsCommand } from './commands/notifications.js';

// Create command instances
const boardsCommand = createBoardsCommand();
const cardsCommand = createCardsCommand();
const tagsCommand = createTagsCommand();
const usersCommand = createUsersCommand();
const notificationsCommand = createNotificationsCommand();

// Get package.json for version info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

/**
 * List of all available commands for "did you mean" suggestions
 */
const COMMANDS = [
  'auth', 'boards', 'cards', 'columns', 'comments', 'tags', 'users', 'notifications'
];

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find a similar command based on Levenshtein distance
 */
function findSimilarCommand(input: string, threshold = 3): string | null {
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const cmd of COMMANDS) {
    const distance = levenshteinDistance(input.toLowerCase(), cmd.toLowerCase());
    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance;
      bestMatch = cmd;
    }
  }

  return bestMatch;
}

/**
 * Check if user is authenticated (sync check for CLI startup)
 */
function isAuthenticatedSync(): boolean {
  const tokenPath = join(homedir(), '.fizzy-cli', 'tokens.json');
  return existsSync(tokenPath);
}

/**
 * Run the CLI with the provided arguments
 * @param args - Command line arguments (defaults to process.argv)
 */
export async function runCli(args?: string[]): Promise<void> {
  const program = new Command();

  program
    .name('fizzy')
    .description('Command-line interface for Fizzy API')
    .version(packageJson.version)
    .option('--account <slug>', 'Use specific Fizzy account')
    .option('--verbose', 'Enable verbose output')
    .option('--quiet', 'Suppress non-essential output')
    .option('--no-color', 'Disable colored output')
    .option('--base-url <url>', 'Fizzy API base URL');

  // Configure error handling
  program.showHelpAfterError('(add --help for additional information)');

  // Handle unknown commands with suggestions
  program.on('command:*', (operands) => {
    const unknownCmd = operands[0];
    const suggestion = findSimilarCommand(unknownCmd);

    console.error(`error: unknown command '${unknownCmd}'`);
    if (suggestion) {
      console.error(`Did you mean: ${suggestion}?`);
    }
    console.error(`Run 'fizzy --help' to see available commands.`);
    process.exit(1);
  });

  // Register commands
  program.addCommand(authCommand);
  program.addCommand(boardsCommand);
  program.addCommand(cardsCommand);
  program.addCommand(columnsCommand);
  program.addCommand(commentsCommand);
  program.addCommand(tagsCommand);
  program.addCommand(usersCommand);
  program.addCommand(notificationsCommand);

  // Parse and execute
  await program.parseAsync(args || process.argv);
}
