import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface RepoStatus {
  branch: string;
  isClean: boolean;
  hasUncommittedChanges: boolean;
  isRebaseInProgress: boolean;
}

export class GitError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'GitError';
  }
}

export async function checkGitRepository(cwd?: string): Promise<void> {
  try {
    await execAsync('git rev-parse --git-dir', { cwd });
  } catch {
    throw new GitError('Current directory is not a git repository');
  }
}

export async function getRepoStatus(cwd?: string): Promise<RepoStatus> {
  await checkGitRepository(cwd);

  let branch = 'main';
  try {
    const { stdout: branchOut } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd });
    branch = branchOut.trim();
  } catch {
    // If HEAD doesn't exist (empty repo), fallback to 'main'
    branch = 'main';
  }

  const { stdout: statusOut } = await execAsync('git status --porcelain', { cwd });
  const hasUncommittedChanges = statusOut.trim().length > 0;

  let isRebaseInProgress = false;
  try {
    await execAsync('git rev-parse --verify REBASE_HEAD', { cwd });
    isRebaseInProgress = true;
  } catch {
    // REBASE_HEAD doesn't exist, not in rebase
  }

  return {
    branch,
    isClean: !hasUncommittedChanges && !isRebaseInProgress,
    hasUncommittedChanges,
    isRebaseInProgress,
  };
}

export async function listCommits(count: number = 10, cwd?: string): Promise<CommitInfo[]> {
  await checkGitRepository(cwd);

  try {
    const format = '%H%x1f%h%x1f%s%x1f%an%x1f%ai';
    const { stdout } = await execAsync(`git log -n ${count} --format="${format}"`, { cwd });

    const commits: CommitInfo[] = [];
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      if (!line) continue;
      const [hash, shortHash, message, author, date] = line.split('\x1f');
      commits.push({ hash, shortHash, message, author, date });
    }

    return commits;
  } catch {
    // If there are no commits yet, return empty array
    return [];
  }
}

export async function getCommitByHash(hash: string, cwd?: string): Promise<CommitInfo | null> {
  await checkGitRepository(cwd);

  try {
    const format = '%H%x1f%h%x1f%s%x1f%an%x1f%ai';
    const { stdout } = await execAsync(`git log -n 1 --format="${format}" ${hash}`, { cwd });

    if (!stdout.trim()) return null;

    const [fullHash, shortHash, message, author, date] = stdout.trim().split('\x1f');
    return { hash: fullHash, shortHash, message, author, date };
  } catch {
    return null;
  }
}

export async function isCommitPushedToRemote(hash: string, cwd?: string): Promise<boolean> {
  await checkGitRepository(cwd);

  try {
    const { stdout } = await execAsync(`git branch -r --contains ${hash}`, { cwd });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export async function renameCommitMessage(
  hash: string,
  newMessage: string,
  cwd?: string
): Promise<{ success: boolean; newHash: string; warnings: string[] }> {
  await checkGitRepository(cwd);

  const status = await getRepoStatus(cwd);
  const warnings: string[] = [];

  if (!status.isClean) {
    throw new GitError('Working directory is not clean. Please commit or stash your changes.');
  }

  if (status.isRebaseInProgress) {
    throw new GitError('A rebase is already in progress. Please complete or abort it first.');
  }

  const commit = await getCommitByHash(hash, cwd);
  if (!commit) {
    throw new GitError(`Commit ${hash} not found`);
  }

  const isPushed = await isCommitPushedToRemote(hash, cwd);
  if (isPushed) {
    warnings.push('This commit has been pushed to remote. Rewriting history will require force push.');
  }

  const { stdout: headHash } = await execAsync('git rev-parse HEAD', { cwd });
  const isLatestCommit = headHash.trim() === commit.hash;

  if (isLatestCommit) {
    await execAsync(`git commit --amend -m "${escapeShellArg(newMessage)}"`, { cwd });
    const { stdout: newHashOut } = await execAsync('git rev-parse HEAD', { cwd });
    return {
      success: true,
      newHash: newHashOut.trim(),
      warnings,
    };
  } else {
    const { stdout: commitCount } = await execAsync(`git rev-list --count ${hash}..HEAD`, { cwd });
    const distance = parseInt(commitCount.trim(), 10);

    await execAsync(
      `GIT_SEQUENCE_EDITOR="sed -i 's/^pick ${commit.shortHash}/reword ${commit.shortHash}/'" git rebase -i HEAD~${distance + 1}`,
      { cwd }
    );

    await execAsync(`git commit --amend -m "${escapeShellArg(newMessage)}"`, { cwd });
    await execAsync('git rebase --continue', { cwd });

    const { stdout: newHashOut } = await execAsync(
      `git log -n 1 --format="%H" --grep="${escapeShellArg(newMessage)}"`,
      {
        cwd,
      }
    );

    return {
      success: true,
      newHash: newHashOut.trim(),
      warnings,
    };
  }
}

function escapeShellArg(arg: string): string {
  return arg.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
}
