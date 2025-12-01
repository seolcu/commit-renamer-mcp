import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  checkGitRepository,
  getRepoStatus,
  listCommits,
  getCommitByHash,
  isCommitPushedToRemote,
  GitError,
} from '../git/operations.js';

const execAsync = promisify(exec);

describe('Git Operations', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'git-test-'));
    await execAsync('git init', { cwd: testDir });
    await execAsync('git config user.name "Test User"', { cwd: testDir });
    await execAsync('git config user.email "test@example.com"', { cwd: testDir });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('checkGitRepository', () => {
    it('should not throw error for valid git repository', async () => {
      await expect(checkGitRepository(testDir)).resolves.not.toThrow();
    });

    it('should throw GitError for non-git directory', async () => {
      const nonGitDir = await mkdtemp(join(tmpdir(), 'non-git-'));
      await expect(checkGitRepository(nonGitDir)).rejects.toThrow(GitError);
      await rm(nonGitDir, { recursive: true, force: true });
    });
  });

  describe('getRepoStatus', () => {
    it('should return clean status for empty repository', async () => {
      const status = await getRepoStatus(testDir);
      expect(status.isClean).toBe(true);
      expect(status.hasUncommittedChanges).toBe(false);
      expect(status.isRebaseInProgress).toBe(false);
    });

    it('should detect uncommitted changes', async () => {
      await execAsync('echo "test" > test.txt', { cwd: testDir });
      await execAsync('git add test.txt', { cwd: testDir });
      const status = await getRepoStatus(testDir);
      expect(status.hasUncommittedChanges).toBe(true);
      expect(status.isClean).toBe(false);
    });

    it('should return correct branch name', async () => {
      const status = await getRepoStatus(testDir);
      expect(status.branch).toBe('main');
    });
  });

  describe('listCommits', () => {
    it('should return empty array for repository with no commits', async () => {
      const commits = await listCommits(10, testDir);
      expect(commits).toEqual([]);
    });

    it('should list commits after creating them', async () => {
      await execAsync('echo "test1" > test1.txt && git add test1.txt && git commit -m "First commit"', {
        cwd: testDir,
      });
      await execAsync('echo "test2" > test2.txt && git add test2.txt && git commit -m "Second commit"', {
        cwd: testDir,
      });

      const commits = await listCommits(10, testDir);
      expect(commits).toHaveLength(2);
      expect(commits[0].message).toBe('Second commit');
      expect(commits[1].message).toBe('First commit');
    });

    it('should respect count parameter', async () => {
      for (let i = 1; i <= 5; i++) {
        await execAsync(`echo "test${i}" > test${i}.txt && git add test${i}.txt && git commit -m "Commit ${i}"`, {
          cwd: testDir,
        });
      }

      const commits = await listCommits(3, testDir);
      expect(commits).toHaveLength(3);
    });
  });

  describe('getCommitByHash', () => {
    it('should return null for non-existent commit', async () => {
      const commit = await getCommitByHash('nonexistent', testDir);
      expect(commit).toBeNull();
    });

    it('should retrieve commit by full hash', async () => {
      await execAsync('echo "test" > test.txt && git add test.txt && git commit -m "Test commit"', { cwd: testDir });
      const commits = await listCommits(1, testDir);
      const hash = commits[0].hash;

      const commit = await getCommitByHash(hash, testDir);
      expect(commit).not.toBeNull();
      expect(commit?.message).toBe('Test commit');
    });

    it('should retrieve commit by short hash', async () => {
      await execAsync('echo "test" > test.txt && git add test.txt && git commit -m "Test commit"', { cwd: testDir });
      const commits = await listCommits(1, testDir);
      const shortHash = commits[0].shortHash;

      const commit = await getCommitByHash(shortHash, testDir);
      expect(commit).not.toBeNull();
      expect(commit?.message).toBe('Test commit');
    });
  });

  describe('isCommitPushedToRemote', () => {
    it('should return false for commit not pushed to remote', async () => {
      await execAsync('echo "test" > test.txt && git add test.txt && git commit -m "Test commit"', { cwd: testDir });
      const commits = await listCommits(1, testDir);
      const hash = commits[0].hash;

      const isPushed = await isCommitPushedToRemote(hash, testDir);
      expect(isPushed).toBe(false);
    });

    it('should return false when no remote is configured', async () => {
      await execAsync('echo "test" > test.txt && git add test.txt && git commit -m "Test commit"', { cwd: testDir });
      const commits = await listCommits(1, testDir);
      const hash = commits[0].hash;

      const isPushed = await isCommitPushedToRemote(hash, testDir);
      expect(isPushed).toBe(false);
    });
  });
});
