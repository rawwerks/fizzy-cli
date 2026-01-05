# Contributing to fizzy-cli

Thank you for your interest in contributing to fizzy-cli! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Adding New Commands](#adding-new-commands)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

---

## Code of Conduct

This project follows a simple code of conduct: be respectful, be collaborative, and help make fizzy-cli better for everyone.

## Getting Started

### Prerequisites

- **Bun** v1.0.0 or higher (recommended) or **Node.js** v18+
- **Git** for version control
- A **Fizzy account** for testing (https://app.fizzy.do)
- **Personal Access Token** from Fizzy for dogfooding tests

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/fizzy-cli.git
cd fizzy-cli
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/fizzy-cli.git
```

## Development Setup

### Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### Build the Project

```bash
bun run build
```

### Link for Local Testing

```bash
# This allows you to run `fizzy` globally during development
npm link
```

Now you can test your changes by running `fizzy` from anywhere.

### Run in Development Mode

```bash
# Run without building
bun run dev boards list
bun run dev --help
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/issue-123
```

### 2. Make Your Changes

- Write clean, readable code
- Follow existing patterns and conventions
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Type checking
bun run typecheck

# Run unit tests
bun test

# Run smoke tests
./scripts/smoke-test.sh

# Test manually
fizzy auth login
fizzy boards list
# ... test your specific changes
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "Add feature: description of what you did"
```

**Commit message guidelines:**
- Use present tense ("Add feature" not "Added feature")
- Start with a verb ("Add", "Fix", "Update", "Remove")
- Keep first line under 72 characters
- Add detailed description if needed

Examples:
```
Add support for card attachments

Implement file upload functionality for card attachments.
- Add uploadFile method to API client
- Update cards command to accept --attachment flag
- Add integration tests for file uploads
```

### 5. Push and Create Pull Request

```bash
git push origin feature/my-new-feature
```

Then create a Pull Request on GitHub.

## Testing

### Unit Tests

Unit tests are located in `src/commands/__tests__/`.

```bash
# Run all tests
bun test

# Run specific test file
bun test src/commands/__tests__/boards.test.ts

# Run tests in watch mode
bun test --watch
```

#### Writing Unit Tests

Example test structure:

```typescript
import { describe, expect, it, beforeEach } from 'bun:test';

describe('boards command', () => {
  beforeEach(() => {
    // Setup
  });

  it('should list all boards', async () => {
    // Arrange
    const mockBoards = [
      { id: 'board1', name: 'Board 1' },
      { id: 'board2', name: 'Board 2' },
    ];

    // Act
    const result = await listBoards();

    // Assert
    expect(result).toEqual(mockBoards);
  });
});
```

### Smoke Tests

Smoke tests verify that all commands are accessible:

```bash
./scripts/smoke-test.sh
```

### E2E Tests

End-to-end tests validate complete workflows:

```bash
bun test src/commands/__tests__/e2e.test.ts
```

### Dogfooding Tests

Test against a real Fizzy instance:

```bash
# Set up authentication
export FIZZY_TOKEN="your_token_here"
export FIZZY_BASE_URL="https://app.fizzy.do"

# Run dogfooding tests
./scripts/dogfood-test.sh
```

**Important:** Never commit credentials! Use environment variables or GitHub Secrets.

### Testing Checklist

Before submitting a PR, ensure:

- [ ] Unit tests pass: `bun test`
- [ ] Type checking passes: `bun run typecheck`
- [ ] Smoke tests pass: `./scripts/smoke-test.sh`
- [ ] Manual testing completed
- [ ] No sensitive data in commits (run `gitleaks detect`)

## Code Style

### TypeScript Guidelines

- Use TypeScript for all new code
- Prefer `interface` over `type` for object shapes
- Use explicit return types for functions
- Avoid `any` type; use `unknown` if type is truly unknown

```typescript
// Good
interface CreateCardOptions {
  board: string;
  title: string;
  description?: string;
}

async function createCard(options: CreateCardOptions): Promise<Card> {
  // ...
}

// Avoid
function createCard(options: any) {
  // ...
}
```

### Code Formatting

We don't currently use a formatter, but follow these conventions:

- **Indentation:** 2 spaces
- **Line length:** Max 120 characters (prefer 80-100)
- **Semicolons:** Always use them
- **Quotes:** Single quotes for strings, unless string contains single quote
- **Trailing commas:** Use them in multiline objects/arrays

### Naming Conventions

- **Variables/Functions:** camelCase (`boardList`, `createCard`)
- **Classes/Interfaces:** PascalCase (`BoardSchema`, `ApiClient`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_BASE_URL`)
- **Files:** kebab-case (`api-client.ts`, `token-storage.ts`)

### Project Structure

```
src/
├── commands/          # Command implementations
│   ├── auth.ts
│   ├── boards.ts
│   ├── cards.ts
│   └── __tests__/    # Command tests
├── lib/
│   ├── api/          # API client and utilities
│   ├── auth/         # Authentication logic
│   └── output/       # Output formatting
├── middleware/       # Command middleware
├── schemas/          # Zod schemas for validation
└── types/           # TypeScript type definitions
```

### Error Handling

Always handle errors gracefully:

```typescript
try {
  const result = await apiClient.get('boards');
  return result;
} catch (error) {
  printError(error instanceof Error ? error : new Error('Unknown error'));
  process.exit(1);
}
```

### Output Formatting

- Use existing output utilities from `lib/output/formatter.ts`
- Support both table and JSON output
- Use chalk for colored terminal output (but only when not in JSON mode)

```typescript
const format = detectFormat(options);

if (format === 'json') {
  printOutput(data, format);
} else {
  // Format for table display
  printOutput(tableData, format, {
    columns: ['ID', 'Name'],
    headers: ['ID', 'Name'],
  });
}
```

## Adding New Commands

### 1. Create Command File

Create a new file in `src/commands/`:

```typescript
// src/commands/my-feature.ts
import { Command } from 'commander';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '../lib/api/client.js';

function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('List my features')
    .option('--json', 'Output in JSON format')
    .option('--account <slug>', 'Account slug to use')
    .action(async (options) => {
      const auth = await requireAuth({ accountSlug: options.account });
      const client = createClient({
        auth: { type: 'bearer', token: auth.account.access_token },
        accountSlug: auth.account.account_slug,
      });

      const items = await client.get('my-features');
      // Format and output...
    });

  return command;
}

export function createMyFeatureCommand(): Command {
  const command = new Command('my-feature');

  command
    .description('Manage my features')
    .addCommand(createListCommand())
    // Add more subcommands...

  return command;
}
```

### 2. Register Command

Add to `src/cli.ts`:

```typescript
import { createMyFeatureCommand } from './commands/my-feature.js';

program.addCommand(createMyFeatureCommand());
```

### 3. Add Tests

Create test file in `src/commands/__tests__/my-feature.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { createMyFeatureCommand } from '../my-feature';

describe('my-feature command', () => {
  it('should have list subcommand', () => {
    const cmd = createMyFeatureCommand();
    const listCmd = cmd.commands.find(c => c.name() === 'list');
    expect(listCmd).toBeDefined();
  });

  // Add more tests...
});
```

### 4. Update Documentation

- Add command to README.md command overview
- Add detailed docs to docs/COMMANDS.md
- Add usage examples to docs/EXAMPLES.md

## Documentation

### Code Comments

- Add JSDoc comments for exported functions
- Explain complex logic with inline comments
- Keep comments up-to-date with code changes

```typescript
/**
 * Create a new card on a board
 *
 * @param options - Card creation options
 * @returns The created card
 * @throws {Error} If board ID is invalid or creation fails
 */
async function createCard(options: CreateCardOptions): Promise<Card> {
  // Validate required fields
  if (!options.board) {
    throw new Error('Board ID is required');
  }

  // Create card via API
  const result = await client.post(`boards/${options.board}/cards`, {
    card: options,
  });

  return result;
}
```

### README and Docs

When adding features:

1. Update README.md with new commands
2. Add to docs/COMMANDS.md with full details
3. Add examples to docs/EXAMPLES.md
4. Update CHANGELOG.md

## Pull Request Process

### Before Submitting

1. ✅ Ensure all tests pass
2. ✅ Update documentation
3. ✅ Run secret scanning: `gitleaks detect --no-git --verbose`
4. ✅ Rebase on latest main branch
5. ✅ Write clear PR description

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Smoke tests pass

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Tests pass locally

## Related Issues
Fixes #123
Relates to #456
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, PR will be merged

### After Merge

1. Delete your feature branch
2. Pull latest changes from main
3. Your contribution will be in the next release!

## Release Process

Releases are managed by maintainers. The process:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. Publish to npm: `npm publish`
6. Create GitHub release with notes

## Additional Resources

### Fizzy API

- API Documentation: `fizzy-api/docs/API.md`
- Fizzy Repository: https://github.com/basecamp/fizzy

### fizzy-cli

- Command Reference: [docs/COMMANDS.md](docs/COMMANDS.md)
- Usage Examples: [docs/EXAMPLES.md](docs/EXAMPLES.md)
- Troubleshooting: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

### Development Tools

- **TypeScript:** https://www.typescriptlang.org/docs/
- **Commander.js:** https://github.com/tj/commander.js
- **Zod:** https://zod.dev/
- **Bun:** https://bun.sh/docs

## Questions?

- Open a GitHub Discussion for questions
- Check existing Issues for known problems
- Read the documentation in `/docs`

## Thank You!

Your contributions help make fizzy-cli better for everyone. We appreciate your time and effort!

---

**Happy coding!** 🚀
