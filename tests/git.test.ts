import { describe, it, expect } from 'vitest';
import { deriveBranchName } from '../src/git/manager.js';

describe('deriveBranchName', () => {
  it('kebab-cases the task prompt', () => {
    const name = deriveBranchName('add auth middleware');
    expect(name).toMatch(/^add-auth-middleware-\d{8}-\d{6}$/);
  });

  it('truncates to ~40 chars', () => {
    const longPrompt = 'implement a very complex feature that does many things and handles edge cases properly';
    const name = deriveBranchName(longPrompt);
    // The brief part (before timestamp) should be derived from first ~40 chars
    const brief = name.replace(/-\d{8}-\d{6}$/, '');
    expect(brief.length).toBeLessThanOrEqual(45);
  });

  it('strips non-alphanumeric characters', () => {
    const name = deriveBranchName('fix bug #123 (urgent!)');
    expect(name).toMatch(/^fix-bug-123-urgent-\d{8}-\d{6}$/);
  });

  it('handles empty prompt', () => {
    const name = deriveBranchName('');
    expect(name).toMatch(/^task-\d{8}-\d{6}$/);
  });

  it('handles only special characters', () => {
    const name = deriveBranchName('!!!@@@###');
    expect(name).toMatch(/^task-\d{8}-\d{6}$/);
  });

  it('appends YYYYMMDD-HHmmss timestamp', () => {
    const name = deriveBranchName('test');
    const timestampMatch = name.match(/-(\d{8}-\d{6})$/);
    expect(timestampMatch).toBeTruthy();

    const ts = timestampMatch![1];
    const year = parseInt(ts.slice(0, 4));
    const month = parseInt(ts.slice(4, 6));
    const day = parseInt(ts.slice(6, 8));

    expect(year).toBeGreaterThanOrEqual(2024);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });

  it('collapses multiple hyphens', () => {
    const name = deriveBranchName('fix   the    bug');
    const brief = name.replace(/-\d{8}-\d{6}$/, '');
    expect(brief).not.toMatch(/--+/);
  });
});
