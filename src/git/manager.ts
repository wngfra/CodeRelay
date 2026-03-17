/**
 * Git Manager — initializes repos, creates task branches, auto-commits,
 * and manages branch lifecycle via simple-git.
 */

import simpleGit, { type SimpleGit } from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';

const log = createLogger('git');

const DEFAULT_GITIGNORE = `node_modules/
dist/
.env
*.log
.DS_Store
`;

/**
 * Derive a branch name from a task prompt.
 * Takes first ~40 chars, kebab-cases, strips non-alphanumeric except hyphens,
 * appends datetime.
 */
export function deriveBranchName(taskPrompt: string): string {
  const brief = taskPrompt
    .slice(0, 40)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');

  return `${brief || 'task'}-${timestamp}`;
}

export class GitManager {
  private config = loadConfig();

  private getGit(projectDir: string): SimpleGit {
    return simpleGit(projectDir);
  }

  /**
   * Initialize a new Git repo with a .gitignore and initial commit on main.
   */
  async initRepo(projectDir: string): Promise<void> {
    const gitDir = path.join(projectDir, '.git');
    if (fs.existsSync(gitDir)) {
      log.debug({ projectDir }, 'Git repo already exists');
      return;
    }

    const git = this.getGit(projectDir);

    await git.init();
    await git.addConfig('user.name', this.config.gitUserName);
    await git.addConfig('user.email', this.config.gitUserEmail);

    // Create .gitignore
    const gitignorePath = path.join(projectDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, DEFAULT_GITIGNORE, 'utf8');
    }

    await git.add('.gitignore');
    await git.commit('Initial commit');

    // Ensure we're on main
    try {
      await git.branch(['-M', 'main']);
    } catch {
      // Already on main or rename not needed
    }

    log.info({ projectDir }, 'Git repo initialized');
  }

  /**
   * Create a task branch, commit all changes, and return the branch name.
   */
  async commitTask(
    projectDir: string,
    taskPrompt: string,
  ): Promise<{ branchName: string; filesChanged: string[] } | null> {
    try {
      const git = this.getGit(projectDir);

      // Ensure repo is initialized
      await this.initRepo(projectDir);

      const branchName = deriveBranchName(taskPrompt);

      // Create and checkout new branch
      await git.checkoutLocalBranch(branchName);

      // Stage all changes
      await git.add('-A');

      // Check if there are changes to commit
      const status = await git.status();
      if (status.files.length === 0) {
        log.info({ projectDir }, 'No changes to commit');
        // Switch back to main
        await git.checkout('main');
        return null;
      }

      const filesChanged = status.files.map((f) => f.path);

      // Commit with task summary
      const commitMsg = `[Nuntia] ${taskPrompt.slice(0, 100)}`;
      await git.commit(commitMsg);

      log.info({ projectDir, branchName, filesChanged: filesChanged.length }, 'Task committed');

      return { branchName, filesChanged };
    } catch (err) {
      log.error({ projectDir, err }, 'Git commit failed');
      return null;
    }
  }

  /**
   * List all branches in a project.
   */
  async listBranches(projectDir: string): Promise<{ current: string; all: string[] }> {
    try {
      const git = this.getGit(projectDir);
      const summary = await git.branchLocal();
      return {
        current: summary.current,
        all: summary.all,
      };
    } catch {
      return { current: 'main', all: ['main'] };
    }
  }

  /**
   * Checkout a specific branch.
   */
  async checkout(projectDir: string, branchName: string): Promise<boolean> {
    try {
      const git = this.getGit(projectDir);
      await git.checkout(branchName);
      return true;
    } catch (err) {
      log.error({ projectDir, branchName, err }, 'Checkout failed');
      return false;
    }
  }

  /**
   * Push the current branch to the configured remote.
   */
  async push(projectDir: string): Promise<{ success: boolean; message: string }> {
    if (!this.config.gitRemoteUrl) {
      return { success: false, message: 'No GIT_REMOTE_URL configured' };
    }

    try {
      const git = this.getGit(projectDir);

      // Ensure remote is configured
      const remotes = await git.getRemotes();
      if (!remotes.find((r) => r.name === 'origin')) {
        await git.addRemote('origin', this.config.gitRemoteUrl);
      }

      const branch = (await git.branchLocal()).current;
      await git.push('origin', branch, ['--set-upstream']);

      return { success: true, message: `Pushed ${branch} to origin` };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Push failed';
      log.error({ projectDir, err }, 'Git push failed');
      return { success: false, message };
    }
  }

  /**
   * Get diff of uncommitted changes or last commit.
   */
  async getDiff(projectDir: string): Promise<string> {
    try {
      const git = this.getGit(projectDir);
      let diff = await git.diff();
      if (!diff) {
        // No uncommitted changes — show last commit diff
        diff = await git.diff(['HEAD~1', 'HEAD']);
      }
      return diff || 'No changes found';
    } catch {
      return 'No changes found';
    }
  }
}
