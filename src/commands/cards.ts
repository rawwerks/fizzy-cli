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
  image?: string;
}

/**
 * Options for cards update command
 */
interface UpdateOptions extends BaseOptions {
  title?: string;
  description?: string;
  status?: 'drafted' | 'published';
  image?: string;
}

/**
 * Options for cards move command
 */
interface MoveOptions extends BaseOptions {
  column: string;
}

/**
 * Options for cards tag command
 */
interface TagOptions extends BaseOptions {
  add?: string[];
  remove?: string[];
}

/**
 * Options for cards assign command
 */
interface AssignOptions extends BaseOptions {
  add?: string[];
  remove?: string[];
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

    let rawCard: Card;

    // If image is provided, use multipart/form-data upload
    if (options.image) {
      // Validate file exists
      const fs = await import('fs/promises');
      try {
        await fs.access(options.image);
      } catch {
        throw new Error(`Image file not found: ${options.image}`);
      }

      // Validate file extension
      const ext = options.image.split('.').pop()?.toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      if (!ext || !validExtensions.includes(ext)) {
        throw new Error(`Invalid image format. Supported formats: ${validExtensions.join(', ')}`);
      }

      rawCard = await client.uploadFile<Card>(
        `boards/${options.board}/cards`,
        options.image,
        'card[image]',
        { card: payload },
        'POST'
      );
    } else {
      // Regular JSON request
      rawCard = await client.post<Card>(
        `boards/${options.board}/cards`,
        { card: payload }
      );
    }

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

    if (Object.keys(payload).length === 0 && !options.image) {
      printError(new Error('No update parameters provided. Use --title, --description, --status, or --image'));
      process.exit(1);
    }

    // Resolve ID to number if needed (API uses card number for updates)
    const cardNumber = await resolveCardNumber(client, cardIdentifier);

    let rawCard: Card;

