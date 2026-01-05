#!/usr/bin/env bash

echo "🧪 Running CLI smoke tests..."
echo ""

# Build the CLI
echo "📦 Building CLI..."
bun run build
echo ""

# Make sure the binary exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed: dist/index.js not found"
    exit 1
fi

# Test counter
PASSED=0
FAILED=0

# Helper to run a test
test_cmd() {
    local name="$1"
    shift
    echo -n "  Testing: $name... "
    if "$@" > /dev/null 2>&1; then
        echo "✅"
        ((PASSED++))
    else
        echo "❌"
        ((FAILED++))
    fi
}

echo "Running basic CLI tests:"
test_cmd "CLI shows help" bun dist/index.js --help
test_cmd "Version command" bun dist/index.js --version
test_cmd "Auth command exists" bun dist/index.js auth --help
test_cmd "Boards command exists" bun dist/index.js boards --help
test_cmd "Cards command exists" bun dist/index.js cards --help
test_cmd "Users command exists" bun dist/index.js users --help
test_cmd "Comments command exists" bun dist/index.js comments --help
test_cmd "Tags command exists" bun dist/index.js tags --help
test_cmd "Columns command exists" bun dist/index.js columns --help
test_cmd "Notifications command exists" bun dist/index.js notifications --help

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Smoke Test Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
    echo "✅ All smoke tests passed!"
    exit 0
else
    echo "❌ Some smoke tests failed!"
    exit 1
fi
