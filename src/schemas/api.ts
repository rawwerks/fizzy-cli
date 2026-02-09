/**
 * Zod schemas for Fizzy API responses
 * Based on: /home/raw/Documents/GitHub/fizzy-cli/fizzy-api/docs/API.md
 *
 * These schemas provide runtime validation to ensure API responses match expected shapes.
 * All schemas are derived from the official Fizzy API documentation.
 */

import { z } from 'zod';

// =============================================================================
// User
// =============================================================================

/**
 * User object - represents a person's membership in an account
 * Source: API.md - Users section
 */
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['owner', 'admin', 'member', 'system']),
  active: z.boolean(),
  email_address: z.string().nullable().optional(),
  created_at: z.string(),
  url: z.string(),
});
export type User = z.infer<typeof UserSchema>;

// =============================================================================
// Account
// =============================================================================

/**
 * Account object - represents a tenant/organization
 * Source: API.md - Identity section (GET /my/identity)
 */
export const AccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  created_at: z.string(),
  user: UserSchema,
});
export type Account = z.infer<typeof AccountSchema>;

// =============================================================================
// Identity
// =============================================================================

/**
 * Identity response - contains accounts the identity has access to
 * Source: API.md - GET /my/identity
 */
export const IdentityResponseSchema = z.object({
  accounts: z.array(AccountSchema),
});
export type IdentityResponse = z.infer<typeof IdentityResponseSchema>;

// =============================================================================
// Board
// =============================================================================

/**
 * Board object - primary organizational unit for cards
 * Source: API.md - Boards section
 */
export const BoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  all_access: z.boolean(),
  created_at: z.string(),
  url: z.string(),
  creator: UserSchema,
});
export type Board = z.infer<typeof BoardSchema>;

// =============================================================================
// Steps
// =============================================================================

/**
 * Step object - to-do item on a card
 * Source: API.md - Steps section
 */
export const StepSchema = z.object({
  id: z.string(),
  content: z.string(),
  completed: z.boolean(),
});
export type Step = z.infer<typeof StepSchema>;

// =============================================================================
// Card
// =============================================================================

/**
 * Card object - main work item (task/issue)
 * Source: API.md - Cards section
 */
export const CardSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  status: z.string(),
  description: z.string(),
  description_html: z.string(),
  image_url: z.string().nullable(),
  tags: z.array(z.string()),
  golden: z.boolean(),
  last_active_at: z.string(),
  created_at: z.string(),
  url: z.string(),
  board: BoardSchema,
  creator: UserSchema,
  comments_url: z.string(),
  steps: z.array(StepSchema).optional(),
});
export type Card = z.infer<typeof CardSchema>;

// =============================================================================
// Comment
// =============================================================================

/**
 * Comment body - contains plain text and HTML versions
 * Source: API.md - Comments section
 */
export const CommentBodySchema = z.object({
  plain_text: z.string(),
  html: z.string(),
});
export type CommentBody = z.infer<typeof CommentBodySchema>;

/**
 * Comment object - attached to cards
 * Source: API.md - Comments section
 */
export const CommentSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  body: CommentBodySchema,
  creator: UserSchema,
  reactions_url: z.string(),
  url: z.string(),
});
export type Comment = z.infer<typeof CommentSchema>;

// =============================================================================
// Reaction
// =============================================================================

/**
 * Reaction object - short responses to comments
 * Source: API.md - Reactions section
 */
export const ReactionSchema = z.object({
  id: z.string(),
  content: z.string(),
  reacter: UserSchema,
  url: z.string(),
});
export type Reaction = z.infer<typeof ReactionSchema>;

// =============================================================================
// Tag
// =============================================================================

/**
 * Tag object - labels for organizing cards
 * Source: API.md - Tags section
 */
export const TagSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.string(),
  url: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

// =============================================================================
// Column
// =============================================================================

/**
 * Column object - represents workflow stages on a board
 * Source: API.md - Columns section
 */
export const ColumnSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(), // API returns CSS variable string like "var(--color-card-default)"
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(), // API may include updated_at timestamp
  url: z.string().optional(), // API may include URL field
  position: z.number().optional(), // API may include position/order field
}).passthrough(); // Allow additional fields from API
export type Column = z.infer<typeof ColumnSchema>;

/**
 * Columns list response - wraps array of columns
 * Source: API.md - GET /boards/:id/columns
 */
export const ColumnsListResponseSchema = z.object({
  columns: z.array(ColumnSchema),
});
export type ColumnsListResponse = z.infer<typeof ColumnsListResponseSchema>;

// =============================================================================
// Notification
// =============================================================================

/**
 * Notification card - minimal card info in notification context
 * Source: API.md - Notifications section
 */
export const NotificationCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  url: z.string(),
});
export type NotificationCard = z.infer<typeof NotificationCardSchema>;

/**
 * Notification object - informs users about events
 * Source: API.md - Notifications section
 */
export const NotificationSchema = z.object({
  id: z.string(),
  read: z.boolean(),
  read_at: z.string().nullable(),
  created_at: z.string(),
  title: z.string(),
  body: z.string(),
  creator: UserSchema,
  card: NotificationCardSchema,
  url: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// =============================================================================
// Validation helpers
// =============================================================================

/**
 * Parse and validate API response, throwing on validation errors
 */
export function parseApiResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(
      `API response validation failed${context ? ` (${context})` : ''}: ${errors}`
    );
  }
  return result.data;
}

/**
 * Safely parse API response, returning null on validation errors
 */
export function safeParseApiResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