    // If image is provided, use multipart/form-data upload
    if (options.image) {
      // Validate file exists
      const fs = await import('fs/promises');
      try {
        await fs.access(options.image);
      } catch {
        throw new Error(`Image file not found: ${options.image}`);
      }

      // Validate file extension
      const ext = options.image.split('.').pop()?.toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      if (!ext || !validExtensions.includes(ext)) {
        throw new Error(`Invalid image format. Supported formats: ${validExtensions.join(', ')}`);
      }

      rawCard = await client.uploadFile<Card>(
        `cards/${cardNumber}`,
        options.image,
        'card[image]',
        { card: payload },
        'PUT'
      );
    } else {
      // Regular JSON request
      rawCard = await client.put<Card>(
        `cards/${cardNumber}`,
        { card: payload }
      );
    }

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
 * Postpone card command
 */
async function postponeCard(cardIdentifier: string, options: BaseOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const cardNumber = await resolveCardNumber(client, cardIdentifier);
    await client.post(`cards/${cardNumber}/not_now`, {});
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput({ success: true, message: `Card #${cardNumber} postponed successfully` }, format);
    } else {
      printStatus(`Card #${cardNumber} postponed successfully`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to postpone card'));
    process.exit(1);
  }
}

/**
 * Send card to triage command
 */
async function triageCard(cardIdentifier: string, options: BaseOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const cardNumber = await resolveCardNumber(client, cardIdentifier);
    await client.delete(`cards/${cardNumber}/triage`);
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput({ success: true, message: `Card #${cardNumber} sent to triage successfully` }, format);
    } else {
      printStatus(`Card #${cardNumber} sent to triage successfully`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to send card to triage'));
    process.exit(1);
  }
}

/**
 * Tag card command (add/remove tags)
 */
async function tagCard(cardIdentifier: string, options: TagOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    if (!options.add && !options.remove) {
      printError(new Error('No tag operations specified. Use --add or --remove'));
      process.exit(1);
    }

    const cardNumber = await resolveCardNumber(client, cardIdentifier);
    const format = detectFormat(options);
    const operations: string[] = [];

    // Add tags
    if (options.add && options.add.length > 0) {
      for (const tag of options.add) {
        await client.post(`cards/${cardNumber}/taggings`, { tag_title: tag });
        operations.push(`added "${tag}"`);
      }
    }

    // Remove tags (toggle to remove)
    if (options.remove && options.remove.length > 0) {
      for (const tag of options.remove) {
        await client.post(`cards/${cardNumber}/taggings`, { tag_title: tag });
        operations.push(`removed "${tag}"`);
      }
    }

    if (format === 'json') {
      printOutput({ success: true, message: `Card #${cardNumber} tags updated`, operations }, format);
    } else {
      printStatus(`Card #${cardNumber}: ${operations.join(', ')}`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to update card tags'));
    process.exit(1);
  }
}

/**
 * Assign card command (assign/unassign users)
 */
async function assignCard(cardIdentifier: string, options: AssignOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    if (!options.add && !options.remove) {
      printError(new Error('No assignment operations specified. Use --add or --remove'));
      process.exit(1);
    }

    const cardNumber = await resolveCardNumber(client, cardIdentifier);
    const format = detectFormat(options);
    const operations: string[] = [];

    // Assign users
    if (options.add && options.add.length > 0) {
      for (const userId of options.add) {
        await client.post(`cards/${cardNumber}/assignments`, { assignee_id: userId });
        operations.push(`assigned ${userId}`);
      }
    }

    // Unassign users (toggle to unassign)
    if (options.remove && options.remove.length > 0) {
      for (const userId of options.remove) {
        await client.post(`cards/${cardNumber}/assignments`, { assignee_id: userId });
        operations.push(`unassigned ${userId}`);
      }
    }

    if (format === 'json') {
      printOutput({ success: true, message: `Card #${cardNumber} assignments updated`, operations }, format);
    } else {
      printStatus(`Card #${cardNumber}: ${operations.join(', ')}`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to update card assignments'));
    process.exit(1);
  }
}

/**
 * Watch card command
 */
async function watchCard(cardIdentifier: string, options: BaseOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const cardNumber = await resolveCardNumber(client, cardIdentifier);
    await client.post(`cards/${cardNumber}/watch`, {});
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput({ success: true, message: `Now watching card #${cardNumber}` }, format);
    } else {
      printStatus(`Now watching card #${cardNumber}`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to watch card'));
    process.exit(1);
  }
}

/**
 * Unwatch card command
 */
async function unwatchCard(cardIdentifier: string, options: BaseOptions): Promise<void> {
  try {
    const auth = await requireAuth({ accountSlug: options.account });
    const client = createClient({
      auth: { type: 'bearer', token: auth.account.access_token },
      accountSlug: auth.account.account_slug,
    });

    const cardNumber = await resolveCardNumber(client, cardIdentifier);
    await client.delete(`cards/${cardNumber}/watch`);
    const format = detectFormat(options);

    if (format === 'json') {
      printOutput({ success: true, message: `Stopped watching card #${cardNumber}` }, format);
    } else {
      printStatus(`Stopped watching card #${cardNumber}`);
    }
  } catch (error) {
    printError(error instanceof Error ? error : new Error('Failed to unwatch card'));
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
    .option('--image <path>', 'Path to card header image (jpg, png, gif, webp)')
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
    .option('--image <path>', 'Path to card header image (jpg, png, gif, webp)')
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

  // Postpone card
  cards
    .command('postpone <number>')
    .description('Postpone a card (move to "Not Now")')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: BaseOptions) => {
      await postponeCard(cardNumber, options);
    });

  // Send card to triage
  cards
    .command('triage <number>')
    .description('Send card to triage')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: BaseOptions) => {
      await triageCard(cardNumber, options);
    });

  // Tag card
  cards
    .command('tag <number>')
    .description('Add or remove tags from a card')
    .option('--add <tags...>', 'Tags to add')
    .option('--remove <tags...>', 'Tags to remove')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: TagOptions) => {
      await tagCard(cardNumber, options);
    });

  // Assign card
  cards
    .command('assign <number>')
    .description('Assign or unassign users to/from a card')
    .option('--add <users...>', 'User IDs to assign')
    .option('--remove <users...>', 'User IDs to unassign')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: AssignOptions) => {
      await assignCard(cardNumber, options);
    });

  // Watch card
  cards
    .command('watch <number>')
    .description('Watch a card (receive notifications)')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: BaseOptions) => {
      await watchCard(cardNumber, options);
    });

  // Unwatch card
  cards
    .command('unwatch <number>')
    .description('Unwatch a card (stop receiving notifications)')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (cardNumber: string, options: BaseOptions) => {
      await unwatchCard(cardNumber, options);
    });

  return cards;
}

/**
 * Export the cards command for registration in CLI
 */
export const cardsCommand = createCardsCommand();
