/**
 * Cards commands for fizzy-cli
 */

import { Command } from 'commander';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '../lib/api/client.js';
import { detectFormat, printOutput, printError, printStatus } from '../lib/output/formatter.js';
import { CardSchema, parseApiResponse, type Card } from '../schemas/api.js';

/**
 * Base options for card commands
 */
interface BaseOptions {
  json?: boolean;
  account?: string;
}

/**
 * Options for cards list command
 */
interface ListOptions extends BaseOptions {
  board?: string;
  status?: string;
  tag?: string;
}

/**
 * Options for cards create command
 */
interface CreateOptions extends BaseOptions {
  board: string;
  title: string;
  description?: string;
  status?: 'drafted' | 'published';
}

/**
 * Options for cards update command
 */
interface UpdateOptions extends BaseOptions {
  title?: string;
  description?: string;
  status?: 'drafted' | 'published';
}

/**
 * Options for cards move command
 */
interface MoveOptions extends BaseOptions {
  column: string;
}

/**
 * List cards command
 */
async function listCards(options: ListOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    // Build query parameters
    const params = new URLSearchParams();
    if (options.board) {
      params.append('board_ids[]', options.board);
    }
    if (options.status) {
      params.append('indexed_by', options.status);
    }
    if (options.tag) {
      params.append('tag_ids[]', options.tag);
    }

    const queryString = params.toString();
    const path = `cards${queryString ? `?${queryString}` : ''}`;

    const cards = await client.get<Card[]>(path);
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(cards, format);
    } else {
      // Transform data for table display
      const tableData = cards.map((card) => ({
        Number: card.number,
        Title: card.title,
        Status: card.status,
        Board: card.board.name,
        Created: card.created_at,
      }));

      printOutput(tableData, format, {
        columns: ['Number', 'Title', 'Status', 'Board', 'Created'],
        headers: ['#', 'Title', 'Status', 'Board', 'Created'],
      });
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to fetch cards'));
    process.exit(1);
  }
}

/**
 * Check if a string looks like a card ID (alphanumeric, 20+ chars) vs a number
 */
function isCardId(value: string): boolean {
  // Card IDs are base36-encoded UUIDs, typically 25 chars, alphanumeric
  // Card numbers are purely numeric
  return /^[a-z0-9]{20,}$/i.test(value) && !/^\d+$/.test(value);
}

/**
 * Get card details command
 */
async function getCard(cardIdentifier: string, options: BaseOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    let rawCard: Card;

    if (isCardId(cardIdentifier)) {
      // Fetch by ID using the filter endpoint
      const cards = await client.get<Card[]>(`cards?card_ids[]=${cardIdentifier}`);
      if (cards.length === 0) {
        throw new Error(`Card with ID "${cardIdentifier}" not found`);
      }
      rawCard = cards[0];
    } else {
      // Fetch by number using the direct endpoint
      rawCard = await client.get<Card>(`cards/${cardIdentifier}`);
    }

    const card = parseApiResponse(CardSchema, rawCard, 'card details');
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(card, format);
    } else {
      // Transform data for table display
      const tableData = {
        Number: card.number,
        ID: card.id,
        Title: card.title,
        Status: card.status,
        Description: card.description || 'N/A',
        Board: card.board.name,
        Creator: card.creator.name,
        Golden: card.golden ? 'Yes' : 'No',
        Tags: card.tags.join(', ') || 'None',
        'Last Active': card.last_active_at,
        Created: card.created_at,
        URL: card.url,
      };

      printOutput(tableData, 'table');
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to fetch card details'));
    process.exit(1);
  }
}

/**
 * Create card command
 */
async function createCard(options: CreateOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const payload: Record<string, unknown> = {
      title: options.title,
    };

    if (options.description) {
      payload.description = options.description;
    }

    if (options.status) {
      payload.status = options.status;
    }

    const rawCard = await client.post<Card>(
      `boards/${options.board}/cards`,
      { card: payload }
    );
    const card = parseApiResponse(CardSchema, rawCard, 'card create');
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(card, format);
    } else {
      printStatus(`Card #${card.number} created successfully`);
      const tableData = {
        Number: card.number,
        ID: card.id,
        Title: card.title,
        Status: card.status,
        Board: card.board.name,
        Creator: card.creator.name,
      };
      printOutput(tableData, 'table');
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to create card'));
    process.exit(1);
  }
}

/**
 * Resolve card identifier to card number (for API endpoints that require number)
 */
async function resolveCardNumber(client: ReturnType<typeof createClient>, identifier: string): Promise<string> {
  if (isCardId(identifier)) {
    // Need to look up the card number from the ID
    const cards = await client.get<Card[]>(`cards?card_ids[]=${identifier}`);
    if (cards.length === 0) {
      throw new Error(`Card with ID "${identifier}" not found`);
    }
    return String(cards[0].number);
  }
  return identifier;
}

/**
 * Update card command
 */
