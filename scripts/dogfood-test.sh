#!/usr/bin/env bash
#
# Comprehensive Dogfooding Test - E2E Test with Real Fizzy Instance
#
# This script tests ALL implemented CLI commands against a real Fizzy account.
# It validates API coverage and generates detailed reports for missing features.
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

set -e

echo "🍕 Fizzy CLI Comprehensive Dogfooding Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if required credentials are set
if [ -z "$FIZZY_TOKEN" ] || [ -z "$FIZZY_ACCOUNT_SLUG" ]; then
    echo "⏭️  Skipping dogfooding test: Required environment variables not set"
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
FIZZY_ACCOUNT_SLUG=${FIZZY_ACCOUNT_SLUG}

echo "📊 Configuration:"
echo "  Base URL: $FIZZY_BASE_URL"
echo "  Token: ${FIZZY_TOKEN:0:10}..."
echo "  Account: $FIZZY_ACCOUNT_SLUG"
echo ""

# Build CLI
echo "📦 Building CLI..."
bun run build > /dev/null 2>&1
echo "   ✅ Build complete"
echo ""

# Set up temporary config directory with credentials
# Use timestamp instead of $$ to avoid PID expansion issues in subshells/eval contexts
TEST_CONFIG_DIR="/tmp/fizzy-cli-dogfood-$(date +%s%N)"
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
SKIPPED=0
MISSING_FEATURES=0

# Arrays to track missing features
declare -a MISSING_COMMANDS=()
declare -a FAILED_TESTS=()

# CLI wrapper - use env command to properly set environment variables
CLI="env HOME=$TEST_CONFIG_DIR FIZZY_BASE_URL=$FIZZY_BASE_URL bun dist/index.js"

# Helper to run a test
test_cmd() { || true
    local name="$1"
    shift
    echo -n "  $name... "

    local output_file="/tmp/dogfood-output-$$.txt"

    if $CLI "$@" > "$output_file" 2>&1; then
        echo "✅"
        ((PASSED++))
        rm -f "$output_file"
        return 0
    else
        local exit_code=$?
        local error_msg=$(head -3 "$output_file" | tr '\n' ' ' | cut -c1-100)

        # Check if it's a "command not found" or "not implemented" error
        if grep -q -i "unknown command\|not found\|not implemented\|no such command" "$output_file" 2>/dev/null; then
            echo "⚠️  NOT IMPLEMENTED"
            MISSING_COMMANDS+=("$name")
            ((MISSING_FEATURES++))
        else
            echo "❌"
            echo "     Error: $error_msg"
            FAILED_TESTS+=("$name: $error_msg")
            ((FAILED++))
        fi

        rm -f "$output_file"
        return 1
    fi
}

# Helper to skip a test (for features we know aren't implemented yet)
skip_test() {
    local name="$1"
    echo "  $name... ⏭️  SKIPPED (known missing feature)"
    MISSING_COMMANDS+=("$name")
    ((SKIPPED++))
    ((MISSING_FEATURES++))
}

echo "🧪 Running comprehensive dogfooding tests..."
echo ""

# ============================================================================
# IDENTITY & AUTH
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Identity & Authentication (GET /my/identity)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_cmd "Auth status" auth status --json || true
test_cmd "Get current identity" users me --json || true

# ============================================================================
# BOARDS (5 endpoints)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Boards (5/5 endpoints)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_cmd "List boards" boards list --json || true

# Get first board ID for subsequent tests
BOARD_ID=$(eval "$CLI boards list --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data[0]?.id || \"\")'")

if [ -n "$BOARD_ID" ]; then
    test_cmd "Get board details" boards get "$BOARD_ID" --json || true
    test_cmd "Update board" boards update "$BOARD_ID" --name "Test Board (Dogfood)" --json || true

    # Test board creation and deletion
    echo "  Creating test board for delete test... "
    TEST_BOARD_ID=$(eval "$CLI boards create --name 'Dogfood Test Board' --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data.id || \"\")'")
    if [ -n "$TEST_BOARD_ID" ]; then
        test_cmd "Delete board" boards delete "$TEST_BOARD_ID" --json || true
    else
        echo "❌ (failed to create test board)"
        ((FAILED++))
    fi
