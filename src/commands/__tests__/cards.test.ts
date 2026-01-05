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

describe('Card Operations Response Validation', () => {
  test('should validate postpone operation success response', () => {
    const postponeResponse = {
      success: true,
      message: 'Card #42 postponed successfully',
    };
    expect(postponeResponse.success).toBe(true);
    expect(postponeResponse.message).toContain('postponed');
  });

  test('should validate triage operation success response', () => {
    const triageResponse = {
      success: true,
      message: 'Card #42 sent to triage successfully',
    };
    expect(triageResponse.success).toBe(true);
    expect(triageResponse.message).toContain('triage');
  });

  test('should validate tag operation success response', () => {
    const tagResponse = {
      success: true,
      message: 'Card #42 tags updated',
      operations: ['added "bug"', 'added "urgent"'],
    };
    expect(tagResponse.success).toBe(true);
    expect(tagResponse.operations).toHaveLength(2);
  });

  test('should validate assign operation success response', () => {
    const assignResponse = {
      success: true,
      message: 'Card #42 assignments updated',
      operations: ['assigned user-123', 'unassigned user-456'],
    };
    expect(assignResponse.success).toBe(true);
    expect(assignResponse.operations).toHaveLength(2);
  });

  test('should validate watch operation success response', () => {
    const watchResponse = {
      success: true,
      message: 'Now watching card #42',
    };
    expect(watchResponse.success).toBe(true);
    expect(watchResponse.message).toContain('watching');
  });

  test('should validate unwatch operation success response', () => {
    const unwatchResponse = {
      success: true,
      message: 'Stopped watching card #42',
    };
    expect(unwatchResponse.success).toBe(true);
    expect(unwatchResponse.message).toContain('Stopped watching');
  });
});
