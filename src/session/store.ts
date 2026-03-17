/**
 * Persistent session state store.
 * Tracks per-chat session data: active project, model, running task info.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Platform } from '../transport/types.js';

export interface SessionData {
  /** Chat ID (session key) */
  chatId: string;
  /** Platform origin */
  platform: Platform;
  /** Active project name */
  activeProject: string;
  /** Currently configured model */
  model: string;
  /** Whether a task is currently running */
  taskRunning: boolean;
  /** Current task description (if running) */
  taskDescription: string;
  /** When the session was created */
  createdAt: string;
  /** Last activity timestamp */
  lastActiveAt: string;
}

export class SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private persistPath: string;

  constructor(nuntiaDir: string) {
    this.persistPath = path.join(nuntiaDir, 'sessions.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, 'utf8');
        const data = JSON.parse(raw) as Record<string, SessionData>;
        for (const [key, session] of Object.entries(data)) {
          // Reset running state on load (process was killed)
          session.taskRunning = false;
          session.taskDescription = '';
          this.sessions.set(key, session);
        }
      }
    } catch {
      // Corrupted file — start fresh
      this.sessions.clear();
    }
  }

  private persist(): void {
    const dir = path.dirname(this.persistPath);
    fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, SessionData> = {};
    for (const [key, session] of this.sessions) {
      obj[key] = session;
    }
    fs.writeFileSync(this.persistPath, JSON.stringify(obj, null, 2), 'utf8');
  }

  get(chatId: string): SessionData | undefined {
    return this.sessions.get(chatId);
  }

  getOrCreate(
    chatId: string,
    platform: Platform,
    defaultProject: string,
    defaultModel: string,
  ): SessionData {
    let session = this.sessions.get(chatId);
    if (!session) {
      const now = new Date().toISOString();
      session = {
        chatId,
        platform,
        activeProject: defaultProject,
        model: defaultModel,
        taskRunning: false,
        taskDescription: '',
        createdAt: now,
        lastActiveAt: now,
      };
      this.sessions.set(chatId, session);
      this.persist();
    }
    return session;
  }

  update(chatId: string, updates: Partial<SessionData>): SessionData | undefined {
    const session = this.sessions.get(chatId);
    if (!session) return undefined;
    Object.assign(session, updates, { lastActiveAt: new Date().toISOString() });
    this.persist();
    return session;
  }

  setTaskRunning(chatId: string, description: string): void {
    this.update(chatId, { taskRunning: true, taskDescription: description });
  }

  setTaskComplete(chatId: string): void {
    this.update(chatId, { taskRunning: false, taskDescription: '' });
  }

  listAll(): SessionData[] {
    return [...this.sessions.values()];
  }

  delete(chatId: string): boolean {
    const result = this.sessions.delete(chatId);
    if (result) this.persist();
    return result;
  }
}