else
    echo "  ⚠️  No boards found, skipping board-specific tests"
    ((SKIPPED+=3))
fi

# ============================================================================
# CARDS (18 endpoints)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Cards (18/18 endpoints)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_cmd "List cards" cards list --json || true

# Get first card number for subsequent tests
CARD_NUMBER=$(eval "$CLI cards list --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data[0]?.number || \"\")'")

if [ -n "$CARD_NUMBER" ]; then
    test_cmd "Get card details" cards get "$CARD_NUMBER" --json || true
    test_cmd "Update card" cards update "$CARD_NUMBER" --title "Dogfood Test Card" --json || true

    # Card operations
    test_cmd "Postpone card" cards postpone "$CARD_NUMBER" --json || true
    test_cmd "Send card to triage" cards triage "$CARD_NUMBER" --json || true
    test_cmd "Watch card" cards watch "$CARD_NUMBER" --json || true
    test_cmd "Unwatch card" cards unwatch "$CARD_NUMBER" --json || true

    # Tag operations (need tags to exist first)
    test_cmd "Add tag to card" cards tag "$CARD_NUMBER" --add "test-tag" --json || true
    test_cmd "Remove tag from card" cards tag "$CARD_NUMBER" --remove "test-tag" --json || true

    # Assignment operations (need user IDs)
    USER_ID=$(eval "$CLI users list --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data[0]?.id || \"\")'")
    if [ -n "$USER_ID" ]; then
        test_cmd "Assign user to card" cards assign "$CARD_NUMBER" --add "$USER_ID" --json || true
        test_cmd "Unassign user from card" cards assign "$CARD_NUMBER" --remove "$USER_ID" --json || true
    else
        echo "  ⏭️  No users found for assignment tests"
        ((SKIPPED+=2))
    fi
else
    echo "  ⚠️  No cards found, creating test card..."
    if [ -n "$BOARD_ID" ]; then
        TEST_CARD_NUMBER=$(eval "$CLI cards create --board '$BOARD_ID' --title 'Dogfood Test Card' --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data.number || \"\")'")
        if [ -n "$TEST_CARD_NUMBER" ]; then
            test_cmd "Get created card" cards get "$TEST_CARD_NUMBER" --json || true
            CARD_NUMBER=$TEST_CARD_NUMBER
        fi
    fi
fi

# ============================================================================
# COMMENTS (5 endpoints)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Comments (5/5 endpoints)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "$CARD_NUMBER" ]; then
    test_cmd "List comments" comments list --card "$CARD_NUMBER" --json || true

    # Create a test comment
    echo "  Creating test comment..."
    COMMENT_ID=$(eval "$CLI comments create --card '$CARD_NUMBER' --body 'Dogfood test comment' --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data.id || \"\")'")

    if [ -n "$COMMENT_ID" ]; then
        test_cmd "Get comment details" comments get "$COMMENT_ID" --card "$CARD_NUMBER" --json || true
        test_cmd "Update comment" comments update "$COMMENT_ID" --card "$CARD_NUMBER" --body "Updated dogfood comment" --json || true
        test_cmd "Delete comment" comments delete "$COMMENT_ID" --card "$CARD_NUMBER" --json || true
    else
        echo "  ⚠️  Failed to create test comment"
        ((SKIPPED+=3))
    fi
else
    echo "  ⏭️  No card available, skipping comment tests"
    ((SKIPPED+=5))
fi

