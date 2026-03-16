/**
 * Platform-agnostic transport types.
 * Both Telegram and WhatsApp adapters implement these interfaces.
 */

export type Platform = 'telegram' | 'whatsapp';

export interface IncomingMessage {
  /** Unique message ID from the platform */
  messageId: string;
  /** Chat/conversation identifier — used as session key */
  chatId: string;
  /** Display name of the sender */
  senderName: string;
  /** Sender's user ID on the platform */
  senderId: string;
  /** Text content (empty string if file-only) */
  text: string;
  /** Platform origin */
  platform: Platform;
  /** Whether the chat is a group/channel */
  isGroup: boolean;
  /** File attachment, if any */
  file?: IncomingFile;
  /** Original message ID this is a reply to, if any */
  replyToMessageId?: string;
}

export interface IncomingFile {
  /** Original filename */
  fileName: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Async function to download file contents */
  download: () => Promise<Buffer>;
}

export interface OutgoingMessage {
  chatId: string;
  text: string;
  /** If set, edit this message ID instead of sending a new one */
  editMessageId?: string;
  /** If set, send as a reply to this message ID */
  replyToMessageId?: string;
  /** Parse mode for text */
  parseMode?: 'markdown' | 'html' | 'plain';
}

export interface OutgoingFile {
  chatId: string;
  filePath: string;
  fileName: string;
  caption?: string;
  replyToMessageId?: string;
}

export interface TransportAdapter {
  readonly platform: Platform;

  /** Start listening for messages */
  start(): Promise<void>;

  /** Stop the adapter gracefully */
  stop(): Promise<void>;

  /** Send a text message; returns the sent message ID */
  sendMessage(msg: OutgoingMessage): Promise<string>;

  /** Send a file; returns the sent message ID */
  sendFile(file: OutgoingFile): Promise<string>;

  /** Delete a message (best-effort) */
  deleteMessage(chatId: string, messageId: string): Promise<void>;

  /** Register a handler for incoming messages */
  onMessage(handler: MessageHandler): void;

  /** Check if a user is an admin in a group chat */
  isAdmin(chatId: string, userId: string): Promise<boolean>;
}

export type MessageHandler = (msg: IncomingMessage) => Promise<void>;
