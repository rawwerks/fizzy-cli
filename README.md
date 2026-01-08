# @raw-works/fizzy-cli

**CLI for [Fizzy](https://fizzy.do) - designed for AI agents like Claude Code**

[Fizzy](https://fizzy.do) is a lightweight project management tool with boards, cards, and columns (similar to Trello). This CLI lets you manage Fizzy from the terminal or through AI agents.

## 🚀 Quick Start

**No installation required** - run directly with bunx or npx:

```bash
# 1. Login with your Personal Access Token
#    Get one at: https://app.fizzy.do/my/access_tokens
bunx @raw-works/fizzy-cli auth login --token YOUR_TOKEN

# 2. List your boards (note the board IDs in the output)
bunx @raw-works/fizzy-cli boards list

# 3. List cards on a board
bunx @raw-works/fizzy-cli cards list --board BOARD_ID

# 4. Create a card
bunx @raw-works/fizzy-cli cards create --board BOARD_ID --title "Ship it!"
```

> **Tip:** Replace `bunx` with `npx` if you prefer npm. After global install, use just `fizzy` instead.
>
> **Discover commands:** Run `bunx @raw-works/fizzy-cli --help` to see all available commands.

## ⚡️ Installation (Optional)

The Quick Start above works without installation. For convenience, you can install globally:

### Option 1: bunx (Fastest)

```bash
# Bun's npx equivalent - much faster:
bunx @raw-works/fizzy-cli <command>

# Example: create a card
bunx @raw-works/fizzy-cli cards create --board abc123 --title "New card"
```

### Option 2: npx (No Installation)

```bash
# Run any command without installing:
npx @raw-works/fizzy-cli <command>

# Example: list boards
npx @raw-works/fizzy-cli boards list
```

### Option 3: Global Install

```bash
# With bun (fastest):
bun add -g @raw-works/fizzy-cli

# With npm:
npm install -g @raw-works/fizzy-cli

# Now just use 'fizzy':
fizzy boards list
fizzy cards create --board abc123 --title "New card"
```

### Option 4: Local Project

```bash
# With bun:
bun add @raw-works/fizzy-cli

# With npm:
npm install @raw-works/fizzy-cli

# Use via package.json scripts or npx/bunx:
bunx fizzy boards list
npx fizzy boards list
```

## 🔐 Authentication

### Step 1: Get a Personal Access Token

1. Log in to [Fizzy](https://app.fizzy.do) and go to your **Profile**
2. Scroll to the **API** section and click **"Personal access tokens"**
3. Click **"Generate a new access token"**
4. Enter a description (e.g., "fizzy-cli") and select **"Read + Write"** permission
5. Click **"Generate access token"** and copy the token

> **Keep your token secret!** Anyone with your token can access your Fizzy account.

### Step 2: Log In

**For AI Agents / Scripts (Non-Interactive):**

```bash
# Pass token directly - no prompts
fizzy auth login --token YOUR_PAT_TOKEN
```

**For Humans (Interactive):**

```bash
# Interactive prompt will ask for your token
fizzy auth login

# Or use magic link (sends login email)
fizzy auth login --magic-link your@email.com
```

### Auth Management

```bash
fizzy auth status      # Check if logged in
fizzy auth accounts    # List all accounts
fizzy auth switch foo  # Switch default account
fizzy auth logout      # Remove credentials
```

Your credentials are stored in `~/.fizzy-cli/tokens.json`.

## 📤 JSON Output

All commands support `--json` for machine-readable output:

```bash
# Get boards as JSON (for scripting/AI agents)
fizzy boards list --json

# Pipe to jq for processing
fizzy boards list --json | jq '.[0].id'

# Get a specific card as JSON
fizzy cards get 42 --board BOARD_ID --json
```

## 💡 Why This CLI?

- ✅ **100% API Coverage** - All 55 Fizzy endpoints supported
- ✅ **Zero Config** - Works with npx, no setup needed
- ✅ **Type Safe** - Built with TypeScript, validated with Zod
- ✅ **Battle Tested** - 293 tests, dogfooded daily
- ✅ **Rich Features** - File uploads, search, filters, retries, confirmations
- ✅ **Great DX** - Markdown support, templates, auto-complete ready
- ✅ **Multi-Account** - Switch between Fizzy accounts seamlessly
- ✅ **Scriptable** - JSON output for automation

## 🎯 Features

### Core Resources
- **Boards**: Create, list, update, delete boards
- **Cards**: Full lifecycle management - create, update, move, close, reopen, postpone, triage
- **Columns**: Organize your board workflows
- **Steps**: Checklists and todos for cards
- **Comments**: Discuss and collaborate
- **Reactions**: React with emojis
- **Tags**: Organize and filter
- **Users**: Manage team members
- **Notifications**: Stay updated

### Power Features
- 📁 **File Uploads**: Card images, user avatars
- 🔍 **Search & Filter**: Advanced filtering, sorting, date ranges
- 📝 **Rich Text**: Markdown support with templates (bug, feature, task)
- ✅ **Validation**: Client-side validation for better error messages
- 🔄 **Retries**: Automatic retry with exponential backoff
- ⚠️  **Confirmations**: Prevent accidents with delete confirmations
- 📄 **Pagination**: Handle large datasets efficiently
- 🎨 **Beautiful Output**: Tables, colors, spinners

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

- **Issues**: [GitHub Issues](https://github.com/rawwerks/fizzy-cli/issues)
- **Fizzy API Documentation**: [fizzy-api/docs/API.md](./fizzy-api/docs/API.md)