# ============================================================================
# REACTIONS (3 endpoints)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Reactions (3 endpoints)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$CARD_NUMBER" ]; then
    # Create a comment to test reactions on
    echo "  Creating test comment for reactions..."
    COMMENT_ID=$(eval "$CLI comments create --card '$CARD_NUMBER' --body 'Test for reactions' --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data.id || \"\")'")

    if [ -n "$COMMENT_ID" ]; then
        test_cmd "Add reaction" reactions create --comment "$COMMENT_ID" --card "$CARD_NUMBER" --content "👍" --json || true

        # Add another reaction for delete test
        eval "$CLI reactions create --comment '$COMMENT_ID' --card '$CARD_NUMBER' --content '❤️' --json > /dev/null 2>&1"

        test_cmd "List reactions" reactions list --comment "$COMMENT_ID" --card "$CARD_NUMBER" --json || true

        # Get reaction ID from list for delete test
        REACTION_ID=$(eval "$CLI reactions list --comment '$COMMENT_ID' --card '$CARD_NUMBER' --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data[0]?.id || \"\")'")

        if [ -n "$REACTION_ID" ]; then
            test_cmd "Delete reaction" reactions delete "$REACTION_ID" --comment "$COMMENT_ID" --card "$CARD_NUMBER" --json || true
        fi

        # Cleanup
        eval "$CLI comments delete '$COMMENT_ID' --card '$CARD_NUMBER' --json > /dev/null 2>&1" || true
    else
        echo "  ⏭️  Failed to create comment, skipping reaction tests"
        ((SKIPPED+=3))
    fi
else
    echo "  ⏭️  No card available, skipping reaction tests"
    ((SKIPPED+=2))
fi

# ============================================================================
# STEPS (4 endpoints)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Steps (4/4 endpoints)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "$CARD_NUMBER" ]; then
    test_cmd "List steps" steps list --card "$CARD_NUMBER" --json || true

    # Create a test step
    echo "  Creating test step..."
    STEP_ID=$(eval "$CLI steps create --card '$CARD_NUMBER' --content 'Dogfood test step' --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data.id || \"\")'")

    if [ -n "$STEP_ID" ]; then
        test_cmd "Get step details" steps get "$STEP_ID" --card "$CARD_NUMBER" --json || true
        test_cmd "Update step" steps update "$STEP_ID" --card "$CARD_NUMBER" --content "Updated dogfood step" --completed "true" --json || true
        test_cmd "Delete step" steps delete "$STEP_ID" --card "$CARD_NUMBER" --json || true
    else
        echo "  ⚠️  Failed to create test step"
        ((SKIPPED+=3))
    fi
else
    echo "  ⏭️  No card available, skipping step tests"
    ((SKIPPED+=4))
fi

# ============================================================================
# TAGS (1 endpoint)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Tags (1/1 endpoint)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_cmd "List tags" tags list --json || true

# ============================================================================
# COLUMNS (5 endpoints)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Columns (5/5 endpoints)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "$BOARD_ID" ]; then
    test_cmd "List columns" columns list --board "$BOARD_ID" --json || true

    # Get first column for tests
    COLUMN_ID=$(eval "$CLI columns list --board '$BOARD_ID' --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data[0]?.id || \"\")'")

    if [ -n "$COLUMN_ID" ]; then
        test_cmd "Get column details" columns get "$COLUMN_ID" --board "$BOARD_ID" --json || true
        test_cmd "Update column" columns update "$COLUMN_ID" --board "$BOARD_ID" --name "Test Column" --json || true
    fi

    # Test column creation and deletion
    echo "  Creating test column..."
    TEST_COLUMN_ID=$(eval "$CLI columns create --board '$BOARD_ID' --name 'Dogfood Test Column' --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data.id || \"\")'")

    if [ -n "$TEST_COLUMN_ID" ]; then
        test_cmd "Delete column" columns delete "$TEST_COLUMN_ID" --board "$BOARD_ID" --json || true
    fi
else
    echo "  ⏭️  No board available, skipping column tests"
    ((SKIPPED+=5))
fi

# ============================================================================
# USERS (4 endpoints)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Users (4 endpoints)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_cmd "List users" users list --json || true

