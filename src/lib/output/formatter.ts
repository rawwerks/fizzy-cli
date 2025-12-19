/**
 * Output formatting utilities for Fizzy CLI
 */

import Table from 'cli-table3';
import chalk from 'chalk';
import ora, { Ora } from 'ora';

/**
 * Output format types supported by the formatter
 */
export type OutputFormat = 'json' | 'table' | 'list' | 'card';

/**
 * Configuration for table formatting
 */
export interface TableConfig {
  columns?: string[];
  headers?: string[];
  style?: {
    head?: string[];
    border?: string[];
  };
}

/**
 * Interface for card data
 */
export interface CardData {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  assignees?: string[];
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Interface for board data
 */
export interface BoardData {
  id?: string;
  name?: string;
  description?: string;
  cardCount?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Interface for pagination info
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Format data as pretty-printed JSON
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format data as a table using cli-table3
 */
export function formatTable(data: unknown, config?: TableConfig): string {
  if (!data) {
    return '';
  }

  // Handle arrays of objects
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return 'No data to display';
    }

    // If first item is an object, create a table from it
    if (typeof data[0] === 'object' && data[0] !== null) {
      const columns = config?.columns || Object.keys(data[0]);
      const headers = config?.headers || columns;

      const table = new Table({
        head: headers,
        style: {
          head: config?.style?.head || ['cyan'],
          border: config?.style?.border || ['gray']
        }
      });

      for (const item of data) {
        const row = columns.map(col => {
          const value = (item as Record<string, unknown>)[col];
          return formatValue(value);
        });
        table.push(row);
      }

      return table.toString();
    }

    // Simple array - display as single column
    const table = new Table({
      head: ['Value'],
      style: {
        head: ['cyan'],
        border: ['gray']
      }
    });

    for (const item of data) {
      table.push([formatValue(item)]);
    }

    return table.toString();
  }

  // Handle single object
  if (typeof data === 'object') {
    const table = new Table({
      style: {
        head: ['cyan'],
        border: ['gray']
      }
    });

    for (const [key, value] of Object.entries(data)) {
      table.push({ [key]: formatValue(value) });
    }

    return table.toString();
  }

  // Fallback for primitives
  return String(data);
}

/**
 * Format data as a simple list
 */
export function formatList(data: unknown): string {
  if (!data) {
    return '';
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return 'No items to display';
    }

    return data.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        const entries = Object.entries(item);
        const formatted = entries
          .map(([key, value]) => `  ${chalk.gray(key)}: ${formatValue(value)}`)
          .join('\n');
        return `${chalk.cyan(`[${index + 1}]`)}\n${formatted}`;
      }
      return `${chalk.cyan('•')} ${formatValue(item)}`;
    }).join('\n\n');
  }

  if (typeof data === 'object') {
    return Object.entries(data)
      .map(([key, value]) => `${chalk.cyan(key)}: ${formatValue(value)}`)
      .join('\n');
  }

  return String(data);
}

/**
 * Format a single card with details
 */
export function formatCard(card: CardData): string {
  const lines: string[] = [];

  if (card.title) {
    lines.push(chalk.bold.cyan(card.title));
  }

  if (card.id) {
    lines.push(chalk.gray(`ID: ${card.id}`));
  }

  if (card.status) {
    const statusColor = getStatusColor(card.status);
    lines.push(`Status: ${statusColor(card.status)}`);
  }

  if (card.description) {
    lines.push('');
    lines.push(card.description);
  }

  if (card.assignees && card.assignees.length > 0) {
    lines.push('');
    lines.push(`Assignees: ${card.assignees.join(', ')}`);
  }

  if (card.dueDate) {
    lines.push(`Due: ${formatDate(card.dueDate)}`);
  }

  if (card.createdAt) {
    lines.push(chalk.gray(`Created: ${formatDate(card.createdAt)}`));
  }

  if (card.updatedAt) {
    lines.push(chalk.gray(`Updated: ${formatDate(card.updatedAt)}`));
  }

  // Add any additional fields
  const knownKeys = ['id', 'title', 'description', 'status', 'assignees', 'dueDate', 'createdAt', 'updatedAt'];
  const extraEntries = Object.entries(card).filter(([key]) => !knownKeys.includes(key));

  if (extraEntries.length > 0) {
    lines.push('');
    extraEntries.forEach(([key, value]) => {
      lines.push(`${key}: ${formatValue(value)}`);
    });
  }

  return lines.join('\n');
}

/**
 * Format a board with metadata
 */
export function formatBoard(board: BoardData): string {
  const lines: string[] = [];

  if (board.name) {
    lines.push(chalk.bold.cyan(board.name));
  }

  if (board.id) {
    lines.push(chalk.gray(`ID: ${board.id}`));
  }

  if (board.description) {
    lines.push('');
    lines.push(board.description);
  }

  if (board.cardCount !== undefined) {
    lines.push('');
    lines.push(`Cards: ${chalk.cyan(String(board.cardCount))}`);
  }

  if (board.createdAt) {
    lines.push(chalk.gray(`Created: ${formatDate(board.createdAt)}`));
  }

  if (board.updatedAt) {
    lines.push(chalk.gray(`Updated: ${formatDate(board.updatedAt)}`));
  }

  // Add any additional fields
  const knownKeys = ['id', 'name', 'description', 'cardCount', 'createdAt', 'updatedAt'];
  const extraEntries = Object.entries(board).filter(([key]) => !knownKeys.includes(key));

  if (extraEntries.length > 0) {
    lines.push('');
    extraEntries.forEach(([key, value]) => {
      lines.push(`${key}: ${formatValue(value)}`);
    });
  }

  return lines.join('\n');
}

