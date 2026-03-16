/**
 * Project management commands: /new, /switch, /projects, /files, /cat, /start, /help
 */

import type { SessionManager } from '../session/manager.js';
import type { FileHandler } from '../files/handler.js';
import type { GitManager } from '../git/manager.js';
import type { IncomingMessage, TransportAdapter } from '../transport/types.js';

export class ProjectCommands {
  constructor(
    private sessionManager: SessionManager,
    private fileHandler: FileHandler,
    private gitManager: GitManager,
  ) {}

  async handleStart(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const session = this.sessionManager.ensureSession(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );

    const projectDir = this.sessionManager.getProjectDir(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );

    // Initialize git repo
    await this.gitManager.initRepo(projectDir);

    await transport.sendMessage({
      chatId: msg.chatId,
      text: [
        'Welcome to CodeRelay!',
        '',
        `Active project: \`${session.activeProject}\``,
        `Model: \`${session.model}\``,
        '',
        'Send any message to start coding, or use /help for commands.',
      ].join('\n'),
      replyToMessageId: msg.messageId,
      parseMode: msg.platform === 'telegram' ? 'markdown' : 'plain',
    });
  }

  async handleHelp(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const commands = [
      '*CodeRelay Commands*',
      '',
      '`/start` — Initialize bot',
      '`/help` — Show this help',
      '`/new <name>` — Create new project',
      '`/switch <name>` — Switch project',
      '`/projects` — List projects',
      '`/files` — List project files',
      '`/cat <path>` — View file contents',
      '`/status` — Session status',
      '`/model <name>` — Switch model',
      '`/models` — List models',
      '`/apikey <provider> <key>` — Set API key',
      '`/cancel` — Cancel running task',
      '`/clear` — Clear session state',
      '`/branches` — List git branches',
      '`/checkout <branch>` — Switch branch',
      '`/push` — Push to remote',
      '`/diff` — Show diff',
      '`/uploads` — List uploads',
      '`/rm <path>` — Delete file',
    ];

    await transport.sendMessage({
      chatId: msg.chatId,
      text: commands.join('\n'),
      replyToMessageId: msg.messageId,
      parseMode: msg.platform === 'telegram' ? 'markdown' : 'plain',
    });
  }

  async handleNew(
    msg: IncomingMessage,
    transport: TransportAdapter,
    projectName: string,
  ): Promise<void> {
    if (!projectName) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'Usage: `/new <project-name>`',
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
      return;
    }

    const projectDir = this.sessionManager.createProject(
      msg.chatId,
      msg.platform,
      msg.isGroup,
      projectName,
    );

    await this.gitManager.initRepo(projectDir);

    await transport.sendMessage({
      chatId: msg.chatId,
      text: `Created and switched to project: \`${projectName}\``,
      replyToMessageId: msg.messageId,
      parseMode: 'markdown',
    });
  }

  async handleSwitch(
    msg: IncomingMessage,
    transport: TransportAdapter,
    projectName: string,
  ): Promise<void> {
    if (!projectName) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'Usage: `/switch <project-name>`',
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
      return;
    }

    const result = this.sessionManager.switchProject(
      msg.chatId,
      msg.platform,
      msg.isGroup,
      projectName,
    );

    if (result) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: `Switched to project: \`${projectName}\``,
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
    } else {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: `Project \`${projectName}\` not found. Use \`/projects\` to list available projects.`,
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
    }
  }

  async handleProjects(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const projects = this.sessionManager.listProjects(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );
    const session = this.sessionManager.getSession(msg.chatId);
    const active = session?.activeProject || 'default';

    if (projects.length === 0) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'No projects found. Use `/new <name>` to create one.',
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
      return;
    }

    const list = projects
      .map((p) => `${p === active ? '→ ' : '  '}\`${p}\`${p === active ? ' (active)' : ''}`)
      .join('\n');

    await transport.sendMessage({
      chatId: msg.chatId,
      text: `*Projects:*\n${list}`,
      replyToMessageId: msg.messageId,
      parseMode: 'markdown',
    });
  }

  async handleFiles(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const projectDir = this.sessionManager.getProjectDir(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );

    const files = this.fileHandler.listFiles(projectDir);

    if (files.length === 0) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'Project directory is empty.',
        replyToMessageId: msg.messageId,
      });
      return;
    }

    await transport.sendMessage({
      chatId: msg.chatId,
      text: `\`\`\`\n${files.join('\n')}\n\`\`\``,
      replyToMessageId: msg.messageId,
      parseMode: 'markdown',
    });
  }

  async handleCat(
    msg: IncomingMessage,
    transport: TransportAdapter,
    filePath: string,
  ): Promise<void> {
    if (!filePath) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'Usage: `/cat <file-path>`',
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
      return;
    }

    const projectDir = this.sessionManager.getProjectDir(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );

    const content = this.fileHandler.readFile(projectDir, filePath);

    if (content === null) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: `File not found: \`${filePath}\``,
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
      return;
    }

    // Truncate if too long
    const maxLen = 4000;
    const truncated = content.length > maxLen
      ? content.slice(0, maxLen) + '\n\n[truncated — file too large for chat]'
      : content;

    // If small enough, send as code block; else send as document
    if (truncated.length < 4000) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: `\`\`\`\n${truncated}\n\`\`\``,
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
    } else {
      const absolutePath = `${projectDir}/${filePath}`;
      await transport.sendFile({
        chatId: msg.chatId,
        filePath: absolutePath,
        fileName: filePath.split('/').pop() || 'file',
        replyToMessageId: msg.messageId,
      });
    }
  }
}
