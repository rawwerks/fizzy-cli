# fizzy-cli

A powerful command-line interface for the Fizzy API with 100% API coverage, providing full control over your Fizzy boards, cards, and workflows from the terminal.

## Why fizzy-cli?

- **100% API Coverage**: Access all 55 Fizzy API endpoints directly from your terminal
- **Fast & Efficient**: Manage boards and cards faster than clicking through the web UI
- **Scriptable**: Automate workflows, create cards from scripts, bulk operations
- **Developer-Friendly**: JSON output for easy integration with other tools
- **File Upload Support**: Upload card images and user avatars directly from CLI
- **Offline Token Storage**: Secure local authentication with support for multiple accounts
- **Rich Output**: Beautiful table formatting for human-readable output

## Features

- **Boards**: Full CRUD operations for boards
- **Cards**: Create, update, move, close, tag, assign, and watch cards
- **Columns**: Manage board columns and card organization
- **Steps**: Complete checklist/todo management for cards
- **Comments**: Add, edit, and manage card comments
- **Reactions**: React to comments with emojis
- **Tags**: List and manage tags across your account
- **Users**: View and manage account users, update profiles
- **Notifications**: Read, manage, and bulk-update notifications
- **Authentication**: PAT (Personal Access Token) and magic link support
- **Multi-Account**: Switch between multiple Fizzy accounts seamlessly

## Installation

### Install from npm (Recommended)

```bash
npm install -g fizzy-cli
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/fizzy-cli.git
cd fizzy-cli

# Install dependencies
bun install

# Build the CLI
bun run build

# Link for global usage (optional)
npm link
```

### System Requirements

- **Bun** (recommended): v1.0.0 or higher
- **Node.js**: v18.0.0 or higher (for npm installation)
- **Operating Systems**: Linux, macOS, Windows (WSL recommended)

## Quick Start

### 1. Authentication

The easiest way to authenticate is using a Personal Access Token (PAT):

```bash
fizzy auth login
```

This will guide you through:
1. Visit https://app.fizzy.do/my/access_tokens
2. Create a token with "Read + Write" permission
3. Paste the token when prompted

Your token is stored securely in `~/.fizzy-cli/tokens.json`.

Alternatively, use magic link authentication:

```bash
fizzy auth login --magic-link your@email.com
```

### 2. List Your Boards

```bash
fizzy boards list
```

### 3. Create Your First Card

```bash
fizzy cards create --board <board-id> --title "My first CLI card" --description "Created from fizzy-cli!"
```

### 4. Explore Commands

```bash
fizzy --help
fizzy boards --help
fizzy cards --help
```

## Configuration

### Environment Variables

- `FIZZY_BASE_URL`: Override the default Fizzy API URL (default: `https://app.fizzy.do`)

### Token Storage

Tokens are stored in `~/.fizzy-cli/tokens.json` with the following structure:

```json
{
  "accounts": [
    {
      "account_slug": "your-account",
      "account_name": "Your Account",
      "access_token": "your_token_here",
      "user": {
        "id": "user_id",
        "name": "Your Name",
        "email_address": "your@email.com",
        "role": "owner"
      }
    }
  ],
  "defaultAccount": "your-account"
}
```

### Multiple Accounts

fizzy-cli supports multiple accounts. You can:

```bash
# List all accounts
fizzy auth accounts

# Switch default account
fizzy auth switch another-account

# Use specific account for a command
fizzy boards list --account another-account
```

## Command Overview

All commands support `--json` for JSON output and `--account <slug>` for multi-account usage.

### Authentication

- `fizzy auth login` - Authenticate with PAT or magic link
- `fizzy auth logout` - Remove stored credentials
- `fizzy auth status` - Show authentication status
- `fizzy auth accounts` - List all authenticated accounts
- `fizzy auth switch <slug>` - Switch default account

### Boards

- `fizzy boards list` - List all boards
- `fizzy boards get <id>` - Get board details
- `fizzy boards create <name>` - Create a new board
- `fizzy boards update <id>` - Update board properties
- `fizzy boards delete <id>` - Delete a board

### Cards

- `fizzy cards list` - List cards with filters
- `fizzy cards get <number>` - Get card details
- `fizzy cards create` - Create a new card
- `fizzy cards update <number>` - Update card properties
- `fizzy cards delete <number>` - Delete a card
- `fizzy cards close <number>` - Close a card
- `fizzy cards reopen <number>` - Reopen a closed card
- `fizzy cards move <number>` - Move card to column
- `fizzy cards postpone <number>` - Postpone card (Not Now)
- `fizzy cards triage <number>` - Send card to triage
- `fizzy cards tag <number>` - Add/remove tags
- `fizzy cards assign <number>` - Assign/unassign users
- `fizzy cards watch <number>` - Watch a card
- `fizzy cards unwatch <number>` - Unwatch a card

