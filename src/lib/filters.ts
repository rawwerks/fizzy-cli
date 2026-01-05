/**
 * Client-side filtering utilities for Fizzy CLI
 *
 * Provides powerful filtering, searching, and sorting capabilities for list commands.
 * Since the Fizzy API may not support all filters server-side, we implement
 * client-side filtering to provide a rich filtering experience.
 */

import type { Card, Board, Comment, Notification, User } from '../schemas/api.js';

// =============================================================================
// Filter Types
// =============================================================================

/**
 * Filters for card lists
 */
export interface CardFilters {
  board?: string;
  status?: string;
  tag?: string;
  assignee?: string;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  sort?: 'created_at' | 'updated_at' | 'title' | 'number';
  order?: 'asc' | 'desc';
}

/**
 * Filters for board lists
 */
export interface BoardFilters {
  search?: string;
  sort?: 'name' | 'created_at';
  order?: 'asc' | 'desc';
}

/**
 * Filters for comment lists
 */
export interface CommentFilters {
  search?: string;
  user?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  sort?: 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

/**
 * Filters for notification lists
 */
export interface NotificationFilters {
  read?: boolean;
  unread?: boolean;
  type?: string;
  search?: string;
  sort?: 'created_at';
  order?: 'asc' | 'desc';
}

/**
 * Filters for user lists
 */
export interface UserFilters {
  role?: 'owner' | 'admin' | 'member' | 'system';
  search?: string;
  active?: boolean;
  sort?: 'name' | 'created_at';
  order?: 'asc' | 'desc';
}

// =============================================================================
// Card Filtering
// =============================================================================

/**
 * Filter cards based on provided criteria
 */
export function filterCards(cards: Card[], filters: CardFilters): Card[] {
  let filtered = [...cards];

  // Board filter
  if (filters.board) {
    filtered = filtered.filter(card => card.board.id === filters.board);
  }

  // Status filter
  if (filters.status) {
    filtered = filtered.filter(card => card.status === filters.status);
  }

  // Tag filter
  if (filters.tag) {
    filtered = filtered.filter(card =>
      card.tags?.some(t => t === filters.tag)
    );
  }

  // Assignee filter (Note: Card schema doesn't have assignees in the current definition)
  // This would need to be added when the schema is updated
  if (filters.assignee) {
    // filtered = filtered.filter(card =>
    //   card.assignees?.some(a => a.id === filters.assignee)
    // );
  }

  // Search filter (title and description)
  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(card =>
      card.title.toLowerCase().includes(query) ||
      (card.description || '').toLowerCase().includes(query)
    );
  }

  // Date filters
  if (filters.createdAfter) {
    filtered = filtered.filter(card =>
      new Date(card.created_at) >= filters.createdAfter!
    );
  }

  if (filters.createdBefore) {
    filtered = filtered.filter(card =>
      new Date(card.created_at) <= filters.createdBefore!
    );
  }

  // Sort
  if (filters.sort) {
    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (filters.sort) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'number':
          aVal = a.number;
          bVal = b.number;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          aVal = new Date(a.last_active_at).getTime();
          bVal = new Date(b.last_active_at).getTime();
          break;
        default:
          return 0;
      }

      if (filters.order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  return filtered;
}

// =============================================================================
// Board Filtering
// =============================================================================

/**
 * Filter boards based on provided criteria
 */
export function filterBoards(boards: Board[], filters: BoardFilters): Board[] {
  let filtered = [...boards];

  // Search filter (name only)
  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(board =>
      board.name.toLowerCase().includes(query)
    );
  }

  // Sort
  if (filters.sort) {
    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (filters.sort) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (filters.order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  return filtered;
}

// =============================================================================
// Comment Filtering
// =============================================================================

/**
 * Filter comments based on provided criteria
 */
export function filterComments(comments: Comment[], filters: CommentFilters): Comment[] {
  let filtered = [...comments];

  // User filter
  if (filters.user) {
    filtered = filtered.filter(comment => comment.creator.id === filters.user);
  }

  // Search filter (body only)
  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(comment =>
      comment.body.plain_text.toLowerCase().includes(query)
    );
  }

  // Date filters
  if (filters.createdAfter) {
    filtered = filtered.filter(comment =>
      new Date(comment.created_at) >= filters.createdAfter!
    );
  }

  if (filters.createdBefore) {
    filtered = filtered.filter(comment =>
      new Date(comment.created_at) <= filters.createdBefore!
    );
  }

  // Sort
  if (filters.sort) {
    filtered.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (filters.sort) {
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          aVal = new Date(a.updated_at).getTime();
          bVal = new Date(b.updated_at).getTime();
          break;
        default:
          return 0;
      }

      if (filters.order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  return filtered;
}

// =============================================================================
// Notification Filtering
// =============================================================================

/**
 * Filter notifications based on provided criteria
 */
export function filterNotifications(notifications: Notification[], filters: NotificationFilters): Notification[] {
  let filtered = [...notifications];

  // Read/unread filters
  if (filters.read !== undefined) {
    filtered = filtered.filter(notification => notification.read === filters.read);
  }

  if (filters.unread !== undefined) {
    filtered = filtered.filter(notification => notification.read === !filters.unread);
  }

  // Search filter (title and body)
  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(notification =>
      notification.title.toLowerCase().includes(query) ||
      notification.body.toLowerCase().includes(query)
    );
  }

  // Sort
  if (filters.sort) {
    filtered.sort((a, b) => {
      const aVal = new Date(a.created_at).getTime();
      const bVal = new Date(b.created_at).getTime();

      if (filters.order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  return filtered;
}

// =============================================================================
// User Filtering
// =============================================================================

/**
 * Filter users based on provided criteria
 */
export function filterUsers(users: User[], filters: UserFilters): User[] {
  let filtered = [...users];

  // Role filter
  if (filters.role) {
    filtered = filtered.filter(user => user.role === filters.role);
  }

  // Active filter
  if (filters.active !== undefined) {
    filtered = filtered.filter(user => user.active === filters.active);
  }

  // Search filter (name and email)
  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email_address.toLowerCase().includes(query)
    );
  }

  // Sort
  if (filters.sort) {
    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (filters.sort) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (filters.order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  return filtered;
}

// =============================================================================
// Date Parsing
// =============================================================================

/**
 * Parse a date string to a Date object
 * Supports ISO 8601 and common date formats
 */
export function parseDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Use ISO 8601 format (e.g., 2024-01-01)`);
  }
  return date;
}