/**
 * Format pagination information
 */
export function formatPagination(pagination: PaginationInfo): string {
  const { page, pageSize, total, totalPages } = pagination;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return chalk.gray(
    `Showing ${start}-${end} of ${total} (page ${page}/${totalPages})`
  );
}

/**
 * Format a date string nicely
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return String(date);
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // If less than an hour ago
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  // If less than a day ago
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  // If less than a week ago
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Otherwise, show the date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return chalk.gray('(empty)');
  }

  if (typeof value === 'boolean') {
    return value ? chalk.green('✓') : chalk.red('✗');
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Get color for status
 */
function getStatusColor(status: string): (text: string) => string {
  const normalized = status.toLowerCase();

  if (normalized === 'done' || normalized === 'completed' || normalized === 'complete') {
    return chalk.green;
  }

  if (normalized === 'in progress' || normalized === 'in_progress' || normalized === 'active') {
    return chalk.yellow;
  }

  if (normalized === 'todo' || normalized === 'pending') {
    return chalk.blue;
  }

  if (normalized === 'blocked' || normalized === 'cancelled' || normalized === 'canceled') {
    return chalk.red;
  }

  return chalk.white;
}

/**
 * Format output based on the specified format
 */
export function formatOutput(
  data: unknown,
  format: OutputFormat,
  config?: TableConfig
): string {
  switch (format) {
    case 'json':
      return formatJson(data);
    case 'list':
      return formatList(data);
    case 'table':
      return formatTable(data, config);
    case 'card':
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        return formatCard(data as CardData);
      }
      return formatTable(data, config);
    default:
      return formatJson(data);
  }
}

/**
 * Format error message for display
 */
export function formatError(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;
  return chalk.red(`Error: ${message}`);
}

/**
 * Detect output format from command-line arguments
 */
export function detectFormat(argv: { json?: boolean }): OutputFormat {
  if (argv.json) {
    return 'json';
  }
  // Default to table format for better readability
  return 'table';
}

/**
 * Print formatted output to stdout
 */
export function printOutput(data: unknown, format: OutputFormat, config?: TableConfig): void {
  const output = formatOutput(data, format, config);
  console.log(output);
}

/**
 * Print error message to stderr
 */
export function printError(error: Error | string): void {
  const formatted = formatError(error);
  console.error(formatted);
}

/**
 * Create and return a spinner instance
 */
export function createSpinner(text: string): Ora {
  return ora(text);
}

/**
 * Start a spinner with the given text
 */
export function startSpinner(text: string): Ora {
  return ora(text).start();
}

/**
 * Spinner utilities
 */
export const spinner = {
  /**
   * Start a new spinner
   */
  start: (text: string): Ora => {
    return ora(text).start();
  },

  /**
   * Create a spinner instance without starting it
   */
  create: (text: string): Ora => {
    return ora(text);
  },

  /**
   * Update spinner text
   */
  update: (spinner: Ora, text: string): void => {
    spinner.text = text;
  },

  /**
   * Succeed and stop spinner
   */
  succeed: (spinner: Ora, text?: string): void => {
    if (text) {
      spinner.succeed(text);
    } else {
      spinner.succeed();
    }
  },

  /**
   * Fail and stop spinner
   */
  fail: (spinner: Ora, text?: string): void => {
    if (text) {
      spinner.fail(text);
    } else {
      spinner.fail();
    }
  },

  /**
   * Stop spinner
   */
  stop: (spinner: Ora): void => {
    spinner.stop();
  }
};

/**
 * Verbose mode state
 */
let verboseMode = false;

/**
 * Set verbose mode
 */
export function setVerboseMode(value: boolean): void {
  verboseMode = value;
}

/**
 * Check if verbose mode is enabled
 */
export function isVerboseMode(): boolean {
  return verboseMode;
}

/**
 * Print verbose message to stderr
 */
export function printVerbose(message: string): void {
  if (verboseMode) {
    console.error(chalk.gray(`[verbose] ${message}`));
  }
}

/**
 * Quiet mode state
 */
let quietMode = false;

/**
 * Set quiet mode
 */
export function setQuietMode(value: boolean): void {
  quietMode = value;
}

/**
 * Check if quiet mode is enabled
 */
export function isQuietMode(): boolean {
  return quietMode;
}

/**
 * Print a status message (suppressed in quiet mode)
 * Use this for non-data output like "Fetching...", "Success!", etc.
 */
export function printStatus(message: string): void {
  if (!quietMode) {
    console.log(message);
  }
}
