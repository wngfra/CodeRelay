/**
 * Session commands: /status, /cancel, /clear
 */

import type { SessionManager } from '../session/manager.js';
import type { OpenCodeRunner } from '../runner/opencode.js';
import type { IncomingMessage, TransportAdapter } from '../transport/types.js';

export class SessionCommands {
  constructor(
    private sessionManager: SessionManager,
    private runners: Map<string, OpenCodeRunner>,
  ) {}

  async handleStatus(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const session = this.sessionManager.getSession(msg.chatId);

    if (!session) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'No active session. Send `/start` to initialize.',
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
      return;
    }

    const runner = this.runners.get(msg.chatId);
    const taskStatus = session.taskRunning
      ? `Running: ${session.taskDescription}`
      : 'Idle';

    const lines = [
      '*Session Status*',
      '',
      `Project: \`${session.activeProject}\``,
      `Model: \`${session.model}\``,
      `Task: ${taskStatus}`,
      `Platform: ${session.platform}`,
      `Last active: ${session.lastActiveAt}`,
    ];

    const queue = this.sessionManager.getQueue(msg.chatId);
    if (queue.length > 0) {
      lines.push(`Queue: ${queue.length} pending request(s)`);
    }

    await transport.sendMessage({
      chatId: msg.chatId,
      text: lines.join('\n'),
      replyToMessageId: msg.messageId,
      parseMode: 'markdown',
    });
  }

  async handleCancel(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const runner = this.runners.get(msg.chatId);

    if (!runner || !runner.isRunning()) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'No task is currently running.',
        replyToMessageId: msg.messageId,
      });
      return;
    }

    runner.kill();
    this.sessionManager.setTaskComplete(msg.chatId);

    await transport.sendMessage({
      chatId: msg.chatId,
      text: 'Task cancelled.',
      replyToMessageId: msg.messageId,
    });
  }

  async handleClear(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const session = this.sessionManager.getSession(msg.chatId);

    if (session?.taskRunning) {
      const runner = this.runners.get(msg.chatId);
      if (runner) runner.kill();
    }

    this.sessionManager.setTaskComplete(msg.chatId);

    await transport.sendMessage({
      chatId: msg.chatId,
      text: 'Session state cleared. Project files are preserved.',
      replyToMessageId: msg.messageId,
    });
  }
}
