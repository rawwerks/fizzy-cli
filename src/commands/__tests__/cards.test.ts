/**
 * Tests for cards - schema validation
 */

import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { CardSchema } from '../../schemas/api.js';
const CardArraySchema = z.array(CardSchema);

// Mock data matching CardSchema
const mockCard = {
  id: '03f5v9zkft4hj9qq0lsn9ohcm',
  number: 42,
  title: 'Test Card',
  status: 'open',
  description: 'Test card description',
  description_html: '<p>Test card description</p>',
  image_url: null,
  tags: ['bug', 'urgent'],
  golden: false,
  last_active_at: '2025-12-05T19:36:35.534Z',
  created_at: '2025-12-05T19:36:35.534Z',
  url: 'http://fizzy.localhost:3006/897362094/cards/03f5v9zkft4hj9qq0lsn9ohcm',
  comments_url: 'http://fizzy.localhost:3006/897362094/cards/03f5v9zkft4hj9qq0lsn9ohcm/comments',
  board: {
    id: 'board-123',
    name: 'Test Board',
    all_access: true,
    created_at: '2025-12-05T19:36:35.534Z',
    url: 'http://fizzy.localhost:3006/897362094/boards/board-123',
    creator: {
      id: 'user-123',
      name: 'Test User',
      role: 'owner',
      active: true,
      email_address: 'test@example.com',
      created_at: '2025-12-05T19:36:35.534Z',
      url: 'http://fizzy.localhost:3006/897362094/users/user-123',
    },
  },
  creator: {
    id: 'user-123',
    name: 'Test User',
    role: 'owner',
    active: true,
    email_address: 'test@example.com',
    created_at: '2025-12-05T19:36:35.534Z',
    url: 'http://fizzy.localhost:3006/897362094/users/user-123',
  },
};

describe('Card Schema Validation', () => {
  test('should validate a valid card', () => {
    const result = CardSchema.safeParse(mockCard);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Test Card');
    }
  });

  test('should validate card array', () => {
    const result = CardArraySchema.safeParse([mockCard]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });

  test('should reject invalid card (missing required fields)', () => {
    const invalidCard = {
      id: 'test-id',
      // missing required fields
    };
    const result = CardSchema.safeParse(invalidCard);
    expect(result.success).toBe(false);
  });

  test('should accept card with optional steps', () => {
    const cardWithSteps = {
      ...mockCard,
      steps: [{ id: 'step-1', content: 'Do this', completed: false }],
    };
    const result = CardSchema.safeParse(cardWithSteps);
    expect(result.success).toBe(true);
  });

  test('should validate empty card array', () => {
    const result = CardArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});
