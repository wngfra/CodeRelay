---
title: Adding Commands
description: How to add new bot commands to Nuntia, including handler method patterns, router integration, admin restrictions, and dependency injection.
---

# Adding Commands

This guide covers adding new bot commands to Nuntia.

## Approach

There are two options:

1. **Add to an existing command module** — if the command fits an existing category (project, model, session, git, file)
2. **Create a new command module** — if it represents a new category

## Option 1: Add to an Existing Module

### Step 1: Add the Handler Method

In the appropriate command file (e.g., `src/commands/project.ts`):

```typescript
async handleMyCommand(
  msg: IncomingMessage,
  transport: TransportAdapter,
  args: string,  // command arguments (everything after /mycommand)
): Promise<void> {
  // 1. Get project directory or session state
  const projectDir = this.sessionManager.getProjectDir(
    msg.chatId, msg.platform, msg.isGroup,
  );

  // 2. Do the work
  const result = doSomething(projectDir, args);

  // 3. Send reply
  await transport.sendMessage({
    chatId: msg.chatId,
    text: `Result: ${result}`,
    replyToMessageId: msg.messageId,
    parseMode: 'markdown',
  });
}
```

### Step 2: Wire in the Router

In `src/commands/index.ts`, add a case to the `handle()` switch:

```typescript
case 'mycommand':
  await this.projectCmds.handleMyCommand(msg, transport, args);
  break;
```

### Step 3: Add to Help Text

In `ProjectCommands.handleHelp()`, add the command to the help output:

```typescript
'`/mycommand <args>` — Description of what it does',
```

## Option 2: Create a New Command Module

### Step 1: Create the Module File

Create `src/commands/mymodule.ts`:

```typescript
import type { SessionManager } from '../session/manager.js';
import type { IncomingMessage, TransportAdapter } from '../transport/types.js';

export class MyModuleCommands {
  constructor(private sessionManager: SessionManager) {}

  async handleFoo(
    msg: IncomingMessage,
    transport: TransportAdapter,
    args: string,
  ): Promise<void> {
    // Implementation
    await transport.sendMessage({
      chatId: msg.chatId,
      text: 'Done!',
      replyToMessageId: msg.messageId,
    });
  }

  async handleBar(
    msg: IncomingMessage,
    transport: TransportAdapter,
  ): Promise<void> {
    // Implementation
  }
}
```

### Step 2: Register in the Router

In `src/commands/index.ts`:

```typescript
// Import
import { MyModuleCommands } from './mymodule.js';

// In constructor
this.myModuleCmds = new MyModuleCommands(ctx.sessionManager);

// In handle() switch
case 'foo':
  await this.myModuleCmds.handleFoo(msg, transport, args);
  break;
case 'bar':
  await this.myModuleCmds.handleBar(msg, transport);
  break;
```

### Step 3: Add Admin Restriction (if needed)

If the command should require admin in groups, add it to the `ADMIN_COMMANDS` set:

```typescript
const ADMIN_COMMANDS = new Set(['model', 'apikey', 'new', 'switch', 'foo']);
```

## Handler Pattern

All command handlers follow this pattern:

```typescript
async handleX(
  msg: IncomingMessage,        // The incoming message
  transport: TransportAdapter, // Transport to reply through
  args?: string,               // Parsed command arguments
): Promise<void>
```

### Guidelines

1. **Always reply** — send at least one message back to the user
2. **Validate args** — if required args are missing, reply with usage example
3. **Don't throw** — catch errors and send error messages to chat
4. **Use parseMode** — set to `'markdown'` for formatted output
5. **Reply to message** — set `replyToMessageId: msg.messageId` for context
6. **Log** — use `createLogger` for operational visibility

### Example: Validated Args

```typescript
async handleFoo(msg: IncomingMessage, transport: TransportAdapter, args: string): Promise<void> {
  if (!args) {
    await transport.sendMessage({
      chatId: msg.chatId,
      text: 'Usage: `/foo <required-arg>`',
      replyToMessageId: msg.messageId,
      parseMode: 'markdown',
    });
    return;
  }

  // ... proceed with args
}
```

## Available Dependencies

Command modules can access these via constructor injection:

| Dependency | Use For |
|-----------|---------|
| `SessionManager` | Project dirs, session state, queue, authorization |
| `GitManager` | Branch, commit, push, diff operations |
| `FileHandler` | File listing, read, delete |
| `Map<string, OpenCodeRunner>` | Check/kill running tasks |

For other services (like `crypto/keystore.ts`), import them directly.
