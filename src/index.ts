#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  listCommits,
  getRepoStatus,
  renameCommitMessage,
  getCommitByHash,
  GitError,
  isCommitPushedToRemote,
} from './git/operations.js';

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

server.tool(
  'list_commits',
  'List recent commits in the repository. Pass cwd parameter with workspace path.',
  {
    count: z.number().optional().describe('Number of recent commits to list (default: 10)'),
    cwd: z.string().optional().describe('Working directory path (default: current directory)'),
  },
  async (args) => {
    const { count = 10, cwd } = args;
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
            type: 'text' as const,
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof GitError) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }
);

server.tool('debug_cwd', 'Debug tool to show current working directory of MCP server', {}, () => {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ cwd: process.cwd() }, null, 2),
      },
    ],
  };
});

server.tool(
  'get_repo_status',
  'Get current repository status including branch, clean state, and rebase status',
  {
    cwd: z.string().optional().describe('Working directory path (default: current directory)'),
  },
  async (args) => {
    const { cwd } = args;
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
            type: 'text' as const,
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof GitError) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }
);

server.tool(
  'preview_rename',
  'Preview what would change when renaming a commit message without actually applying the change',
  {
    commit_hash: z.string().describe('The commit hash to rename'),
    new_message: z.string().describe('The new commit message'),
    cwd: z.string().optional().describe('Working directory path (default: current directory)'),
  },
  async (args) => {
    const { commit_hash, new_message, cwd } = args;
    try {
      const status = await getRepoStatus(cwd);
      const commit = await getCommitByHash(commit_hash, cwd);

      if (!commit) {
        return {
          content: [{ type: 'text' as const, text: `Error: Commit ${commit_hash} not found` }],
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
            type: 'text' as const,
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof GitError) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }
);

server.tool(
  'rename_commit',
  'Rename a commit message. WARNING: This rewrites git history. Use with caution on shared branches.',
  {
    commit_hash: z.string().describe('The commit hash to rename'),
    new_message: z.string().describe('The new commit message'),
    force: z.boolean().optional().describe('Force rename even if commit is pushed to remote (default: false)'),
    cwd: z.string().optional().describe('Working directory path (default: current directory)'),
  },
  async (args) => {
    const { commit_hash, new_message, force = false, cwd } = args;
    try {
      if (!force) {
        const isPushed = await isCommitPushedToRemote(commit_hash, cwd);
        if (isPushed) {
          return {
            content: [
              {
                type: 'text' as const,
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
            type: 'text' as const,
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof GitError) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  }
);

server.tool(
  'undo_rename',
  'Undo the last commit rename operation using git reflog. This can recover from mistakes.',
  {
    cwd: z.string().optional().describe('Working directory path (default: current directory)'),
  },
  async (args) => {
    const { cwd } = args;
    try {
      const status = await getRepoStatus(cwd);

      if (!status.isClean) {
        return {
          content: [
            {
              type: 'text' as const,
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
            type: 'text' as const,
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof GitError) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
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
