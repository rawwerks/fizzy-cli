# Command Reference

Auto-generated from CLI source code.

> This documentation is automatically generated from the CLI command definitions.
> Last updated: 2026-01-05T19:08:52.254Z

## Table of Contents

- [auth](#auth)
- [boards](#boards)
- [cards](#cards)
- [columns](#columns)
- [comments](#comments)
- [reactions](#reactions)
- [steps](#steps)
- [tags](#tags)
- [users](#users)
- [notifications](#notifications)

---

## auth

Authentication commands

**Subcommands:**

- `login` - Authenticate with Fizzy (PAT recommended, or magic link)
- `logout` - Remove stored credentials
- `status` - Show current authentication status and accounts
- `accounts` - List all authenticated accounts
- `switch` - Switch the default account

### login

Authenticate with Fizzy (PAT recommended, or magic link)

**Usage:**

```bash
fizzy login [email] [options]
```

**Arguments:**

- `email` (optional) - Email address (only for magic link auth)

**Options:**

- `--json` - Output in JSON format
- `--token <token>` - Personal Access Token (from https://app.fizzy.do/my/access_tokens)
- `--magic-link` - Use magic link authentication instead of PAT
- `--no-browser` - Do not automatically open browser for authentication
- `--wait` - Wait for authentication to complete (polls for completion)
- `--timeout <seconds>` - Timeout in seconds when using --wait (default: 300) (default: "300")

### logout

Remove stored credentials

**Usage:**

```bash
fizzy logout [options]
```

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Remove specific account by slug (otherwise removes all)

### status

Show current authentication status and accounts

**Usage:**

```bash
fizzy status [options]
```

**Options:**

- `--json` - Output in JSON format

### accounts

List all authenticated accounts

**Usage:**

```bash
fizzy accounts [options]
```

**Options:**

- `--json` - Output in JSON format

### switch

Switch the default account

**Usage:**

```bash
fizzy switch <slug> [options]
```

**Arguments:**

- `slug` (required) - Account slug to switch to

**Options:**

- `--json` - Output in JSON format

---

## boards

Manage boards

**Subcommands:**

- `list` - List all boards
- `get` - Get board details
- `create` - Create a new board
- `update` - Update an existing board
- `delete` - Delete a board

### list

List all boards

**Usage:**

```bash
fizzy list [options]
```

**Options:**

- `--search <query>` - Search board names
- `--sort <field>` - Sort by: name, created_at (default: name)
- `--order <order>` - Sort order: asc, desc (default: asc)
- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use
- `--page <number>` - Page number (default: 1)
- `--per-page <number>` - Results per page (default: 30)
- `--all` - Fetch all results (auto-paginate)
- `--limit <number>` - Maximum number of boards to return (deprecated, use --all instead)

### get

Get board details

**Usage:**

```bash
fizzy get <id> [options]
```

**Arguments:**

- `id` (required) - Board ID

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### create

Create a new board

**Usage:**

```bash
fizzy create <name> [options]
```

**Arguments:**

- `name` (required) - Board name

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use
- `--all-access <boolean>` - Whether any user in the account can access this board (default: true)
- `--auto-postpone-period <days>` - Number of days of inactivity before cards are automatically postponed
- `--public-description <text>` - Rich text description shown on the public board page

### update

Update an existing board

**Usage:**

```bash
fizzy update <id> [options]
```

**Arguments:**

- `id` (required) - Board ID

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use
- `--name <name>` - Board name
- `--all-access <boolean>` - Whether any user in the account can access this board
- `--auto-postpone-period <days>` - Number of days of inactivity before cards are automatically postponed
- `--public-description <text>` - Rich text description shown on the public board page

### delete

Delete a board

**Usage:**

```bash
fizzy delete <id> [options]
```

**Arguments:**

- `id` (required) - Board ID

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use
- `--force` - Skip confirmation prompt (default: false)

---

## cards

Manage cards (tasks/issues)

**Subcommands:**

- `list` - List cards
- `get` - Get card details
- `create` - Create a new card
- `update` - Update a card
- `delete` - Delete a card
- `close` - Close a card
- `reopen` - Reopen a closed card
- `move` - Move card to a column
- `postpone` - Postpone a card (move to "Not Now")
- `triage` - Send card to triage
- `tag` - Add or remove tags from a card
- `assign` - Assign or unassign users to/from a card
- `watch` - Watch a card (receive notifications)
- `unwatch` - Unwatch a card (stop receiving notifications)

### list

List cards

**Usage:**

```bash
fizzy list [options]
```

**Options:**

- `--board <id>` - Filter by board ID
- `--status <status>` - Filter by status: drafted, published, closed, not_now
- `--tag <id>` - Filter by tag ID
- `--assignee <user>` - Filter by assignee user ID
- `--search <query>` - Search card titles and descriptions
- `--created-after <date>` - Created after date (ISO 8601)
- `--created-before <date>` - Created before date (ISO 8601)
- `--sort <field>` - Sort by: created_at, updated_at, title, number (default: created_at)
- `--order <order>` - Sort order: asc, desc (default: desc)
- `--all` - Fetch all cards (use with filters for searching across all cards)
- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### get

Get card details

**Usage:**

```bash
fizzy get <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--render` - Render Markdown description in terminal
- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### create

Create a new card

**Usage:**

```bash
fizzy create [options]
```

**Options:**

- `--board <id>` - Board ID
- `--title <title>` - Card title
- `--description <text>` - Card description
- `--description-file <path>` - Path to file containing card description (Markdown)
- `--edit` - Open description in default editor
- `--template <type>` - Use template: bug, feature, task
- `--status <status>` - Initial status (drafted or published) (default: "published")
- `--image <path>` - Path to card header image (jpg, png, gif, webp)
- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### update

Update a card

**Usage:**

```bash
fizzy update <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--title <title>` - New title
- `--description <text>` - New description
- `--description-file <path>` - Path to file containing card description (Markdown)
- `--edit` - Open description in default editor
- `--status <status>` - New status (drafted or published)
- `--image <path>` - Path to card header image (jpg, png, gif, webp)
- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### delete

Delete a card

**Usage:**

```bash
fizzy delete <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use
- `--force` - Skip confirmation prompt (default: false)

### close

Close a card

**Usage:**

```bash
fizzy close <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### reopen

Reopen a closed card

**Usage:**

```bash
fizzy reopen <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### move

Move card to a column

**Usage:**

```bash
fizzy move <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--column <id>` - Column ID to move the card to
- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### postpone

Postpone a card (move to "Not Now")

**Usage:**

```bash
fizzy postpone <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### triage

Send card to triage

**Usage:**

```bash
fizzy triage <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### tag

Add or remove tags from a card

**Usage:**

```bash
fizzy tag <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--add <tags...>` - Tags to add
- `--remove <tags...>` - Tags to remove
- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### assign

Assign or unassign users to/from a card

**Usage:**

```bash
fizzy assign <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--add <users...>` - User IDs to assign
- `--remove <users...>` - User IDs to unassign
- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### watch

Watch a card (receive notifications)

**Usage:**

```bash
fizzy watch <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

### unwatch

Unwatch a card (stop receiving notifications)

**Usage:**

```bash
fizzy unwatch <number> [options]
```

**Arguments:**

- `number` (required)

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug to use

---

## columns

Manage columns on boards

**Subcommands:**

- `list` - List columns for a board
- `get` - Get column details
- `create` - Create a new column on a board
- `update` - Update a column
- `delete` - Delete a column

### list

List columns for a board

**Usage:**

```bash
fizzy list [options]
```

**Options:**

- `--board <id>` - Board ID
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### get

Get column details

**Usage:**

```bash
fizzy get <id> [options]
```

**Arguments:**

- `id` (required) - Column ID

**Options:**

- `--board <id>` - Board ID
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### create

Create a new column on a board

**Usage:**

```bash
fizzy create [options]
```

**Options:**

- `--board <id>` - Board ID
- `--name <name>` - Column name
- `--color <color>` - Column color (e.g., var(--color-card-default))
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### update

Update a column

**Usage:**

```bash
fizzy update <id> [options]
```

**Arguments:**

- `id` (required) - Column ID

**Options:**

- `--board <id>` - Board ID
- `--name <name>` - New column name
- `--color <color>` - New column color
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### delete

Delete a column

**Usage:**

```bash
fizzy delete <id> [options]
```

**Arguments:**

- `id` (required) - Column ID

**Options:**

- `--board <id>` - Board ID
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account
- `--force` - Skip confirmation prompt (default: false)

---

## comments

Manage comments on cards

**Subcommands:**

- `list` - List comments for a card
- `get` - Get comment details
- `create` - Create a new comment
- `update` - Update a comment
- `delete` - Delete a comment
- `react` - Add a reaction to a comment
- `unreact` - Remove a reaction from a comment

### list

List comments for a card

**Usage:**

```bash
fizzy list <card-number> [options]
```

**Arguments:**

- `card-number` (required) - Card number

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### get

Get comment details

**Usage:**

```bash
fizzy get <card-number> <comment-id> [options]
```

**Arguments:**

- `card-number` (required) - Card number
- `comment-id` (required) - Comment ID

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### create

Create a new comment

**Usage:**

```bash
fizzy create <card-number> [options]
```

**Arguments:**

- `card-number` (required) - Card number

**Options:**

- `--body <text>` - Comment body
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### update

Update a comment

**Usage:**

```bash
fizzy update <card-number> <comment-id> [options]
```

**Arguments:**

- `card-number` (required) - Card number
- `comment-id` (required) - Comment ID

**Options:**

- `--body <text>` - Updated comment body
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### delete

Delete a comment

**Usage:**

```bash
fizzy delete <card-number> <comment-id> [options]
```

**Arguments:**

- `card-number` (required) - Card number
- `comment-id` (required) - Comment ID

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account
- `--force` - Skip confirmation prompt (default: false)

### react

Add a reaction to a comment

**Usage:**

```bash
fizzy react <card-number> <comment-id> <emoji> [options]
```

**Arguments:**

- `card-number` (required) - Card number
- `comment-id` (required) - Comment ID
- `emoji` (required) - Reaction emoji or text

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### unreact

Remove a reaction from a comment

**Usage:**

```bash
fizzy unreact <card-number> <comment-id> <reaction-id> [options]
```

**Arguments:**

- `card-number` (required) - Card number
- `comment-id` (required) - Comment ID
- `reaction-id` (required) - Reaction ID

**Options:**

- `--account <slug>` - Use specific Fizzy account

---

## reactions

Manage reactions on comments

**Subcommands:**

- `list` - List reactions for a comment
- `create` - Add a reaction to a comment
- `delete` - Remove a reaction from a comment

### list

List reactions for a comment

**Usage:**

```bash
fizzy list [options]
```

**Options:**

- `--comment <id>` - Comment ID
- `--card <number>` - Card number
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### create

Add a reaction to a comment

**Usage:**

```bash
fizzy create [options]
```

**Options:**

- `--comment <id>` - Comment ID
- `--card <number>` - Card number
- `--content <emoji>` - Reaction content (emoji or text)
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### delete

Remove a reaction from a comment

**Usage:**

```bash
fizzy delete <reaction-id> [options]
```

**Arguments:**

- `reaction-id` (required) - Reaction ID

**Options:**

- `--comment <id>` - Comment ID
- `--card <number>` - Card number
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

---

## steps

Manage steps on cards

**Subcommands:**

- `list` - List steps for a card
- `get` - Get step details
- `create` - Create a new step on a card
- `update` - Update a step
- `delete` - Delete a step

### list

List steps for a card

**Usage:**

```bash
fizzy list [options]
```

**Options:**

- `--card <number>` - Card number
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### get

Get step details

**Usage:**

```bash
fizzy get <id> [options]
```

**Arguments:**

- `id` (required) - Step ID

**Options:**

- `--card <number>` - Card number
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### create

Create a new step on a card

**Usage:**

```bash
fizzy create [options]
```

**Options:**

- `--card <number>` - Card number
- `--content <content>` - Step content
- `--completed` - Mark step as completed (default: false)
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### update

Update a step

**Usage:**

```bash
fizzy update <id> [options]
```

**Arguments:**

- `id` (required) - Step ID

**Options:**

- `--card <number>` - Card number
- `--content <content>` - New step content
- `--completed <completed>` - Set completed status (true/false)
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

### delete

Delete a step

**Usage:**

```bash
fizzy delete <id> [options]
```

**Arguments:**

- `id` (required) - Step ID

**Options:**

- `--card <number>` - Card number
- `--json` - Output in JSON format
- `--account <slug>` - Use specific Fizzy account

---

## tags

Manage tags

**Subcommands:**

- `list` - List all tags in the account

### list

List all tags in the account

**Usage:**

```bash
fizzy list [options]
```

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug (optional, uses default if not provided)

---

## users

Manage users

**Subcommands:**

- `list` - List all users in the account
- `get` - Get user details by ID
- `me` - Get current user profile
- `update` - Update user details
- `deactivate` - Deactivate a user

### list

List all users in the account

**Usage:**

```bash
fizzy list [options]
```

**Options:**

- `--role <role>` - Filter by role: owner, admin, member, system
- `--active` - Show only active users
- `--search <query>` - Search by name or email
- `--sort <field>` - Sort by: name, created_at (default: name)
- `--order <order>` - Sort order: asc, desc (default: asc)
- `--json` - Output in JSON format
- `--account <slug>` - Account slug (optional, uses default if not provided)

### get

Get user details by ID

**Usage:**

```bash
fizzy get <id> [options]
```

**Arguments:**

- `id` (required) - User ID

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug (optional, uses default if not provided)

### me

Get current user profile

**Usage:**

```bash
fizzy me [options]
```

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug (optional, uses default if not provided)

### update

Update user details

**Usage:**

```bash
fizzy update <id> [options]
```

**Arguments:**

- `id` (required) - User ID

**Options:**

- `--name <name>` - User display name
- `--avatar <path>` - Path to avatar image (jpg, png, gif, webp)
- `--json` - Output in JSON format
- `--account <slug>` - Account slug (optional, uses default if not provided)

### deactivate

Deactivate a user

**Usage:**

```bash
fizzy deactivate <id> [options]
```

**Arguments:**

- `id` (required) - User ID

**Options:**

- `--json` - Output in JSON format
- `--force` - Skip confirmation prompt
- `--account <slug>` - Account slug (optional, uses default if not provided)

---

## notifications

Manage notifications

**Subcommands:**

- `list` - List notifications for the current user
- `read` - Mark a notification as read
- `unread` - Mark a notification as unread
- `mark-all-read` - Mark all notifications as read

### list

List notifications for the current user

**Usage:**

```bash
fizzy list [options]
```

**Options:**

- `--read` - Show only read notifications
- `--unread` - Show only unread notifications
- `--search <query>` - Search notification title and body
- `--sort <field>` - Sort by: created_at (default: created_at)
- `--order <order>` - Sort order: asc, desc (default: desc)
- `--json` - Output in JSON format
- `--unread-only` - Show only unread notifications (deprecated, use --unread)
- `--account <slug>` - Account slug (optional, uses default if not provided)

### read

Mark a notification as read

**Usage:**

```bash
fizzy read <id> [options]
```

**Arguments:**

- `id` (required) - Notification ID

**Options:**

- `--account <slug>` - Account slug (optional, uses default if not provided)

### unread

Mark a notification as unread

**Usage:**

```bash
fizzy unread <id> [options]
```

**Arguments:**

- `id` (required) - Notification ID

**Options:**

- `--account <slug>` - Account slug (optional, uses default if not provided)

### mark-all-read

Mark all notifications as read

**Usage:**

```bash
fizzy mark-all-read [options]
```

**Options:**

- `--json` - Output in JSON format
- `--account <slug>` - Account slug (optional, uses default if not provided)

---

