/**
 * Input validation utilities for fizzy-cli
 *
 * Provides client-side validation to catch common errors before making API calls.
 */

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate email address format
 * @param email - Email address to validate
 * @throws {ValidationError} If email format is invalid
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email address: ${email}`);
  }
}

/**
 * Validate URL format (HTTP/HTTPS)
 * @param url - URL to validate
 * @param fieldName - Name of the field for error messages
 * @throws {ValidationError} If URL format is invalid
 */
export function validateUrl(url: string, fieldName: string = 'URL'): void {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new ValidationError(`${fieldName} must use HTTP or HTTPS protocol, got: ${url}`);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`${fieldName} is not a valid URL: ${url}`);
  }
}

/**
 * Validate UUID format (version 4)
 * UUIDs in Fizzy are typically 36 characters with hyphens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * Also accepts base36-encoded UUIDs (alphanumeric, 20-27 chars) used for card IDs
 * @param uuid - UUID string to validate
 * @param fieldName - Name of the field for error messages
 * @throws {ValidationError} If UUID format is invalid
 */
export function validateUUID(uuid: string, fieldName: string = 'ID'): void {
  // Standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Base36-encoded UUID format (used for card IDs): alphanumeric, 20-27 chars
  // Must contain at least one letter to distinguish from numbers
  // Typical base36 UUID is 25 chars, so we allow a small range around that
  const base36UuidRegex = /^(?=.*[a-z])[a-z0-9]{20,27}$/i;

  if (!uuidRegex.test(uuid) && !base36UuidRegex.test(uuid)) {
    throw new ValidationError(`${fieldName} must be a valid UUID format, got: ${uuid}`);
  }
}

/**
 * Validate positive integer
 * @param value - String value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The parsed integer value
 * @throws {ValidationError} If value is not a positive integer
 */
export function validatePositiveInteger(value: string, fieldName: string): number {
  // First check if the string contains only digits
  if (!/^\d+$/.test(value)) {
    throw new ValidationError(`${fieldName} must be a positive integer, got: ${value}`);
  }

  const num = parseInt(value, 10);
  if (isNaN(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer, got: ${value}`);
  }
  return num;
}

/**
 * Validate required string field (non-empty)
 * @param value - String value to validate
 * @param fieldName - Name of the field for error messages
 * @throws {ValidationError} If value is empty or only whitespace
 */
export function validateRequiredString(value: string | undefined, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required and cannot be empty`);
  }
}

/**
 * Validate emoji character
 * Checks if the input is a valid single emoji character or short emoji sequence
 * @param emoji - Emoji string to validate
 * @throws {ValidationError} If emoji is invalid
 */
export function validateEmoji(emoji: string): void {
  if (!emoji || emoji.trim().length === 0) {
    throw new ValidationError('Emoji is required and cannot be empty');
  }

  // Allow single emoji character or short emoji sequences (up to 10 characters)
  // This is a simplified check - actual emoji validation is complex due to Unicode
  if (emoji.length > 10) {
    throw new ValidationError(`Emoji must be a single emoji character or short sequence, got: ${emoji}`);
  }
}

/**
 * Validate file path exists and has correct extension
 * @param filePath - File path to validate
 * @param allowedExtensions - Array of allowed file extensions (without dot)
 * @param fieldName - Name of the field for error messages
 * @returns Promise that resolves if file is valid
 * @throws {ValidationError} If file doesn't exist or has wrong extension
 */
export async function validateFilePath(
  filePath: string,
  allowedExtensions: string[],
  fieldName: string = 'File'
): Promise<void> {
  const fs = await import('fs/promises');

  // Check if file exists
  try {
    await fs.access(filePath);
  } catch {
    throw new ValidationError(`${fieldName} not found: ${filePath}`);
  }

  // Check file extension
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext || !allowedExtensions.includes(ext)) {
    throw new ValidationError(
      `${fieldName} has invalid format. Supported formats: ${allowedExtensions.join(', ')}`
    );
  }
}

/**
 * Validate card number or card ID
 * Card numbers are purely numeric, card IDs are base36-encoded (alphanumeric, 20+ chars)
 * @param cardIdentifier - Card number or ID to validate
 * @param fieldName - Name of the field for error messages
 * @throws {ValidationError} If card identifier is invalid
 */
export function validateCardIdentifier(cardIdentifier: string, fieldName: string = 'Card identifier'): void {
  // Card numbers are purely numeric (positive integers)
  const isNumeric = /^\d+$/.test(cardIdentifier);

  // Card IDs are base36-encoded UUIDs (alphanumeric, 20+ chars, but NOT purely numeric)
  const isCardId = /^[a-z0-9]{20,}$/i.test(cardIdentifier) && !isNumeric;

  if (!isNumeric && !isCardId) {
    throw new ValidationError(
      `${fieldName} must be either a card number (numeric) or card ID (alphanumeric, 20+ chars), got: ${cardIdentifier}`
    );
  }
}

/**
 * Validate board name (non-empty string with reasonable length)
 * @param name - Board name to validate
 * @throws {ValidationError} If board name is invalid
 */
export function validateBoardName(name: string | undefined): void {
  validateRequiredString(name, 'Board name');

  if (name && name.length > 255) {
    throw new ValidationError('Board name must be 255 characters or less');
  }
}

/**
 * Validate column ID (UUID format)
 * @param columnId - Column ID to validate
 * @throws {ValidationError} If column ID is invalid
 */
export function validateColumnId(columnId: string): void {
  validateUUID(columnId, 'Column ID');
}

/**
 * Validate user ID (UUID format)
 * @param userId - User ID to validate
 * @throws {ValidationError} If user ID is invalid
 */
export function validateUserId(userId: string): void {
  validateUUID(userId, 'User ID');
}

/**
 * Validate board ID (UUID format)
 * @param boardId - Board ID to validate
 * @throws {ValidationError} If board ID is invalid
 */
export function validateBoardId(boardId: string): void {
  validateUUID(boardId, 'Board ID');
}

/**
 * Validate comment ID (UUID format)
 * @param commentId - Comment ID to validate
 * @throws {ValidationError} If comment ID is invalid
 */
export function validateCommentId(commentId: string): void {
  validateUUID(commentId, 'Comment ID');
}

/**
 * Validate reaction ID (UUID format)
 * @param reactionId - Reaction ID to validate
 * @throws {ValidationError} If reaction ID is invalid
 */
export function validateReactionId(reactionId: string): void {
  validateUUID(reactionId, 'Reaction ID');
}

/**
 * Validate tag ID (UUID format)
 * @param tagId - Tag ID to validate
 * @throws {ValidationError} If tag ID is invalid
 */
export function validateTagId(tagId: string): void {
  validateUUID(tagId, 'Tag ID');
}
