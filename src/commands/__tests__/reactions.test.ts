/**
 * Tests for reactions - schema validation
 */

import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { ReactionSchema } from '../../schemas/api.js';
const ReactionArraySchema = z.array(ReactionSchema);

// Mock data matching ReactionSchema
const mockReaction = {
  id: 'reaction-123',
  content: '👍',
  reacter: {
    id: 'user-123',
    name: 'Test User',
    role: 'owner',
    active: true,
    email_address: 'test@example.com',
    created_at: '2025-12-05T19:36:35.534Z',
    url: 'http://fizzy.localhost:3006/897362094/users/user-123',
  },
  url: 'http://fizzy.localhost:3006/897362094/reactions/reaction-123',
};

const mockReaction2 = {
  id: 'reaction-456',
  content: '🎉',
  reacter: {
    id: 'user-456',
    name: 'Another User',
    role: 'member',
    active: true,
    email_address: 'another@example.com',
    created_at: '2025-12-05T19:36:35.534Z',
    url: 'http://fizzy.localhost:3006/897362094/users/user-456',
  },
  url: 'http://fizzy.localhost:3006/897362094/reactions/reaction-456',
};

describe('Reaction Schema Validation', () => {
  test('should validate a valid reaction', () => {
    const result = ReactionSchema.safeParse(mockReaction);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('👍');
      expect(result.data.reacter.name).toBe('Test User');
    }
  });

  test('should validate reaction array', () => {
    const result = ReactionArraySchema.safeParse([mockReaction, mockReaction2]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  test('should reject invalid reaction (missing required fields)', () => {
    const invalidReaction = {
      id: 'test-id',
      // missing content and reacter
    };
    const result = ReactionSchema.safeParse(invalidReaction);
    expect(result.success).toBe(false);
  });

  test('should validate empty reaction array', () => {
    const result = ReactionArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  test('should accept various emoji content', () => {
    const emojis = ['👍', '❤️', '🎉', '🚀', '+1', '-1', 'heart'];
    for (const emoji of emojis) {
      const reaction = { ...mockReaction, content: emoji };
      const result = ReactionSchema.safeParse(reaction);
      expect(result.success).toBe(true);
    }
  });

  test('should reject reaction with invalid reacter role', () => {
    const invalidReaction = {
      ...mockReaction,
      reacter: {
        ...mockReaction.reacter,
        role: 'invalid-role',
      },
    };
    const result = ReactionSchema.safeParse(invalidReaction);
    expect(result.success).toBe(false);
  });
});
