# Session Store

**File:** `src/session/store.ts`

Persistent session state backed by a JSON file. Tracks per-chat session data including active project, model, and task status.

## Interface: `SessionData`

```typescript
interface SessionData {
  chatId: string;              // Session key
  platform: Platform;          // 'telegram' | 'whatsapp'
  activeProject: string;       // Currently active project name
  model: string;               // Currently configured model
  taskRunning: boolean;        // Whether a task is in progress
  taskDescription: string;     // Current task prompt (if running)
  createdAt: string;           // ISO 8601 timestamp
  lastActiveAt: string;        // ISO 8601 timestamp (updated on every mutation)
}
```

## Class: `SessionStore`

```typescript
class SessionStore {
  constructor(nuntiaDir: string);
}
```

On construction, loads `sessions.json` from `nuntiaDir`. If the file is corrupted or missing, starts with an empty store.

**Crash recovery:** On load, all sessions have `taskRunning` reset to `false` and `taskDescription` cleared. This handles the case where the process was killed while a task was running.

### Methods

#### `get(chatId)`

```typescript
get(chatId: string): SessionData | undefined
```

Returns the session for a chat ID, or `undefined` if not found.

#### `getOrCreate(chatId, platform, defaultProject, defaultModel)`

```typescript
getOrCreate(
  chatId: string,
  platform: Platform,
  defaultProject: string,
  defaultModel: string
): SessionData
```

Returns the existing session or creates a new one with the provided defaults. New sessions are immediately persisted to disk.

::: warning
If a session already exists, the `defaultProject` and `defaultModel` parameters are ignored — the existing values are preserved.
:::

#### `update(chatId, updates)`

```typescript
update(chatId: string, updates: Partial<SessionData>): SessionData | undefined
```

Merges `updates` into the existing session. Automatically sets `lastActiveAt` to the current time. Persists to disk. Returns `undefined` if the session doesn't exist.

#### `setTaskRunning(chatId, description)`

```typescript
setTaskRunning(chatId: string, description: string): void
```

Shorthand for `update(chatId, { taskRunning: true, taskDescription: description })`.

#### `setTaskComplete(chatId)`

```typescript
setTaskComplete(chatId: string): void
```

Shorthand for `update(chatId, { taskRunning: false, taskDescription: '' })`.

#### `listAll()`

```typescript
listAll(): SessionData[]
```

Returns all sessions as an array.

#### `delete(chatId)`

```typescript
delete(chatId: string): boolean
```

Removes a session. Returns `true` if the session existed, `false` otherwise. Persists to disk.

## Persistence

The store writes to `<nuntiaDir>/sessions.json` on every mutation (create, update, delete). The directory is created if it doesn't exist.

```json
{
  "123456789": {
    "chatId": "123456789",
    "platform": "telegram",
    "activeProject": "default",
    "model": "claude-sonnet-4-20250514",
    "taskRunning": false,
    "taskDescription": "",
    "createdAt": "2026-03-16T14:30:00.000Z",
    "lastActiveAt": "2026-03-16T15:45:00.000Z"
  }
}
```
