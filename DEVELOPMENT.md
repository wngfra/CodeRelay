# CodeRelay Development Guide

API reference and architecture guide for contributing to CodeRelay.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     src/index.ts                         │
│                    (Orchestrator)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Telegram    │  │  Command     │  │  OpenCode      │  │
│  │  Adapter     │──│  Router      │──│  Runner        │  │
│  ├─────────────┤  │              │  │                │  │
│  │  WhatsApp   │  │  project.ts  │  │  parser.ts     │  │
│  │  Adapter     │  │  model.ts    │  │  workflow.ts   │  │
│  └──────┬──────┘  │  session.ts  │  └───────┬────────┘  │
│         │         │  git.ts      │          │           │
│         │         │  file.ts     │          │           │
│  ┌──────┴──────┐  └──────────────┘  ┌───────┴────────┐  │
│  │  Session    │                    │  Git Manager   │  │
│  │  Manager    │                    │  File Handler  │  │
│  │  Store      │                    │  Crypto Store  │  │
│  └─────────────┘                    └────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Data flow:** Transport → Session Manager → Command Router (or) OpenCode Runner → Formatter → Transport

## Module API Reference

### `src/config.ts` — Configuration

```typescript
interface AppConfig {
  telegramBotToken: string;
  whatsappEnabled: boolean;
  allowedChatIds: Set<string>;
  workspaceRoot: string;       // Absolute path
  opencodeBin: string;
  taskTimeoutMs: number;
  masterKey: string;           // 64 hex chars (32 bytes)
  defaultModel: string;
  logLevel: string;
  gitRemoteUrl: string;
  gitUserName: string;
  gitUserEmail: string;
  maxUploadSizeMb: number;
}

loadConfig(): AppConfig           // Loads from .env, caches result
resetConfig(): void               // Clears cache (for tests)
```

---

### `src/transport/types.ts` — Transport Interface

Every transport adapter (Telegram, WhatsApp) implements `TransportAdapter`:

```typescript
type Platform = 'telegram' | 'whatsapp';
type MessageHandler = (msg: IncomingMessage) => Promise<void>;

interface IncomingMessage {
  messageId: string;
  chatId: string;               // Session key
  senderName: string;
  senderId: string;
  text: string;
  platform: Platform;
  isGroup: boolean;
  file?: IncomingFile;
  replyToMessageId?: string;
}

interface IncomingFile {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  download(): Promise<Buffer>;  // Lazy download
}

interface OutgoingMessage {
  chatId: string;
  text: string;
  editMessageId?: string;       // Edit instead of send (Telegram only)
  replyToMessageId?: string;
  parseMode?: 'markdown' | 'html' | 'plain';
}

interface OutgoingFile {
  chatId: string;
  filePath: string;             // Absolute path on disk
  fileName: string;
  caption?: string;
  replyToMessageId?: string;
}

interface TransportAdapter {
  readonly platform: Platform;
  start(): Promise<void>;
  stop(): Promise<void>;
  sendMessage(msg: OutgoingMessage): Promise<string>;   // Returns message ID
  sendFile(file: OutgoingFile): Promise<string>;
  deleteMessage(chatId: string, messageId: string): Promise<void>;
  onMessage(handler: MessageHandler): void;
  isAdmin(chatId: string, userId: string): Promise<boolean>;
}
```

**Adding a new transport:** Create a class implementing `TransportAdapter`, register it in `src/index.ts` alongside Telegram/WhatsApp.

---

### `src/transport/telegram.ts` — Telegram Adapter

```typescript
class TelegramAdapter implements TransportAdapter {
  constructor();                // Reads TELEGRAM_BOT_TOKEN from config
  // All TransportAdapter methods
}
```

- Uses grammY with long polling
- `sendMessage` with `editMessageId` calls `editMessageText` for live status updates
- `sendMessage` with `parseMode: 'markdown'` uses MarkdownV2; falls back to plain text on failure
- Throttles outgoing messages to 1 per 2 seconds per chat
- Downloads files via Telegram Bot API file URL

---

### `src/transport/whatsapp.ts` — WhatsApp Adapter

```typescript
class WhatsAppAdapter implements TransportAdapter {
  constructor();                // Reads config, sets auth dir
  // All TransportAdapter methods
}
```