### Columns

- `fizzy columns list --board <id>` - List board columns
- `fizzy columns get <id> --board <id>` - Get column details
- `fizzy columns create --board <id> --name <name>` - Create column
- `fizzy columns update <id> --board <id>` - Update column
- `fizzy columns delete <id> --board <id>` - Delete column

### Steps (Card Checklists)

- `fizzy steps list --card <number>` - List card steps
- `fizzy steps get <id> --card <number>` - Get step details
- `fizzy steps create --card <number> --content <text>` - Create step
- `fizzy steps update <id> --card <number>` - Update step
- `fizzy steps delete <id> --card <number>` - Delete step

### Comments

- `fizzy comments list <card-number>` - List card comments
- `fizzy comments get <card-number> <comment-id>` - Get comment details
- `fizzy comments create <card-number> --body <text>` - Create comment
- `fizzy comments update <card-number> <comment-id> --body <text>` - Update comment
- `fizzy comments delete <card-number> <comment-id>` - Delete comment

### Reactions

- `fizzy reactions list --card <number> --comment <id>` - List reactions
- `fizzy reactions create --card <number> --comment <id> --content <emoji>` - Add reaction
- `fizzy reactions delete <id> --card <number> --comment <id>` - Remove reaction

### Tags

- `fizzy tags list` - List all tags

### Users

- `fizzy users list` - List all users
- `fizzy users get <id>` - Get user details
- `fizzy users me` - Get current user profile
- `fizzy users update <id>` - Update user details
- `fizzy users deactivate <id>` - Deactivate a user

### Notifications

- `fizzy notifications list` - List notifications
- `fizzy notifications read <id>` - Mark as read
- `fizzy notifications unread <id>` - Mark as unread
- `fizzy notifications mark-all-read` - Mark all as read

## Documentation

- **[Complete Command Reference](docs/COMMANDS.md)** - Detailed documentation for every command
- **[Usage Examples](docs/EXAMPLES.md)** - Real-world examples and workflows
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to fizzy-cli

## Development

### Running Locally

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

### Testing

This project has comprehensive test coverage across multiple layers:

#### Unit Tests

Run the unit test suite:
```bash
bun test
```

Tests are located in `src/commands/__tests__/` and cover individual commands and utilities.

#### Smoke Tests

Basic CLI functionality tests:
```bash
./scripts/smoke-test.sh
```

Verifies all commands are accessible and display help correctly.

#### E2E Tests

End-to-end integration tests:
```bash
bun test src/commands/__tests__/e2e.test.ts
```

Tests complete workflows and command interactions.

#### Dogfooding Tests (Optional)

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
│   │   ├── auth.ts           # Authentication commands
│   │   ├── boards.ts         # Board management
│   │   ├── cards.ts          # Card management
│   │   ├── columns.ts        # Column management
│   │   ├── steps.ts          # Step/checklist management
│   │   ├── comments.ts       # Comment management
│   │   ├── reactions.ts      # Reaction management
│   │   ├── tags.ts           # Tag listing
│   │   ├── users.ts          # User management
│   │   └── notifications.ts  # Notification management
│   ├── lib/
│   │   ├── api/              # API client and utilities
│   │   ├── auth/             # Authentication utilities
│   │   └── output/           # Output formatting utilities
│   ├── middleware/           # Command middleware (auth, validation)
│   ├── schemas/              # Zod schemas for API validation
│   └── types/                # TypeScript type definitions
├── docs/                     # Documentation
├── scripts/                  # Build and test scripts
├── package.json
└── tsconfig.json
```

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

## Examples

### Create a card with an image

```bash
fizzy cards create \
  --board abc123 \
  --title "Design mockup review" \
  --description "Please review the new homepage design" \
  --image ./mockup.png
```

### List cards filtered by status

```bash
# Show only closed cards
fizzy cards list --status closed

# Show cards with specific tag
fizzy cards list --tag tag-id-here
```

### Bulk tag multiple cards

```bash
# Tag cards in a loop
for card in 42 43 44; do
  fizzy cards tag $card --add "urgent"
done
```

### Get JSON output for scripting

```bash
# Parse JSON with jq
fizzy boards list --json | jq '.[] | select(.name | contains("Design"))'
```

### Watch a card for updates

```bash
fizzy cards watch 42
```

### Update your profile avatar

```bash
fizzy users update <your-user-id> --avatar ./profile.jpg
```

For more examples, see [docs/EXAMPLES.md](docs/EXAMPLES.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## License

ISC

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/fizzy-cli/issues)
- **Fizzy API Documentation**: [fizzy-api/docs/API.md](./fizzy-api/docs/API.md)
