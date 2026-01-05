# Pagination Implementation Guide

## Completed

### API Client (src/lib/api/client.ts)
- [x] Added `PaginationOptions` interface with `page`, `perPage`, `all` fields
- [x] Updated `RequestOptions` to include `pagination` field
- [x] Modified `request()` method to append page/per_page query params
- [x] Updated `get()` method to handle `--all` flag by calling `getAll()`

### Commands
- [x] boards list - Added --page, --per-page, --all flags with full implementation

## TODO - Remaining List Commands

Each command needs these changes:

### 1. Interface Updates
Add to the ListOptions interface:
```typescript
page?: number;
perPage?: number;
all?: boolean;
```

### 2. CLI Options
Add these three options to the `.command('list')`:
```typescript
.option('--page <number>', 'Page number (default: 1)', (value) => parseInt(value, 10))
.option('--per-page <number>', 'Results per page (default: 30)', (value) => parseInt(value, 10))
.option('--all', 'Fetch all results (auto-paginate)')
```

### 3. API Call Logic
Replace the current `client.get()` or `client.getAll()` call with:
```typescript
const items = await client.get<ItemType[]>(path, {
  pagination: {
    page: options.page,
    perPage: options.perPage,
    all: options.all || (!options.page && !options.perPage), // default to all if no pagination specified
  }
});
```

## Commands Remaining

1. **cards list** (src/commands/cards.ts)
   - File has additional filters (board, status, tag, assignee, search, etc.)
   - Need to preserve existing query parameter logic
   - Add pagination to the client.get() call

2. **comments list** (src/commands/comments.ts)
   - Requires card number as argument
   - Add pagination options

3. **users list** (src/commands/users.ts)
   - Currently uses `client.getAll('/users')`
   - Replace with paginated client.get()

4. **notifications list** (src/commands/notifications.ts)
   - Currently uses `client.getAll('/notifications')`
   - Replace with paginated client.get()

5. **tags list** (src/commands/tags.ts)
   - Currently uses `client.getAll('/tags')`
   - Replace with paginated client.get()

6. **steps list** (src/commands/steps.ts)
   - Requires --card option
   - Add pagination options

7. **columns list** (src/commands/columns.ts)
   - Requires --board option
   - Add pagination options

## Testing

After implementation:
1. Run `npm run build` to verify no TypeScript errors
2. Run `npm test` to ensure tests pass
3. Test manually with different pagination combinations:
   - `fizzy boards list` (should fetch all by default)
   - `fizzy boards list --page 1 --per-page 10`
   - `fizzy boards list --all`
