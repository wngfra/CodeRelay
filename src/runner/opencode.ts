/**
 * OpenCode Runner — spawns and manages OpenCode CLI subprocesses,
 * streams stdout/stderr, tracks agent stage transitions, handles
 * process lifecycle and timeouts.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';
import { loadConfig } from '../config.js';
import { OutputStreamParser, extractErrorTail, type AgentStage, type ParsedLine } from './parser.js';
import { buildPrompt, buildFileReferencePrompt } from './workflow-prompt.js';
import { createLogger } from '../logger.js';

const log = createLogger('runner');

export interface TaskOptions {
  projectDir: string;
  prompt: string;
  senderName?: string;
  model?: string;
  /** If the prompt references an uploaded file */
  uploadedFilePath?: string;
}

export interface TaskResult {
  success: boolean;
  exitCode: number | null;
  timedOut: boolean;
  stderrTail: string;
  finalStage: AgentStage;
}

export type RunnerEvent =
  | { type: 'line'; data: ParsedLine }
  | { type: 'stage'; data: AgentStage }
  | { type: 'error'; data: string }
  | { type: 'complete'; data: TaskResult };

/**
 * Manages a single OpenCode subprocess for a session.
 */
export class OpenCodeRunner extends EventEmitter {
  private process: ChildProcess | null = null;
  private parser = new OutputStreamParser();
  private config = loadConfig();
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private killed = false;
  private stderrBuffer: string[] = [];

  /**
   * Run an OpenCode task. Returns when the process completes.
   */
  async run(options: TaskOptions): Promise<TaskResult> {
    const { projectDir, prompt, senderName, model, uploadedFilePath } = options;

    // Build the full prompt
    const fullPrompt = uploadedFilePath
      ? buildFileReferencePrompt(prompt, uploadedFilePath, senderName)
      : buildPrompt(prompt, senderName);

    // Build environment variables
    const env: Record<string, string> = { ...process.env as Record<string, string> };
    if (model) {
      env.OPENCODE_MODEL = model;
    }

    const bin = this.config.opencodeBin;

    log.info({ projectDir, bin, promptLength: fullPrompt.length }, 'Spawning OpenCode');

    return new Promise<TaskResult>((resolve) => {
      this.parser.reset();
      this.killed = false;
      this.stderrBuffer = [];

      try {
        this.process = spawn(bin, [fullPrompt], {
          cwd: projectDir,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to spawn opencode';
        log.error({ err }, 'Failed to spawn OpenCode process');
        const result: TaskResult = {
          success: false,
          exitCode: null,
          timedOut: false,
          stderrTail: message,
          finalStage: 'error',
        };
        this.emit('event', { type: 'complete', data: result } satisfies RunnerEvent);
        resolve(result);
        return;
      }

      // Set timeout
      this.timeoutHandle = setTimeout(() => {
        log.warn({ projectDir }, 'Task timed out');
        this.kill();
      }, this.config.taskTimeoutMs);

      // Stream stdout line by line
      if (this.process.stdout) {
        const rl = createInterface({ input: this.process.stdout });
        rl.on('line', (line) => {
          const parsed = this.parser.parse(line);
          this.emit('event', { type: 'line', data: parsed } satisfies RunnerEvent);

          if (parsed.isStageTransition) {
            this.emit('event', { type: 'stage', data: parsed.stage } satisfies RunnerEvent);
          }
        });
      }

      // Capture stderr
      if (this.process.stderr) {
        const rl = createInterface({ input: this.process.stderr });
        rl.on('line', (line) => {
          this.stderrBuffer.push(line);
          this.emit('event', { type: 'error', data: line } satisfies RunnerEvent);
        });
      }

      // Handle process exit
      this.process.on('close', (code) => {
        if (this.timeoutHandle) {
          clearTimeout(this.timeoutHandle);
          this.timeoutHandle = null;
        }

        const result: TaskResult = {
          success: code === 0,
          exitCode: code,
          timedOut: this.killed,
          stderrTail: extractErrorTail(this.stderrBuffer.join('\n')),
          finalStage: this.parser.getCurrentStage(),
        };

        log.info({ projectDir, exitCode: code, timedOut: this.killed }, 'OpenCode process exited');

        this.process = null;
        this.emit('event', { type: 'complete', data: result } satisfies RunnerEvent);
        resolve(result);
      });

      this.process.on('error', (err) => {
        if (this.timeoutHandle) {
          clearTimeout(this.timeoutHandle);
          this.timeoutHandle = null;
        }

        const result: TaskResult = {
          success: false,
          exitCode: null,
          timedOut: false,
          stderrTail: err.message,
          finalStage: 'error',
        };

        log.error({ err }, 'OpenCode process error');
        this.process = null;
        this.emit('event', { type: 'complete', data: result } satisfies RunnerEvent);
        resolve(result);
      });
    });
  }

  /**
   * Kill the running process (cancel).
   */
  kill(): void {
    if (!this.process) return;
    this.killed = true;

    // SIGTERM first
    this.process.kill('SIGTERM');

    // Force kill after 5 seconds
    setTimeout(() => {
      if (this.process) {
        this.process.kill('SIGKILL');
      }
    }, 5000);
  }

  /**
   * Whether a task is currently running.
   */
  isRunning(): boolean {
    return this.process !== null;
  }
}
