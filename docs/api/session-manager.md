# Session Manager

**File:** `src/session/manager.ts`

High-level session lifecycle management. Maps chat IDs to project directories, manages task queuing, and handles authorization.

## Interface: `QueuedRequest`

```typescript
interface QueuedRequest {
  prompt: string;
  senderName: string;
  resolve: (value: void) => void;
  reject: (reason: Error) => void;
}
```

Represents a pending task request waiting in the per-session queue.

## Class: `SessionManager`

```typescript
class SessionManager {
  constructor();
}
```

On construction, creates the bridge directory and initializes the `SessionStore`.

### Directory Resolution

#### `getProjectDir(chatId, platform, isGroup)`

```typescript
getProjectDir(chatId: string, platform: Platform, isGroup: boolean): string
```

Returns the absolute path to the active project directory for a chat.

**Naming convention:**

| Platform | Type | Directory |
|----------|------|-----------|
| Telegram | DM | `<workspace>/tg_<chatId>/<project>/` |
| Telegram | Group | `<workspace>/tg_group_<chatId>/<project>/` |
| WhatsApp | Any | `<workspace>/wa_<chatId>/<project>/` |

#### `ensureSession(chatId, platform, isGroup)`

```typescript
ensureSession(chatId: string, platform: Platform, isGroup: boolean): SessionData
```

Ensures a session and its project directory exist. Creates the project directory and `uploads/` subdirectory if missing. Returns the `SessionData`.

### Project Management

#### `createProject(chatId, platform, isGroup, projectName)`

```typescript
createProject(
  chatId: string, platform: Platform, isGroup: boolean, projectName: string
): string
```

Creates a new project directory (name sanitized: non-alphanumeric → `_`), creates `uploads/` subdirectory, updates the session's active project, and returns the absolute path.

#### `switchProject(chatId, platform, isGroup, projectName)`

```typescript
switchProject(
  chatId: string, platform: Platform, isGroup: boolean, projectName: string
): string | null
```

Switches the active project. Returns the project directory path, or `null` if the project doesn't exist.

#### `listProjects(chatId, platform, isGroup)`

```typescript
listProjects(chatId: string, platform: Platform, isGroup: boolean): string[]
```

Returns an array of project directory names for the chat (excluding hidden directories).

### Session State

#### `getSession(chatId)`

```typescript
getSession(chatId: string): SessionData | undefined
```

#### `updateSession(chatId, updates)`

```typescript
updateSession(chatId: string, updates: Partial<SessionData>): void
```

#### `setTaskRunning(chatId, description)` / `setTaskComplete(chatId)`

```typescript
setTaskRunning(chatId: string, description: string): void
setTaskComplete(chatId: string): void
```

### Task Queue

Each session has an independent task queue. Only one OpenCode process runs per session at a time.

#### `getQueue(chatId)`

```typescript
getQueue(chatId: string): QueuedRequest[]
```

Returns the current queue (creates an empty one if none exists).

#### `enqueue(chatId, request)`

```typescript
enqueue(chatId: string, request: QueuedRequest): number
```

Adds a request to the queue. Returns the 1-based position (e.g., `2` means "you're #2 in queue").

#### `dequeue(chatId)`

```typescript
dequeue(chatId: string): QueuedRequest | undefined
```

Removes and returns the next request from the queue, or `undefined` if empty.

### Authorization

#### `isAllowed(chatId)`

```typescript
isAllowed(chatId: string): boolean
```

Checks if a chat ID is in the `ALLOWED_CHAT_IDS` whitelist.
