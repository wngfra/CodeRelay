# Adding a Transport

This guide walks through adding a new messaging platform adapter (e.g., Discord, Slack, Matrix).

## 1. Implement `TransportAdapter`

Create `src/transport/newtransport.ts` implementing the [`TransportAdapter`](/api/transport-types#transportadapter) interface:

```typescript
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

const log = createLogger('newtransport');

export class NewTransportAdapter implements TransportAdapter {
  readonly platform: Platform = 'newtransport' as Platform;
  private handler: MessageHandler | null = null;

  async start(): Promise<void> {
    // Initialize SDK, connect, register event listeners
    // Call this.handler(msg) when a message arrives
    log.info('NewTransport adapter started');
  }

  async stop(): Promise<void> {
    // Disconnect, clean up
  }

  async sendMessage(msg: OutgoingMessage): Promise<string> {
    // Send text message to msg.chatId
    // If msg.editMessageId is set and platform supports editing, edit instead
    // Return the sent message ID
    return 'message-id';
  }

  async sendFile(file: OutgoingFile): Promise<string> {
    // Send file attachment
    return 'message-id';
  }

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    // Best-effort deletion
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async isAdmin(chatId: string, userId: string): Promise<boolean> {
    // Check if user has admin role in the chat
    return false;
  }
}
```

## 2. Update the `Platform` Type

In `src/transport/types.ts`, add your platform:

```typescript
export type Platform = 'telegram' | 'whatsapp' | 'newtransport';
```

## 3. Convert Platform Messages

The key responsibility is converting platform-specific messages to `IncomingMessage`:

```typescript
private convertMessage(platformMsg: PlatformMessage): IncomingMessage {
  return {
    messageId: String(platformMsg.id),
    chatId: String(platformMsg.channelId),
    senderName: platformMsg.author.username,
    senderId: String(platformMsg.author.id),
    text: platformMsg.content,
    platform: 'newtransport' as Platform,
    isGroup: platformMsg.channel.type === 'group',
    file: platformMsg.attachment ? {
      fileName: platformMsg.attachment.name,
      mimeType: platformMsg.attachment.contentType,
      sizeBytes: platformMsg.attachment.size,
      download: async () => {
        const response = await fetch(platformMsg.attachment.url);
        return Buffer.from(await response.arrayBuffer());
      },
    } : undefined,
  };
}
```

## 4. Implement Rate Limiting

Add per-chat throttling appropriate for your platform's rate limits:

```typescript
private lastSendTime = new Map<string, number>();
private THROTTLE_MS = 1000; // Adjust per platform

private async throttle(chatId: string): Promise<void> {
  const now = Date.now();
  const last = this.lastSendTime.get(chatId) || 0;
  const elapsed = now - last;
  if (elapsed < this.THROTTLE_MS) {
    await new Promise(r => setTimeout(r, this.THROTTLE_MS - elapsed));
  }
  this.lastSendTime.set(chatId, Date.now());
}
```

## 5. Register in the Entry Point

In `src/index.ts`, add your adapter alongside Telegram and WhatsApp:

```typescript
// In CodeRelay.start()
if (this.config.newTransportEnabled) {
  const adapter = new NewTransportAdapter();
  adapter.onMessage((msg) => this.handleMessage(msg, adapter));
  this.transports.push(adapter);
  await adapter.start();
}
```

## 6. Add a Formatter (Optional)

If your platform has unique formatting requirements, create `src/formatter/newtransport.ts`. Otherwise, reuse the WhatsApp formatter (plain text with basic bold/code).

## 7. Add Config Variables

In `src/config.ts`, add any platform-specific config:

```typescript
newTransportEnabled: optionalEnv('NEW_TRANSPORT_ENABLED', 'false') === 'true',
newTransportToken: optionalEnv('NEW_TRANSPORT_TOKEN', ''),
```

## Checklist

- [ ] Implements all `TransportAdapter` methods
- [ ] Converts platform messages to `IncomingMessage` correctly
- [ ] Handles file attachments with lazy `download()` 
- [ ] Rate limits outgoing messages
- [ ] Handles reconnection on disconnect
- [ ] Logs with `createLogger('newtransport')`
- [ ] Admin check works for group chats
- [ ] Registered in `src/index.ts`
- [ ] Config variables added to `.env.example`
