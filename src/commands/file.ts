/**
 * File commands: /uploads, /rm
 */

import type { SessionManager } from '../session/manager.js';
import type { FileHandler } from '../files/handler.js';
import type { IncomingMessage, TransportAdapter } from '../transport/types.js';

export class FileCommands {
  constructor(
    private sessionManager: SessionManager,
    private fileHandler: FileHandler,
  ) {}

  async handleUploads(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const projectDir = this.sessionManager.getProjectDir(
      msg.chatId,
      msg.platform,
      msg.isGroup,
    );

    const uploads = this.fileHandler.listUploads(projectDir);

    if (uploads.length === 0) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'No files uploaded yet. Send a file to upload it to the project.',
        replyToMessageId: msg.messageId,
      });
      return;
    }

    const list = uploads.map((f) => `  \`uploads/${f}\``).join('\n');

    await transport.sendMessage({
      chatId: msg.chatId,
      text: `*Uploaded Files:*\n${list}`,
      replyToMessageId: msg.messageId,
      parseMode: 'markdown',
    });
  }

  async handleRm(
    msg: IncomingMessage,
    transport: TransportAdapter,
    filePath: string,
  ): Promise<void> {
    if (!filePath) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'Usage: `/rm <file-path>`',
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

    const deleted = this.fileHandler.deleteFile(projectDir, filePath);

    if (deleted) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: `Deleted: \`${filePath}\``,
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
    } else {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: `File not found: \`${filePath}\``,
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
    }
  }
}
