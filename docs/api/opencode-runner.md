---
title: OpenCode Runner API
description: API reference for OpenCodeRunner managing CLI subprocess spawning, stdout/stderr streaming, timeout, and task cancellation.
---

# OpenCode Runner

**File:** `src/runner/opencode.ts`

Spawns and manages OpenCode CLI subprocesses. Streams stdout/stderr, tracks agent stage transitions, handles process lifecycle, timeout, and cancellation.

## Interfaces

### `TaskOptions`

```typescript
interface TaskOptions {
  projectDir: string;          // Working directory for the OpenCode process
  prompt: string;              // User's coding request
  senderName?: string;         // For [User: Name] attribution in groups
  model?: string;              // Sets OPENCODE_MODEL env var
  uploadedFilePath?: string;   // If set, uses file reference prompt
}
```

### `TaskResult`

```typescript
interface TaskResult {
  success: boolean;            // true if exit code === 0
  exitCode: number | null;     // Process exit code (null if spawn failed)
  timedOut: boolean;           // true if killed by timeout
  stderrTail: string;          // Last 20 lines of stderr (ANSI-stripped)
  finalStage: AgentStage;      // Last detected agent stage
}
```

## Types

### `RunnerEvent`

```typescript
type RunnerEvent =
  | { type: 'line'; data: ParsedLine }     // New output line parsed
  | { type: 'stage'; data: AgentStage }    // Stage transition detected
  | { type: 'error'; data: string }        // stderr line received
  | { type: 'complete'; data: TaskResult } // Process exited
```

## Class: `OpenCodeRunner`

```typescript
class OpenCodeRunner extends EventEmitter {
  constructor();
}
```

Extends `EventEmitter`. Emits `'event'` events of type `RunnerEvent`.

### Methods

#### `run(options)`

```typescript
async run(options: TaskOptions): Promise<TaskResult>
```

Runs an OpenCode task. Returns when the process completes (or times out).

**Behavior:**

1. Builds the full prompt (workflow system prompt + user message + optional attribution/file reference)
2. Spawns `opencode` with the prompt as the first argument
3. Sets `cwd` to `options.projectDir`
4. Sets `OPENCODE_MODEL` env var if `options.model` is provided
5. Streams stdout line-by-line through `OutputStreamParser`
6. Captures stderr to a buffer
7. Starts a timeout timer (`TASK_TIMEOUT_MS`)
8. Emits `RunnerEvent`s throughout execution
9. On exit, clears timeout and returns `TaskResult`

**Spawn command:**

```typescript
spawn(OPENCODE_BIN, [fullPrompt], {
  cwd: projectDir,
  env: { ...process.env, OPENCODE_MODEL: model },
  stdio: ['ignore', 'pipe', 'pipe']
});
```

**Error handling:**

- If the binary is not found, returns immediately with `success: false` and error message in `stderrTail`
- If the process crashes, captures the error in `stderrTail`

#### `kill()`

```typescript
kill(): void
```

Cancels the running task:

1. Sends `SIGTERM` to the process
2. After 5 seconds, sends `SIGKILL` if still running
3. Sets `timedOut: true` on the resulting `TaskResult`

#### `isRunning()`

```typescript
isRunning(): boolean
```

Returns `true` if a subprocess is currently active.

### Events

Subscribe to events using the standard `EventEmitter` API:

```typescript
const runner = new OpenCodeRunner();

runner.on('event', (event: RunnerEvent) => {
  switch (event.type) {
    case 'stage':
      console.log(`Stage: ${event.data}`);
      break;
    case 'line':
      console.log(`Output: ${event.data.cleaned}`);
      break;
    case 'error':
      console.error(`stderr: ${event.data}`);
      break;
    case 'complete':
      console.log(`Done: ${event.data.success}`);
      break;
  }
});

const result = await runner.run({
  projectDir: '/path/to/project',
  prompt: 'add user authentication',
});
```

### Lifecycle

```
run() called
  │
  ├─ Build prompt
  ├─ Spawn process
  ├─ Start timeout timer
  │
  │  ┌─ stdout line ──→ parse ──→ emit 'line' event
  │  │                         └─→ emit 'stage' event (if transition)
  │  ├─ stderr line ──→ buffer + emit 'error' event
  │  └─ (repeat)
  │
  ├─ Process exits ──→ clear timeout ──→ emit 'complete' ──→ resolve
  └─ Timeout fires ──→ kill() ──→ process exits ──→ resolve with timedOut: true
```
