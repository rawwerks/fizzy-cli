# fizzy-cli

Command-line interface for Fizzy API

## Installation

```bash
bun install
```

## Development

```bash
# Run in development mode
bun run dev

# Build the project
bun run build

# Type checking
bun run typecheck

# Run tests
bun test
```

## Testing

This project has comprehensive test coverage across multiple layers:

### Unit Tests

Run the unit test suite:
```bash
bun test
```

Tests are located in `src/commands/__tests__/` and cover individual commands and utilities.

### Smoke Tests

Basic CLI functionality tests:
```bash
./scripts/smoke-test.sh
```

Verifies all commands are accessible and display help correctly.

### E2E Tests

End-to-end integration tests:
```bash
bun test src/commands/__tests__/e2e.test.ts
```

Tests complete workflows and command interactions.

### Dogfooding Tests (Optional)

Test against a real Fizzy instance:
```bash
export FIZZY_TOKEN="your_token"
export FIZZY_BASE_URL="https://app.fizzy.do"
./scripts/dogfood-test.sh
```

**Security Note**: Never commit credentials. Use environment variables or GitHub Secrets in CI/CD.

### Secret Scanning

All commits are scanned for leaked credentials using gitleaks:
```bash
gitleaks detect --no-git --verbose
```

Configuration: `.gitleaks.toml`

## Project Structure

```
fizzy-cli/
├── src/
│   ├── index.ts              # Main entry point
│   ├── cli.ts                # CLI setup with Commander
│   ├── commands/             # Command implementations
│   ├── lib/
│   │   ├── api/              # API client and utilities
│   │   ├── auth/             # Authentication utilities
│   │   └── output/           # Output formatting utilities
│   ├── middleware/           # Command middleware (auth, validation, etc.)
│   ├── schemas/              # Zod schemas for API validation
│   └── types/                # TypeScript type definitions
├── package.json
└── tsconfig.json
```

## Configuration

The base URL for Fizzy API is `https://app.fizzy.do` and is configurable via the `--base-url` option.

## Automated Updates

This CLI stays in sync with the upstream [Fizzy repository](https://github.com/basecamp/fizzy) through:

### Nightly Updates

A GitHub Actions workflow runs every night at 2 AM UTC to:
1. Check for updates in the `fizzy-api` submodule
2. Update to the latest commit from upstream
3. Run comprehensive tests:
   - Type checking
   - Unit tests
   - CLI smoke tests
4. Create a pull request if updates are available and tests pass

The workflow can also be triggered manually via the Actions tab.

### Smoke Tests

Basic CLI functionality is verified through automated smoke tests in `scripts/smoke-test.sh`. Run locally with:

```bash
./scripts/smoke-test.sh
```

This verifies all CLI commands are accessible and help text displays correctly.

## License

ISC
