/**
 * Tests for notifications - schema validation
 */

import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { NotificationSchema } from '../../schemas/api.js';
const NotificationArraySchema = z.array(NotificationSchema);

// Mock data matching NotificationSchema
const mockNotification = {
  id: 'notification-123',
  read: false,
  read_at: null,
  created_at: '2025-12-05T19:36:35.534Z',
  title: 'New card created',
  body: 'A new card was created in Test Board',
  creator: {
    id: 'user-123',
    name: 'Test User',
    role: 'owner',
    active: true,
    email_address: 'test@example.com',
    created_at: '2025-12-05T19:36:35.534Z',
    url: 'http://fizzy.localhost:3006/897362094/users/user-123',
  },
  card: {
    id: 'card-123',
    title: 'Test Card',
    status: 'open',
    url: 'http://fizzy.localhost:3006/897362094/cards/card-123',
  },
  url: 'http://fizzy.localhost:3006/897362094/notifications/notification-123',
};

const mockNotification2 = {
  id: 'notification-456',
  read: true,
  read_at: '2025-12-06T10:00:00.000Z',
  created_at: '2025-12-06T10:00:00.000Z',
  title: 'Comment added',
  body: 'Someone commented on your card',
  creator: {
    id: 'user-456',
    name: 'Another User',
    role: 'member',
    active: true,
    email_address: 'another@example.com',
    created_at: '2025-12-05T19:36:35.534Z',
    url: 'http://fizzy.localhost:3006/897362094/users/user-456',
  },
  card: {
    id: 'card-456',
    title: 'Another Card',
    status: 'in_progress',
    url: 'http://fizzy.localhost:3006/897362094/cards/card-456',
  },
  url: 'http://fizzy.localhost:3006/897362094/notifications/notification-456',
};

describe('Notification Schema Validation', () => {
  test('should validate a valid notification', () => {
    const result = NotificationSchema.safeParse(mockNotification);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('New card created');
      expect(result.data.read).toBe(false);
    }
  });

  test('should validate notification array', () => {
    const result = NotificationArraySchema.safeParse([mockNotification, mockNotification2]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  test('should reject invalid notification (missing required fields)', () => {
    const invalidNotification = {
      id: 'test-id',
      // missing other required fields
    };
    const result = NotificationSchema.safeParse(invalidNotification);
    expect(result.success).toBe(false);
  });

  test('should validate read/unread state', () => {
    const unread = NotificationSchema.safeParse(mockNotification);
    const read = NotificationSchema.safeParse(mockNotification2);

    expect(unread.success).toBe(true);
    expect(read.success).toBe(true);

    if (unread.success && read.success) {
      expect(unread.data.read).toBe(false);
      expect(read.data.read).toBe(true);
    }
  });

  test('should validate empty notification array', () => {
    const result = NotificationArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});
