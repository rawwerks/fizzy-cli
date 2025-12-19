/**
 * Tests for columns - schema validation
 */

import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { ColumnSchema } from '../../schemas/api.js';
const ColumnArraySchema = z.array(ColumnSchema);

// Mock data matching ColumnSchema
const mockColumn = {
  id: 'column-123',
  name: 'To Do',
  color: { name: 'red', value: 'var(--color-card-red)' },
  created_at: '2025-12-05T19:36:35.534Z',
};

const mockColumn2 = {
  id: 'column-456',
  name: 'In Progress',
  color: { name: 'green', value: 'var(--color-card-green)' },
  created_at: '2025-12-05T19:36:35.534Z',
};

describe('Column Schema Validation', () => {
  test('should validate a valid column', () => {
    const result = ColumnSchema.safeParse(mockColumn);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('To Do');
    }
  });

  test('should validate column array', () => {
    const result = ColumnArraySchema.safeParse([mockColumn, mockColumn2]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  test('should reject invalid column (missing required fields)', () => {
    const invalidColumn = {
      id: 'test-id',
      // missing name and color
    };
    const result = ColumnSchema.safeParse(invalidColumn);
    expect(result.success).toBe(false);
  });

  test('should validate empty column array', () => {
    const result = ColumnArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});