- Uses @whiskeysockets/baileys with multi-file auth state
- QR code printed to terminal on first run
- Auto-reconnects on disconnect (except logged out)
- Throttles outgoing messages to 1 per 3 seconds per chat
- `editMessageId` is ignored (WhatsApp has no edit)
- `deleteMessage` logs a warning (unreliable on WhatsApp)

---

### `src/session/store.ts` — Session Persistence

```typescript
interface SessionData {
  chatId: string;
  platform: Platform;
  activeProject: string;
  model: string;
  taskRunning: boolean;
  taskDescription: string;
  createdAt: string;           // ISO 8601
  lastActiveAt: string;        // ISO 8601
}

class SessionStore {
  constructor(bridgeDir: string);   // Loads sessions.json from bridgeDir
  get(chatId: string): SessionData | undefined;
  getOrCreate(chatId, platform, defaultProject, defaultModel): SessionData;
  update(chatId: string, updates: Partial<SessionData>): SessionData | undefined;
  setTaskRunning(chatId: string, description: string): void;
  setTaskComplete(chatId: string): void;
  listAll(): SessionData[];
  delete(chatId: string): boolean;
}
```

- Persists to `<bridgeDir>/sessions.json` on every mutation
- On load, resets all `taskRunning` to `false` (process restart recovery)

---

### `src/session/manager.ts` — Session Lifecycle

```typescript
interface QueuedRequest {
  prompt: string;
  senderName: string;
  resolve: (value: void) => void;
  reject: (reason: Error) => void;
}

class SessionManager {
  constructor();

  // Directory resolution
  getProjectDir(chatId, platform, isGroup): string;
  ensureSession(chatId, platform, isGroup): SessionData;

  // Project management
  createProject(chatId, platform, isGroup, projectName): string;   // Returns dir path
  switchProject(chatId, platform, isGroup, projectName): string | null;
  listProjects(chatId, platform, isGroup): string[];

  // Session state
  getSession(chatId): SessionData | undefined;
  updateSession(chatId, updates: Partial<SessionData>): void;
  setTaskRunning(chatId, description): void;
  setTaskComplete(chatId): void;

  // Task queue (per session)
  getQueue(chatId): QueuedRequest[];
  enqueue(chatId, request): number;     // Returns 1-based queue position
  dequeue(chatId): QueuedRequest | undefined;

  // Authorization
  isAllowed(chatId): boolean;           // Checks ALLOWED_CHAT_IDS
}
```

**Directory naming convention:**
- Telegram DM: `<workspace>/tg_<chatId>/<project>/`
- Telegram group: `<workspace>/tg_group_<chatId>/<project>/`
- WhatsApp: `<workspace>/wa_<chatId>/<project>/`

---

### `src/runner/parser.ts` — Output Stream Parser

```typescript
type AgentStage = 'planning' | 'writing' | 'reviewing' | 'testing'
                | 'complete' | 'error' | 'unknown';

interface ParsedLine {
  raw: string;              // Original line
  cleaned: string;          // ANSI-stripped
  stage: AgentStage;
  isDiff: boolean;
  isTestResult: boolean;
  isError: boolean;
  isStageTransition: boolean;
}

// Stateless
stripAnsi(str: string): string;
parseLine(raw: string, currentStage?: AgentStage): ParsedLine;
extractErrorTail(stderr: string, lines?: number): string;   // Default 20 lines
stageLabel(stage: AgentStage): string;                       // 'planning' → 'Planning'

// Stateful
class OutputStreamParser {
  parse(rawLine: string): ParsedLine;
  getCurrentStage(): AgentStage;
  getBuffer(): ParsedLine[];
  reset(): void;
}
```

**Stage detection patterns:** The parser matches `[SPEC]`, `[TEST]`, `[IMPLEMENT]`, `[REVIEW]`, `[COMPLETE]`, `[ERROR]`, and `planner:`, `coder:`, `reviewer:`, `tester:` prefixes.

**Extending stage detection:** Add entries to `STAGE_PATTERNS` array in `parser.ts`.

---

### `src/runner/workflow-prompt.ts` — System Prompt

```typescript
const WORKFLOW_SYSTEM_PROMPT: string;   // The full SPEC→TEST→IMPLEMENT→README→CHANGELOG prompt

buildPrompt(userMessage: string, senderName?: string): string;
buildFileReferencePrompt(userMessage: string, filePath: string, senderName?: string): string;
```

