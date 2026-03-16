# Architecture

## System Diagram

```
┌─────────────┐     ┌─────────────┐
│  Telegram    │     │  WhatsApp   │
│  User/Group  │     │  User       │
└──────┬──────┘     └──────┬──────┘
       │                    │
       ▼                    ▼
┌──────────────────────────────────┐
│        Transport Layer           │
│  telegram.ts  │  whatsapp.ts     │
│  (grammY)     │  (Baileys)       │
│  ─ rate limiting per chat        │
│  ─ file download                 │
│  ─ message edit (TG only)        │
└──────────────┬───────────────────┘
               │ IncomingMessage
               ▼
┌──────────────────────────────────┐
│        Session Manager           │
│  ─ chat ID → project directory   │
│  ─ whitelist authorization       │
│  ─ task queue (per session)      │
│  ─ persistent state (JSON)       │
└──────────────┬───────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌──────────────┐ ┌─────────────────┐
│  Command     │ │  Task Pipeline  │
│  Router      │ │                 │
│  20 commands │ │  ┌───────────┐  │
│  admin check │ │  │ Workflow  │  │
└──────────────┘ │  │ Prompt    │  │
                 │  └─────┬─────┘  │
                 │        ▼        │
                 │  ┌───────────┐  │
                 │  │ OpenCode  │  │
                 │  │ Runner    │  │
                 │  │ (spawn)   │  │
                 │  └─────┬─────┘  │
                 │        │ stdout │
                 │        ▼        │
                 │  ┌───────────┐  │
                 │  │ Output    │  │
                 │  │ Parser    │  │
                 │  └─────┬─────┘  │
                 │        ▼        │
                 │  ┌───────────┐  │
                 │  │ Formatter │  │
                 │  │ (TG/WA)   │  │
                 │  └─────┬─────┘  │
                 └────────┼────────┘
                          │
               ┌──────────┼──────────┐
               ▼          ▼          ▼
        ┌──────────┐ ┌────────┐ ┌────────┐
        │ Git      │ │ File   │ │ Crypto │
        │ Manager  │ │ Handler│ │ Store  │
        └──────────┘ └────────┘ └────────┘
```

## Module Responsibilities

### Transport Layer (`src/transport/`)

Abstracts Telegram and WhatsApp behind a unified `TransportAdapter` interface. Each adapter handles:

- Receiving messages and converting to `IncomingMessage`
- Sending text messages with platform-specific formatting
- File upload/download
- Rate limiting (2s Telegram, 3s WhatsApp)
- Admin permission checks

### Session Manager (`src/session/`)

Maps each chat to a persistent session and project directory:

- `SessionStore` — JSON-backed persistence with crash recovery (resets `taskRunning` on load)
- `SessionManager` — directory creation, project switching, task queue management, authorization

### OpenCode Runner (`src/runner/`)

Manages the OpenCode CLI subprocess lifecycle:

- `workflow-prompt.ts` — builds the system prompt enforcing TDD workflow
- `opencode.ts` — spawns the process, streams stdout/stderr, handles timeout and cancellation
- `parser.ts` — strips ANSI codes, classifies lines into stages, detects diffs/tests/errors

### Formatters (`src/formatter/`)

Platform-specific output formatting:

- `telegram.ts` — MarkdownV2 with emoji prefixes, code blocks, escaped special characters
- `whatsapp.ts` — WhatsApp-compatible bold/code formatting

### Git Manager (`src/git/`)

Handles all Git operations via `simple-git`:

- Auto-initializes repos with `.gitignore` and initial commit
- Creates task branches with descriptive names (`<brief>-<timestamp>`)
- Auto-commits all changes on task completion
- Non-blocking — Git failures don't prevent task output delivery

### File Handler (`src/files/`)

Manages file uploads and project file operations:

- Saves files to `uploads/` with deduplication (`file_2.txt`, `file_3.txt`)
- Sanitizes filenames (strips `..`, `/`, `\`)
- Tree listing with configurable depth
- Path traversal prevention on read/delete

### Crypto Keystore (`src/crypto/`)

AES-256-GCM encryption for API keys:

- Encrypts with random 16-byte IV per entry
- Stores to `<bridgeDir>/keystore.json`
- Keys are never logged, echoed, or stored in plaintext

### Command Router (`src/commands/`)

Dispatches `/command` messages to handler modules:

- Parses command name and arguments (handles `@botname` suffix)
- Checks admin permissions for restricted commands in groups
- 5 command modules: project, model, session, git, file

## Data Flow: Task Execution

1. **Receive** — Transport adapter converts platform message to `IncomingMessage`
2. **Authorize** — Session manager checks chat ID against whitelist
3. **Session** — Ensure project directory exists, check task queue
4. **File upload** — If message has attachment, save to `uploads/` first
5. **Build prompt** — Prepend workflow system prompt + optional user attribution
6. **Spawn** — `OpenCodeRunner` spawns CLI subprocess in project directory
7. **Stream** — stdout parsed line-by-line; stage transitions sent immediately, output batched every 2-3s
8. **Format** — Platform-specific formatter prepares messages
9. **Deliver** — Transport adapter sends/edits messages in chat
10. **Git** — On completion, commit all changes to a new task branch
11. **Summary** — Send final summary (branch, files changed, test results)
12. **Queue** — Process next queued request, if any

## Concurrency Model

- **One OpenCode process per session** — prevents file conflicts
- **Task queue per chat** — additional requests queued with position notifications
- **Transport-level throttling** — prevents API rate limits
- **Non-blocking Git** — commit failures don't block output delivery
- **Graceful shutdown** — SIGTERM kills all running OpenCode processes
