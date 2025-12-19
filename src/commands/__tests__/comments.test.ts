/**
 * Tests for comments - schema validation
 */

import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { CommentSchema } from '../../schemas/api.js';
const CommentArraySchema = z.array(CommentSchema);

// Mock data matching CommentSchema
const mockComment = {
  id: 'comment-123',
  created_at: '2025-12-05T19:36:35.534Z',
  updated_at: '2025-12-05T19:36:35.534Z',
  body: {
    plain_text: 'This is a test comment',
    html: '<p>This is a test comment</p>',
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
  reactions_url: 'http://fizzy.localhost:3006/897362094/comments/comment-123/reactions',
  url: 'http://fizzy.localhost:3006/897362094/comments/comment-123',
};

describe('Comment Schema Validation', () => {
  test('should validate a valid comment', () => {
    const result = CommentSchema.safeParse(mockComment);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.plain_text).toBe('This is a test comment');
    }
  });

  test('should validate comment array', () => {
    const result = CommentArraySchema.safeParse([mockComment]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });

  test('should reject invalid comment (missing required fields)', () => {
    const invalidComment = {
      id: 'test-id',
      // missing body and other required fields
    };
    const result = CommentSchema.safeParse(invalidComment);
    expect(result.success).toBe(false);
  });

  test('should validate empty comment array', () => {
    const result = CommentArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});
