/**
 * Tests for filtering utilities
 */

import { describe, it, expect } from 'bun:test';
import {
  filterCards,
  filterBoards,
  filterComments,
  filterNotifications,
  filterUsers,
  parseDate,
  type CardFilters,
  type BoardFilters,
  type CommentFilters,
  type NotificationFilters,
  type UserFilters,
} from '../filters.js';
import type { Card, Board, Comment, Notification, User } from '../../schemas/api.js';

describe('parseDate', () => {
  it('should parse valid ISO 8601 dates', () => {
    const date = parseDate('2024-01-15');
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0); // January is 0
    expect(date.getDate()).toBe(15);
  });

  it('should throw error on invalid dates', () => {
    expect(() => parseDate('invalid-date')).toThrow();
    expect(() => parseDate('2024-13-01')).toThrow(); // Invalid month
  });
});

describe('filterCards', () => {
  const mockCards: Card[] = [
    {
      id: 'card1',
      number: 1,
      title: 'Bug in authentication',
      description: 'Users cannot login',
      description_html: '<p>Users cannot login</p>',
      status: 'published',
      tags: ['bug', 'urgent'],
      golden: false,
      image_url: null,
      created_at: '2024-01-01T00:00:00Z',
      last_active_at: '2024-01-05T00:00:00Z',
      url: 'https://example.com/cards/1',
      board: {
        id: 'board1',
        name: 'Engineering',
        all_access: true,
        created_at: '2023-01-01T00:00:00Z',
        url: 'https://example.com/boards/1',
        creator: {
          id: 'user1',
          name: 'John Doe',
          email_address: 'john@example.com',
          role: 'owner',
          active: true,
          created_at: '2023-01-01T00:00:00Z',
          url: 'https://example.com/users/1',
        },
      },
      creator: {
        id: 'user1',
        name: 'John Doe',
        email_address: 'john@example.com',
        role: 'owner',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        url: 'https://example.com/users/1',
      },
      comments_url: 'https://example.com/cards/1/comments',
    },
    {
      id: 'card2',
      number: 2,
      title: 'Add dark mode',
      description: 'Implement dark mode toggle',
      description_html: '<p>Implement dark mode toggle</p>',
      status: 'drafted',
      tags: ['feature'],
      golden: true,
      image_url: null,
      created_at: '2024-01-10T00:00:00Z',
      last_active_at: '2024-01-15T00:00:00Z',
      url: 'https://example.com/cards/2',
      board: {
        id: 'board2',
        name: 'Design',
        all_access: false,
        created_at: '2023-01-01T00:00:00Z',
        url: 'https://example.com/boards/2',
        creator: {
          id: 'user2',
          name: 'Jane Smith',
          email_address: 'jane@example.com',
          role: 'admin',
          active: true,
          created_at: '2023-01-01T00:00:00Z',
          url: 'https://example.com/users/2',
        },
      },
      creator: {
        id: 'user2',
        name: 'Jane Smith',
        email_address: 'jane@example.com',
        role: 'admin',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        url: 'https://example.com/users/2',
      },
      comments_url: 'https://example.com/cards/2/comments',
    },
  ];

  it('should return all cards when no filters are applied', () => {
    const filtered = filterCards(mockCards, {});
    expect(filtered).toHaveLength(2);
  });

  it('should filter by board ID', () => {
    const filtered = filterCards(mockCards, { board: 'board1' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].board.id).toBe('board1');
  });

  it('should filter by status', () => {
    const filtered = filterCards(mockCards, { status: 'published' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe('published');
  });

  it('should filter by tag', () => {
    const filtered = filterCards(mockCards, { tag: 'bug' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].tags).toContain('bug');
  });

  it('should search in title and description', () => {
    const filtered = filterCards(mockCards, { search: 'dark mode' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toContain('dark mode');
  });

  it('should filter by created after date', () => {
    const filtered = filterCards(mockCards, {
      createdAfter: new Date('2024-01-05'),
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].number).toBe(2);
  });

  it('should filter by created before date', () => {
    const filtered = filterCards(mockCards, {
      createdBefore: new Date('2024-01-05'),
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].number).toBe(1);
  });

  it('should sort by title ascending', () => {
    const filtered = filterCards(mockCards, { sort: 'title', order: 'asc' });
    expect(filtered[0].title).toBe('Add dark mode');
    expect(filtered[1].title).toBe('Bug in authentication');
  });

  it('should sort by title descending', () => {
    const filtered = filterCards(mockCards, { sort: 'title', order: 'desc' });
    expect(filtered[0].title).toBe('Bug in authentication');
    expect(filtered[1].title).toBe('Add dark mode');
  });

  it('should sort by number', () => {
    const filtered = filterCards(mockCards, { sort: 'number', order: 'asc' });
    expect(filtered[0].number).toBe(1);
    expect(filtered[1].number).toBe(2);
  });

  it('should combine multiple filters', () => {
    const filtered = filterCards(mockCards, {
      search: 'dark',
      sort: 'title',
      order: 'asc',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toContain('dark');
  });
});

describe('filterBoards', () => {
  const mockBoards: Board[] = [
    {
      id: 'board1',
      name: 'Engineering',
      all_access: true,
      created_at: '2024-01-01T00:00:00Z',
      url: 'https://example.com/boards/1',
      creator: {
        id: 'user1',
        name: 'John Doe',
        email_address: 'john@example.com',
        role: 'owner',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        url: 'https://example.com/users/1',
      },
    },
    {
      id: 'board2',
      name: 'Design',
      all_access: false,
      created_at: '2024-01-10T00:00:00Z',
      url: 'https://example.com/boards/2',
      creator: {
        id: 'user2',
        name: 'Jane Smith',
        email_address: 'jane@example.com',
        role: 'admin',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        url: 'https://example.com/users/2',
      },
    },
  ];

  it('should search board names', () => {
    const filtered = filterBoards(mockBoards, { search: 'engineer' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Engineering');
  });

  it('should sort by name ascending', () => {
    const filtered = filterBoards(mockBoards, { sort: 'name', order: 'asc' });
    expect(filtered[0].name).toBe('Design');
    expect(filtered[1].name).toBe('Engineering');
  });

  it('should sort by created_at descending', () => {
    const filtered = filterBoards(mockBoards, {
      sort: 'created_at',
      order: 'desc',
    });
    expect(filtered[0].id).toBe('board2');
  });
});

describe('filterUsers', () => {
  const mockUsers: User[] = [
    {
      id: 'user1',
      name: 'Alice Admin',
      email_address: 'alice@example.com',
      role: 'admin',
      active: true,
      created_at: '2023-01-01T00:00:00Z',
      url: 'https://example.com/users/1',
    },
    {
      id: 'user2',
      name: 'Bob Member',
      email_address: 'bob@example.com',
      role: 'member',
      active: true,
      created_at: '2023-02-01T00:00:00Z',
      url: 'https://example.com/users/2',
    },
    {
      id: 'user3',
      name: 'Charlie Inactive',
      email_address: 'charlie@example.com',
      role: 'member',
      active: false,
      created_at: '2023-03-01T00:00:00Z',
      url: 'https://example.com/users/3',
    },
  ];

  it('should filter by role', () => {
    const filtered = filterUsers(mockUsers, { role: 'admin' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].role).toBe('admin');
  });

  it('should filter by active status', () => {
    const filtered = filterUsers(mockUsers, { active: true });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((u) => u.active)).toBe(true);
  });

  it('should search by name', () => {
    const filtered = filterUsers(mockUsers, { search: 'alice' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toContain('Alice');
  });

  it('should search by email', () => {
    const filtered = filterUsers(mockUsers, { search: 'bob@example' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].email_address).toContain('bob@example');
  });

  it('should sort by name', () => {
    const filtered = filterUsers(mockUsers, { sort: 'name', order: 'asc' });
    expect(filtered[0].name).toBe('Alice Admin');
    expect(filtered[2].name).toBe('Charlie Inactive');
  });

  it('should combine filters', () => {
    const filtered = filterUsers(mockUsers, {
      role: 'member',
      active: true,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Bob Member');
  });
});

describe('filterComments', () => {
  const mockComments: Comment[] = [
    {
      id: 'comment1',
      body: {
        plain_text: 'This is a great feature!',
        html: '<p>This is a great feature!</p>',
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      creator: {
        id: 'user1',
        name: 'Alice Admin',
        email_address: 'alice@example.com',
        role: 'admin',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        url: 'https://example.com/users/1',
      },
      reactions_url: 'https://example.com/comments/1/reactions',
      url: 'https://example.com/comments/1',
    },
    {
      id: 'comment2',
      body: {
        plain_text: 'I found a bug in this code',
        html: '<p>I found a bug in this code</p>',
      },
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      creator: {
        id: 'user2',
        name: 'Bob Member',
        email_address: 'bob@example.com',
        role: 'member',
        active: true,
        created_at: '2023-02-01T00:00:00Z',
        url: 'https://example.com/users/2',
      },
      reactions_url: 'https://example.com/comments/2/reactions',
      url: 'https://example.com/comments/2',
    },
  ];

  it('should return all comments when no filters are applied', () => {
    const filtered = filterComments(mockComments, {});
    expect(filtered).toHaveLength(2);
  });

  it('should filter by user ID', () => {
    const filtered = filterComments(mockComments, { user: 'user1' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].creator.id).toBe('user1');
  });

  it('should search in comment body', () => {
    const filtered = filterComments(mockComments, { search: 'bug' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].body.plain_text).toContain('bug');
  });

  it('should filter by created after date', () => {
    const filtered = filterComments(mockComments, {
      createdAfter: new Date('2024-01-05'),
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('comment2');
  });

  it('should filter by created before date', () => {
    const filtered = filterComments(mockComments, {
      createdBefore: new Date('2024-01-05'),
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('comment1');
  });

  it('should sort by created_at ascending', () => {
    const filtered = filterComments(mockComments, { sort: 'created_at', order: 'asc' });
    expect(filtered[0].id).toBe('comment1');
    expect(filtered[1].id).toBe('comment2');
  });

  it('should sort by created_at descending', () => {
    const filtered = filterComments(mockComments, { sort: 'created_at', order: 'desc' });
    expect(filtered[0].id).toBe('comment2');
    expect(filtered[1].id).toBe('comment1');
  });

  it('should sort by updated_at', () => {
    const filtered = filterComments(mockComments, { sort: 'updated_at', order: 'desc' });
    expect(filtered[0].id).toBe('comment2');
  });

  it('should combine multiple filters', () => {
    const filtered = filterComments(mockComments, {
      search: 'feature',
      user: 'user1',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('comment1');
  });
});

describe('filterNotifications', () => {
  const mockCreator = {
    id: 'user1',
    name: 'Alice Admin',
    email_address: 'alice@example.com',
    role: 'admin' as const,
    active: true,
    created_at: '2023-01-01T00:00:00Z',
    url: 'https://example.com/users/1',
  };

  const mockCard = {
    id: 'card1',
    title: 'Test Card',
    status: 'open',
    url: 'https://example.com/cards/1',
  };

  const mockNotifications: Notification[] = [
    {
      id: 'notif1',
      title: 'New comment on your card',
      body: 'Alice commented on your card',
      read: false,
      read_at: null,
      created_at: '2024-01-01T00:00:00Z',
      creator: mockCreator,
      card: mockCard,
      url: 'https://example.com/notifications/1',
    },
    {
      id: 'notif2',
      title: 'Card assigned to you',
      body: 'You have been assigned to a new card',
      read: true,
      read_at: '2024-01-11T00:00:00Z',
      created_at: '2024-01-10T00:00:00Z',
      creator: mockCreator,
      card: mockCard,
      url: 'https://example.com/notifications/2',
    },
    {
      id: 'notif3',
      title: 'Board activity',
      body: 'New activity on Engineering board',
      read: false,
      read_at: null,
      created_at: '2024-01-15T00:00:00Z',
      creator: mockCreator,
      card: mockCard,
      url: 'https://example.com/notifications/3',
    },
  ];

  it('should return all notifications when no filters are applied', () => {
    const filtered = filterNotifications(mockNotifications, {});
    expect(filtered).toHaveLength(3);
  });

  it('should filter by read status', () => {
    const filtered = filterNotifications(mockNotifications, { read: true });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].read).toBe(true);
  });

  it('should filter by unread status', () => {
    const filtered = filterNotifications(mockNotifications, { unread: true });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((n) => n.read === false)).toBe(true);
  });

  it('should search in title', () => {
    const filtered = filterNotifications(mockNotifications, { search: 'comment' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toContain('comment');
  });

  it('should search in body', () => {
    const filtered = filterNotifications(mockNotifications, { search: 'Engineering' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].body).toContain('Engineering');
  });

  it('should sort by created_at ascending', () => {
    const filtered = filterNotifications(mockNotifications, { sort: 'created_at', order: 'asc' });
    expect(filtered[0].id).toBe('notif1');
    expect(filtered[2].id).toBe('notif3');
  });

  it('should sort by created_at descending', () => {
    const filtered = filterNotifications(mockNotifications, { sort: 'created_at', order: 'desc' });
    expect(filtered[0].id).toBe('notif3');
    expect(filtered[2].id).toBe('notif1');
  });

  it('should combine multiple filters', () => {
    const filtered = filterNotifications(mockNotifications, {
      unread: true,
      search: 'card',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('notif1');
  });
});
