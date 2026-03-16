/**
 * Telegram Bot adapter using grammY.
 * Handles message receive/send, file downloads, rate limiting,
 * message editing for live status updates, and admin checks.
 */

import { Bot, InputFile, type Context } from 'grammy';
import fs from 'node:fs';
import path from 'node:path';
import type {
  TransportAdapter,
  IncomingMessage,
  OutgoingMessage,
  OutgoingFile,
  MessageHandler,
  Platform,
} from './types.js';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';

const log = createLogger('telegram');

/** Minimum interval between outgoing messages per chat (ms) */
const SEND_THROTTLE_MS = 2000;

export class TelegramAdapter implements TransportAdapter {
  readonly platform: Platform = 'telegram';
  private bot: Bot;
  private handler: MessageHandler | null = null;
  private lastSendTime: Map<string, number> = new Map();

  constructor() {
    const config = loadConfig();
    this.bot = new Bot(config.telegramBotToken);
  }

  async start(): Promise<void> {
    // Register message handler
    this.bot.on('message', async (ctx) => {
      if (!this.handler) return;

      try {
        const msg = await this.contextToMessage(ctx);
        if (msg) {
          await this.handler(msg);
        }
      } catch (err) {
        log.error({ err }, 'Error handling Telegram message');
      }
    });

    // Start polling
    this.bot.start({
      onStart: () => log.info('Telegram bot started (long polling)'),
    });

    log.info('Telegram adapter initialized');
  }

  async stop(): Promise<void> {
    this.bot.stop();
    log.info('Telegram adapter stopped');
  }

  private async contextToMessage(ctx: Context): Promise<IncomingMessage | null> {
    const msg = ctx.message;
    if (!msg) return null;

    const chatId = String(msg.chat.id);
    const senderId = String(msg.from?.id || '');
    const senderName = msg.from
      ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ')
      : 'Unknown';
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
    const text = msg.text || msg.caption || '';

    const incoming: IncomingMessage = {
      messageId: String(msg.message_id),
      chatId,
      senderId,
      senderName,
      text,
      platform: 'telegram',
      isGroup,
      replyToMessageId: msg.reply_to_message
        ? String(msg.reply_to_message.message_id)
        : undefined,
    };

    // Handle file attachments
    const doc = msg.document;
    const photo = msg.photo;

    if (doc) {
      const file = await ctx.getFile();
      incoming.file = {
        fileName: doc.file_name || 'document',
        mimeType: doc.mime_type || 'application/octet-stream',
        sizeBytes: doc.file_size || 0,
        download: async () => {
          const filePath = file.file_path;
          if (!filePath) throw new Error('No file path from Telegram');
          const url = `https://api.telegram.org/file/bot${loadConfig().telegramBotToken}/${filePath}`;
          const response = await fetch(url);
          return Buffer.from(await response.arrayBuffer());
        },
      };
    } else if (photo && photo.length > 0) {
      // Get the largest photo
      const largest = photo[photo.length - 1];
      const file = await ctx.api.getFile(largest.file_id);
      incoming.file = {
        fileName: `photo_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: largest.file_size || 0,
        download: async () => {
          const filePath = file.file_path;
          if (!filePath) throw new Error('No file path from Telegram');
          const url = `https://api.telegram.org/file/bot${loadConfig().telegramBotToken}/${filePath}`;
          const response = await fetch(url);
          return Buffer.from(await response.arrayBuffer());
        },
      };
    }

    return incoming;
  }

  async sendMessage(msg: OutgoingMessage): Promise<string> {
    await this.throttle(msg.chatId);

    try {
      if (msg.editMessageId) {
        // Edit existing message
        const result = await this.bot.api.editMessageText(
          msg.chatId,
          parseInt(msg.editMessageId, 10),
          msg.text,
          {
            parse_mode: msg.parseMode === 'markdown' ? 'MarkdownV2' : undefined,
          },
        );
        return typeof result === 'object' && 'message_id' in result
          ? String(result.message_id)
          : msg.editMessageId;
      }

      // Send new message
      const result = await this.bot.api.sendMessage(msg.chatId, msg.text, {
        parse_mode: msg.parseMode === 'markdown' ? 'MarkdownV2' : undefined,
        reply_parameters: msg.replyToMessageId
          ? { message_id: parseInt(msg.replyToMessageId, 10) }
          : undefined,
      });

      return String(result.message_id);
    } catch (err) {
      // If MarkdownV2 fails, retry without parse mode
      if (msg.parseMode === 'markdown') {
        log.warn({ err }, 'MarkdownV2 send failed, retrying as plain text');
        return this.sendMessage({ ...msg, parseMode: 'plain' });
      }
      throw err;
    }
  }

  async sendFile(file: OutgoingFile): Promise<string> {
    await this.throttle(file.chatId);

    const result = await this.bot.api.sendDocument(
      file.chatId,
      new InputFile(fs.createReadStream(file.filePath), file.fileName),
      {
        caption: file.caption,
        reply_parameters: file.replyToMessageId
          ? { message_id: parseInt(file.replyToMessageId, 10) }
          : undefined,
      },
    );

    return String(result.message_id);
  }

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    try {
      await this.bot.api.deleteMessage(chatId, parseInt(messageId, 10));
    } catch (err) {
      log.warn({ chatId, messageId, err }, 'Failed to delete message');
    }
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async isAdmin(chatId: string, userId: string): Promise<boolean> {
    try {
      const member = await this.bot.api.getChatMember(chatId, parseInt(userId, 10));
      return member.status === 'creator' || member.status === 'administrator';
    } catch {
      return false;
    }
  }

  /**
   * Throttle outgoing messages to avoid Telegram rate limits.
   */
  private async throttle(chatId: string): Promise<void> {
    const now = Date.now();
    const lastSend = this.lastSendTime.get(chatId) || 0;
    const elapsed = now - lastSend;

    if (elapsed < SEND_THROTTLE_MS) {
      await new Promise((resolve) => setTimeout(resolve, SEND_THROTTLE_MS - elapsed));
    }

    this.lastSendTime.set(chatId, Date.now());
  }
}
