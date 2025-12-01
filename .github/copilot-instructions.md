# Commit Renamer MCP - AI Agent Instructions

## Project Architecture

This is an MCP (Model Context Protocol) server that provides Git commit message renaming capabilities to AI agents. Built with TypeScript in strict mode, targeting ES2022 with ESNext modules.

**Core Components:**
- `src/index.ts`: MCP server entry point using stdio transport. Registers 5 tools: list_commits, get_repo_status, preview_rename, rename_commit, undo_rename
- `src/git/operations.ts`: Git command wrappers using Node.js child_process. All functions accept optional `cwd` parameter for multi-repo support
- `src/__tests__/git-operations.test.ts`: Vitest tests that create temporary Git repos using mkdtemp for isolation

**Key Patterns:**
- MCP SDK requires `inputSchema: {}` with type-safe handlers using TypeScript interfaces (ToolArgs, ListCommitsArgs, etc.)
- Git operations use `escapeShellArg()` to prevent command injection
- Error handling: GitError class for Git-specific errors, returned as `{isError: true}` in MCP responses
- Safety checks: Refuse operations on dirty working directory, during rebase, or on pushed commits (unless force=true)

## Development Workflow

**Quality Gate (runs on every publish):**
```bash
npm run quality  # typecheck + lint + format:check + test (must pass before deploy)
```

**Individual Commands:**
```bash
npm run dev           # tsx hot-reload for development
npm run build         # TypeScript compilation to dist/
npm test              # Run Vitest tests
npm run test:watch    # Watch mode for TDD
npm run lint:fix      # Auto-fix ESLint issues
npm run format        # Apply Prettier formatting
```

**Testing Pattern:**
- Tests use temporary directories (`mkdtemp`) with full Git initialization
- Clean up with `afterEach` to remove test repos
- Test both success and error cases (e.g., empty repos, missing HEAD)

## Project-Specific Conventions

**No Emojis:** Comments, docs, responses - anywhere. Remove immediately if found.

**Git Operations:**
- Latest commit rename uses `git commit --amend`
- Older commits use `git rebase -i` with automated editor (GIT_SEQUENCE_EDITOR)
- Format strings use `%x1f` (Unit Separator) as delimiter for parsing multi-field output
- Handle edge cases: empty repos (no HEAD), no commits, detached HEAD state

**MCP Tool Structure:**
```typescript
server.registerTool('tool_name', {
  description: 'Clear description',
  inputSchema: {},  // Empty schema, use TypeScript interfaces instead
}, async (args: ToolArgs) => {
  const { param1, param2 } = args as SpecificArgs;
  // Return { content: [{ type: 'text', text: JSON.stringify(result) }] }
});
```

**Publishing:**
- Version bumps: `npm version patch|minor|major`
- `prepublishOnly` hook runs quality checks automatically
- Package includes only `dist/`, `README.md`, `LICENSE`
- NPM scoped package: `@seolcu/commit-renamer-mcp`

**Code Style:**
- ESLint flat config (eslint.config.mjs) with TypeScript plugin
- Prettier: 120 char line width, single quotes, semicolons
- Avoid bare catch blocks - use typed error handling

## External Dependencies

- `@modelcontextprotocol/sdk`: Core MCP server implementation (stdio transport)
- Git CLI: All operations shell out to git commands (requires git in PATH)
- Vitest: Test framework with native ESM support
- tsx: Development runtime for TypeScript hot-reload

## Critical Files

- `package.json`: Defines `bin` entry point for npx execution, `prepublishOnly` hook
- `tsconfig.json`: ES2022 target, strict mode, declaration maps for debugging
- `.github/mcp-settings.json`: One-click installation config for MCP clients