---

### `src/runner/opencode.ts` — OpenCode Subprocess Manager

```typescript
interface TaskOptions {
  projectDir: string;
  prompt: string;
  senderName?: string;         // For group attribution
  model?: string;              // Sets OPENCODE_MODEL env var
  uploadedFilePath?: string;   // Triggers file reference prompt
}

interface TaskResult {
  success: boolean;
  exitCode: number | null;
  timedOut: boolean;
  stderrTail: string;          // Last 20 lines of stderr
  finalStage: AgentStage;
}

type RunnerEvent =
  | { type: 'line'; data: ParsedLine }
  | { type: 'stage'; data: AgentStage }
  | { type: 'error'; data: string }
  | { type: 'complete'; data: TaskResult };

class OpenCodeRunner extends EventEmitter {
  run(options: TaskOptions): Promise<TaskResult>;
  kill(): void;                // SIGTERM, then SIGKILL after 5s
  isRunning(): boolean;
}
```

- Emits `'event'` events of type `RunnerEvent` during execution
- Spawns: `spawn(OPENCODE_BIN, [fullPrompt], { cwd: projectDir, stdio: ['ignore', 'pipe', 'pipe'] })`
- Timeout: kills process after `TASK_TIMEOUT_MS`

**Subscribing to events:**
```typescript
runner.on('event', (event: RunnerEvent) => {
  if (event.type === 'stage') console.log('Stage:', event.data);
  if (event.type === 'line') console.log('Output:', event.data.cleaned);
});
```

---

### `src/formatter/telegram.ts` — Telegram Formatter

```typescript
escapeMarkdownV2(text: string): string;
formatStageTransition(stage: AgentStage): string;         // '📋 *Planning*'
formatCodeBlock(code: string, language?: string): string;
formatError(error: string): string;
formatDiff(diffLines: string[]): string;                  // Truncates at 50 lines
formatTaskSummary(branchName, filesChanged, testsPassed): string;
formatOutputBatch(lines: ParsedLine[], maxLength?: number): string;  // Default 4000
truncateWithNotice(text: string, maxLength?: number): string;
```

### `src/formatter/whatsapp.ts` — WhatsApp Formatter

Same function signatures as Telegram formatter, but outputs WhatsApp-compatible formatting (`*bold*`, triple backticks). No MarkdownV2 escaping.

---

### `src/crypto/keystore.ts` — API Key Encryption

```typescript
encrypt(plaintext: string): { iv: string; tag: string; ciphertext: string };
decrypt(data: { iv, tag, ciphertext }): string;

storeApiKey(bridgeDir: string, provider: string, apiKey: string): void;
getApiKey(bridgeDir: string, provider: string): string | null;
listProviders(bridgeDir: string): string[];
maskKey(key: string): string;   // 'sk-ant-api...2345' or '****' if <= 8 chars
```

- Algorithm: AES-256-GCM, 16-byte random IV, 16-byte auth tag
- Storage: `<bridgeDir>/keystore.json`
- Master key: `MASTER_KEY` env var (64 hex chars = 32 bytes)

---

### `src/git/manager.ts` — Git Operations

```typescript
deriveBranchName(taskPrompt: string): string;
// 'add auth middleware' → 'add-auth-middleware-20260316-143022'
// First ~40 chars, kebab-cased, non-alpha stripped, timestamp appended

class GitManager {
  initRepo(projectDir: string): Promise<void>;
  // git init + .gitignore + initial commit on main

  commitTask(projectDir, taskPrompt): Promise<{ branchName: string; filesChanged: string[] } | null>;
  // Creates branch, stages all, commits. Returns null if no changes.

  listBranches(projectDir): Promise<{ current: string; all: string[] }>;
  checkout(projectDir, branchName): Promise<boolean>;
  push(projectDir): Promise<{ success: boolean; message: string }>;
  getDiff(projectDir): Promise<string>;
  // Returns uncommitted diff, or last commit diff if clean
}
```

---

### `src/files/handler.ts` — File Upload & Management

