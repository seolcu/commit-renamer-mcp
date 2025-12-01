# Commit Renamer MCP

An MCP (Model Context Protocol) server that enables AI agents to safely rename Git commit messages.

[![NPM Version](https://img.shields.io/npm/v/@seolcu/commit-renamer-mcp)](https://www.npmjs.com/package/@seolcu/commit-renamer-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Quick Start

No local installation needed:

```bash
npx @seolcu/commit-renamer-mcp
```

## Installation

### One-Click Installation (Recommended)

Click the button below to add this MCP server to your editor:

[![Add to Claude Desktop](https://img.shields.io/badge/Add%20to-Claude%20Desktop-7C3AED)](https://github.com/seolcu/commit-renamer-mcp/blob/main/.github/mcp-settings.json)
[![Add to Cursor](https://img.shields.io/badge/Add%20to-Cursor-000000)](https://github.com/seolcu/commit-renamer-mcp/blob/main/.github/mcp-settings.json)
[![Add to VSCode](https://img.shields.io/badge/Add%20to-VSCode-007ACC)](https://github.com/seolcu/commit-renamer-mcp/blob/main/.github/mcp-settings.json)
[![Add to Windsurf](https://img.shields.io/badge/Add%20to-Windsurf-00D9FF)](https://github.com/seolcu/commit-renamer-mcp/blob/main/.github/mcp-settings.json)

### Manual Installation

#### Claude Desktop

Edit your config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "commit-renamer": {
      "command": "npx",
      "args": ["-y", "@seolcu/commit-renamer-mcp"]
    }
  }
}
```

#### Cursor

Edit `~/.cursor/mcp_settings.json`:

```json
{
  "mcpServers": {
    "commit-renamer": {
      "command": "npx",
      "args": ["-y", "@seolcu/commit-renamer-mcp"]
    }
  }
}
```

#### VSCode / VSCode Insiders

Edit your settings:
- VSCode: `~/.vscode/mcp_settings.json`
- VSCode Insiders: `~/.vscode-insiders/mcp_settings.json`

```json
{
  "mcpServers": {
    "commit-renamer": {
      "command": "npx",
      "args": ["-y", "@seolcu/commit-renamer-mcp"]
    }
  }
}
```

#### Windsurf

Edit `~/.windsurf/mcp_settings.json`:

```json
{
  "mcpServers": {
    "commit-renamer": {
      "command": "npx",
      "args": ["-y", "@seolcu/commit-renamer-mcp"]
    }
  }
}
```

#### Cline (VSCode Extension)

Edit VSCode settings (`settings.json`):

```json
{
  "cline.mcpServers": {
    "commit-renamer": {
      "command": "npx",
      "args": ["-y", "@seolcu/commit-renamer-mcp"]
    }
  }
}
```

#### Gemini CLI

Add to your Gemini CLI config:

```bash
gemini mcp add commit-renamer npx -y @seolcu/commit-renamer-mcp
```

#### OpenCode

Edit `~/.opencode/mcp_settings.json`:

```json
{
  "mcpServers": {
    "commit-renamer": {
      "command": "npx",
      "args": ["-y", "@seolcu/commit-renamer-mcp"]
    }
  }
}
```

### Global Installation

```bash
npm install -g @seolcu/commit-renamer-mcp
```

### From Source

```bash
git clone https://github.com/seolcu/commit-renamer-mcp.git
cd commit-renamer-mcp
npm install
npm run build
```

## Features

This MCP server provides the following tools:

### `list_commits`
List recent commits in the repository.

**Parameters:**
- `count` (number, optional): Number of commits to list (1-100, default: 10)
- `cwd` (string, optional): Working directory (default: current directory)

**Returns:**
```json
{
  "commits": [
    {
      "hash": "full commit hash",
      "shortHash": "short hash",
      "message": "commit message",
      "author": "author name",
      "date": "commit date"
    }
  ]
}
```

### `get_repo_status`
Check the current repository status.

**Parameters:**
- `cwd` (string, optional): Working directory

**Returns:**
```json
{
  "branch": "current branch name",
  "isClean": true,
  "hasUncommittedChanges": false,
  "isRebaseInProgress": false
}
```

### `preview_rename`
Preview commit message changes without actually applying them.

**Parameters:**
- `commit_hash` (string, required): Commit hash to rename (full or short)
- `new_message` (string, required): New commit message
- `cwd` (string, optional): Working directory

**Returns:**
```json
{
  "commit": {
    "hash": "commit hash",
    "shortHash": "short hash",
    "currentMessage": "current message",
    "newMessage": "new message",
    "author": "author",
    "date": "date"
  },
  "canProceed": true,
  "warnings": ["warning messages"]
}
```

### `rename_commit`
Actually rename a commit message. **Warning: This rewrites Git history!**

**Parameters:**
- `commit_hash` (string, required): Commit hash to rename
- `new_message` (string, required): New commit message
- `force` (boolean, optional): Bypass safety checks (default: false)
- `cwd` (string, optional): Working directory

**Returns:**
```json
{
  "success": true,
  "oldHash": "old hash",
  "newHash": "new hash",
  "newMessage": "new message",
  "warnings": ["warning messages"]
}
```

### `undo_rename`
Undo the last commit message change using git reflog.

**Parameters:**
- `cwd` (string, optional): Working directory

**Returns:**
```json
{
  "success": true,
  "message": "Successfully reverted to previous state using reflog"
}
```

## Safety Features

This tool provides several safety mechanisms:

1. **Working Directory Check**: Refuses to operate if there are uncommitted changes
2. **Rebase Status Check**: Refuses to operate if a rebase is in progress
3. **Remote Push Check**: By default, prevents changing commits that have been pushed to remote (can be bypassed with `force=true`)
4. **Preview Feature**: See what will happen before making actual changes
5. **Undo Feature**: Revert changes using reflog if you make a mistake

## Important Warnings

**Renaming commits rewrites Git history!**

- Only use on branches you work on alone
- Rewriting history on shared branches can cause serious problems
- After changing pushed commits, you'll need `git push --force`
- Always use `preview_rename` first to verify changes

## Development

### Build and Run
```bash
# Run in development mode
npm run dev

# Build
npm run build

# Start production
npm start
```

### Quality Checks
```bash
# Run all quality checks (typecheck + lint + format + test)
npm run quality

# Individual checks
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint checking
npm run format        # Prettier formatting
npm test              # Run tests
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## Quality Assurance

- **TypeScript Strict Mode**: Type safety guaranteed
- **ESLint**: Automated code quality checks
- **Prettier**: Consistent code style
- **Vitest**: 13 unit tests (100% passing)
- **Production Ready**: All quality checks passing

## License

MIT

## Contributing

Issues and PRs are always welcome! See [Contributing Guide](CONTRIBUTING.md) for details.
