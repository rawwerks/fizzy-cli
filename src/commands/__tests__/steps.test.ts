/**
 * Tests for steps - schema validation
 */

import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { StepSchema } from '../../schemas/api.js';
const StepArraySchema = z.array(StepSchema);

// Mock data matching StepSchema
const mockStep = {
  id: 'step-123',
  content: 'Review pull request',
  completed: false,
};

const mockStep2 = {
  id: 'step-456',
  content: 'Write tests',
  completed: true,
};

describe('Step Schema Validation', () => {
  test('should validate a valid step', () => {
    const result = StepSchema.safeParse(mockStep);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('Review pull request');
      expect(result.data.completed).toBe(false);
    }
  });

  test('should validate step array', () => {
    const result = StepArraySchema.safeParse([mockStep, mockStep2]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  test('should reject invalid step (missing required fields)', () => {
    const invalidStep = {
      id: 'test-id',
      // missing content and completed
    };
    const result = StepSchema.safeParse(invalidStep);
    expect(result.success).toBe(false);
  });

  test('should validate empty step array', () => {
    const result = StepArraySchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  test('should validate completed step', () => {
    const result = StepSchema.safeParse(mockStep2);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completed).toBe(true);
    }
  });

  test('should reject step with invalid completed type', () => {
    const invalidStep = {
      id: 'step-789',
      content: 'Invalid step',
      completed: 'yes', // should be boolean
    };
    const result = StepSchema.safeParse(invalidStep);
    expect(result.success).toBe(false);
  });
});
