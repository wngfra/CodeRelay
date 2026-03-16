# Transport Types

**File:** `src/transport/types.ts`

Platform-agnostic interfaces that both the Telegram and WhatsApp adapters implement. This is the contract for adding new transports.

## Types

### `Platform`

```typescript
type Platform = 'telegram' | 'whatsapp';
```

### `MessageHandler`

```typescript
type MessageHandler = (msg: IncomingMessage) => Promise<void>;
```

Callback function registered via `TransportAdapter.onMessage()`.

## Interfaces

### `IncomingMessage`

Represents a message received from any platform.

```typescript
interface IncomingMessage {
  messageId: string;           // Platform-specific message ID
  chatId: string;              // Session key (chat/conversation ID)
  senderName: string;          // Display name of the sender
  senderId: string;            // Platform user ID
  text: string;                // Message text (empty string if file-only)
  platform: Platform;          // 'telegram' | 'whatsapp'
  isGroup: boolean;            // Whether this is a group/channel chat
  file?: IncomingFile;         // Attached file, if any
  replyToMessageId?: string;   // ID of the message being replied to
}
```

### `IncomingFile`

Represents an attached file on an incoming message.

```typescript
interface IncomingFile {
  fileName: string;            // Original filename
  mimeType: string;            // MIME type (e.g., 'image/png')
  sizeBytes: number;           // File size in bytes
  download(): Promise<Buffer>; // Lazy download — call to fetch file content
}
```

::: info Lazy Downloads
The `download()` function is not called until the file is actually needed. This avoids downloading files that exceed the size limit.
:::

### `OutgoingMessage`

Message to send to a chat.

```typescript
interface OutgoingMessage {
  chatId: string;
  text: string;
  editMessageId?: string;      // Edit existing message (Telegram only)
  replyToMessageId?: string;   // Send as reply to this message
  parseMode?: 'markdown' | 'html' | 'plain';
}
```

When `editMessageId` is set on Telegram, the adapter calls `editMessageText` instead of `sendMessage`. On WhatsApp, this field is ignored (no edit capability).

### `OutgoingFile`

File to send to a chat.

```typescript
interface OutgoingFile {
  chatId: string;
  filePath: string;            // Absolute path on disk
  fileName: string;            // Display name in chat
  caption?: string;            // Optional caption text
  replyToMessageId?: string;
}
```

### `TransportAdapter`

The interface that every transport adapter must implement.

```typescript
interface TransportAdapter {
  readonly platform: Platform;

  start(): Promise<void>;
  stop(): Promise<void>;
  sendMessage(msg: OutgoingMessage): Promise<string>;
  sendFile(file: OutgoingFile): Promise<string>;
  deleteMessage(chatId: string, messageId: string): Promise<void>;
  onMessage(handler: MessageHandler): void;
  isAdmin(chatId: string, userId: string): Promise<boolean>;
}
```

| Method | Returns | Description |
|--------|---------|-------------|
| `start()` | `Promise<void>` | Start listening for messages |
| `stop()` | `Promise<void>` | Graceful shutdown |
| `sendMessage(msg)` | `Promise<string>` | Send or edit a message. Returns sent message ID |
| `sendFile(file)` | `Promise<string>` | Send a file attachment. Returns sent message ID |
| `deleteMessage(chatId, messageId)` | `Promise<void>` | Delete a message (best-effort) |
| `onMessage(handler)` | `void` | Register the incoming message callback |
| `isAdmin(chatId, userId)` | `Promise<boolean>` | Check if a user is admin in a group chat |
