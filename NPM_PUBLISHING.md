# NPM Publishing Guide for fizzy-cli

This guide explains how to publish fizzy-cli to NPM.

## Prerequisites

### 1. NPM Account Setup

```bash
# Create NPM account (if you don't have one)
# Visit: https://www.npmjs.com/signup

# Login to NPM
npm login

# Verify you're logged in
npm whoami
```

### 2. NPM Token for GitHub Actions (Optional)

For automated publishing via GitHub Actions:

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Generate a new "Automation" token
3. Add it to GitHub Secrets as `NPM_TOKEN`:
   - Go to https://github.com/rawwerks/fizzy-cli/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: (paste your NPM token)

## Pre-Publishing Checklist

Before publishing, ensure:

- [ ] All tests pass: `bun test`
- [ ] Build succeeds: `bun run build`
- [ ] Version is correct in `package.json`
- [ ] CHANGELOG.md is updated
- [ ] README.md has correct installation instructions
- [ ] LICENSE.md is included
- [ ] Git working directory is clean

## Publishing Methods

### Method 1: Manual Publishing (Recommended for first release)

```bash
# 1. Ensure you're on master branch and up to date
git checkout master
git pull

# 2. Run pre-publish checks
bun run build
bun test

# 3. Test the package locally
npm pack
# This creates fizzy-cli-1.0.0.tgz
# Inspect contents:
tar -tzf fizzy-cli-1.0.0.tgz | less

# 4. Optionally test the packed package
npm install -g ./fizzy-cli-1.0.0.tgz
fizzy --version
fizzy --help
npm uninstall -g fizzy-cli

# 5. Publish to NPM
npm publish --access public

# 6. Tag the release in Git
git tag v1.0.0
git push --tags
```

### Method 2: Using Release Scripts

The package.json includes release scripts:

```bash
# Patch release (1.0.0 -> 1.0.1)
npm run release

# Minor release (1.0.0 -> 1.1.0)
npm run release:minor

# Major release (1.0.0 -> 2.0.0)
npm run release:major
```

These scripts:
1. Bump the version in package.json
2. Create a git commit
3. Create a git tag
4. Push to GitHub
5. Publish to NPM

### Method 3: GitHub Actions (Automated)

#### Option A: Manual Trigger

1. Go to https://github.com/rawwerks/fizzy-cli/actions/workflows/publish.yml
2. Click "Run workflow"
3. Select version bump type (patch/minor/major)
4. Click "Run workflow"

The workflow will:
- Run tests
- Build the package
- Bump version
- Publish to NPM
- Create GitHub release

#### Option B: GitHub Release Trigger

1. Create a new release on GitHub: https://github.com/rawwerks/fizzy-cli/releases/new
2. Set tag: `v1.0.0`
3. Set title: `v1.0.0`
4. Add release notes from CHANGELOG.md
5. Click "Publish release"

This automatically triggers the publish workflow.

## Package Contents

The published package includes only:

```
fizzy-cli/
├── dist/           # Built JavaScript files
│   └── index.js    # Main CLI entry point
├── LICENSE.md      # License file
├── README.md       # Documentation
├── CHANGELOG.md    # Version history
└── package.json    # Package metadata
```

Everything else is excluded via `.npmignore`.

## Post-Publishing Steps

After successful publication:

### 1. Verify Package on NPM

```bash
# Check package page
open https://www.npmjs.com/package/fizzy-cli

# Test installation
npm install -g fizzy-cli
fizzy --version
fizzy --help
```

### 2. Update Documentation

If this is the first release:
- Update README.md badges (if any)
- Announce on relevant channels
- Update any dependent projects

### 3. Monitor

- Check download stats: https://www.npmjs.com/package/fizzy-cli
- Monitor issues: https://github.com/rawwerks/fizzy-cli/issues
- Watch for npm deprecation notices

## Troubleshooting

### "You do not have permission to publish"

```bash
# Check you're logged in as the correct user
npm whoami

# Ensure package name is available
npm search fizzy-cli

# If name is taken, rename in package.json
```

### "npm ERR! 403 Forbidden"

```bash
# Package might be private, make it public:
npm publish --access public
```

### "prepublishOnly script failed"

```bash
# Tests or build failed. Fix the errors:
bun test
bun run build
```

### Package size is too large

```bash
# Check what's included:
npm pack --dry-run

# Review .npmignore to exclude more files
```

## Version Strategy

Follow semantic versioning (semver):

- **Patch (1.0.x)**: Bug fixes, small improvements
- **Minor (1.x.0)**: New features, backwards compatible
- **Major (x.0.0)**: Breaking changes

## NPM Scripts Reference

```bash
# Build the package
npm run build

# Run tests
npm test

# Type checking
npm run typecheck

# Generate documentation
npm run docs

# Check what will be published
npm pack --dry-run

# Pre-publish checks (runs automatically before publish)
npm run prepublishOnly

# Release scripts
npm run release           # Patch version
npm run release:minor     # Minor version
npm run release:major     # Major version
```

## Security

### Package Provenance

The publish workflow uses `--provenance` flag which:
- Links the published package to the source code
- Provides transparency about where the package comes from
- Helps users verify authenticity

### Dependency Security

```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix
```

## Unpublishing (Emergency Only)

```bash
# Unpublish a specific version (within 72 hours)
npm unpublish fizzy-cli@1.0.0

# Deprecate a version (preferred over unpublish)
npm deprecate fizzy-cli@1.0.0 "Security issue, please upgrade to 1.0.1"
```

**Note**: Unpublishing is discouraged. Use deprecation instead.

## Support

- NPM Package: https://www.npmjs.com/package/fizzy-cli
- GitHub Issues: https://github.com/rawwerks/fizzy-cli/issues
- NPM Support: https://www.npmjs.com/support
