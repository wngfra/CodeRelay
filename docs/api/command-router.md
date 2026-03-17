---
title: Command Router API
description: API reference for CommandRouter and CommandContext dispatching bot commands to handler modules with admin permission checks.
---

# Command Router

**File:** `src/commands/index.ts`

Parses incoming messages for bot commands and dispatches to the appropriate handler module.

## Interfaces

### `CommandContext`

```typescript
interface CommandContext {
  sessionManager: SessionManager;
  gitManager: GitManager;
  fileHandler: FileHandler;
  runners: Map<string, OpenCodeRunner>;
}
```

Dependency container passed to the router on construction. All command modules receive their dependencies through this context.

## Class: `CommandRouter`

```typescript
class CommandRouter {
  constructor(ctx: CommandContext);
}
```

On construction, instantiates all command modules:

- `ProjectCommands` — `/start`, `/help`, `/new`, `/switch`, `/projects`, `/files`, `/cat`
- `ModelCommands` — `/model`, `/models`, `/apikey`
- `SessionCommands` — `/status`, `/cancel`, `/clear`
- `GitCommands` — `/branches`, `/checkout`, `/push`, `/diff`
- `FileCommands` — `/uploads`, `/rm`

### Methods

#### `isCommand(text)`

```typescript
isCommand(text: string): boolean
```

Returns `true` if the text starts with `/`.

#### `parseCommand(text)`

```typescript
parseCommand(text: string): { command: string; args: string }
```

Parses a command message into its name and arguments:

| Input | `command` | `args` |
|-------|-----------|--------|
| `/start` | `start` | `''` |
| `/new my-project` | `new` | `my-project` |
| `/apikey anthropic sk-ant...` | `apikey` | `anthropic sk-ant...` |
| `/model@NuntiaBot gpt-4o` | `model` | `gpt-4o` |

Handles the `@botname` suffix that Telegram appends in groups.

#### `handle(msg, transport)`

```typescript
async handle(
  msg: IncomingMessage,
  transport: TransportAdapter
): Promise<boolean>
```

Routes a message to the appropriate command handler. Returns `true` if the message was a command (even unknown ones), `false` if not.

**Admin check:** For group chats, commands in the `ADMIN_COMMANDS` set (`model`, `apikey`, `new`, `switch`) require admin permission. The router calls `transport.isAdmin()` before dispatching.

**Unknown commands** receive a response: `Unknown command: /foo. Use /help for available commands.`

## Command Routing Table

| Command | Handler Module | Method |
|---------|---------------|--------|
| `/start` | `ProjectCommands` | `handleStart` |
| `/help` | `ProjectCommands` | `handleHelp` |
| `/new` | `ProjectCommands` | `handleNew` |
| `/switch` | `ProjectCommands` | `handleSwitch` |
| `/projects` | `ProjectCommands` | `handleProjects` |
| `/files` | `ProjectCommands` | `handleFiles` |
| `/cat` | `ProjectCommands` | `handleCat` |
| `/model` | `ModelCommands` | `handleModel` |
| `/models` | `ModelCommands` | `handleModels` |
| `/apikey` | `ModelCommands` | `handleApiKey` |
| `/status` | `SessionCommands` | `handleStatus` |
| `/cancel` | `SessionCommands` | `handleCancel` |
| `/clear` | `SessionCommands` | `handleClear` |
| `/branches` | `GitCommands` | `handleBranches` |
| `/checkout` | `GitCommands` | `handleCheckout` |
| `/push` | `GitCommands` | `handlePush` |
| `/diff` | `GitCommands` | `handleDiff` |
| `/uploads` | `FileCommands` | `handleUploads` |
| `/rm` | `FileCommands` | `handleRm` |

## Admin-Restricted Commands

These commands require admin permission in Telegram group chats:

| Command | Reason |
|---------|--------|
| `/model` | Changes model for all group members |
| `/apikey` | Manages shared API keys |
| `/new` | Creates shared project directories |
| `/switch` | Changes active project for the entire group |
