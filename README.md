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

## License

ISC
