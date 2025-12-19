# Authentication Module

This directory contains the authentication implementation for fizzy-cli. It supports two authentication methods:

1. **Personal Access Tokens** - Stored locally in `~/.fizzy-cli/tokens.json`
2. **Magic Link Authentication** - For native apps (email → code → session token)

## Architecture

The authentication system is based on bc-cli patterns but adapted for Fizzy's multi-account structure.

### Key Files

- **token-storage.ts** - Manages token storage in `~/.fizzy-cli/tokens.json`
  - Supports multiple accounts per user
  - Stores: access_token, account_slug, account_name, user info
  - Secure file permissions (0o600)

- **config.ts** - Configuration management
  - Default base URL: `https://app.fizzy.do`
  - Override via `FIZZY_BASE_URL` environment variable
  - User preferences in `~/.config/fizzy-cli/config.json`

- **magic-link.ts** - Magic link authentication flow
  - Step 1: POST `/session` with email → `pending_authentication_token`
  - Step 2: POST `/session/magic_link` with code → `session_token`
  - Step 3: GET `/my/identity` → accounts list
  - Step 4: Save all accounts locally

- **auth.ts** - Barrel exports for easy imports

## Token Storage Format

Tokens are stored in `~/.fizzy-cli/tokens.json`:

```json
{
  "accounts": [
    {
      "account_slug": "acme-corp",
      "account_name": "Acme Corporation",
      "account_id": "abc123",
      "access_token": "eyJfcmFpbHMi...",
      "user": {
        "id": "user123",
        "name": "Jane Doe",
        "email_address": "jane@acme.com",
        "role": "admin"
      },
      "created_at": "2025-12-19T12:00:00.000Z"
    }
  ],
  "default_account": "acme-corp"
}
```

## Usage Examples

### Magic Link Authentication

```typescript
import { authenticateWithMagicLink } from './lib/auth/magic-link.js';
import * as readline from 'readline';

async function login(email: string) {
  const accounts = await authenticateWithMagicLink(email, async () => {
    // Prompt user for the code they received via email
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('Enter the 6-character code from your email: ', (code) => {
        rl.close();
        resolve(code);
      });
    });
  });

  console.log(`Successfully authenticated! ${accounts.length} account(s) added.`);
}
```

### Using Auth Middleware in Commands

```typescript
import { requireAuth } from './middleware/auth.js';

async function listBoards(accountSlug?: string) {
  try {
    // Get authentication details
    const auth = await requireAuth({ accountSlug });

    // Make authenticated API call
    const response = await fetch(`${auth.accountBaseUrl}/boards`, {
      headers: {
        Authorization: auth.authHeader,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch boards: ${response.statusText}`);
    }

    const boards = await response.json();
    console.log(`Boards for ${auth.account.account_name}:`);
    console.log(boards);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      console.error('Please login first: fizzy login');
    } else if (error instanceof AccountSelectionError) {
      console.error(error.message);
    } else {
      throw error;
    }
  }
}
```

### Managing Multiple Accounts

```typescript
import { listAccounts, setDefaultAccount, removeAccount } from './lib/auth/auth.js';

// List all accounts
const accounts = await listAccounts();
accounts.forEach(acc => {
  console.log(`- ${acc.account_slug} (${acc.account_name})`);
});

// Set default account
await setDefaultAccount('acme-corp');

// Remove an account
await removeAccount('old-account');
```

### Configuration Management

```typescript
import { getConfig, setConfig } from './lib/auth/auth.js';

// Set output format preference
await setConfig('output_format', 'json');

// Get current setting
const format = await getConfig('output_format'); // 'json'
```

## Environment Variables

- **FIZZY_BASE_URL** - Override the base URL (default: `https://app.fizzy.do`)
  - Use `http://fizzy.localhost:3006` for local development
- **XDG_CONFIG_HOME** - Override config directory (default: `~/.config`)

## Security

- Token files are created with `0o600` permissions (owner read/write only)
- Token directory is created with `0o700` permissions (owner access only)
- Access tokens are session tokens from Fizzy API (Bearer tokens)

## Multi-Tenancy Support

Fizzy uses URL path-based multi-tenancy:
- Each account has a unique slug (e.g., `acme-corp`)
- API URLs are prefixed: `/{account_slug}/boards`
- The middleware automatically constructs the correct URL: `https://app.fizzy.do/{account_slug}`

## Auto-Selection Logic

The middleware automatically selects an account:

1. If `--account` flag is provided, use that account
2. If only one account exists, use it automatically
3. If multiple accounts exist, use the default account
4. If no default is set, prompt the user to specify

## Error Handling

- **AuthenticationRequiredError** - No valid tokens found
- **AccountSelectionError** - Ambiguous account selection
- API errors are thrown with descriptive messages
