/**
 * Tests for templates
 */

import { describe, test, expect } from 'bun:test';
import { getTemplate, isValidTemplateType, templates } from '../templates.js';

describe('Templates', () => {
  test('should have all required templates', () => {
    expect(templates.bug).toBeDefined();
    expect(templates.feature).toBeDefined();
    expect(templates.task).toBeDefined();
  });

  test('should return bug template', () => {
    const template = getTemplate('bug');
    expect(template).toContain('Bug Description');
    expect(template).toContain('Steps to Reproduce');
    expect(template).toContain('Expected Behavior');
    expect(template).toContain('Actual Behavior');
    expect(template).toContain('Environment');
  });

  test('should return feature template', () => {
    const template = getTemplate('feature');
    expect(template).toContain('Feature Request');
    expect(template).toContain('Use Case');
    expect(template).toContain('Proposed Solution');
    expect(template).toContain('Alternatives Considered');
  });

  test('should return task template', () => {
    const template = getTemplate('task');
    expect(template).toContain('Task Description');
    expect(template).toContain('Acceptance Criteria');
    expect(template).toContain('Notes');
  });

  test('should validate valid template types', () => {
    expect(isValidTemplateType('bug')).toBe(true);
    expect(isValidTemplateType('feature')).toBe(true);
    expect(isValidTemplateType('task')).toBe(true);
  });

  test('should reject invalid template types', () => {
    expect(isValidTemplateType('invalid')).toBe(false);
    expect(isValidTemplateType('Bug')).toBe(false);
    expect(isValidTemplateType('')).toBe(false);
    expect(isValidTemplateType('123')).toBe(false);
  });

  test('templates should be non-empty strings', () => {
    expect(templates.bug.length).toBeGreaterThan(0);
    expect(templates.feature.length).toBeGreaterThan(0);
    expect(templates.task.length).toBeGreaterThan(0);
  });

  test('templates should contain markdown formatting', () => {
    // All templates should have markdown headers (##)
    expect(templates.bug).toContain('##');
    expect(templates.feature).toContain('##');
    expect(templates.task).toContain('##');
  });
});
