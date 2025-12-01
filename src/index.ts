#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  listCommits,
  getRepoStatus,
  renameCommitMessage,
  getCommitByHash,
  GitError,
  isCommitPushedToRemote,
} from './git/operations.js';

interface ToolArgs {
  [key: string]: unknown;
}

interface ListCommitsArgs extends ToolArgs {
  count?: number;
  cwd?: string;
}

interface GetRepoStatusArgs extends ToolArgs {
  cwd?: string;
}

interface PreviewRenameArgs extends ToolArgs {
  commit_hash: string;
  new_message: string;
  cwd?: string;
}

interface RenameCommitArgs extends ToolArgs {
  commit_hash: string;
  new_message: string;
  force?: boolean;
  cwd?: string;
}

interface UndoRenameArgs extends ToolArgs {
  cwd?: string;
}

const server = new McpServer(
  {
    name: 'commit-renamer-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.registerTool(
  'list_commits',
  {
    description: 'List recent commits in the repository',
    inputSchema: {},
  },
  async (args: ToolArgs) => {
    const { count = 10, cwd } = args as ListCommitsArgs;
    try {
      const commits = await listCommits(typeof count === 'number' ? count : 10, cwd);
      const output = {
        commits: commits.map((c) => ({
          hash: c.hash,
          shortHash: c.shortHash,
          message: c.message,
          author: c.author,
          date: c.date,
        })),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof GitError) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }
);

server.registerTool(
  'get_repo_status',
  {
    description: 'Get current repository status including branch, clean state, and rebase status',
    inputSchema: {},
  },
  async (args: ToolArgs) => {
    const { cwd } = args as GetRepoStatusArgs;
    try {
      const status = await getRepoStatus(cwd);
      const output = {
        branch: status.branch,
        isClean: status.isClean,
        hasUncommittedChanges: status.hasUncommittedChanges,
        isRebaseInProgress: status.isRebaseInProgress,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof GitError) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }
);

server.registerTool(
  'preview_rename',
  {
    description: 'Preview what would change when renaming a commit message without actually applying the change',
    inputSchema: {},
  },
  async (args: ToolArgs) => {
    const { commit_hash, new_message, cwd } = args as PreviewRenameArgs;
    try {
      const status = await getRepoStatus(cwd);
      const commit = await getCommitByHash(commit_hash, cwd);

      if (!commit) {
        return {
          content: [{ type: 'text', text: `Error: Commit ${commit_hash} not found` }],
          isError: true,
        };
      }

      const isPushed = await isCommitPushedToRemote(commit.hash, cwd);
      const warnings: string[] = [];

      if (!status.isClean) {
        warnings.push('Working directory is not clean. Commit or stash changes before renaming.');
      }

      if (status.isRebaseInProgress) {
        warnings.push('A rebase is in progress. Complete or abort it before renaming.');
      }

      if (isPushed) {
        warnings.push('This commit has been pushed to remote. Rewriting history will require force push.');
      }

      const output = {
        commit: {
          hash: commit.hash,
          shortHash: commit.shortHash,
          currentMessage: commit.message,
          newMessage: new_message,
          author: commit.author,
          date: commit.date,
        },
        canProceed: status.isClean && !status.isRebaseInProgress,
        warnings,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof GitError) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }
);

server.registerTool(
  'rename_commit',
  {
    description: 'Rename a commit message. WARNING: This rewrites git history. Use with caution on shared branches.',
    inputSchema: {},
  },
  async (args: ToolArgs) => {
    const { commit_hash, new_message, force = false, cwd } = args as RenameCommitArgs;
    try {
      if (!force) {
        const isPushed = await isCommitPushedToRemote(commit_hash, cwd);
        if (isPushed) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: This commit has been pushed to remote. Rewriting history can cause issues for collaborators. Use force=true to proceed anyway.',
              },
            ],
            isError: true,
          };
        }
      }

      const result = await renameCommitMessage(commit_hash, new_message, cwd);
      const output = {
        success: result.success,
        oldHash: commit_hash,
        newHash: result.newHash,
        newMessage: new_message,
        warnings: result.warnings,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof GitError) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }
);

server.registerTool(
  'undo_rename',
  {
    description: 'Undo the last commit rename operation using git reflog. This can recover from mistakes.',
    inputSchema: {},
  },
  async (args: ToolArgs) => {
    const { cwd } = args as UndoRenameArgs;
    try {
      const status = await getRepoStatus(cwd);

      if (!status.isClean) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Working directory is not clean. Cannot safely undo.',
            },
          ],
          isError: true,
        };
      }

      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('git reset --hard HEAD@{1}', { cwd });

      const output = {
        success: true,
        message: 'Successfully reverted to previous state using reflog',
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof GitError) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Commit Renamer MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
