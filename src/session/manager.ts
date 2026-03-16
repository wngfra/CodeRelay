/**
 * Session Manager — maps chat IDs to persistent project directories,
 * manages conversation state, model configuration, and task queuing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { SessionStore, type SessionData } from './store.js';
import type { Platform } from '../transport/types.js';
import { createLogger } from '../logger.js';

const log = createLogger('session');

export interface QueuedRequest {
  prompt: string;
  senderName: string;
  resolve: (value: void) => void;
  reject: (reason: Error) => void;
}

export class SessionManager {
  private store: SessionStore;
  private queues: Map<string, QueuedRequest[]> = new Map();
  private config = loadConfig();

  constructor() {
    const bridgeDir = path.join(this.config.workspaceRoot, '.bridge');
    this.store = new SessionStore(bridgeDir);
  }

  /**
   * Resolve the project directory path for a given chat.
   */
  getProjectDir(chatId: string, platform: Platform, isGroup: boolean): string {
    const prefix = platform === 'telegram'
      ? (isGroup ? 'tg_group_' : 'tg_')
      : 'wa_';
    const session = this.store.get(chatId);
    const projectName = session?.activeProject || 'default';
    return path.join(this.config.workspaceRoot, `${prefix}${chatId}`, projectName);
  }

  /**
   * Ensure a session and its project directory exist.
   */
  ensureSession(
    chatId: string,
    platform: Platform,
    isGroup: boolean,
  ): SessionData {
    const prefix = platform === 'telegram'
      ? (isGroup ? 'tg_group_' : 'tg_')
      : 'wa_';
    const defaultProject = 'default';

    const session = this.store.getOrCreate(
      chatId,
      platform,
      defaultProject,
      this.config.defaultModel,
    );

    // Ensure project directory exists
    const projectDir = path.join(
      this.config.workspaceRoot,
      `${prefix}${chatId}`,
      session.activeProject,
    );
    fs.mkdirSync(projectDir, { recursive: true });

    // Ensure uploads directory
    const uploadsDir = path.join(projectDir, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    log.info({ chatId, projectDir }, 'Session ensured');
    return session;
  }

  /**
   * Create a new project for a chat and switch to it.
   */
  createProject(
    chatId: string,
    platform: Platform,
    isGroup: boolean,
    projectName: string,
  ): string {
    const prefix = platform === 'telegram'
      ? (isGroup ? 'tg_group_' : 'tg_')
      : 'wa_';

    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectDir = path.join(
      this.config.workspaceRoot,
      `${prefix}${chatId}`,
      safeName,
    );
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'uploads'), { recursive: true });

    this.store.update(chatId, { activeProject: safeName });
    log.info({ chatId, projectName: safeName }, 'Project created');
    return projectDir;
  }

  /**
   * Switch the active project for a chat.
   */
  switchProject(chatId: string, platform: Platform, isGroup: boolean, projectName: string): string | null {
    const prefix = platform === 'telegram'
      ? (isGroup ? 'tg_group_' : 'tg_')
      : 'wa_';
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectDir = path.join(
      this.config.workspaceRoot,
      `${prefix}${chatId}`,
      safeName,
    );

    if (!fs.existsSync(projectDir)) return null;

    this.store.update(chatId, { activeProject: safeName });
    return projectDir;
  }

  /**
   * List all projects for a chat.
   */
  listProjects(chatId: string, platform: Platform, isGroup: boolean): string[] {
    const prefix = platform === 'telegram'
      ? (isGroup ? 'tg_group_' : 'tg_')
      : 'wa_';
    const chatDir = path.join(this.config.workspaceRoot, `${prefix}${chatId}`);

    if (!fs.existsSync(chatDir)) return [];

    return fs.readdirSync(chatDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name);
  }

  getSession(chatId: string): SessionData | undefined {
    return this.store.get(chatId);
  }

  updateSession(chatId: string, updates: Partial<SessionData>): void {
    this.store.update(chatId, updates);
  }

  setTaskRunning(chatId: string, description: string): void {
    this.store.setTaskRunning(chatId, description);
  }

  setTaskComplete(chatId: string): void {
    this.store.setTaskComplete(chatId);
  }

  /**
   * Get the request queue for a session.
   */
  getQueue(chatId: string): QueuedRequest[] {
    if (!this.queues.has(chatId)) {
      this.queues.set(chatId, []);
    }
    return this.queues.get(chatId)!;
  }

  /**
   * Enqueue a request. Returns the queue position (1-based).
   */
  enqueue(chatId: string, request: QueuedRequest): number {
    const queue = this.getQueue(chatId);
    queue.push(request);
    return queue.length;
  }

  /**
   * Dequeue the next request, if any.
   */
  dequeue(chatId: string): QueuedRequest | undefined {
    const queue = this.getQueue(chatId);
    return queue.shift();
  }

  /**
   * Check if a chat ID is whitelisted.
   */
  isAllowed(chatId: string): boolean {
    return this.config.allowedChatIds.has(chatId);
  }
}
