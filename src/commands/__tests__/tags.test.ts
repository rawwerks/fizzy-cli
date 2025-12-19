/**
 * Tests for tags - schema validation
 */

import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { TagSchema } from '../../schemas/api.js';
const TagArraySchema = z.array(TagSchema);

// Mock data matching TagSchema
const mockTag = {
  id: 'tag-123',
  title: 'bug',
  created_at: '2025-12-05T19:36:35.534Z',
  url: 'http://fizzy.localhost:3006/897362094/tags/tag-123',
};

const mockTag2 = {
  id: 'tag-456',
  title: 'feature',
  created_at: '2025-12-05T19:36:35.534Z',
  url: 'http://fizzy.localhost:3006/897362094/tags/tag-456',
};

describe('Tag Schema Validation', () => {
  test('should validate a valid tag', () => {
    const result = TagSchema.safeParse(mockTag);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('bug');
    }
  });

  test('should validate tag array', () => {
    const result = TagArraySchema.safeParse([mockTag, mockTag2]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  test('should reject invalid tag (missing required fields)', () => {
    const invalidTag = {
      id: 'test-id',
      // missing title
    };
    const result = TagSchema.safeParse(invalidTag);
    expect(result.success).toBe(false);
  });

  test('should validate empty tag array', () => {
    const result = TagArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});
