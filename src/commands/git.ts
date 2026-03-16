/**
 * Git commands: /branches, /checkout, /push, /diff
 */

import type { SessionManager } from '../session/manager.js';
import type { GitManager } from '../git/manager.js';
import type { IncomingMessage, TransportAdapter } from '../transport/types.js';

export class GitCommands {
  constructor(
    private sessionManager: SessionManager,
    private gitManager: GitManager,
  ) {}

  async handleBranches(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const projectDir = this.sessionManager.getProjectDir(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );

    const { current, all } = await this.gitManager.listBranches(projectDir);

    const list = all
      .map((b) => `${b === current ? '→ ' : '  '}\`${b}\`${b === current ? ' (current)' : ''}`)
      .join('\n');

    await transport.sendMessage({
      chatId: msg.chatId,
      text: `*Branches:*\n${list}`,
      replyToMessageId: msg.messageId,
      parseMode: 'markdown',
    });
  }

  async handleCheckout(
    msg: IncomingMessage,
    transport: TransportAdapter,
    branchName: string,
  ): Promise<void> {
    if (!branchName) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'Usage: `/checkout <branch-name>`',
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

    const success = await this.gitManager.checkout(projectDir, branchName);

    if (success) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: `Switched to branch: \`${branchName}\``,
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
    } else {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: `Failed to checkout branch \`${branchName}\`. Use \`/branches\` to see available branches.`,
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
    }
  }

  async handlePush(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const projectDir = this.sessionManager.getProjectDir(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );

    const result = await this.gitManager.push(projectDir);

    await transport.sendMessage({
      chatId: msg.chatId,
      text: result.success
        ? `Pushed successfully: ${result.message}`
        : `Push failed: ${result.message}`,
      replyToMessageId: msg.messageId,
    });
  }

  async handleDiff(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const projectDir = this.sessionManager.getProjectDir(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );

    const diff = await this.gitManager.getDiff(projectDir);

    const maxLen = 4000;
    const truncated = diff.length > maxLen
      ? diff.slice(0, maxLen) + '\n\n[truncated]'
      : diff;

    await transport.sendMessage({
      chatId: msg.chatId,
      text: `\`\`\`diff\n${truncated}\n\`\`\``,
      replyToMessageId: msg.messageId,
      parseMode: 'markdown',
    });
  }
}