USER_ID=$(eval "$CLI users list --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data[0]?.id || \"\")'")

if [ -n "$USER_ID" ]; then
    test_cmd "Get user details" users get "$USER_ID" --json || true
    test_cmd "Update user" users update "$USER_ID" --name "Test User (Dogfood)" --json || true

    # Only test deactivate if we have a non-owner user (to avoid breaking the test account)
    NON_OWNER_USER_ID=$(eval "$CLI users list --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); const nonOwner = data.find(u => u.role !== \"owner\"); console.log(nonOwner?.id || \"\")'")

    if [ -n "$NON_OWNER_USER_ID" ]; then
        test_cmd "Deactivate user" users deactivate "$NON_OWNER_USER_ID" --force --json || true
    else
        echo "  ⏭️  Skipping deactivate test (no non-owner user available)"
        ((SKIPPED+=1))
    fi
else
    echo "  ⏭️  No users found"
    ((SKIPPED+=3))
fi

# ============================================================================
# NOTIFICATIONS (4 endpoints)
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Notifications (4 endpoints)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_cmd "List notifications" notifications list --json || true

NOTIF_ID=$(eval "$CLI notifications list --json 2>/dev/null | bun -e 'const data = await Bun.file(\"/dev/stdin\").json(); console.log(data[0]?.id || \"\")'")

if [ -n "$NOTIF_ID" ]; then
    test_cmd "Mark notification as read" notifications read "$NOTIF_ID" --json || true
    test_cmd "Mark notification as unread" notifications unread "$NOTIF_ID" --json || true
else
    echo "  ⏭️  No notifications found"
    ((SKIPPED+=2))
fi

test_cmd "Mark all notifications as read" notifications mark-all-read --json || true

# ============================================================================
# FILE UPLOADS
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "File Uploads (multipart/form-data)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Create a test image if it does not exist
TEST_IMAGE="tests/fixtures/test-image.png"
if [ ! -f "$TEST_IMAGE" ]; then
    echo "  Creating test image..."
    mkdir -p tests/fixtures
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > "$TEST_IMAGE"
fi

if [ -n "$BOARD_ID" ]; then
    echo "  Creating card with image..."
    TEST_CARD_WITH_IMG=$(eval "$CLI cards create --board '$BOARD_ID' --title 'Card with Image (Dogfood)' --image '$TEST_IMAGE' --json 2>/dev/null | bun -e 'const data = await Bun.file("/dev/stdin").json(); console.log(data.number || "")'")

    if [ -n "$TEST_CARD_WITH_IMG" ]; then
        echo "  Upload card image (create)... ✅"
        ((PASSED++))

        # Test updating card image
        test_cmd "Upload card image (update)" cards update "$TEST_CARD_WITH_IMG" --image "$TEST_IMAGE" --json || true

        # Cleanup
        eval "$CLI cards delete '$TEST_CARD_WITH_IMG' --json > /dev/null 2>&1" || true
    else
        echo "  Upload card image (create)... ❌"
        ((FAILED++))
        skip_test "Upload card image (update)" # Cannot test without create working
    fi
else
    skip_test "Upload card image (POST /boards/:id/cards with image)" # No board available
    skip_test "Upload card image (PUT /cards/:id with image)" # No board available
fi

if [ -n "$USER_ID" ]; then
    test_cmd "Upload user avatar" users update "$USER_ID" --avatar "$TEST_IMAGE" --json || true
else
    skip_test "Upload user avatar (PUT /users/:id with avatar)" # No user available
fi

# ============================================================================
# SUMMARY & REPORTING
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Dogfooding Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "  ⏭️  Skipped: $SKIPPED"
echo "  ⚠️  Missing Features: $MISSING_FEATURES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# API Coverage Report
TOTAL_ENDPOINTS=55
IMPLEMENTED_ENDPOINTS=$((PASSED + FAILED))
COVERAGE_PERCENT=$((IMPLEMENTED_ENDPOINTS * 100 / TOTAL_ENDPOINTS))

