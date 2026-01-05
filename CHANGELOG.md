# Changelog

All notable changes to fizzy-cli will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-05

### Added - Complete Fizzy API Coverage

**Authentication & Account Management**
- Personal Access Token (PAT) authentication flow
- Magic link authentication support
- Multi-account support with account switching
- Secure token storage in ~/.fizzy-cli/tokens.json
- Account management commands (list, switch, status)

**Boards**
- Create, read, update, delete (CRUD) operations
- List boards with pagination support
- Board configuration options (all_access, auto_postpone_period, public_description)

**Cards**
- Complete card lifecycle management
- Card creation with optional header images
- Card updates with image upload support
- Card state management (close, reopen, postpone, triage)
- Card organization (move to columns, tag, assign)
- Card watching/unwatching for notifications
- Filter cards by board, status, and tags
- Support for both card numbers and IDs

**Columns**
- CRUD operations for board columns
- Custom column colors
- Column listing and details

**Steps (Card Checklists)**
- Complete checklist/todo system for cards
- Create, read, update, delete steps
- Mark steps as completed/incomplete
- Full integration with card workflows

**Comments**
- Add, edit, delete comments on cards
- View comment details with HTML and plain text
- Rich text comment support

**Reactions**
- Add emoji reactions to comments
- List and delete reactions
- Support for any emoji content

**Tags**
- List all tags in account
- Tag management on cards (add/remove)
- Filter cards by tags

**Users**
- List all users in account
- View user details and profiles
- Get current user profile
- Update user display name
- Upload user avatar images
- Deactivate user accounts

**Notifications**
- List all notifications
- Filter to unread-only notifications
- Mark individual notifications as read/unread
- Bulk mark all as read
- Full notification details

### Added - Developer Experience

**Output & Formatting**
- JSON output mode for all commands (--json flag)
- Beautiful table formatting for human-readable output
- Color-coded terminal output using chalk
- Consistent error messages and success confirmations
- Spinner indicators for long-running operations

**API Client**
- Robust HTTP client with retry logic
- Exponential backoff for rate limiting (429 errors)
- Comprehensive error handling
- Support for multipart/form-data file uploads
- Pagination support with automatic page fetching
- Request validation with Zod schemas

**File Upload Support**
- Card header image uploads (jpg, png, gif, webp)
- User avatar uploads
- File validation (format, existence, size)
- Multipart/form-data handling

**Testing**
- 186+ comprehensive unit tests
- E2E test suite for complete workflows
- Smoke tests for CLI functionality
- Dogfooding test suite for real API testing
- Secret scanning with gitleaks integration
- Continuous Integration workflows

**Validation & Safety**
- Client-side input validation using Zod schemas
- API response validation
- Type-safe TypeScript implementation
- Error handling with detailed messages
- Secret scanning to prevent credential leaks

### Added - Documentation

**Comprehensive Documentation**
- Complete README with quick start guide
- Full command reference (docs/COMMANDS.md)
- Real-world usage examples (docs/EXAMPLES.md)
- Troubleshooting guide (docs/TROUBLESHOOTING.md)
- Contributing guidelines (CONTRIBUTING.md)
- Inline help for all commands (--help flag)

**Examples & Guides**
- Getting started tutorials
- Board management workflows
- Card workflows and automation
- Team collaboration examples
- Scripting and automation recipes
- Advanced usage with jq and shell scripts

### Technical Improvements

**Architecture**
- Clean command structure with Commander.js
- Middleware pattern for authentication
- Modular API client design
- Separation of concerns (commands, lib, middleware, schemas)
- TypeScript type safety throughout

**Automation**
- Nightly sync with upstream Fizzy repository
- Automated testing in CI/CD
- Self-healing workflows
- Comprehensive smoke testing

**Developer Tools**
- Hot reload development mode
- Type checking with TypeScript
- Build system with Bun
- NPM package distribution

### Security

- Secure token storage with proper file permissions (600)
- Secret scanning with gitleaks
- No credentials in git history
- Environment variable support for sensitive data
- Rate limiting awareness and handling

### Performance

- Efficient pagination for large datasets
- Response caching where appropriate
- Minimal dependencies for fast installation
- Optimized build output

---

## [0.1.0] - 2025-12-XX (Pre-release)

### Added
- Initial project setup
- Basic authentication framework
- Preliminary board commands
- Development environment configuration

---

## Release Notes

### 1.0.0 - Complete API Coverage

This is the first stable release of fizzy-cli, featuring **100% coverage of the Fizzy API**. Every endpoint is accessible via the CLI, making it possible to manage your Fizzy boards entirely from the terminal.

**Key Highlights:**
- ✅ All 55 Fizzy API endpoints implemented
- ✅ File upload support (images for cards and avatars)
- ✅ Multi-account management
- ✅ Comprehensive test coverage (186+ tests)
- ✅ Complete documentation with examples
- ✅ JSON output for scripting and automation
- ✅ Beautiful terminal output for humans

**Breaking Changes:**
None - this is the initial stable release.

**Migration Guide:**
If upgrading from pre-release versions, please:
1. Run `fizzy auth logout` to clear old token format
2. Re-authenticate with `fizzy auth login`
3. Review updated command syntax in docs/COMMANDS.md

**Known Limitations:**
- No interactive mode (all commands are direct)
- No offline mode (requires network connectivity)
- File uploads limited to supported image formats

**Upcoming Features:**
- Card attachments (beyond header images)
- Webhooks integration
- Custom output templates
- Configuration file support
- Shell completion

---

## Versioning

fizzy-cli follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Incompatible API changes
- **MINOR** version: Backward-compatible functionality additions
- **PATCH** version: Backward-compatible bug fixes

## Unreleased

Changes that are in development but not yet released:

### Planned for 1.1.0
- Shell completion (bash, zsh, fish)
- Configuration file support (~/.fizzy-cli/config.json)
- Interactive mode for common workflows
- Card templates for quick creation

### Under Consideration
- Offline mode with local caching
- Card attachments (non-image files)
- Webhooks endpoint integration
- Export/import board data
- Custom output formatting templates
- Plugin system for extensions

---

## Release History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-01-05 | Initial stable release with 100% API coverage |
| 0.1.0 | 2025-12-XX | Pre-release development version |

---

## How to Update

### NPM Installation

```bash
npm update -g fizzy-cli
```

### From Source

```bash
cd fizzy-cli
git pull origin main
bun install
bun run build
```

### Check Version

```bash
fizzy --version
```

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/fizzy-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/fizzy-cli/discussions)
- **Documentation**: [docs/](./docs/)

---

## Contributors

Thank you to all contributors who helped build fizzy-cli!

<!-- This section will be populated with contributors as the project grows -->

---

**Note**: This changelog is maintained manually. For a complete list of commits, see the [commit history](https://github.com/yourusername/fizzy-cli/commits/main).
