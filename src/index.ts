/**
 * CodeRelay — Entry Point
 *
 * Telegram + WhatsApp to OpenCode multi-agent coding interface.
 * Initializes all modules, wires up message handling, manages the
 * task execution lifecycle with streaming output.
 */

import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { SessionManager } from './session/manager.js';
import { GitManager } from './git/manager.js';
import { FileHandler } from './files/handler.js';
import { OpenCodeRunner, type RunnerEvent, type TaskResult } from './runner/opencode.js';
import { CommandRouter } from './commands/index.js';
import { TelegramAdapter } from './transport/telegram.js';
import { WhatsAppAdapter } from './transport/whatsapp.js';
import type { IncomingMessage, TransportAdapter, Platform } from './transport/types.js';
import { stageLabel, type ParsedLine } from './runner/parser.js';
import * as telegramFmt from './formatter/telegram.js';
import * as whatsappFmt from './formatter/whatsapp.js';
import { checkDiskSpace } from './utils.js';

const log = createLogger('main');

class CodeRelay {
  private config = loadConfig();
  private sessionManager = new SessionManager();
  private gitManager = new GitManager();
  private fileHandler = new FileHandler();
  private runners = new Map<string, OpenCodeRunner>();
  private transports: TransportAdapter[] = [];
  private commandRouter: CommandRouter;

  constructor() {
    this.commandRouter = new CommandRouter({
      sessionManager: this.sessionManager,
      gitManager: this.gitManager,
      fileHandler: this.fileHandler,
      runners: this.runners,
    });
  }

