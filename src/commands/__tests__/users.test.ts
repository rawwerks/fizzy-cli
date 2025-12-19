/**
 * Tests for users - schema validation
 */

import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { UserSchema } from '../../schemas/api.js';
const UserArraySchema = z.array(UserSchema);

// Mock data
const mockUser = {
  id: 'user-123',
  name: 'Test User',
  role: 'owner',
  active: true,
  email_address: 'test@example.com',
  created_at: '2025-12-05T19:36:35.534Z',
  url: 'http://fizzy.localhost:3006/897362094/users/user-123',
};

const mockUser2 = {
  id: 'user-456',
  name: 'Another User',
  role: 'member',
  active: true,
  email_address: 'another@example.com',
  created_at: '2025-12-05T19:36:35.534Z',
  url: 'http://fizzy.localhost:3006/897362094/users/user-456',
};

describe('User Schema Validation', () => {
  test('should validate a valid user', () => {
    const result = UserSchema.safeParse(mockUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test User');
      expect(result.data.role).toBe('owner');
    }
  });

  test('should validate user array', () => {
    const result = UserArraySchema.safeParse([mockUser, mockUser2]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  test('should reject invalid user (missing required fields)', () => {
    const invalidUser = {
      id: 'test-id',
      // missing name and other required fields
    };
    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  test('should reject user with invalid role', () => {
    const invalidUser = {
      ...mockUser,
      role: 'invalid-role',
    };
    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  test('should accept all valid roles', () => {
    const roles = ['owner', 'admin', 'member', 'system'] as const;
    for (const role of roles) {
      const user = { ...mockUser, role };
      const result = UserSchema.safeParse(user);
      expect(result.success).toBe(true);
    }
  });

  test('should validate empty user array', () => {
    const result = UserArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});