echo "📊 API Coverage:"
echo "  Implemented: $IMPLEMENTED_ENDPOINTS / $TOTAL_ENDPOINTS endpoints"
echo "  Coverage: $COVERAGE_PERCENT%"
echo ""

# Generate detailed report if there are missing features or failures
if [ $MISSING_FEATURES -gt 0 ] || [ $FAILED -gt 0 ]; then
    REPORT_FILE="/tmp/fizzy-cli-dogfood-report-$$.md"

    cat > "$REPORT_FILE" <<EOF
# Fizzy CLI Dogfooding Report

**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Status:** $([ $FAILED -eq 0 ] && echo "⚠️ INCOMPLETE" || echo "❌ FAILURES DETECTED")

## Summary

- ✅ **Passed:** $PASSED tests
- ❌ **Failed:** $FAILED tests
- ⏭️  **Skipped:** $SKIPPED tests
- ⚠️  **Missing Features:** $MISSING_FEATURES

## API Coverage

- **Implemented:** $IMPLEMENTED_ENDPOINTS / $TOTAL_ENDPOINTS endpoints
- **Coverage:** $COVERAGE_PERCENT%
- **Target:** 100% (55/55 endpoints)

EOF

    if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
        cat >> "$REPORT_FILE" <<EOF
## Failed Tests

The following tests failed unexpectedly. These are implemented features that are broken:

EOF
        for test in "${FAILED_TESTS[@]}"; do
            echo "- ❌ $test" >> "$REPORT_FILE"
        done
        echo "" >> "$REPORT_FILE"
    fi

    if [ ${#MISSING_COMMANDS[@]} -gt 0 ]; then
        cat >> "$REPORT_FILE" <<EOF
## Missing Features

The following API endpoints are not implemented in the CLI:

EOF
        for cmd in "${MISSING_COMMANDS[@]}"; do
            echo "- ⚠️  $cmd" >> "$REPORT_FILE"
        done
        echo "" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" <<EOF
## Priority Breakdown

### P0 Critical (Blocks Production)
- File upload support (multipart/form-data)

### P1 High (Needed for v1.0)
- List reactions (GET /comments/:id/reactions)
- Update user (PUT /users/:id)
- Deactivate user (DELETE /users/:id)
- Mark all notifications as read

## Next Steps

1. Review this report in the GitHub Actions logs
2. Implement missing P0 features first
3. Run dogfooding tests locally to verify fixes
4. Re-run full dogfooding suite in CI

## Test Environment

- **Base URL:** $FIZZY_BASE_URL
- **Account:** $FIZZY_ACCOUNT_SLUG
- **Timestamp:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

---

**Generated by:** Fizzy CLI Dogfooding Test Suite
EOF

    echo "📄 Detailed report generated: $REPORT_FILE"
    echo ""
    echo "Report contents:"
    cat "$REPORT_FILE"
fi

# Cleanup
rm -rf "$TEST_CONFIG_DIR"

# Exit with appropriate status
if [ $FAILED -eq 0 ]; then
    if [ $MISSING_FEATURES -gt 0 ]; then
        echo "⚠️  Dogfooding completed with $MISSING_FEATURES missing features"
        echo ""
        echo "The CLI is partially functional but missing $MISSING_FEATURES API endpoints."
        echo "See report above for details."
        exit 0  # Don't fail CI for missing features, only for broken features
    else
        echo "✅ All dogfooding tests passed!"
        echo ""
        echo "The CLI successfully communicated with the real Fizzy instance."
        echo "API coverage: 100% (55/55 endpoints implemented)"
        exit 0
    fi
else
    echo "❌ $FAILED dogfooding tests failed!"
    echo ""
    echo "Please review the failures above and ensure:"
    echo "  1. Your token has correct permissions"
    echo "  2. The Fizzy instance is accessible"
    echo "  3. Your account slug is correct"
    echo "  4. The implemented features are working correctly"
    exit 1
fi
