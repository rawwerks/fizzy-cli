/**
 * Tests for boards - schema validation and output formatting
 */

import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { BoardSchema } from '../../schemas/api.js';
const BoardArraySchema = z.array(BoardSchema);

// Mock data
const mockBoard = {
  id: '03f5v9zkft4hj9qq0lsn9ohcm',
  name: 'Test Board',
  all_access: true,
  created_at: '2025-12-05T19:36:35.534Z',
  url: 'http://fizzy.localhost:3006/897362094/boards/03f5v9zkft4hj9qq0lsn9ohcm',
  creator: {
    id: '03f5v9zjw7pz8717a4no1h8a7',
    name: 'Test User',
    role: 'owner',
    active: true,
    email_address: 'test@example.com',
    created_at: '2025-12-05T19:36:35.401Z',
    url: 'http://fizzy.localhost:3006/897362094/users/03f5v9zjw7pz8717a4no1h8a7',
  },
};

const mockBoard2 = {
  id: '03f5v9zkft4hj9qq0lsn9ohcd',
  name: 'Another Board',
  all_access: false,
  created_at: '2025-12-06T10:20:15.123Z',
  url: 'http://fizzy.localhost:3006/897362094/boards/03f5v9zkft4hj9qq0lsn9ohcd',
  creator: {
    id: '03f5v9zjw7pz8717a4no1h8a7',
    name: 'Test User',
    role: 'owner',
    active: true,
    email_address: 'test@example.com',
    created_at: '2025-12-05T19:36:35.401Z',
    url: 'http://fizzy.localhost:3006/897362094/users/03f5v9zjw7pz8717a4no1h8a7',
  },
};

describe('Board Schema Validation', () => {
  test('should validate a valid board', () => {
    const result = BoardSchema.safeParse(mockBoard);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test Board');
      expect(result.data.all_access).toBe(true);
    }
  });

  test('should validate board array', () => {
    const result = BoardArraySchema.safeParse([mockBoard, mockBoard2]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  test('should reject invalid board (missing required fields)', () => {
    const invalidBoard = {
      id: 'test-id',
      // missing name and other required fields
    };
    const result = BoardSchema.safeParse(invalidBoard);
    expect(result.success).toBe(false);
  });

  test('should reject board with invalid creator role', () => {
    const invalidBoard = {
      ...mockBoard,
      creator: {
        ...mockBoard.creator,
        role: 'invalid-role',
      },
    };
    const result = BoardSchema.safeParse(invalidBoard);
    expect(result.success).toBe(false);
  });

  test('should accept board with optional description', () => {
    const boardWithDesc = {
      ...mockBoard,
      description: 'This is a test board',
    };
    const result = BoardSchema.safeParse(boardWithDesc);
    expect(result.success).toBe(true);
  });

  test('should validate empty board array', () => {
    const result = BoardArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});
