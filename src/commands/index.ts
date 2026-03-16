/**
 * Command Router — parses incoming messages for bot commands
 * and dispatches to the appropriate handler module.
 */

import type { IncomingMessage, TransportAdapter } from '../transport/types.js';
import type { SessionManager } from '../session/manager.js';
import type { OpenCodeRunner } from '../runner/opencode.js';
import type { GitManager } from '../git/manager.js';
import type { FileHandler } from '../files/handler.js';
import { ProjectCommands } from './project.js';
import { ModelCommands } from './model.js';
import { SessionCommands } from './session.js';
import { GitCommands } from './git.js';
import { FileCommands } from './file.js';
import { createLogger } from '../logger.js';

const log = createLogger('commands');

/** Commands that require admin in group chats */
const ADMIN_COMMANDS = new Set(['model', 'apikey', 'new', 'switch']);

export interface CommandContext {
  sessionManager: SessionManager;
  gitManager: GitManager;
  fileHandler: FileHandler;
  runners: Map<string, OpenCodeRunner>;
}

export class CommandRouter {
  private projectCmds: ProjectCommands;
  private modelCmds: ModelCommands;
  private sessionCmds: SessionCommands;
  private gitCmds: GitCommands;
  private fileCmds: FileCommands;

  constructor(private ctx: CommandContext) {
    this.projectCmds = new ProjectCommands(
      ctx.sessionManager,
      ctx.fileHandler,
      ctx.gitManager,
    );
    this.modelCmds = new ModelCommands(ctx.sessionManager);
    this.sessionCmds = new SessionCommands(ctx.sessionManager, ctx.runners);
    this.gitCmds = new GitCommands(ctx.sessionManager, ctx.gitManager);
    this.fileCmds = new FileCommands(ctx.sessionManager, ctx.fileHandler);
  }

  /**
   * Check if a message text is a bot command.
   */
  isCommand(text: string): boolean {
    return text.startsWith('/');
  }

  /**
   * Parse a command message into command name and arguments.
   */
  parseCommand(text: string): { command: string; args: string } {
    const trimmed = text.trim();
    // Handle /command@botname format
    const match = trimmed.match(/^\/(\w+)(?:@\w+)?\s*(.*)/s);
    if (!match) return { command: '', args: '' };
    return { command: match[1].toLowerCase(), args: match[2].trim() };
  }

  /**
   * Route and execute a command. Returns true if the message was a command.
   */
  async handle(
    msg: IncomingMessage,
    transport: TransportAdapter,
  ): Promise<boolean> {
    if (!this.isCommand(msg.text)) return false;

    const { command, args } = this.parseCommand(msg.text);
    if (!command) return false;

    // Check admin permission for restricted commands in groups
    if (msg.isGroup && ADMIN_COMMANDS.has(command)) {
      const isAdmin = await transport.isAdmin(msg.chatId, msg.senderId);
      if (!isAdmin) {
        await transport.sendMessage({
          chatId: msg.chatId,
          text: 'This command requires admin permissions in group chats.',
          replyToMessageId: msg.messageId,
        });
        return true;
      }
    }

    log.info({ command, chatId: msg.chatId, sender: msg.senderName }, 'Handling command');

    switch (command) {
      case 'start':
        await this.projectCmds.handleStart(msg, transport);
        break;
      case 'help':
        await this.projectCmds.handleHelp(msg, transport);
        break;
      case 'new':
        await this.projectCmds.handleNew(msg, transport, args);
        break;
      case 'switch':
        await this.projectCmds.handleSwitch(msg, transport, args);
        break;
      case 'projects':
        await this.projectCmds.handleProjects(msg, transport);
        break;
      case 'files':
        await this.projectCmds.handleFiles(msg, transport);
        break;
      case 'cat':
        await this.projectCmds.handleCat(msg, transport, args);
        break;
      case 'model':
        await this.modelCmds.handleModel(msg, transport, args);
        break;
      case 'models':
        await this.modelCmds.handleModels(msg, transport);
        break;
      case 'apikey':
        await this.modelCmds.handleApiKey(msg, transport, args);
        break;
      case 'status':
        await this.sessionCmds.handleStatus(msg, transport);
        break;
      case 'cancel':
        await this.sessionCmds.handleCancel(msg, transport);
        break;
      case 'clear':
        await this.sessionCmds.handleClear(msg, transport);
        break;
      case 'branches':
        await this.gitCmds.handleBranches(msg, transport);
        break;
      case 'checkout':
        await this.gitCmds.handleCheckout(msg, transport, args);
        break;
      case 'push':
        await this.gitCmds.handlePush(msg, transport);
        break;
      case 'diff':
        await this.gitCmds.handleDiff(msg, transport);
        break;
      case 'uploads':
        await this.fileCmds.handleUploads(msg, transport);
        break;
      case 'rm':
        await this.fileCmds.handleRm(msg, transport, args);
        break;
      default:
        await transport.sendMessage({
          chatId: msg.chatId,
          text: `Unknown command: \`/${command}\`. Use /help for available commands.`,
          replyToMessageId: msg.messageId,
          parseMode: 'markdown',
        });
    }

    return true;
  }
}
