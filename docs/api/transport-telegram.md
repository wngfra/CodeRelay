# Telegram Adapter

**File:** `src/transport/telegram.ts`

Telegram Bot API adapter using [grammY](https://grammy.dev/). Supports long polling, message editing for live status updates, file downloads, and admin permission checks.

## Class: `TelegramAdapter`

```typescript
class TelegramAdapter implements TransportAdapter {
  readonly platform: Platform = 'telegram';
  constructor();
}
```

Reads `TELEGRAM_BOT_TOKEN` from config on construction.

### Methods

All methods from [`TransportAdapter`](/api/transport-types#transportadapter) are implemented.

#### `start()`

```typescript
async start(): Promise<void>
```

Registers the message handler and starts long polling via `bot.start()`.

#### `stop()`

```typescript
async stop(): Promise<void>
```

Calls `bot.stop()` to terminate the polling loop.

#### `sendMessage(msg)`

```typescript
async sendMessage(msg: OutgoingMessage): Promise<string>
```

- If `msg.editMessageId` is set, calls `editMessageText` to update an existing message
- If `msg.parseMode` is `'markdown'`, uses `MarkdownV2` parse mode
- On MarkdownV2 parse failure, automatically retries as plain text
- Throttled: minimum 2 seconds between sends per chat

#### `sendFile(file)`

```typescript
async sendFile(file: OutgoingFile): Promise<string>
```

Sends a file as a Telegram document using `sendDocument` with `InputFile`. Supports captions and reply-to.

#### `deleteMessage(chatId, messageId)`

```typescript
async deleteMessage(chatId: string, messageId: string): Promise<void>
```

Best-effort deletion via `bot.api.deleteMessage`. Logs a warning on failure (may lack permissions).

#### `isAdmin(chatId, userId)`

```typescript
async isAdmin(chatId: string, userId: string): Promise<boolean>
```

Checks Telegram group membership via `getChatMember`. Returns `true` for `creator` or `administrator` status.

## Message Conversion

The adapter converts Telegram messages to `IncomingMessage`:

| Telegram Field | IncomingMessage Field |
|---------------|----------------------|
| `message.chat.id` | `chatId` (as string) |
| `message.from.id` | `senderId` (as string) |
| `message.from.first_name + last_name` | `senderName` |
| `message.text \|\| message.caption` | `text` |
| `message.chat.type` (`group`/`supergroup`) | `isGroup` |
| `message.document` | `file` (with lazy download) |
| `message.photo[-1]` | `file` (largest size, as JPEG) |

## Rate Limiting

Outgoing messages are throttled to a minimum of **2 seconds** between sends per chat ID. This prevents Telegram API rate limit errors (HTTP 429).

## File Downloads

Files are downloaded via the Telegram Bot API file URL:

```
https://api.telegram.org/file/bot<token>/<file_path>
```

The `download()` function on `IncomingFile` is lazy — it only fetches when called.
