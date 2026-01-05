/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'bun:test';
import {
  ValidationError,
  validateEmail,
  validateUrl,
  validateUUID,
  validatePositiveInteger,
  validateRequiredString,
  validateEmoji,
  validateFilePath,
  validateCardIdentifier,
  validateBoardName,
  validateColumnId,
  validateUserId,
  validateBoardId,
  validateCommentId,
  validateReactionId,
  validateTagId,
} from '../validation.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('ValidationError', () => {
  it('should create a validation error with correct name', () => {
    const error = new ValidationError('Test error');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Test error');
  });
});

describe('validateEmail', () => {
  it('should accept valid email addresses', () => {
    expect(() => validateEmail('user@example.com')).not.toThrow();
    expect(() => validateEmail('test.user@example.co.uk')).not.toThrow();
    expect(() => validateEmail('user+tag@example.com')).not.toThrow();
  });

  it('should reject invalid email addresses', () => {
    expect(() => validateEmail('invalid')).toThrow(ValidationError);
    expect(() => validateEmail('invalid@')).toThrow(ValidationError);
    expect(() => validateEmail('@example.com')).toThrow(ValidationError);
    expect(() => validateEmail('user@')).toThrow(ValidationError);
    expect(() => validateEmail('user @example.com')).toThrow(ValidationError);
  });

  it('should provide helpful error messages', () => {
    try {
      validateEmail('invalid');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toContain('Invalid email address');
      expect((error as Error).message).toContain('invalid');
    }
  });
});

describe('validateUrl', () => {
  it('should accept valid HTTP/HTTPS URLs', () => {
    expect(() => validateUrl('http://example.com')).not.toThrow();
    expect(() => validateUrl('https://example.com')).not.toThrow();
    expect(() => validateUrl('https://example.com/path?query=value')).not.toThrow();
  });

  it('should reject non-HTTP/HTTPS URLs', () => {
    expect(() => validateUrl('ftp://example.com')).toThrow(ValidationError);
    expect(() => validateUrl('file:///path/to/file')).toThrow(ValidationError);
  });

  it('should reject invalid URLs', () => {
    expect(() => validateUrl('not a url')).toThrow(ValidationError);
    expect(() => validateUrl('example.com')).toThrow(ValidationError);
  });

  it('should use custom field name in error messages', () => {
    try {
      validateUrl('invalid', 'Avatar URL');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toContain('Avatar URL');
    }
  });
});

