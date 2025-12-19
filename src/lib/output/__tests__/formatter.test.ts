/**
 * Tests for output formatter utilities
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  formatJson,
  formatTable,
  formatList,
  formatCard,
  formatBoard,
  formatPagination,
  formatDate,
  formatOutput,
  formatError,
  detectFormat,
  setVerboseMode,
  isVerboseMode,
  setQuietMode,
  isQuietMode,
  type CardData,
  type BoardData,
  type PaginationInfo,
  type TableConfig,
} from '../formatter';

describe('formatJson', () => {
  test('formats simple object as JSON', () => {
    const data = { name: 'Test', value: 42 };
    const result = formatJson(data);
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  test('formats array as JSON', () => {
    const data = [1, 2, 3];
    const result = formatJson(data);
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  test('formats nested object as JSON', () => {
    const data = {
      nested: {
        value: 'test'
      },
      array: [1, 2, 3]
    };
    const result = formatJson(data);
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  test('formats null and undefined', () => {
    expect(formatJson(null)).toBe('null');
    // JSON.stringify(undefined) returns undefined, not a string
    expect(formatJson(undefined)).toBeUndefined();
  });
});

describe('formatTable', () => {
  test('formats array of objects as table', () => {
    const data = [
      { id: '1', name: 'Alice', age: 30 },
      { id: '2', name: 'Bob', age: 25 }
    ];
    const result = formatTable(data);
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
    expect(result).toContain('30');
    expect(result).toContain('25');
  });

  test('formats empty array', () => {
    const result = formatTable([]);
    expect(result).toBe('No data to display');
  });

  test('formats single object as key-value table', () => {
    const data = { name: 'Test', value: 42 };
    const result = formatTable(data);
    expect(result).toContain('name');
    expect(result).toContain('Test');
    expect(result).toContain('value');
    expect(result).toContain('42');
  });

  test('formats array of primitives', () => {
    const data = ['apple', 'banana', 'cherry'];
    const result = formatTable(data);
    expect(result).toContain('apple');
    expect(result).toContain('banana');
    expect(result).toContain('cherry');
  });

  test('respects custom columns config', () => {
    const data = [
      { id: '1', name: 'Alice', age: 30, email: 'alice@example.com' },
      { id: '2', name: 'Bob', age: 25, email: 'bob@example.com' }
    ];
    const config: TableConfig = {
      columns: ['id', 'name'],
      headers: ['ID', 'Name']
    };
    const result = formatTable(data, config);
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
    // Email should not be in the output
    expect(result).not.toContain('alice@example.com');
  });

  test('handles null and undefined values', () => {
    const data = [
      { id: '1', name: 'Alice', value: null },
      { id: '2', name: null, value: undefined }
    ];
    const result = formatTable(data);
    expect(result).toContain('Alice');
    expect(result).toContain('(empty)');
  });

  test('handles boolean values', () => {
    const data = [
      { name: 'Active', value: true },
      { name: 'Inactive', value: false }
    ];
    const result = formatTable(data);
    expect(result).toContain('Active');
    expect(result).toContain('Inactive');
    // Should contain checkmarks
    expect(result).toContain('✓');
    expect(result).toContain('✗');
  });

  test('handles array values', () => {
    const data = [
      { name: 'User', tags: ['admin', 'developer'] }
    ];
    const result = formatTable(data);
    expect(result).toContain('admin, developer');
  });

  test('returns empty string for null data', () => {
    expect(formatTable(null)).toBe('');
    expect(formatTable(undefined)).toBe('');
  });
});

describe('formatList', () => {
  test('formats array of objects as list', () => {
    const data = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ];
    const result = formatList(data);
    expect(result).toContain('[1]');
    expect(result).toContain('[2]');
    expect(result).toContain('id');
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
  });

  test('formats empty array', () => {
    const result = formatList([]);
    expect(result).toBe('No items to display');
  });

  test('formats array of primitives', () => {
    const data = ['apple', 'banana', 'cherry'];
    const result = formatList(data);
    expect(result).toContain('apple');
    expect(result).toContain('banana');
    expect(result).toContain('cherry');
    expect(result).toContain('•');
  });

  test('formats single object as key-value list', () => {
    const data = { name: 'Test', value: 42 };
    const result = formatList(data);
    expect(result).toContain('name');
    expect(result).toContain('Test');
    expect(result).toContain('value');
    expect(result).toContain('42');
  });

  test('returns empty string for null data', () => {
    expect(formatList(null)).toBe('');
    expect(formatList(undefined)).toBe('');
  });
});

describe('formatCard', () => {
  test('formats complete card data', () => {
    const card: CardData = {
      id: 'card-123',
      title: 'Implement feature',
      description: 'Add new feature to the system',
      status: 'in progress',
      assignees: ['Alice', 'Bob'],
      dueDate: '2024-12-31',
      createdAt: '2024-01-01',
      updatedAt: '2024-06-15'
    };
    const result = formatCard(card);
    expect(result).toContain('Implement feature');
    expect(result).toContain('card-123');
    expect(result).toContain('in progress');
    expect(result).toContain('Alice, Bob');
    expect(result).toContain('Add new feature');
  });

  test('formats minimal card data', () => {
    const card: CardData = {
      title: 'Simple card'
    };
    const result = formatCard(card);
    expect(result).toContain('Simple card');
  });

  test('handles card with extra fields', () => {
    const card: CardData = {
      title: 'Card',
      customField: 'custom value',
      priority: 'high'
    };
    const result = formatCard(card);
    expect(result).toContain('Card');
    expect(result).toContain('customField');
    expect(result).toContain('custom value');
    expect(result).toContain('priority');
    expect(result).toContain('high');
  });

  test('formats different status colors correctly', () => {
    const statuses = ['done', 'in progress', 'todo', 'blocked'];
    for (const status of statuses) {
      const card: CardData = { title: 'Test', status };
      const result = formatCard(card);
      expect(result).toContain(status);
    }
  });
});

describe('formatBoard', () => {
  test('formats complete board data', () => {
    const board: BoardData = {
      id: 'board-456',
      name: 'Project Board',
      description: 'Main project board',
      cardCount: 15,
      createdAt: '2024-01-01',
      updatedAt: '2024-06-15'
    };
    const result = formatBoard(board);
    expect(result).toContain('Project Board');
    expect(result).toContain('board-456');
    expect(result).toContain('Main project board');
    expect(result).toContain('15');
  });

  test('formats minimal board data', () => {
    const board: BoardData = {
      name: 'Simple Board'
    };
    const result = formatBoard(board);
    expect(result).toContain('Simple Board');
  });

  test('handles board with extra fields', () => {
    const board: BoardData = {
      name: 'Board',
      owner: 'Alice',
      isPrivate: true
    };
    const result = formatBoard(board);
    expect(result).toContain('Board');
    expect(result).toContain('owner');
    expect(result).toContain('Alice');
  });
});

describe('formatPagination', () => {
  test('formats pagination info correctly', () => {
    const pagination: PaginationInfo = {
      page: 2,
      pageSize: 10,
      total: 45,
      totalPages: 5
    };
    const result = formatPagination(pagination);
    expect(result).toContain('11-20');
    expect(result).toContain('45');
    expect(result).toContain('2/5');
  });

  test('formats first page correctly', () => {
    const pagination: PaginationInfo = {
      page: 1,
      pageSize: 10,
      total: 45,
      totalPages: 5
    };
    const result = formatPagination(pagination);
    expect(result).toContain('1-10');
    expect(result).toContain('45');
  });

  test('formats last page correctly', () => {
    const pagination: PaginationInfo = {
      page: 5,
      pageSize: 10,
      total: 45,
      totalPages: 5
    };
    const result = formatPagination(pagination);
    expect(result).toContain('41-45');
    expect(result).toContain('45');
  });

  test('handles single page', () => {
    const pagination: PaginationInfo = {
      page: 1,
      pageSize: 50,
      total: 5,
      totalPages: 1
    };
    const result = formatPagination(pagination);
    expect(result).toContain('1-5');
    expect(result).toContain('5');
  });
});

describe('formatDate', () => {
  test('formats recent date in minutes', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const result = formatDate(fiveMinutesAgo);
    expect(result).toContain('m ago');
  });

  test('formats date in hours', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const result = formatDate(twoHoursAgo);
    expect(result).toContain('h ago');
  });

  test('formats date in days', () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const result = formatDate(threeDaysAgo);
    expect(result).toContain('d ago');
  });

  test('formats old date with full format', () => {
    const oldDate = new Date('2024-01-01');
    const result = formatDate(oldDate);
    expect(result).toContain('Jan');
    expect(result).toContain('2024');
  });

  test('handles ISO string dates', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const result = formatDate(fiveMinutesAgo.toISOString());
    expect(result).toContain('m ago');
  });

  test('handles invalid dates', () => {
    const result = formatDate('invalid-date');
    expect(result).toBe('invalid-date');
  });

  test('handles Date objects', () => {
    const date = new Date('2024-01-01');
    const result = formatDate(date);
    expect(result).toBeTruthy();
  });
});

describe('formatOutput', () => {
  const testData = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' }
  ];

  test('formats as JSON when format is json', () => {
    const result = formatOutput(testData, 'json');
    expect(result).toBe(JSON.stringify(testData, null, 2));
  });

  test('formats as table when format is table', () => {
    const result = formatOutput(testData, 'table');
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
  });

  test('formats as list when format is list', () => {
    const result = formatOutput(testData, 'list');
    expect(result).toContain('[1]');
    expect(result).toContain('[2]');
    expect(result).toContain('Alice');
  });

  test('formats as card when format is card and data is object', () => {
    const card: CardData = {
      title: 'Test Card',
      description: 'Test description'
    };
    const result = formatOutput(card, 'card');
    expect(result).toContain('Test Card');
    expect(result).toContain('Test description');
  });

  test('falls back to table when format is card and data is array', () => {
    const result = formatOutput(testData, 'card');
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
  });

  test('passes table config through', () => {
    const config: TableConfig = {
      columns: ['name'],
      headers: ['Name']
    };
    const result = formatOutput(testData, 'table', config);
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
    // ID should not be in the output
    expect(result).not.toContain('id');
  });
});

describe('formatError', () => {
  test('formats Error object', () => {
    const error = new Error('Something went wrong');
    const result = formatError(error);
    expect(result).toContain('Error:');
    expect(result).toContain('Something went wrong');
  });

  test('formats error string', () => {
    const result = formatError('Custom error message');
    expect(result).toContain('Error:');
    expect(result).toContain('Custom error message');
  });
});

describe('detectFormat', () => {
  test('returns json when json flag is true', () => {
    const result = detectFormat({ json: true });
    expect(result).toBe('json');
  });

  test('returns table when json flag is false', () => {
    const result = detectFormat({ json: false });
    expect(result).toBe('table');
  });

  test('returns table when json flag is undefined', () => {
    const result = detectFormat({});
    expect(result).toBe('table');
  });
});

describe('verbose mode', () => {
  beforeEach(() => {
    setVerboseMode(false);
  });

  test('starts disabled', () => {
    expect(isVerboseMode()).toBe(false);
  });

  test('can be enabled', () => {
    setVerboseMode(true);
    expect(isVerboseMode()).toBe(true);
  });

  test('can be disabled', () => {
    setVerboseMode(true);
    setVerboseMode(false);
    expect(isVerboseMode()).toBe(false);
  });
});

describe('quiet mode', () => {
  beforeEach(() => {
    setQuietMode(false);
  });

  test('starts disabled', () => {
    expect(isQuietMode()).toBe(false);
  });

  test('can be enabled', () => {
    setQuietMode(true);
    expect(isQuietMode()).toBe(true);
  });

  test('can be disabled', () => {
    setQuietMode(true);
    setQuietMode(false);
    expect(isQuietMode()).toBe(false);
  });
});

describe('edge cases and error handling', () => {
  test('formatTable handles objects with no enumerable properties', () => {
    const obj = Object.create(null);
    const result = formatTable(obj);
    // Empty object with no properties returns empty string after table creation
    expect(result).toBeDefined();
  });

  test('formatList handles deeply nested objects', () => {
    const data = [
      {
        nested: {
          deeply: {
            value: 'test'
          }
        }
      }
    ];
    const result = formatList(data);
    expect(result).toContain('nested');
  });

  test('formatCard handles empty card', () => {
    const card: CardData = {};
    const result = formatCard(card);
    // Empty card returns empty string (no lines to join)
    expect(result).toBe('');
  });

  test('formatBoard handles empty board', () => {
    const board: BoardData = {};
    const result = formatBoard(board);
    // Empty board returns empty string (no lines to join)
    expect(result).toBe('');
  });

  test('formatDate handles future dates', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = formatDate(future);
    expect(result).toBeTruthy();
  });

  test('formatTable handles mixed type arrays', () => {
    const data = [
      { type: 'string', value: 'text' },
      { type: 'number', value: 42 },
      { type: 'boolean', value: true }
    ];
    const result = formatTable(data);
    expect(result).toContain('text');
    expect(result).toContain('42');
  });

  test('formatJson handles circular references gracefully', () => {
    const obj: any = { name: 'test' };
    obj.self = obj;
    expect(() => formatJson(obj)).toThrow();
  });
});

describe('integration tests', () => {
  test('complete workflow with cards', () => {
    const cards: CardData[] = [
      {
        id: '1',
        title: 'Design UI',
        status: 'done',
        assignees: ['Alice']
      },
      {
        id: '2',
        title: 'Implement API',
        status: 'in progress',
        assignees: ['Bob']
      },
      {
        id: '3',
        title: 'Write tests',
        status: 'todo',
        assignees: ['Charlie']
      }
    ];

    // Test table format
    const tableResult = formatOutput(cards, 'table');
    expect(tableResult).toContain('Design UI');
    expect(tableResult).toContain('Implement API');
    expect(tableResult).toContain('Write tests');

    // Test list format
    const listResult = formatOutput(cards, 'list');
    expect(listResult).toContain('Design UI');
    expect(listResult).toContain('[1]');
    expect(listResult).toContain('[2]');

    // Test JSON format
    const jsonResult = formatOutput(cards, 'json');
    expect(jsonResult).toBe(JSON.stringify(cards, null, 2));
  });

  test('complete workflow with pagination', () => {
    const cards = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      title: `Card ${i + 1}`
    }));

    const pagination: PaginationInfo = {
      page: 1,
      pageSize: 5,
      total: 15,
      totalPages: 3
    };

    const tableResult = formatOutput(cards, 'table');
    const paginationResult = formatPagination(pagination);

    expect(tableResult).toContain('Card 1');
    expect(tableResult).toContain('Card 5');
    expect(paginationResult).toContain('1-5');
    expect(paginationResult).toContain('15');
  });
});