  async start(): Promise<void> {
    log.info('Starting CodeRelay...');

    // Initialize Telegram
    const telegram = new TelegramAdapter();
    telegram.onMessage((msg) => this.handleMessage(msg, telegram));
    this.transports.push(telegram);
    await telegram.start();

    // Initialize WhatsApp if enabled
    if (this.config.whatsappEnabled) {
      const whatsapp = new WhatsAppAdapter();
      whatsapp.onMessage((msg) => this.handleMessage(msg, whatsapp));
      this.transports.push(whatsapp);
      await whatsapp.start();
    }

    // Graceful shutdown
    const shutdown = async () => {
      log.info('Shutting down...');

      // Kill all running processes
      for (const [chatId, runner] of this.runners) {
        if (runner.isRunning()) {
          log.info({ chatId }, 'Killing running task');
          runner.kill();
        }
      }

      // Stop transports
      for (const transport of this.transports) {
        await transport.stop();
      }

      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    log.info('CodeRelay is running');
  }

  private async handleMessage(
    msg: IncomingMessage,
    transport: TransportAdapter,
  ): Promise<void> {
    const { chatId, senderId, senderName, text, platform, isGroup } = msg;

    // Authorization check
    if (!this.sessionManager.isAllowed(chatId) && !this.sessionManager.isAllowed(senderId)) {
      log.debug({ chatId, senderId }, 'Unauthorized message ignored');
      return;
    }

    // Ensure session exists
    this.sessionManager.ensureSession(chatId, platform, isGroup);

    // Handle file uploads
    if (msg.file) {
      await this.handleFileUpload(msg, transport);
      // If there's no caption text, we're done (FR-84)
      if (!text) return;
    }

    // Handle commands
    if (text.startsWith('/')) {
      const handled = await this.commandRouter.handle(msg, transport);
      if (handled) return;
    }

    // Regular text — send to OpenCode
    if (text.trim()) {
      await this.executeTask(msg, transport);
    }
  }

  private async handleFileUpload(
    msg: IncomingMessage,
    transport: TransportAdapter,
  ): Promise<void> {
    if (!msg.file) return;

    const projectDir = this.sessionManager.getProjectDir(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );

    try {
      const data = await msg.file.download();
      const result = await this.fileHandler.saveUpload(
        projectDir,
        msg.file.fileName,
        data,
      );

      if (result.success) {
        await transport.sendMessage({
          chatId: msg.chatId,
          text: `Saved to \`${result.relativePath}\``,
          replyToMessageId: msg.messageId,
          parseMode: 'markdown',
        });
      } else {
        await transport.sendMessage({
          chatId: msg.chatId,
          text: result.error || 'Failed to save file',
          replyToMessageId: msg.messageId,
        });
      }
    } catch (err) {
      log.error({ err }, 'File upload handling error');
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'Failed to process file upload.',
        replyToMessageId: msg.messageId,
      });
    }
  }

  private async executeTask(
    msg: IncomingMessage,
    transport: TransportAdapter,
  ): Promise<void> {
    const session = this.sessionManager.getSession(msg.chatId);
    if (!session) return;

    // Check if a task is already running — queue it
    const existingRunner = this.runners.get(msg.chatId);
    if (existingRunner?.isRunning()) {
      const position = this.sessionManager.enqueue(msg.chatId, {
        prompt: msg.text,
        senderName: msg.senderName,
        resolve: () => {},
        reject: () => {},
      });

      await transport.sendMessage({
        chatId: msg.chatId,
        text: `Your request is #${position} in queue. Please wait...`,
        replyToMessageId: msg.messageId,
      });
      return;
    }

    // Check disk space
    const spaceOk = await checkDiskSpace(this.config.workspaceRoot);
    if (!spaceOk) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'Warning: Low disk space (<500MB free). Task may fail.',
        replyToMessageId: msg.messageId,
      });
    }

    const projectDir = this.sessionManager.getProjectDir(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );

    // Initialize git repo if needed
    await this.gitManager.initRepo(projectDir);

    // Mark task as running
    this.sessionManager.setTaskRunning(msg.chatId, msg.text.slice(0, 100));

    // Create runner
    const runner = new OpenCodeRunner();
    this.runners.set(msg.chatId, runner);

    // Send initial status
    let statusMessageId = await transport.sendMessage({
      chatId: msg.chatId,
      text: 'Processing your request...',
      replyToMessageId: msg.messageId,
    });

    // Collect output for batched updates
    let outputBuffer: ParsedLine[] = [];
    let lastUpdateTime = 0;
    const BATCH_INTERVAL = msg.platform === 'telegram' ? 2000 : 3000;

    // Handle streaming events
    runner.on('event', async (event: RunnerEvent) => {
      switch (event.type) {
        case 'stage': {
          // Stage transitions are sent immediately
          const label = msg.platform === 'telegram'
            ? telegramFmt.formatStageTransition(event.data)
            : whatsappFmt.formatStageTransition(event.data);

          if (msg.platform === 'telegram' && statusMessageId) {
            // Edit the status message on Telegram
            try {
              await transport.sendMessage({
                chatId: msg.chatId,
                text: label,
                editMessageId: statusMessageId,
              });
            } catch {
              // If edit fails, send new message
              statusMessageId = await transport.sendMessage({
                chatId: msg.chatId,
                text: label,
              });
            }
          } else {
            await transport.sendMessage({
              chatId: msg.chatId,
              text: label,
            });
          }
          break;
        }

        case 'line': {
          outputBuffer.push(event.data);
          const now = Date.now();

          // Batch output every BATCH_INTERVAL ms
          if (now - lastUpdateTime >= BATCH_INTERVAL && outputBuffer.length > 0) {
            const batchText = msg.platform === 'telegram'
              ? telegramFmt.formatOutputBatch(outputBuffer)
              : whatsappFmt.formatOutputBatch(outputBuffer);

            if (batchText.trim()) {
              if (msg.platform === 'telegram' && statusMessageId) {
                try {
                  await transport.sendMessage({
                    chatId: msg.chatId,
                    text: batchText,
                    editMessageId: statusMessageId,
                    parseMode: 'markdown',
                  });
                } catch {
                  // Ignore edit failures
                }
              } else {
                await transport.sendMessage({
                  chatId: msg.chatId,
                  text: batchText,
                });
              }
            }

            outputBuffer = [];
            lastUpdateTime = now;
          }
          break;
        }

        case 'error': {
          log.warn({ chatId: msg.chatId, error: event.data }, 'Task stderr');
          break;
        }
      }
    });

    // Run the task
    const uploadedFile = msg.file
      ? `uploads/${msg.file.fileName}`
      : undefined;

    const result = await runner.run({
      projectDir,
      prompt: msg.text,
      senderName: msg.isGroup ? msg.senderName : undefined,
      model: session.model,
      uploadedFilePath: uploadedFile,
    });

    // Task complete — commit to git
    let branchName: string | null = null;
    let filesChanged: string[] = [];

    if (result.success) {
      const commitResult = await this.gitManager.commitTask(projectDir, msg.text);
      if (commitResult) {
        branchName = commitResult.branchName;
        filesChanged = commitResult.filesChanged;
      }
    }

    // Send final summary
    const summary = msg.platform === 'telegram'
      ? telegramFmt.formatTaskSummary(branchName, filesChanged, result.success ? true : null)
      : whatsappFmt.formatTaskSummary(branchName, filesChanged, result.success ? true : null);

    if (result.success) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: summary,
        parseMode: msg.platform === 'telegram' ? 'markdown' : 'plain',
      });
    } else {
      const errorMsg = result.timedOut
        ? 'Task timed out and was cancelled.'
        : `Task failed (exit code ${result.exitCode}).`;

      let errorText = errorMsg;
      if (result.stderrTail) {
        errorText += `\n\`\`\`\n${result.stderrTail.slice(0, 2000)}\n\`\`\``;
      }

      await transport.sendMessage({
        chatId: msg.chatId,
        text: errorText,
        parseMode: 'markdown',
      });
    }

    // Mark task complete
    this.sessionManager.setTaskComplete(msg.chatId);

    // Process next item in queue
    const next = this.sessionManager.dequeue(msg.chatId);
    if (next) {
      log.info({ chatId: msg.chatId }, 'Processing next queued request');
      const syntheticMsg: IncomingMessage = {
        messageId: '',
        chatId: msg.chatId,
        senderId: '',
        senderName: next.senderName,
        text: next.prompt,
        platform: msg.platform,
        isGroup: msg.isGroup,
      };
      // Don't await — let it process in the background
      this.executeTask(syntheticMsg, transport).then(
        () => next.resolve(),
        (err) => next.reject(err instanceof Error ? err : new Error(String(err))),
      );
    }
  }
}

// Start the application
const app = new CodeRelay();
app.start().catch((err) => {
  log.fatal({ err }, 'Failed to start CodeRelay');
  process.exit(1);
});
