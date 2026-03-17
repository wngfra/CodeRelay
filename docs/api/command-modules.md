---
title: Command Modules API
description: API reference for ProjectCommands, ModelCommands, SessionCommands, GitCommands, and FileCommands handler classes.
---

# Command Modules

Individual command handler classes. Each module groups related commands and is instantiated by the [`CommandRouter`](/api/command-router).

## `ProjectCommands`

**File:** `src/commands/project.ts`

```typescript
class ProjectCommands {
  constructor(
    sessionManager: SessionManager,
    fileHandler: FileHandler,
    gitManager: GitManager
  );
}
```

### Methods

| Method | Command | Parameters | Description |
|--------|---------|------------|-------------|
| `handleStart(msg, transport)` | `/start` | — | Creates default project, inits Git, sends welcome |
| `handleHelp(msg, transport)` | `/help` | — | Sends command reference list |
| `handleNew(msg, transport, name)` | `/new` | project name | Creates project dir, inits Git, switches to it |
| `handleSwitch(msg, transport, name)` | `/switch` | project name | Switches active project (must exist) |
| `handleProjects(msg, transport)` | `/projects` | — | Lists all projects with active marker |
| `handleFiles(msg, transport)` | `/files` | — | Tree-view listing of project files |
| `handleCat(msg, transport, path)` | `/cat` | file path | Sends file contents as code block or document |

---

## `ModelCommands`

**File:** `src/commands/model.ts`

```typescript
class ModelCommands {
  constructor(sessionManager: SessionManager);
}
```

### Methods

| Method | Command | Parameters | Description |
|--------|---------|------------|-------------|
| `handleModel(msg, transport, name)` | `/model` | model name | Switches active model for the session |
| `handleModels(msg, transport)` | `/models` | — | Lists preset models with active marker |
| `handleApiKey(msg, transport, args)` | `/apikey` | `<provider> <key>` or `list` | Stores encrypted API key or lists providers |

### Preset Models

The `/models` command lists these presets (custom names are also accepted via `/model`):

- `claude-sonnet-4-20250514`
- `claude-opus-4-20250514`
- `gpt-4o`
- `gpt-4o-mini`
- `o3`
- `o4-mini`
- `gemini-2.5-pro`
- `deepseek-r1`
- `deepseek-v3`

### `/apikey` Behavior

- `args = "list"` — lists configured providers with masked keys
- `args = "<provider> <key>"` — encrypts and stores the key
- On Telegram: deletes the user's message containing the key
- On WhatsApp: warns user to manually delete their message
- Invalid format: replies with usage example

---

## `SessionCommands`

**File:** `src/commands/session.ts`

```typescript
class SessionCommands {
  constructor(
    sessionManager: SessionManager,
    runners: Map<string, OpenCodeRunner>
  );
}
```

### Methods

| Method | Command | Description |
|--------|---------|-------------|
| `handleStatus(msg, transport)` | `/status` | Shows project, model, task status, queue depth |
| `handleCancel(msg, transport)` | `/cancel` | Kills running OpenCode process (SIGTERM/SIGKILL) |
| `handleClear(msg, transport)` | `/clear` | Resets session state, kills running task, preserves files |

---

## `GitCommands`

**File:** `src/commands/git.ts`

```typescript
class GitCommands {
  constructor(
    sessionManager: SessionManager,
    gitManager: GitManager
  );
}
```

### Methods

| Method | Command | Parameters | Description |
|--------|---------|------------|-------------|
| `handleBranches(msg, transport)` | `/branches` | — | Lists local branches with current marker |
| `handleCheckout(msg, transport, branch)` | `/checkout` | branch name | Switches Git branch |
| `handlePush(msg, transport)` | `/push` | — | Pushes current branch to remote |
| `handleDiff(msg, transport)` | `/diff` | — | Shows uncommitted or last-commit diff |

---

## `FileCommands`

**File:** `src/commands/file.ts`

```typescript
class FileCommands {
  constructor(
    sessionManager: SessionManager,
    fileHandler: FileHandler
  );
}
```

### Methods

| Method | Command | Parameters | Description |
|--------|---------|------------|-------------|
| `handleUploads(msg, transport)` | `/uploads` | — | Lists files in `uploads/` directory |
| `handleRm(msg, transport, path)` | `/rm` | file path | Deletes file (path traversal protected) |

## Common Method Signature

All handler methods follow the same pattern:

```typescript
async handleX(
  msg: IncomingMessage,      // Incoming message from transport
  transport: TransportAdapter, // Transport to send replies through
  args?: string               // Command arguments (if any)
): Promise<void>
```

They always send at least one reply message. Errors are communicated to the user via chat — handlers don't throw.
