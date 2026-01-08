# Troubleshooting Guide

Common issues and solutions for fizzy-cli.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [API Errors](#api-errors)
- [Network Problems](#network-problems)
- [File Upload Issues](#file-upload-issues)
- [JSON Parsing Errors](#json-parsing-errors)
- [Installation Problems](#installation-problems)
- [General Issues](#general-issues)

---

## Authentication Issues

### Error: "Not authenticated"

**Problem:** Commands fail with "Not authenticated" error.

**Solution:**

```bash
# Check authentication status
fizzy auth status

# If not authenticated, login
fizzy auth login

# Verify authentication worked
fizzy auth status
```

### Error: "Invalid token"

**Problem:** Token is rejected during login or API calls.

**Cause:** Token may be expired, revoked, or incorrectly copied.

**Solution:**

1. Generate a new token at https://app.fizzy.do/my/access_tokens
2. Ensure you copy the entire token (starts with `fiz_`)
3. Re-authenticate:

```bash
fizzy auth logout
fizzy auth login --token fiz_your_new_token_here
```

### Error: "Token file not found"

**Problem:** Token storage file is missing or inaccessible.

**Solution:**

```bash
# Check if token file exists
ls -la ~/.fizzy-cli/tokens.json

# If missing, re-authenticate
fizzy auth login

# Verify permissions (should be 600)
chmod 600 ~/.fizzy-cli/tokens.json
```

### Multiple Account Issues

**Problem:** Wrong account is being used for commands.

**Solution:**

```bash
# Check which account is default
fizzy auth status

# List all accounts
fizzy auth accounts

# Switch default account
fizzy auth switch <account-slug>

# Or use --account flag
fizzy boards list --account specific-account
```

### Magic Link Not Working

**Problem:** Magic link code not being sent or not working.

**Solution:**

1. Check spam/junk folder for the email
2. Ensure email address is correct
3. Try PAT authentication instead:

```bash
fizzy auth login --token fiz_your_token
```

---

## API Errors

### Error: 401 Unauthorized

**Problem:** API returns 401 error.

**Cause:** Invalid or expired authentication token.

**Solution:**

```bash
# Logout and re-authenticate
fizzy auth logout
fizzy auth login

# Verify token is valid
fizzy auth status
```

### Error: 403 Forbidden

**Problem:** API returns 403 error.

**Cause:** Account doesn't have permission for the operation.

**Possible reasons:**
- Token has read-only permission (need "Read + Write")
- User doesn't have access to the resource
- Board/card is restricted

**Solution:**

1. Check token permissions at https://app.fizzy.do/my/access_tokens
2. Recreate token with "Read + Write" permission
3. Verify user has access to the resource

```bash
# Re-authenticate with new token
fizzy auth login --token fiz_new_token_with_write_access
```

### Error: 404 Not Found

**Problem:** Resource (board, card, etc.) not found.

**Cause:** Invalid ID or resource doesn't exist.

**Solution:**

```bash
# Verify resource exists
fizzy boards list
fizzy cards list

# Check ID is correct (copy from the list output)
fizzy boards get <correct-board-id>

# For cards, you can use number or ID
fizzy cards get 42  # Card number
fizzy cards get abc123...  # Card ID
```

### Error: 422 Unprocessable Entity

**Problem:** API rejects the request due to validation errors.

**Cause:** Invalid or missing required fields.

**Common causes:**
- Missing required options (--board, --title, etc.)
- Invalid field values
- Invalid file format

**Solution:**

```bash
# Check command help for required options
fizzy cards create --help

# Example fix: Add missing required fields
fizzy cards create \
  --board abc123 \
  --title "Card title"  # Title is required

# Verify field values are valid
fizzy boards update abc123 --all-access true  # Must be 'true' or 'false'
```

### Error: 429 Too Many Requests

**Problem:** Rate limit exceeded.

**Cause:** Too many API requests in a short time.

**Solution:**

```bash
# Wait a few seconds and retry
sleep 5
fizzy boards list

# For scripts, add delays between requests
for card in 1 2 3; do
  fizzy cards tag $card --add urgent
  sleep 0.5  # 500ms delay
done
```

**Best practices for scripts:**
- Add `sleep` delays between requests
- Use bulk operations when possible
- Cache results instead of repeated queries

### Error: 500 Internal Server Error

**Problem:** API server error.

**Cause:** Temporary server issue.

**Solution:**

1. Wait a few minutes and retry
2. Check Fizzy status page for outages
3. If persists, report the issue

```bash
# Retry the command
fizzy boards list

# Check if issue is specific to one resource
fizzy auth status  # Should work
fizzy boards list   # May fail
```

---

## Network Problems

### Error: "Network request failed"

**Problem:** Cannot connect to Fizzy API.

**Cause:** Network connectivity or firewall issues.

**Solution:**

```bash
# Test connectivity
curl https://app.fizzy.do

# Check firewall/proxy settings
# Ensure HTTPS (443) is allowed

# If behind proxy, configure environment variables
export HTTPS_PROXY=http://proxy.example.com:8080
fizzy boards list

# Verify DNS resolution
nslookup app.fizzy.do
```

### Error: "SSL certificate verification failed"

**Problem:** SSL/TLS certificate errors.

**Cause:** Outdated certificates or network inspection.

**Solution:**

```bash
# Update system certificates (Ubuntu/Debian)
sudo apt update
sudo apt install ca-certificates

# Update system certificates (macOS)
# Usually automatic, but can reinstall
brew reinstall curl

# For corporate networks with SSL inspection
# Contact IT department about adding certificate
```

### Timeout Errors

**Problem:** Requests time out.

**Cause:** Slow network or large response.

**Solution:**

```bash
# For slow networks, limit results
fizzy boards list --limit 10

# Split large operations into smaller chunks
# Instead of: fizzy cards list
# Do: fizzy cards list --board abc123

# Check network speed
ping app.fizzy.do
```

---

## File Upload Issues

### Error: "File not found"

**Problem:** Cannot find image file for upload.

**Cause:** Incorrect file path.

**Solution:**

```bash
# Use absolute path
fizzy cards create \
  --board abc123 \
  --title "Card" \
  --image /home/user/images/photo.png

# Or use relative path from current directory
cd /home/user/images
fizzy cards create \
  --board abc123 \
  --title "Card" \
  --image ./photo.png

# Verify file exists
ls -la /path/to/image.png
```

### Error: "Invalid image format"

**Problem:** Image file format not supported.

**Cause:** Only jpg, jpeg, png, gif, and webp are supported.

**Solution:**

```bash
# Convert image to supported format
convert image.bmp image.png

# Or use a different image
fizzy cards create \
  --board abc123 \
  --title "Card" \
  --image ./image.png  # Use PNG instead of BMP
```

### Error: "File too large"

**Problem:** Image file exceeds size limit.

**Cause:** Fizzy has file size limits for uploads.

**Solution:**

```bash
# Check file size
ls -lh image.png

# Resize/compress image
convert image.png -resize 50% -quality 85 image-compressed.png

# Or use online tools to compress
# Then upload compressed version
fizzy cards create \
  --board abc123 \
  --title "Card" \
  --image ./image-compressed.png
```

---

## JSON Parsing Errors

### Error: "Invalid JSON" when using jq

**Problem:** jq fails to parse output.

**Cause:** Output is not valid JSON or --json flag missing.

**Solution:**

```bash
# Always use --json flag for jq
fizzy boards list --json | jq .

# NOT: fizzy boards list | jq .  # Wrong!

# If still failing, inspect output
fizzy boards list --json > output.json
cat output.json  # Check if valid JSON
```

### Error: jq command not found

**Problem:** jq is not installed.

**Solution:**

```bash
# Install jq (Ubuntu/Debian)
sudo apt install jq

# Install jq (macOS)
brew install jq

# Install jq (other platforms)
# Download from: https://stedolan.github.io/jq/download/
```

### Parsing Nested JSON

**Problem:** Cannot extract nested values.

**Solution:**

```bash
# Use jq path notation
fizzy cards get 42 --json | jq '.board.name'

# Access array elements
fizzy cards get 42 --json | jq '.tags[0]'

# Filter arrays
fizzy cards list --json | jq '.[] | select(.status == "published")'

# Extract multiple fields
fizzy cards list --json | jq '.[] | {number, title, status}'
```

---

## Installation Problems

### npm install fails

**Problem:** Cannot install fizzy-cli via npm.

**Solution:**

```bash
# Update npm
npm install -g npm@latest

# Clear npm cache
npm cache clean --force

# Retry installation
npm install -g @raw-works/fizzy-cli

# If still fails, install from source
git clone https://github.com/rawwerks/fizzy-cli.git
cd fizzy-cli
bun install
bun run build
npm link
```

### Command not found after installation

**Problem:** `fizzy` command not found.

**Cause:** npm global bin directory not in PATH.

**Solution:**

```bash
# Find npm global bin directory
npm bin -g

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$(npm bin -g)"

# Reload shell config
source ~/.bashrc  # or source ~/.zshrc

# Verify installation
which fizzy
fizzy --version
```

### Bun not found

**Problem:** Bun is not installed (for source installation).

**Solution:**

```bash
# Install Bun (Linux/macOS)
curl -fsSL https://bun.sh/install | bash

# Or use npm version instead
npm install -g @raw-works/fizzy-cli
```

### Permission errors during install

**Problem:** Permission denied during npm install.

**Solution:**

```bash
# Use sudo (not recommended for global install)
sudo npm install -g @raw-works/fizzy-cli

# Better: Use nvm to manage Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
npm install -g fizzy-cli  # No sudo needed
```

---

## General Issues

### Output formatting issues

**Problem:** Table output is misaligned or garbled.

**Cause:** Terminal width too narrow.

**Solution:**

```bash
# Use JSON output instead
fizzy boards list --json

# Or resize terminal window
# Or use --json and format with jq
fizzy boards list --json | jq -r '.[] | "\(.id): \(.name)"'
```

### Special characters in input

**Problem:** Commands fail with special characters.

**Solution:**

```bash
# Quote strings with special characters
fizzy cards create \
  --board abc123 \
  --title "Card with 'quotes' and \"double quotes\""

# Escape special characters in shell
fizzy cards create \
  --board abc123 \
  --title "Card with \$pecial char\$"

# Use heredoc for multiline text
fizzy cards create \
  --board abc123 \
  --title "Card" \
  --description "$(cat <<'EOF'
Line 1
Line 2 with 'quotes'
Line 3
EOF
)"
```

### Commands hanging or not responding

**Problem:** Command appears to hang.

**Cause:** Waiting for user input or network timeout.

**Solution:**

```bash
# Check if command is waiting for input
# Press Ctrl+C to cancel

# For interactive prompts, provide all arguments
fizzy auth login --token fiz_token  # Not: fizzy auth login

# Increase verbosity to debug
# (Not currently supported, but can check network)
curl -v https://app.fizzy.do
```

### Unexpected behavior after update

**Problem:** Commands behave differently after updating.

**Cause:** Breaking changes or cache issues.

**Solution:**

```bash
# Check version
fizzy --version

# Clear any caches
rm -rf ~/.fizzy-cli/cache  # If cache directory exists

# Re-authenticate
fizzy auth logout
fizzy auth login

# Check changelog for breaking changes
# Read CHANGELOG.md in repository
```

---

## Debugging Tips

### Enable verbose output

```bash
# For network debugging, use curl directly
curl -H "Authorization: Bearer your_token" \
  https://app.fizzy.do/api/v1/boards
```

### Check token file directly

```bash
# View stored tokens (be careful with output!)
cat ~/.fizzy-cli/tokens.json

# Validate JSON format
jq . ~/.fizzy-cli/tokens.json
```

### Test API connectivity

```bash
# Test basic connectivity
curl https://app.fizzy.do

# Test API endpoint (replace with your token)
curl -H "Authorization: Bearer fiz_your_token" \
  https://app.fizzy.do/api/v1/boards
```

### Check file permissions

```bash
# Token file should be readable only by user
ls -la ~/.fizzy-cli/tokens.json
# Should show: -rw------- (600 permissions)

# Fix if needed
chmod 600 ~/.fizzy-cli/tokens.json
```

### Reproduce with minimal example

```bash
# Strip down to simplest case
fizzy auth status  # Does this work?
fizzy boards list  # Does this work?
fizzy boards get abc123  # Does this work?
# Narrow down where the issue is
```

---

## Getting Help

### Check documentation

1. Read command help:
   ```bash
   fizzy --help
   fizzy boards --help
   fizzy cards create --help
   ```

2. Review documentation:
   - [Command Reference](COMMANDS.md)
   - [Usage Examples](EXAMPLES.md)
   - [README](../README.md)

### Search existing issues

Check GitHub issues for similar problems:
https://github.com/rawwerks/fizzy-cli/issues

### Report a bug

When reporting issues, include:

1. **Command executed:**
   ```bash
   fizzy boards create "Test Board"
   ```

2. **Expected behavior:**
   "Should create a board named 'Test Board'"

3. **Actual behavior:**
   "Error: 422 Unprocessable Entity"

4. **Environment:**
   ```bash
   fizzy --version
   node --version
   npm --version
   uname -a  # OS information
   ```

5. **Full error message:**
   ```
   Copy entire error output here
   ```

6. **Steps to reproduce:**
   1. Run `fizzy auth login`
   2. Run `fizzy boards create "Test"`
   3. See error

### Community support

- GitHub Discussions: Ask questions and share tips
- Fizzy API Documentation: fizzy-api/docs/API.md

---

## Common Error Reference

| Error Code | Meaning | Common Solution |
|------------|---------|-----------------|
| 401 | Unauthorized | Re-authenticate with `fizzy auth login` |
| 403 | Forbidden | Check token permissions (need Read + Write) |
| 404 | Not Found | Verify resource ID is correct |
| 422 | Validation Error | Check required fields and valid values |
| 429 | Rate Limited | Add delays between requests |
| 500 | Server Error | Wait and retry, may be temporary |

## Quick Fixes Checklist

When something isn't working, try these steps in order:

1. ✅ Check authentication: `fizzy auth status`
2. ✅ Verify network: `curl https://app.fizzy.do`
3. ✅ Re-authenticate: `fizzy auth logout && fizzy auth login`
4. ✅ Check command syntax: `fizzy <command> --help`
5. ✅ Try with `--json` flag for better error messages
6. ✅ Check file permissions: `ls -la ~/.fizzy-cli/tokens.json`
7. ✅ Update to latest version: `npm update -g @raw-works/fizzy-cli`
8. ✅ Clear and re-authenticate all accounts
9. ✅ Report issue with full details if still failing
