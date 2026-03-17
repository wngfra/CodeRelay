/**
 * WhatsApp adapter using @whiskeysockets/baileys.
 * Handles message receive/send, file downloads, rate limiting.
 * WhatsApp does NOT support message editing — uses incremental messages.
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
  type WAMessage,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
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

const log = createLogger('whatsapp');

/** Minimum interval between outgoing messages per chat (ms) */
const SEND_THROTTLE_MS = 3000;

export class WhatsAppAdapter implements TransportAdapter {
  readonly platform: Platform = 'whatsapp';
  private sock: WASocket | null = null;
  private handler: MessageHandler | null = null;
  private lastSendTime: Map<string, number> = new Map();
  private authDir: string;

  constructor() {
    const config = loadConfig();
    this.authDir = path.join(config.workspaceRoot, '.nuntia', 'whatsapp-auth');
  }

  async start(): Promise<void> {
    fs.mkdirSync(this.authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        log.warn({ statusCode }, 'WhatsApp connection closed');

        if (shouldReconnect) {
          log.info('Attempting WhatsApp reconnection...');
          setTimeout(() => this.start(), 5000);
        } else {
          log.error('WhatsApp logged out. Please re-authenticate.');
        }
      } else if (connection === 'open') {
        log.info('WhatsApp connection established');
      }
    });

    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      if (!this.handler) return;

      for (const waMsg of messages) {
        // Skip messages sent by us
        if (waMsg.key.fromMe) continue;

        try {
          const msg = await this.waMessageToIncoming(waMsg);
          if (msg) {
            await this.handler(msg);
          }
        } catch (err) {
          log.error({ err }, 'Error handling WhatsApp message');
        }
      }
    });

    log.info('WhatsApp adapter initialized');
  }

  async stop(): Promise<void> {
    if (this.sock) {
      this.sock.end(undefined);
      this.sock = null;
    }
    log.info('WhatsApp adapter stopped');
  }

  private async waMessageToIncoming(waMsg: WAMessage): Promise<IncomingMessage | null> {
    const chatId = waMsg.key.remoteJid;
    if (!chatId) return null;

    const isGroup = chatId.endsWith('@g.us');
    const senderId = isGroup
      ? (waMsg.key.participant || '')
      : chatId;
    const senderName = waMsg.pushName || senderId.split('@')[0];

    const messageContent = waMsg.message;
    if (!messageContent) return null;

    const text =
      messageContent.conversation ||
      messageContent.extendedTextMessage?.text ||
      messageContent.imageMessage?.caption ||
      messageContent.documentMessage?.caption ||
      '';

    const incoming: IncomingMessage = {
      messageId: waMsg.key.id || '',
      chatId,
      senderId,
      senderName,
      text,
      platform: 'whatsapp',
      isGroup,
      replyToMessageId: messageContent.extendedTextMessage?.contextInfo?.stanzaId ?? undefined,
    };

    // Handle file attachments
    if (messageContent.documentMessage) {
      const doc = messageContent.documentMessage;
      incoming.file = {
        fileName: doc.fileName || 'document',
        mimeType: doc.mimetype || 'application/octet-stream',
        sizeBytes: Number(doc.fileLength) || 0,
        download: async () => {
          const buffer = await downloadMediaMessage(waMsg, 'buffer', {});
          return buffer as Buffer;
        },
      };
    } else if (messageContent.imageMessage) {
      incoming.file = {
        fileName: `image_${Date.now()}.jpg`,
        mimeType: messageContent.imageMessage.mimetype || 'image/jpeg',
        sizeBytes: Number(messageContent.imageMessage.fileLength) || 0,
        download: async () => {
          const buffer = await downloadMediaMessage(waMsg, 'buffer', {});
          return buffer as Buffer;
        },
      };
    }

    return incoming;
  }

  async sendMessage(msg: OutgoingMessage): Promise<string> {
    if (!this.sock) throw new Error('WhatsApp not connected');
    await this.throttle(msg.chatId);

    // WhatsApp doesn't support editing — always send new
    const result = await this.sock.sendMessage(msg.chatId, {
      text: msg.text,
    }, {
      quoted: msg.replyToMessageId ? { key: { id: msg.replyToMessageId, remoteJid: msg.chatId } } as any : undefined,
    });

    return result?.key?.id || '';
  }

  async sendFile(file: OutgoingFile): Promise<string> {
    if (!this.sock) throw new Error('WhatsApp not connected');
    await this.throttle(file.chatId);

    const buffer = fs.readFileSync(file.filePath);
    const mimeType = this.guessMimeType(file.fileName);

    const result = await this.sock.sendMessage(file.chatId, {
      document: buffer,
      fileName: file.fileName,
      mimetype: mimeType,
      caption: file.caption,
    });

    return result?.key?.id || '';
  }

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    // WhatsApp delete is unreliable — log warning
    log.warn({ chatId, messageId }, 'WhatsApp message deletion not reliably supported');
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async isAdmin(chatId: string, userId: string): Promise<boolean> {
    if (!this.sock) return false;

    try {
      const metadata = await this.sock.groupMetadata(chatId);
      const participant = metadata.participants.find((p) => p.id === userId);
      return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch {
      return false;
    }
  }

  private async throttle(chatId: string): Promise<void> {
    const now = Date.now();
    const lastSend = this.lastSendTime.get(chatId) || 0;
    const elapsed = now - lastSend;

    if (elapsed < SEND_THROTTLE_MS) {
      await new Promise((resolve) => setTimeout(resolve, SEND_THROTTLE_MS - elapsed));
    }

    this.lastSendTime.set(chatId, Date.now());
  }

  private guessMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const types: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.py': 'text/x-python',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    return types[ext] || 'application/octet-stream';
  }
}