describe('validateUUID', () => {
  it('should accept valid standard UUID format', () => {
    expect(() => validateUUID('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    expect(() => validateUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).not.toThrow();
  });

  it('should accept valid base36-encoded UUID format (card IDs)', () => {
    expect(() => validateUUID('abcd1234efgh5678ijkl')).not.toThrow();
    expect(() => validateUUID('a1b2c3d4e5f6g7h8i9j0k1l2')).not.toThrow();
    expect(() => validateUUID('abcdefghijklmnopqrstuvwxy')).not.toThrow();
  });

  it('should reject invalid UUID formats', () => {
    expect(() => validateUUID('invalid')).toThrow(ValidationError);
    expect(() => validateUUID('550e8400-e29b-41d4-a716')).toThrow(ValidationError);
    expect(() => validateUUID('550e8400e29b41d4a716446655440000')).toThrow(ValidationError);
    expect(() => validateUUID('short')).toThrow(ValidationError);
  });

  it('should use custom field name in error messages', () => {
    try {
      validateUUID('invalid', 'Board ID');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toContain('Board ID');
    }
  });
});

describe('validatePositiveInteger', () => {
  it('should accept valid positive integers', () => {
    expect(validatePositiveInteger('1', 'Test')).toBe(1);
    expect(validatePositiveInteger('42', 'Test')).toBe(42);
    expect(validatePositiveInteger('1000', 'Test')).toBe(1000);
  });

  it('should reject zero and negative numbers', () => {
    expect(() => validatePositiveInteger('0', 'Test')).toThrow(ValidationError);
    expect(() => validatePositiveInteger('-1', 'Test')).toThrow(ValidationError);
    expect(() => validatePositiveInteger('-100', 'Test')).toThrow(ValidationError);
  });

  it('should reject non-integer values', () => {
    expect(() => validatePositiveInteger('1.5', 'Test')).toThrow(ValidationError);
    expect(() => validatePositiveInteger('abc', 'Test')).toThrow(ValidationError);
    expect(() => validatePositiveInteger('', 'Test')).toThrow(ValidationError);
  });

  it('should include field name and value in error message', () => {
    try {
      validatePositiveInteger('invalid', 'Card number');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toContain('Card number');
      expect((error as Error).message).toContain('invalid');
    }
  });
});

describe('validateRequiredString', () => {
  it('should accept non-empty strings', () => {
    expect(() => validateRequiredString('test', 'Field')).not.toThrow();
    expect(() => validateRequiredString('  test  ', 'Field')).not.toThrow();
  });

  it('should reject empty strings', () => {
    expect(() => validateRequiredString('', 'Field')).toThrow(ValidationError);
    expect(() => validateRequiredString('   ', 'Field')).toThrow(ValidationError);
  });

  it('should reject undefined', () => {
    expect(() => validateRequiredString(undefined, 'Field')).toThrow(ValidationError);
  });

  it('should include field name in error message', () => {
    try {
      validateRequiredString('', 'Comment body');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toContain('Comment body');
      expect((error as Error).message).toContain('required');
    }
  });
});

describe('validateEmoji', () => {
  it('should accept emoji characters', () => {
    expect(() => validateEmoji('👍')).not.toThrow();
    expect(() => validateEmoji('😀')).not.toThrow();
    expect(() => validateEmoji('🎉')).not.toThrow();
    expect(() => validateEmoji('❤️')).not.toThrow();
  });

  it('should accept short text reactions', () => {
    expect(() => validateEmoji('+1')).not.toThrow();
    expect(() => validateEmoji('tada')).not.toThrow();
    expect(() => validateEmoji('heart')).not.toThrow();
  });

  it('should reject empty strings', () => {
    expect(() => validateEmoji('')).toThrow(ValidationError);
    expect(() => validateEmoji('   ')).toThrow(ValidationError);
  });

  it('should reject very long strings', () => {
    expect(() => validateEmoji('this is way too long to be an emoji')).toThrow(ValidationError);
  });
});

describe('validateFilePath', () => {
  it('should accept existing files with correct extensions', async () => {
    // Create a temporary file
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-image.png');
    await fs.writeFile(testFile, 'test content');

    try {
      await expect(validateFilePath(testFile, ['png', 'jpg'], 'Test file')).resolves.toBeUndefined();
    } finally {
      await fs.unlink(testFile);
    }
  });

  it('should reject non-existent files', async () => {
    await expect(
      validateFilePath('/nonexistent/file.png', ['png'], 'Test file')
    ).rejects.toThrow(ValidationError);
  });

  it('should reject files with wrong extensions', async () => {
    // Create a temporary file with wrong extension
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, 'test-file.txt');
    await fs.writeFile(testFile, 'test content');

    try {
      await expect(
        validateFilePath(testFile, ['png', 'jpg'], 'Test file')
      ).rejects.toThrow(ValidationError);
    } finally {
      await fs.unlink(testFile);
    }
  });

  it('should include field name and allowed extensions in error message', async () => {
    try {
      await validateFilePath('/nonexistent/file.pdf', ['png', 'jpg'], 'Avatar');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toContain('Avatar');
    }
  });
});

describe('validateCardIdentifier', () => {
  it('should accept card numbers (numeric)', () => {
    expect(() => validateCardIdentifier('1')).not.toThrow();
    expect(() => validateCardIdentifier('42')).not.toThrow();
    expect(() => validateCardIdentifier('1234567890')).not.toThrow();
  });

  it('should accept card IDs (base36-encoded, 20-27 chars)', () => {
    expect(() => validateCardIdentifier('abcd1234efgh5678ijkl')).not.toThrow();
    expect(() => validateCardIdentifier('a1b2c3d4e5f6g7h8i9j0k1l2')).not.toThrow();
  });

  it('should reject invalid identifiers', () => {
    expect(() => validateCardIdentifier('invalid')).toThrow(ValidationError);
    expect(() => validateCardIdentifier('abc123')).toThrow(ValidationError);
    expect(() => validateCardIdentifier('')).toThrow(ValidationError);
  });

  it('should use custom field name in error messages', () => {
    try {
      validateCardIdentifier('invalid', 'Card reference');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toContain('Card reference');
    }
  });
});

describe('validateBoardName', () => {
  it('should accept valid board names', () => {
    expect(() => validateBoardName('My Board')).not.toThrow();
    expect(() => validateBoardName('Test 123')).not.toThrow();
  });

  it('should reject empty names', () => {
    expect(() => validateBoardName('')).toThrow(ValidationError);
    expect(() => validateBoardName('   ')).toThrow(ValidationError);
    expect(() => validateBoardName(undefined)).toThrow(ValidationError);
  });

  it('should reject names that are too long', () => {
    const longName = 'a'.repeat(256);
    expect(() => validateBoardName(longName)).toThrow(ValidationError);
  });
});

describe('ID validators', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const validBase36 = 'abcd1234efgh5678ijkl';
  const invalid = 'invalid';

  describe('validateColumnId', () => {
    it('should accept valid UUIDs', () => {
      expect(() => validateColumnId(validUUID)).not.toThrow();
      expect(() => validateColumnId(validBase36)).not.toThrow();
    });

    it('should reject invalid UUIDs', () => {
      expect(() => validateColumnId(invalid)).toThrow(ValidationError);
    });

    it('should include field name in error', () => {
      try {
        validateColumnId(invalid);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Column ID');
      }
    });
  });

  describe('validateUserId', () => {
    it('should accept valid UUIDs', () => {
      expect(() => validateUserId(validUUID)).not.toThrow();
      expect(() => validateUserId(validBase36)).not.toThrow();
    });

    it('should reject invalid UUIDs', () => {
      expect(() => validateUserId(invalid)).toThrow(ValidationError);
    });

    it('should include field name in error', () => {
      try {
        validateUserId(invalid);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('User ID');
      }
    });
  });

  describe('validateBoardId', () => {
    it('should accept valid UUIDs', () => {
      expect(() => validateBoardId(validUUID)).not.toThrow();
      expect(() => validateBoardId(validBase36)).not.toThrow();
    });

    it('should reject invalid UUIDs', () => {
      expect(() => validateBoardId(invalid)).toThrow(ValidationError);
    });

    it('should include field name in error', () => {
      try {
        validateBoardId(invalid);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Board ID');
      }
    });
  });

  describe('validateCommentId', () => {
    it('should accept valid UUIDs', () => {
      expect(() => validateCommentId(validUUID)).not.toThrow();
      expect(() => validateCommentId(validBase36)).not.toThrow();
    });

    it('should reject invalid UUIDs', () => {
      expect(() => validateCommentId(invalid)).toThrow(ValidationError);
    });

    it('should include field name in error', () => {
      try {
        validateCommentId(invalid);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Comment ID');
      }
    });
  });

  describe('validateReactionId', () => {
    it('should accept valid UUIDs', () => {
      expect(() => validateReactionId(validUUID)).not.toThrow();
      expect(() => validateReactionId(validBase36)).not.toThrow();
    });

    it('should reject invalid UUIDs', () => {
      expect(() => validateReactionId(invalid)).toThrow(ValidationError);
    });

    it('should include field name in error', () => {
      try {
        validateReactionId(invalid);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Reaction ID');
      }
    });
  });

  describe('validateTagId', () => {
    it('should accept valid UUIDs', () => {
      expect(() => validateTagId(validUUID)).not.toThrow();
      expect(() => validateTagId(validBase36)).not.toThrow();
    });

    it('should reject invalid UUIDs', () => {
      expect(() => validateTagId(invalid)).toThrow(ValidationError);
    });

    it('should include field name in error', () => {
      try {
        validateTagId(invalid);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Tag ID');
      }
    });
  });
});