```typescript
sanitizeFilename(filename: string): string;      // Strips .., /, \, leading dots
deduplicateFilename(dir: string, filename: string): string;  // Appends _2, _3, etc.

interface SaveResult {
  success: boolean;
  relativePath: string;        // 'uploads/file.txt'
  absolutePath: string;
  error?: string;
}

class FileHandler {
  saveUpload(projectDir, filename, data: Buffer): Promise<SaveResult>;
  listUploads(projectDir): string[];             // Filenames in uploads/
  deleteFile(projectDir, relativePath): boolean;
  listFiles(projectDir, maxDepth?: number): string[];  // Tree view, default depth 2
  readFile(projectDir, relativePath): string | null;
}
```

- Size check against `MAX_UPLOAD_SIZE_MB`
- Path traversal prevention on delete and read (resolved path must be within projectDir)

---

### `src/commands/index.ts` — Command Router

```typescript
interface CommandContext {
  sessionManager: SessionManager;
  gitManager: GitManager;
  fileHandler: FileHandler;
  runners: Map<string, OpenCodeRunner>;
}

class CommandRouter {
  constructor(ctx: CommandContext);
  isCommand(text: string): boolean;           // Starts with '/'
  parseCommand(text: string): { command: string; args: string };
  handle(msg, transport): Promise<boolean>;   // Returns true if was a command
}
```

**Admin-restricted commands (group chats only):** `model`, `apikey`, `new`, `switch` — checked via `transport.isAdmin()`.

**Adding a new command:**
1. Add handler method to the appropriate command class (or create a new one)
2. Add a `case` to the `switch` in `CommandRouter.handle()`
3. If admin-restricted, add to `ADMIN_COMMANDS` set

---

### `src/logger.ts` — Logging

```typescript
const rootLogger: pino.Logger;
createLogger(module: string): pino.Logger;   // Child logger with { module } context
```

Usage: `const log = createLogger('mymodule'); log.info({ key: 'val' }, 'message');`

---

### `src/utils.ts` — Utilities

```typescript
checkDiskSpace(dirPath: string): Promise<boolean>;  // true if >= 500MB free, fail-open
```

---

## Adding a New Transport

1. Create `src/transport/newtransport.ts` implementing `TransportAdapter`
2. Handle message conversion in your adapter (platform message → `IncomingMessage`)
3. Implement throttling in `sendMessage` appropriate for the platform's rate limits
4. Register in `src/index.ts`:
   ```typescript
   const adapter = new NewTransportAdapter();
   adapter.onMessage((msg) => this.handleMessage(msg, adapter));
   this.transports.push(adapter);
   await adapter.start();
   ```

## Adding a New Command

1. Choose the appropriate command class in `src/commands/` or create a new one
2. Add an async handler method: `async handleFoo(msg, transport, args?): Promise<void>`
3. Wire it in `src/commands/index.ts`:
   - Import and instantiate your command class in the constructor
   - Add a `case 'foo':` in the `handle()` switch
4. Add to `ADMIN_COMMANDS` set if it should be restricted in groups

## Testing

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npx vitest run tests/parser.test.ts   # Single file
```

Tests use vitest. Test files are in `tests/` and cover:
- `parser.test.ts` — ANSI stripping, stage detection, diff/error/test classification (22 tests)
- `crypto.test.ts` — Encrypt/decrypt round-trips, keystore file ops, key masking (13 tests)
- `session.test.ts` — Session CRUD, persistence, task state, restart recovery (9 tests)
- `git.test.ts` — Branch name derivation from task prompts (7 tests)
- `files.test.ts` — Filename sanitization, dedup, upload/delete/list, path traversal (22 tests)
- `runner.test.ts` — Workflow prompt building, file reference prompts (6 tests)

Environment variables needed for tests (set automatically in test files):
```
MASTER_KEY=aaaa...  (64 'a' chars)
TELEGRAM_BOT_TOKEN=test-token
ALLOWED_CHAT_IDS=123
```

## Key Design Decisions

- **One OpenCode process per session** — requests are queued sequentially to avoid file conflicts
- **Git failures are non-blocking** — task output is always delivered even if commit fails
- **Fail-open disk check** — low space warning doesn't block task execution
- **MarkdownV2 fallback** — Telegram messages retry as plain text if formatting fails
- **Session state reset on startup** — `taskRunning` flags are cleared (the process is gone)
- **Config is cached** — `loadConfig()` reads `.env` once; use `resetConfig()` in tests
