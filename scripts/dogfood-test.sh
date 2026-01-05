#!/usr/bin/env bash
#
# Dogfooding Test - Optional E2E Test with Real Fizzy Instance
#
# This script tests the CLI against a real Fizzy account.
# It requires authentication credentials to be set via environment variables.
#
# Required Environment Variables:
#   FIZZY_BASE_URL - Base URL for Fizzy API (default: https://app.fizzy.do)
#   FIZZY_TOKEN    - Personal access token for authentication
#
# Security Notes:
#   - Never commit credentials to the repository
#   - Use GitHub Secrets for CI/CD workflows
#   - Store credentials securely (1Password, etc.)
#   - This test is skipped if credentials are not provided
#

set -e

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
    echo ""
    echo "For CI/CD, add these as GitHub Secrets:"
    echo "  - FIZZY_BASE_URL"
    echo "  - FIZZY_TOKEN"
    echo ""
    exit 0
fi

FIZZY_BASE_URL=${FIZZY_BASE_URL:-"https://app.fizzy.do"}

echo "📊 Configuration:"
echo "  Base URL: $FIZZY_BASE_URL"
echo "  Token: ${FIZZY_TOKEN:0:10}..."
echo ""

# Build CLI
echo "📦 Building CLI..."
bun run build
echo ""

# Test counter
PASSED=0
FAILED=0

# Helper to run a test
test_cmd() {
    local name="$1"
    shift
    echo -n "  Testing: $name... "
    if "$@" > /tmp/dogfood-output.txt 2>&1; then
        echo "✅"
        ((PASSED++))
        return 0
    else
        echo "❌"
        echo "     Output: $(cat /tmp/dogfood-output.txt | head -3)"
        ((FAILED++))
        return 1
    fi
}

echo "🧪 Running dogfooding tests against real Fizzy instance..."
echo ""

# Configure CLI with token
export FIZZY_CLI_TOKEN="$FIZZY_TOKEN"
export FIZZY_CLI_BASE_URL="$FIZZY_BASE_URL"

echo "Basic API Tests:"
test_cmd "List boards" bun dist/index.js boards list --json
test_cmd "List users" bun dist/index.js users list --json
test_cmd "List notifications" bun dist/index.js notifications list --json

echo ""
echo "Read Operations:"
# Note: These tests assume certain data exists. Adjust as needed.
test_cmd "Get user profile" bun dist/index.js users me --json || true
test_cmd "Check auth status" bun dist/index.js auth status --json || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Dogfooding Test Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cleanup
rm -f /tmp/dogfood-output.txt

if [ $FAILED -eq 0 ]; then
    echo "✅ All dogfooding tests passed!"
    echo ""
    echo "The CLI is working correctly with a real Fizzy instance."
    exit 0
else
    echo "❌ Some dogfooding tests failed!"
    echo ""
    echo "Please review the failures above and ensure:"
    echo "  1. Your token has correct permissions"
    echo "  2. The Fizzy instance is accessible"
    echo "  3. Required data exists (boards, users, etc.)"
    exit 1
fi