async function updateCard(cardIdentifier: string, options: UpdateOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const payload: Record<string, unknown> = {};

    if (options.title) {
      payload.title = options.title;
    }

    if (options.description) {
      payload.description = options.description;
    }

    if (options.status) {
      payload.status = options.status;
    }

    if (Object.keys(payload).length === 0) {
      printError(new Error('No update parameters provided. Use --title, --description, or --status'));
      process.exit(1);
    }

    // Resolve ID to number if needed (API uses card number for updates)
    const cardNumber = await resolveCardNumber(client, cardIdentifier);

    const rawCard = await client.put<Card>(
      `cards/${cardNumber}`,
      { card: payload }
    );
    const card = parseApiResponse(CardSchema, rawCard, 'card update');
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput(card, format);
    } else {
      printStatus(`Card #${card.number} updated successfully`);
      const tableData = {
        Number: card.number,
        Title: card.title,
        Status: card.status,
        Description: card.description || 'N/A',
      };
      printOutput(tableData, 'table');
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to update card'));
    process.exit(1);
  }
}

/**
 * Delete card command
 */
async function deleteCard(cardIdentifier: string, options: BaseOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const cardNumber = await resolveCardNumber(client, cardIdentifier);
    await client.delete(`cards/${cardNumber}`);
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput({ success: true, message: `Card #${cardNumber} deleted successfully` }, format);
    } else {
      printStatus(`Card #${cardNumber} deleted successfully`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to delete card'));
    process.exit(1);
  }
}

/**
 * Close card command
 */
async function closeCard(cardIdentifier: string, options: BaseOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const cardNumber = await resolveCardNumber(client, cardIdentifier);
    await client.post(`cards/${cardNumber}/closure`, {});
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput({ success: true, message: `Card #${cardNumber} closed successfully` }, format);
    } else {
      printStatus(`Card #${cardNumber} closed successfully`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to close card'));
    process.exit(1);
  }
}

/**
 * Reopen card command
 */
async function reopenCard(cardIdentifier: string, options: BaseOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const cardNumber = await resolveCardNumber(client, cardIdentifier);
    await client.delete(`cards/${cardNumber}/closure`);
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput({ success: true, message: `Card #${cardNumber} reopened successfully` }, format);
    } else {
      printStatus(`Card #${cardNumber} reopened successfully`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to reopen card'));
    process.exit(1);
  }
}

/**
 * Move card command
 */
async function moveCard(cardIdentifier: string, options: MoveOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const cardNumber = await resolveCardNumber(client, cardIdentifier);
    await client.post(`cards/${cardNumber}/triage`, {
      column_id: options.column,
    });
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput({ success: true, message: `Card #${cardNumber} moved to column ${options.column}` }, format);
    } else {
      printStatus(`Card #${cardNumber} moved to column ${options.column} successfully`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to move card'));
    process.exit(1);
  }
}

/**
 * Create the cards command group
 */
export function createCardsCommand(): Command {
  const cards = new Command('cards')
    .description('Manage cards (tasks/issues)');

  // List cards
  cards
    .command('list')
    .description('List cards')
    .option('--board <id>', 'Filter by board ID')
    .option('--status <status>', 'Filter by status (e.g., closed, not_now, stalled, golden)')
    .option('--tag <id>', 'Filter by tag ID')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (options: ListOptions) => {
      await listCards(options);
    });

  // Get card
  cards
    .command('get <number>')
    .description('Get card details')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: BaseOptions) => {
      await getCard(cardNumber, options);
    });

  // Create card
  cards
    .command('create')
    .description('Create a new card')
    .requiredOption('--board <id>', 'Board ID')
    .requiredOption('--title <title>', 'Card title')
    .option('--description <text>', 'Card description')
    .option('--status <status>', 'Initial status (drafted or published)', 'published')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (options: CreateOptions) => {
      await createCard(options);
    });

  // Update card
  cards
    .command('update <number>')
    .description('Update a card')
    .option('--title <title>', 'New title')
    .option('--description <text>', 'New description')
    .option('--status <status>', 'New status (drafted or published)')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: UpdateOptions) => {
      await updateCard(cardNumber, options);
    });

  // Delete card
  cards
    .command('delete <number>')
    .description('Delete a card')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: BaseOptions) => {
      await deleteCard(cardNumber, options);
    });

  // Close card
  cards
    .command('close <number>')
    .description('Close a card')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: BaseOptions) => {
      await closeCard(cardNumber, options);
    });

  // Reopen card
  cards
    .command('reopen <number>')
    .description('Reopen a closed card')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: BaseOptions) => {
      await reopenCard(cardNumber, options);
    });

  // Move card
  cards
    .command('move <number>')
    .description('Move card to a column')
    .requiredOption('--column <id>', 'Column ID to move the card to')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: MoveOptions) => {
      await moveCard(cardNumber, options);
    });

  return cards;
}

/**
 * Export the cards command for registration in CLI
 */
export const cardsCommand = createCardsCommand();
