#!/usr/bin/env bash
set -e

echo "Testing CLI commands..."

# Test 1
echo -n "1. Help... "
bun dist/index.js --help > /dev/null 2>&1 && echo "✓" || echo "✗"

# Test 2
echo -n "2. Version... "
bun dist/index.js --version > /dev/null 2>&1 && echo "✓" || echo "✗"

# Test 3
echo -n "3. Auth help... "
bun dist/index.js auth --help > /dev/null 2>&1 && echo "✓" || echo "✗"

# Test 4
echo -n "4. Boards help... "
bun dist/index.js boards --help > /dev/null 2>&1 && echo "✓" || echo "✗"

echo "Done!"
