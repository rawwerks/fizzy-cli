# Usage Examples

Real-world examples and workflows for fizzy-cli. These examples demonstrate common tasks and best practices.

## Table of Contents

- [Getting Started](#getting-started)
- [Board Management](#board-management)
- [Card Workflows](#card-workflows)
- [Team Collaboration](#team-collaboration)
- [Automation & Scripting](#automation--scripting)
- [Advanced Usage](#advanced-usage)

---

## Getting Started

### Initial Setup

First-time setup with fizzy-cli:

```bash
# Install fizzy-cli
npm install -g fizzy-cli

# Authenticate with Personal Access Token
fizzy auth login

# Verify authentication
fizzy auth status

# List your boards
fizzy boards list
```

### Managing Multiple Accounts

If you work with multiple Fizzy accounts:

```bash
# Login adds the account to your config
fizzy auth login --token fiz_company_token...

# Login to another account
fizzy auth login --token fiz_personal_token...

# List all accounts
fizzy auth accounts

# Switch between accounts
fizzy auth switch my-company
fizzy auth switch personal

# Or use --account flag for one-off commands
fizzy boards list --account my-company
fizzy boards list --account personal
```

---

## Board Management

### Creating a Project Board

Set up a new project board with common columns:

```bash
# Create the board
BOARD_ID=$(fizzy boards create "Q1 2026 Planning" --json | jq -r '.id')

# Create columns
fizzy columns create --board $BOARD_ID --name "Backlog"
fizzy columns create --board $BOARD_ID --name "This Week" --color "var(--color-card-blue)"
fizzy columns create --board $BOARD_ID --name "In Progress" --color "var(--color-card-yellow)"
fizzy columns create --board $BOARD_ID --name "Review" --color "var(--color-card-purple)"
fizzy columns create --board $BOARD_ID --name "Done" --color "var(--color-card-green)"

echo "Board created with ID: $BOARD_ID"
```

### Creating a Bug Tracker

```bash
# Create board with auto-postpone for inactive bugs
BOARD_ID=$(fizzy boards create "Bug Tracker" \
  --auto-postpone-period 30 \
  --public-description "Track and resolve product bugs" \
  --json | jq -r '.id')

# Create priority columns
fizzy columns create --board $BOARD_ID --name "P0 - Critical" --color "var(--color-card-red)"
fizzy columns create --board $BOARD_ID --name "P1 - High" --color "var(--color-card-orange)"
fizzy columns create --board $BOARD_ID --name "P2 - Medium" --color "var(--color-card-yellow)"
fizzy columns create --board $BOARD_ID --name "P3 - Low" --color "var(--color-card-default)"
fizzy columns create --board $BOARD_ID --name "Fixed" --color "var(--color-card-green)"
```

### Listing Boards with Filtering

```bash
# List all boards in table format
fizzy boards list

# Get JSON output
fizzy boards list --json

# Find boards containing "Design" in the name (using jq)
fizzy boards list --json | jq '.[] | select(.name | contains("Design"))'

# Get just board IDs and names
fizzy boards list --json | jq -r '.[] | "\(.id): \(.name)"'
```

---

## Card Workflows

### Creating Cards

Basic card creation:

```bash
# Simple card
fizzy cards create \
  --board abc123 \
  --title "Update user documentation"

# Card with description
fizzy cards create \
  --board abc123 \
  --title "Implement dark mode" \
  --description "Add dark mode toggle to settings page. Should persist user preference."

# Draft card (not published yet)
fizzy cards create \
  --board abc123 \
  --title "Research new framework" \
  --status drafted \
  --description "Evaluate React 19 features for our use case"

# Card with header image
fizzy cards create \
  --board abc123 \
  --title "Review design mockup" \
  --description "Please review the attached homepage redesign" \
  --image ./mockups/homepage-v2.png
```

### Managing Card States

```bash
# Get card number from previous command or list
CARD_NUM=42

# Move card through workflow
fizzy cards move $CARD_NUM --column col-in-progress-123
fizzy cards move $CARD_NUM --column col-review-456
fizzy cards move $CARD_NUM --column col-done-789

# Close completed card
fizzy cards close $CARD_NUM

# Reopen if needed
fizzy cards reopen $CARD_NUM

# Postpone card for later
fizzy cards postpone $CARD_NUM

# Send back to triage
fizzy cards triage $CARD_NUM
```

### Adding Card Checklists

Create a card with steps (checklist):

```bash
# Create a feature card
CARD_NUM=$(fizzy cards create \
  --board abc123 \
  --title "Add user authentication" \
  --json | jq -r '.number')

# Add implementation steps
fizzy steps create --card $CARD_NUM --content "Design database schema"
fizzy steps create --card $CARD_NUM --content "Implement login endpoint"
fizzy steps create --card $CARD_NUM --content "Add password hashing"
fizzy steps create --card $CARD_NUM --content "Create JWT token system"
fizzy steps create --card $CARD_NUM --content "Write integration tests"
fizzy steps create --card $CARD_NUM --content "Update API documentation"

# Mark steps as completed
STEP_ID=$(fizzy steps list --card $CARD_NUM --json | jq -r '.[0].id')
fizzy steps update $STEP_ID --card $CARD_NUM --completed true
```

### Filtering and Searching Cards

```bash
# List all cards on a specific board
fizzy cards list --board abc123

# Show only closed cards
fizzy cards list --status closed

# Show postponed cards
fizzy cards list --status not_now

# Show "golden" (important) cards
fizzy cards list --status golden

# Cards with specific tag
fizzy cards list --tag tag-urgent-xyz

# Combine board and status filters
fizzy cards list --board abc123 --status closed

# Get card details
fizzy cards get 42
fizzy cards get 42 --json
```

### Bulk Tagging Cards

Tag multiple cards at once:

```bash
# Tag cards as urgent
for card in 42 43 44 45; do
  fizzy cards tag $card --add urgent
  echo "Tagged card #$card"
done

# Remove old tags from multiple cards
for card in 42 43 44 45; do
  fizzy cards tag $card --remove backlog --add this-week
done

# Using card IDs from a list
fizzy cards list --board abc123 --json | \
  jq -r '.[].number' | \
  while read card; do
    fizzy cards tag $card --add q1-2026
  done
```

---

## Team Collaboration

### Assigning Cards

```bash
# Get user IDs
fizzy users list --json | jq -r '.[] | "\(.id): \(.name)"'

# Assign card to user
fizzy cards assign 42 --add user-abc123

# Assign to multiple users
fizzy cards assign 42 --add user-abc123 user-def456

# Reassign card (remove old assignee, add new)
fizzy cards assign 42 \
  --remove user-old123 \
  --add user-new456

# Unassign all (by removing individually)
fizzy cards assign 42 --remove user-abc123
```

### Commenting on Cards

```bash
# Add a comment
fizzy comments create 42 --body "LGTM! Approved for merge."

# Add detailed comment
fizzy comments create 42 --body "Great work! A few suggestions:

1. Add error handling for edge cases
2. Consider adding integration tests
3. Update the user documentation

Otherwise looks good to go!"

# List comments on a card
fizzy comments list 42

# Update a comment
COMMENT_ID=$(fizzy comments list 42 --json | jq -r '.[0].id')
fizzy comments update 42 $COMMENT_ID --body "Updated: Approved after addressing feedback"

# Delete a comment
fizzy comments delete 42 $COMMENT_ID
```

### Reacting to Comments

```bash
# Get comment ID
COMMENT_ID=$(fizzy comments list 42 --json | jq -r '.[0].id')

# Add reactions
fizzy reactions create --card 42 --comment $COMMENT_ID --content 👍
fizzy reactions create --card 42 --comment $COMMENT_ID --content 🎉
fizzy reactions create --card 42 --comment $COMMENT_ID --content ❤️

# List reactions
fizzy reactions list --card 42 --comment $COMMENT_ID

# Delete a reaction
REACTION_ID=$(fizzy reactions list --card 42 --comment $COMMENT_ID --json | jq -r '.[0].id')
fizzy reactions delete $REACTION_ID --card 42 --comment $COMMENT_ID
```

### Watching Cards

Stay updated on cards you care about:

```bash
# Watch a card for notifications
fizzy cards watch 42

# Unwatch when done
fizzy cards unwatch 42

# Watch multiple cards
for card in 42 43 44; do
  fizzy cards watch $card
done
```

### Managing Notifications

```bash
# List all notifications
fizzy notifications list

# Show only unread
fizzy notifications list --unread-only

# Mark specific notification as read
fizzy notifications read notif-abc123

# Mark all as read
fizzy notifications mark-all-read

# Mark as unread for follow-up
fizzy notifications unread notif-abc123
```

---

## Automation & Scripting

### Daily Standup Report

Generate a report of your activity:

```bash
#!/bin/bash
# daily-standup.sh - Show my cards and recent activity

echo "=== My Cards ==="
echo

# Get current user ID
USER_ID=$(fizzy users me --json | jq -r '.id')

# Get all cards and filter by assignee
fizzy cards list --json | \
  jq --arg uid "$USER_ID" '.[] |
    select(.assignees[]? | select(.id == $uid)) |
    "\(.number): \(.title) [\(.status)]"' -r

echo
echo "=== Unread Notifications ==="
fizzy notifications list --unread-only
```

### Create Card from Issue Template

```bash
#!/bin/bash
# create-bug.sh - Create a bug report card

BOARD_ID="abc123"
TITLE="$1"
DESCRIPTION="$2"

if [ -z "$TITLE" ]; then
  echo "Usage: ./create-bug.sh 'Bug title' 'Bug description'"
  exit 1
fi

# Create card with bug template
CARD_NUM=$(fizzy cards create \
  --board $BOARD_ID \
  --title "🐛 $TITLE" \
  --description "## Bug Report

**Description:**
$DESCRIPTION

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Environment:**
- Browser:
- OS:
- Version: " \
  --json | jq -r '.number')

# Add bug tag
fizzy cards tag $CARD_NUM --add bug

# Add steps checklist
fizzy steps create --card $CARD_NUM --content "Reproduce the issue"
fizzy steps create --card $CARD_NUM --content "Identify root cause"
fizzy steps create --card $CARD_NUM --content "Implement fix"
fizzy steps create --card $CARD_NUM --content "Add regression test"
fizzy steps create --card $CARD_NUM --content "Verify fix in production"

echo "Created bug report card #$CARD_NUM"
echo "https://app.fizzy.do/boards/$BOARD_ID/cards/$CARD_NUM"
```

### Automated Card Import

Import cards from CSV:

```bash
#!/bin/bash
# import-cards.sh - Import cards from CSV file

BOARD_ID="abc123"
CSV_FILE="$1"

if [ ! -f "$CSV_FILE" ]; then
  echo "Usage: ./import-cards.sh cards.csv"
  exit 1
fi

# Skip header line and read CSV
tail -n +2 "$CSV_FILE" | while IFS=',' read -r title description tags; do
  echo "Creating: $title"

  CARD_NUM=$(fizzy cards create \
    --board $BOARD_ID \
    --title "$title" \
    --description "$description" \
    --json | jq -r '.number')

  # Add tags if provided
  if [ -n "$tags" ]; then
    IFS=';' read -ra TAG_ARRAY <<< "$tags"
    for tag in "${TAG_ARRAY[@]}"; do
      fizzy cards tag $CARD_NUM --add "$(echo $tag | xargs)"
    done
  fi

  echo "  Created card #$CARD_NUM"
  sleep 0.5  # Rate limiting
done

echo "Import complete!"
```

Example CSV format:
```csv
title,description,tags
"Update documentation","Refresh API docs for v2.0","docs;high-priority"
"Fix login bug","Users can't login with email","bug;urgent"
"New dashboard","Design new analytics dashboard","feature;design"
```

### Weekly Card Summary

```bash
#!/bin/bash
# weekly-summary.sh - Generate weekly summary

BOARD_ID="abc123"

echo "=== Weekly Card Summary ==="
echo "Generated: $(date)"
echo

# Count cards by status
echo "Cards by Status:"
fizzy cards list --board $BOARD_ID --json | \
  jq -r 'group_by(.status) | .[] | "\(.[0].status): \(length)"'

echo
echo "Recently Closed Cards:"
fizzy cards list --board $BOARD_ID --status closed --json | \
  jq -r '.[] | "  #\(.number): \(.title)"' | head -10

echo
echo "Active Cards:"
fizzy cards list --board $BOARD_ID --json | \
  jq -r '.[] | select(.status == "published") | "  #\(.number): \(.title)"'
```

### Backup Board Data

```bash
#!/bin/bash
# backup-board.sh - Backup all board data to JSON

BOARD_ID="$1"
OUTPUT_DIR="backup-$(date +%Y%m%d)"

if [ -z "$BOARD_ID" ]; then
  echo "Usage: ./backup-board.sh <board-id>"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Backup board info
echo "Backing up board info..."
fizzy boards get $BOARD_ID --json > "$OUTPUT_DIR/board.json"

# Backup columns
echo "Backing up columns..."
fizzy columns list --board $BOARD_ID --json > "$OUTPUT_DIR/columns.json"

# Backup all cards
echo "Backing up cards..."
fizzy cards list --board $BOARD_ID --json > "$OUTPUT_DIR/cards.json"

# Backup tags
echo "Backing up tags..."
fizzy tags list --json > "$OUTPUT_DIR/tags.json"

echo "Backup complete: $OUTPUT_DIR"
```

---

## Advanced Usage

### Using with jq for Complex Queries

```bash
# Find cards assigned to specific user
USER_EMAIL="john@example.com"
fizzy cards list --json | \
  jq --arg email "$USER_EMAIL" '.[] |
    select(.assignees[]? | .email_address == $email) |
    {number, title, status}'

# Find cards with multiple tags
fizzy cards list --json | \
  jq '.[] | select(.tags | length > 2) | {number, title, tags}'

# Cards created this week
WEEK_AGO=$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)
fizzy cards list --json | \
  jq --arg date "$WEEK_AGO" '.[] |
    select(.created_at > $date) |
    {number, title, created_at}'

# Generate markdown table
fizzy cards list --json | \
  jq -r '["Number", "Title", "Status"],
         ["---", "---", "---"],
         (.[] | [.number, .title, .status]) |
         @tsv' | column -t -s $'\t'
```

### Pipeline Integration

Use in CI/CD pipelines:

```yaml
# .github/workflows/create-card.yml
name: Create Card on Release

on:
  release:
    types: [published]

jobs:
  create-card:
    runs-on: ubuntu-latest
    steps:
      - name: Install fizzy-cli
        run: npm install -g fizzy-cli

      - name: Create release card
        env:
          FIZZY_TOKEN: ${{ secrets.FIZZY_TOKEN }}
        run: |
          fizzy auth login --token $FIZZY_TOKEN

          fizzy cards create \
            --board ${{ vars.BOARD_ID }} \
            --title "Release ${{ github.event.release.tag_name }}" \
            --description "Track deployment of ${{ github.event.release.tag_name }}

          Release notes: ${{ github.event.release.html_url }}"
```

### Webhooks Integration

Process Fizzy webhooks and create cards:

```bash
#!/bin/bash
# webhook-handler.sh - Handle incoming webhooks

# Example: Create card when GitHub issue is opened
# This would be called by a webhook service

ISSUE_TITLE="$1"
ISSUE_BODY="$2"
ISSUE_URL="$3"

fizzy cards create \
  --board abc123 \
  --title "$ISSUE_TITLE" \
  --description "**GitHub Issue**: $ISSUE_URL

$ISSUE_BODY" \
  --json | jq -r '.number'
```

### Bulk Operations

Process many cards efficiently:

```bash
# Close all cards in "Done" column
COL_DONE="col-done-123"
fizzy cards list --json | \
  jq -r --arg col "$COL_DONE" '.[] |
    select(.column.id == $col and .status != "closed") |
    .number' | \
  while read card; do
    echo "Closing card #$card"
    fizzy cards close $card
    sleep 0.2  # Rate limiting
  done

# Add tag to all cards on a board
BOARD_ID="abc123"
TAG="q1-review"
fizzy cards list --board $BOARD_ID --json | \
  jq -r '.[].number' | \
  while read card; do
    fizzy cards tag $card --add "$TAG"
  done
```

### Interactive Card Selection

```bash
#!/bin/bash
# interactive-card.sh - Interactively select and update card

# List cards with numbers
cards=$(fizzy cards list --board abc123 --json)

# Show options
echo "$cards" | jq -r '.[] | "\(.number): \(.title)"'

# Prompt for selection
read -p "Enter card number: " CARD_NUM

# Prompt for action
echo "Actions:"
echo "1. Close"
echo "2. Postpone"
echo "3. Add comment"
read -p "Select action: " ACTION

case $ACTION in
  1)
    fizzy cards close $CARD_NUM
    echo "Card #$CARD_NUM closed"
    ;;
  2)
    fizzy cards postpone $CARD_NUM
    echo "Card #$CARD_NUM postponed"
    ;;
  3)
    read -p "Comment: " COMMENT
    fizzy comments create $CARD_NUM --body "$COMMENT"
    echo "Comment added to card #$CARD_NUM"
    ;;
esac
```

### Error Handling in Scripts

```bash
#!/bin/bash
# robust-script.sh - Script with error handling

set -e  # Exit on error

BOARD_ID="abc123"

# Function to handle errors
handle_error() {
  echo "Error on line $1"
  exit 1
}

trap 'handle_error $LINENO' ERR

# Check authentication
if ! fizzy auth status > /dev/null 2>&1; then
  echo "Not authenticated. Please run: fizzy auth login"
  exit 1
fi

# Create card with validation
if [ -z "$1" ]; then
  echo "Usage: $0 'Card title'"
  exit 1
fi

echo "Creating card..."
CARD_NUM=$(fizzy cards create \
  --board $BOARD_ID \
  --title "$1" \
  --json | jq -r '.number')

if [ -z "$CARD_NUM" ]; then
  echo "Failed to create card"
  exit 1
fi

echo "Successfully created card #$CARD_NUM"
```

---

## Tips & Best Practices

### Performance Optimization

```bash
# Use --json for scripting (faster parsing)
fizzy cards list --json | jq '.[] | .title'

# Limit results when you don't need all data
fizzy boards list --limit 10

# Cache results for multiple operations
CARDS=$(fizzy cards list --board abc123 --json)
echo "$CARDS" | jq '.[0]'
echo "$CARDS" | jq '.[1]'
```

### Rate Limiting

```bash
# Add delays in loops to avoid rate limits
for card in 1 2 3 4 5; do
  fizzy cards tag $card --add urgent
  sleep 0.5  # 500ms delay
done
```

### Debugging

```bash
# Use --json to see full API responses
fizzy boards get abc123 --json | jq .

# Check authentication status
fizzy auth status

# Verify account access
fizzy auth accounts
```

### Script Organization

```bash
# Store commonly used IDs in config file
# ~/.fizzy-config
export MAIN_BOARD_ID="abc123"
export BUGS_BOARD_ID="def456"

# Source in scripts
source ~/.fizzy-config
fizzy cards list --board $MAIN_BOARD_ID
```
