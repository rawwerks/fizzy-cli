#!/usr/bin/env bash
#
# Dogfooding Test - E2E Test with Real Fizzy Instance
#
# This script tests the CLI against a real Fizzy account.
# It requires authentication credentials to be set via environment variables.
#
# Required Environment Variables:
#   FIZZY_BASE_URL - Base URL for Fizzy API (default: https://app.fizzy.do)
#   FIZZY_TOKEN    - Personal access token for authentication
#   FIZZY_ACCOUNT_SLUG - Account slug (e.g., /6125212)
#
# Security Notes:
#   - Never commit credentials to the repository
#   - Use GitHub Secrets for CI/CD workflows
#   - Store credentials securely (1Password, etc.)
#   - This test is skipped if credentials are not provided
#

echo "🍕 Fizzy CLI Dogfooding Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if required credentials are set
if [ -z "$FIZZY_TOKEN" ]; then
    echo "⏭️  Skipping dogfooding test: FIZZY_TOKEN not set"
    echo ""
    echo "To run dogfooding tests, set the following environment variables:"
    echo "  export FIZZY_BASE_URL=https://app.fizzy.do"
    echo "  export FIZZY_TOKEN=your_token_here"
    echo "  export FIZZY_ACCOUNT_SLUG=/your_account_slug"
    echo ""
    echo "For CI/CD, add these as GitHub Secrets:"
    echo "  - FIZZY_BASE_URL"
    echo "  - FIZZY_TOKEN"
    echo "  - FIZZY_ACCOUNT_SLUG"
    echo ""
    exit 0
fi

FIZZY_BASE_URL=${FIZZY_BASE_URL:-"https://app.fizzy.do"}
FIZZY_ACCOUNT_SLUG=${FIZZY_ACCOUNT_SLUG:-"/6125212"}

echo "📊 Configuration:"
echo "  Base URL: $FIZZY_BASE_URL"
echo "  Token: ${FIZZY_TOKEN:0:10}..."
echo "  Account: $FIZZY_ACCOUNT_SLUG"
echo ""

# Build CLI
echo "📦 Building CLI..."
bun run build
echo ""

# Set up temporary config directory with credentials
TEST_CONFIG_DIR="/tmp/fizzy-cli-dogfood-$$"
mkdir -p "$TEST_CONFIG_DIR/.fizzy-cli"

# Create tokens.json from environment variables
cat > "$TEST_CONFIG_DIR/.fizzy-cli/tokens.json" <<EOF
{
  "accounts": [
    {
      "account_slug": "$FIZZY_ACCOUNT_SLUG",
      "account_name": "Test Account",
      "account_id": "test",
      "access_token": "$FIZZY_TOKEN",
      "user": {
        "id": "test",
        "name": "Test User",
        "email_address": "test@example.com",
        "role": "owner"
      },
      "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
    }
  ],
  "default_account": "$FIZZY_ACCOUNT_SLUG"
}
EOF

# Test counter
PASSED=0
FAILED=0

# Helper to run a test
test_cmd() {
    local name="$1"
    shift
    echo -n "  Testing: $name... "
    if HOME="$TEST_CONFIG_DIR" FIZZY_BASE_URL="$FIZZY_BASE_URL" "$@" > /tmp/dogfood-output.txt 2>&1; then
        echo "✅"
        ((PASSED++))
        return 0
    else
        echo "❌"
        echo "     Output: $(cat /tmp/dogfood-output.txt | head -3 | tr '\n' ' ')"
        ((FAILED++))
        return 1
    fi
}

echo "🧪 Running dogfooding tests against real Fizzy instance..."
echo ""

echo "Basic API Tests:"
test_cmd "List boards" bun dist/index.js boards list --json
test_cmd "List users" bun dist/index.js users list --json
test_cmd "List notifications (may be empty)" bun dist/index.js notifications list --json

echo ""
echo "Read Operations:"
test_cmd "Get current user info" bun dist/index.js users me --json
test_cmd "Check auth status" bun dist/index.js auth status --json

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Dogfooding Test Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cleanup
rm -rf "$TEST_CONFIG_DIR"
rm -f /tmp/dogfood-output.txt

if [ $FAILED -eq 0 ]; then
    echo "✅ All dogfooding tests passed!"
    echo ""
    echo "The CLI successfully communicated with the real Fizzy instance."
    exit 0
else
    echo "❌ Some dogfooding tests failed!"
    echo ""
    echo "Please review the failures above and ensure:"
    echo "  1. Your token has correct permissions"
    echo "  2. The Fizzy instance is accessible"
    echo "  3. Your account slug is correct"
    exit 1
fi
