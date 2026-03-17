---
title: WhatsApp Adapter API
description: API reference for WhatsAppAdapter using Baileys with QR code authentication, auto-reconnection, media downloads, and group admin checks.
---

# WhatsApp Adapter

**File:** `src/transport/whatsapp.ts`

WhatsApp adapter using [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys). Supports QR code auth, auto-reconnection, media downloads, and group admin checks.

## Class: `WhatsAppAdapter`

```typescript
class WhatsAppAdapter implements TransportAdapter {
  readonly platform: Platform = 'whatsapp';
  constructor();
}
```

Auth state is stored at `<WORKSPACE_ROOT>/.nuntia/whatsapp-auth/`.

### Methods

All methods from [`TransportAdapter`](/api/transport-types#transportadapter) are implemented.

#### `start()`

```typescript
async start(): Promise<void>
```

- Creates the auth directory
- Loads multi-file auth state from disk
- Creates a Baileys WebSocket connection
- Prints QR code to terminal on first connection
- Registers connection update handler for auto-reconnect
- Saves credentials on update

#### `stop()`

```typescript
async stop(): Promise<void>
```

Calls `sock.end()` to close the WebSocket connection.

#### `sendMessage(msg)`

```typescript
async sendMessage(msg: OutgoingMessage): Promise<string>
```

- Always sends a new message (WhatsApp has no edit capability — `editMessageId` is ignored)
- Supports quoted replies via `msg.replyToMessageId`
- Throttled: minimum 3 seconds between sends per chat

#### `sendFile(file)`

```typescript
async sendFile(file: OutgoingFile): Promise<string>
```

Reads the file from disk and sends as a document with auto-detected MIME type. Supports captions.

#### `deleteMessage(chatId, messageId)`

```typescript
async deleteMessage(chatId: string, messageId: string): Promise<void>
```

Logs a warning — WhatsApp message deletion by bots is unreliable. The user is warned in `/apikey` responses to manually delete sensitive messages.

#### `isAdmin(chatId, userId)`

```typescript
async isAdmin(chatId: string, userId: string): Promise<boolean>
```

Fetches group metadata and checks if the participant has `admin` or `superadmin` status.

## Auto-Reconnection

On connection close, the adapter checks the disconnect reason:

- **Logged out** (`DisconnectReason.loggedOut`): Stops and logs an error
- **Other reasons**: Attempts reconnection after 5 seconds

## MIME Type Detection

File MIME types are guessed from extension:

| Extension | MIME Type |
|-----------|----------|
| `.pdf` | `application/pdf` |
| `.zip` | `application/zip` |
| `.tar` | `application/x-tar` |
| `.gz` | `application/gzip` |
| `.js` | `text/javascript` |
| `.ts` | `text/typescript` |
| `.py` | `text/x-python` |
| `.json` | `application/json` |
| `.txt` | `text/plain` |
| `.md` | `text/markdown` |
| `.png` | `image/png` |
| `.jpg`/`.jpeg` | `image/jpeg` |
| `.gif` | `image/gif` |
| `.svg` | `image/svg+xml` |
| _other_ | `application/octet-stream` |

## Rate Limiting

Outgoing messages are throttled to a minimum of **3 seconds** between sends per chat ID. WhatsApp has stricter rate limits than Telegram.
