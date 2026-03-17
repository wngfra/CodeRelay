import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SessionStore } from '../src/session/store.js';

describe('SessionStore', () => {
  let tmpDir: string;
  let store: SessionStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuntia-session-test-'));
    store = new SessionStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a new session with getOrCreate', () => {
    const session = store.getOrCreate('chat123', 'telegram', 'default', 'claude-sonnet-4-20250514');

    expect(session.chatId).toBe('chat123');
    expect(session.platform).toBe('telegram');
    expect(session.activeProject).toBe('default');
    expect(session.model).toBe('claude-sonnet-4-20250514');
    expect(session.taskRunning).toBe(false);
  });

  it('returns existing session on second getOrCreate', () => {
    store.getOrCreate('chat123', 'telegram', 'default', 'claude-sonnet-4-20250514');
    const session = store.getOrCreate('chat123', 'telegram', 'other', 'gpt-4');

    // Should return original, not overwrite
    expect(session.activeProject).toBe('default');
    expect(session.model).toBe('claude-sonnet-4-20250514');
  });

  it('updates session fields', () => {
    store.getOrCreate('chat123', 'telegram', 'default', 'claude-sonnet-4-20250514');
    const updated = store.update('chat123', { activeProject: 'my-project' });

    expect(updated?.activeProject).toBe('my-project');
  });

  it('returns undefined when updating non-existent session', () => {
    const result = store.update('nonexistent', { activeProject: 'test' });
    expect(result).toBeUndefined();
  });

  it('tracks task running state', () => {
    store.getOrCreate('chat123', 'telegram', 'default', 'model');

    store.setTaskRunning('chat123', 'fix the login bug');
    let session = store.get('chat123');
    expect(session?.taskRunning).toBe(true);
    expect(session?.taskDescription).toBe('fix the login bug');

    store.setTaskComplete('chat123');
    session = store.get('chat123');
    expect(session?.taskRunning).toBe(false);
    expect(session?.taskDescription).toBe('');
  });

  it('lists all sessions', () => {
    store.getOrCreate('chat1', 'telegram', 'default', 'model');
    store.getOrCreate('chat2', 'whatsapp', 'default', 'model');

    const all = store.listAll();
    expect(all).toHaveLength(2);
  });

  it('deletes a session', () => {
    store.getOrCreate('chat123', 'telegram', 'default', 'model');
    const deleted = store.delete('chat123');
    expect(deleted).toBe(true);
    expect(store.get('chat123')).toBeUndefined();
  });

  it('persists sessions to disk', () => {
    store.getOrCreate('chat123', 'telegram', 'default', 'model');

    // Create a new store instance reading from same directory
    const store2 = new SessionStore(tmpDir);
    const session = store2.get('chat123');
    expect(session).toBeDefined();
    expect(session?.chatId).toBe('chat123');
  });

  it('resets taskRunning on load (process restart)', () => {
    store.getOrCreate('chat123', 'telegram', 'default', 'model');
    store.setTaskRunning('chat123', 'running task');

    // Reload from disk
    const store2 = new SessionStore(tmpDir);
    const session = store2.get('chat123');
    expect(session?.taskRunning).toBe(false);
    expect(session?.taskDescription).toBe('');
  });
});
