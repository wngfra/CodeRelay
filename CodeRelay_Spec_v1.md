# CodeRelay

## Telegram + WhatsApp ↔ OpenCode Multi-Agent Interface

### Software Design Specification v1.2

| Field | Value |
|-------|-------|
| Document Type | Software Design Specification (SDS) |
| Project | CodeRelay |
| Version | 1.2.0 |
| Date | March 16, 2026 |
| Author | Xander / Claude |
| Language | TypeScript / Node.js |
| Status | Draft — Pending Review |

---

## 1. Overview

CodeRelay is a self-hosted messaging bot that connects Telegram and WhatsApp to OpenCode's multi-agent coding pipeline. Users send natural language coding requests via chat and receive real-time procedural feedback as OpenCode's agents (planner → coder → reviewer) execute the task. The system manages per-conversation project directories, streams intermediate agent output, enforces a spec-first test-driven development workflow, supports multi-user collaboration via Telegram groups, auto-commits completed work to Git branches, and accepts file uploads (e.g., reference images for UI design) as input.

---

## 2. System Architecture

### 2.1 High-Level Components

The system consists of seven core modules:

- **Transport Layer** — Telegram Bot API adapter + WhatsApp adapter (whatsapp-web.js / Baileys)
- **Session Manager** — Maps chat IDs to persistent project directories and manages conversation state, model configuration, and API key storage per session. In group chats, multiple users share the same session/project.
- **OpenCode Runner** — Spawns and manages OpenCode CLI subprocesses, streams stdout/stderr, parses agent stage transitions, and handles process lifecycle
- **Output Formatter** — Strips ANSI escape codes, extracts diffs/file contents, formats messages for each platform's markup (Telegram Markdown, WhatsApp formatting)
- **Config Manager** — Handles model switching, API key storage (encrypted at rest), and per-session OpenCode configuration
- **Git Manager** — Initializes repos, creates task branches (named `<task-brief>-<YYYYMMDD-HHmmss>`), auto-commits on task completion, and manages branch lifecycle
- **File Handler** — Receives file uploads (images, documents, code files, archives) from chat, saves them to the active project directory, and allows users to reference uploaded files in subsequent prompts (e.g., uploading a UI mockup image and asking OpenCode to implement it)

### 2.2 Data Flow

1. User sends a message (text or file) via Telegram or WhatsApp.
2. Transport Layer receives the message and resolves the session (chat ID → project directory). In Telegram groups, the group chat ID is the session key — all group members share the same project.
3. If the message is a **file upload**: File Handler saves the file to the active project directory under `uploads/<original_filename>` and confirms. The user can reference the file by name in subsequent prompts (e.g., "implement this UI based on the mockup in uploads/homepage.png").
4. Session Manager ensures the project directory exists and injects the system prompt (spec-first + TDD workflow).
5. OpenCode Runner spawns `opencode` in the project directory with the user's prompt prepended by the workflow system prompt.
6. Runner streams stdout line-by-line. The Output Formatter classifies each line as a stage transition, code output, diff, or status message.
7. Formatted updates are pushed to the chat via the Transport Layer, throttled to avoid rate limits (batched every 2–3 seconds or on stage transitions).
8. On process completion, **Git Manager** auto-commits all changes to a new branch named `<task-brief>-<YYYYMMDD-HHmmss>` (e.g., `add-auth-middleware-20260316-143022`). The branch name is derived from the first ~40 chars of the task description, kebab-cased, with non-alphanumeric characters stripped.
9. A final summary (files changed, tests passed/failed, branch name, README/CHANGELOG updates) is sent to the chat.

### 2.3 Directory Layout

Each Telegram/WhatsApp chat maps to a directory under a configurable workspace root:

```
workspace_root/
├─ tg_<chat_id>/           # Telegram DM session project
├─ tg_group_<chat_id>/     # Telegram group shared project
├─ wa_<chat_id>/           # WhatsApp session project
│   ├─ uploads/            # User-uploaded files
│   ├─ .git/               # Auto-initialized Git repo
│   └─ ...                 # Project files
└─ .bridge/                # Bridge config & encrypted keys
```

---

## 3. Functional Requirements

### 3.1 Messaging Interface

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Receive text messages from Telegram Bot API via long polling or webhook | P0 |
| FR-02 | Receive text messages from WhatsApp via whatsapp-web.js or Baileys | P0 |
| FR-03 | Send formatted text replies (Markdown for Telegram, WhatsApp formatting) | P0 |
| FR-04 | Send file attachments (code files, diffs) as documents | P1 |
| FR-05 | Support message threading (Telegram reply chains, WhatsApp quoted replies) | P1 |
| FR-06 | Rate-limit outgoing messages per platform API limits | P0 |
| FR-07 | Receive file uploads (documents, images, archives) from Telegram and WhatsApp; save to project directory | P0 |

### 3.2 OpenCode Integration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10 | Spawn OpenCode CLI subprocess in the session's project directory | P0 |
| FR-11 | Prepend workflow system prompt (spec → TDD → implement → README/CHANGELOG) to every invocation | P0 |
| FR-12 | Stream stdout/stderr from OpenCode in real-time | P0 |
| FR-13 | Parse and classify output lines into agent stages: planning, writing, reviewing, testing, complete | P0 |
| FR-14 | Detect and extract file diffs, test results, and error messages from output | P1 |
| FR-15 | Handle OpenCode process timeout (configurable, default 10 minutes) | P0 |
| FR-16 | Support cancellation of running tasks via /cancel command | P1 |
| FR-17 | Queue sequential requests per session (no concurrent OpenCode processes per project) | P0 |

### 3.3 Streaming Procedural Output

The bot must relay OpenCode's multi-agent progress to the chat in near-real-time:

- Stage transitions (e.g., "Planning: analyzing project structure...") are sent immediately as new messages
- Code output and diffs are batched and sent every 2–3 seconds to avoid API rate limits
- Long outputs are truncated with a "[truncated — full output in project directory]" notice
- On Telegram, use message editing (`editMessageText`) for live-updating a single status message, then send final result as a new message
- On WhatsApp, send incremental messages (no edit capability), throttled appropriately

### 3.4 Development Workflow Enforcement

Every coding request sent to OpenCode is prepended with a system prompt that enforces:

1. **SPEC** — Generate a brief specification document (SPEC.md) before writing any code. Include acceptance criteria.
2. **TEST** — Write failing tests based on the spec (TDD). Run them to confirm they fail.
3. **IMPLEMENT** — Write the minimum code to make all tests pass. Iterate until green.
4. **README** — Generate or update README.md with a features summary and usage instructions.
5. **CHANGELOG** — If modifying an existing project, create or append to CHANGELOG.md with a dated entry describing what changed.

### 3.5 Model & API Key Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-30 | Command `/model <name>` switches the active model for OpenCode in the current session | P0 |
| FR-31 | Command `/models` lists available models and the currently active one | P0 |
| FR-32 | Command `/apikey <provider> <key>` stores an API key for a model provider | P0 |
| FR-33 | API keys are encrypted at rest using AES-256-GCM with a server-side master key | P0 |
| FR-34 | The bot deletes the user's `/apikey` message immediately after processing (Telegram only) | P0 |
| FR-35 | Command `/apikey list` shows configured providers (keys masked) | P1 |
| FR-36 | Model config is written to the OpenCode config file in the session directory before each invocation | P0 |

### 3.6 Session & Project Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-40 | Command `/new <name>` creates a new project directory and switches to it | P0 |
| FR-41 | Command `/switch <name>` switches the active project for the current chat | P0 |
| FR-42 | Command `/projects` lists all projects for the current chat | P0 |
| FR-43 | Command `/files` lists files in the current project directory (tree view, depth 2) | P1 |
| FR-44 | Command `/cat <path>` sends the content of a file as a message or document | P1 |
| FR-45 | Command `/status` shows current session info: project, model, running task | P0 |

### 3.7 Multi-User Collaboration (Telegram Groups)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-50 | When the bot is added to a Telegram group, the group chat ID becomes the session key — all members share one project directory | P0 |
| FR-51 | All group members on the `ALLOWED_CHAT_IDS` whitelist (or the group ID itself) can send prompts | P0 |
| FR-52 | Each message is attributed with the sender's display name in the OpenCode prompt context (e.g., `[User: Alice] fix the login bug`) | P0 |
| FR-53 | The task queue is shared — concurrent requests from different users are queued sequentially with attribution | P0 |
| FR-54 | Commands `/model`, `/apikey`, `/new`, `/switch` require admin permission in the group (Telegram `getChatMember` check) | P1 |
| FR-55 | Bot responds in-thread (reply to the requesting message) to keep group conversations organized | P1 |

### 3.8 Git Integration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-60 | Auto-initialize a Git repo (`git init`) when a new project directory is created | P0 |
| FR-61 | On task completion, create a new branch named `<task-brief>-<YYYYMMDD-HHmmss>` from the current HEAD | P0 |
| FR-62 | Branch name derivation: take the first ~40 characters of the task prompt, kebab-case, strip non-alphanumeric (except hyphens), append datetime. Example: `add-auth-middleware-20260316-143022` | P0 |
| FR-63 | Auto-commit all changed/new files on the task branch with a commit message summarizing the task | P0 |
| FR-64 | Command `/branches` lists all branches in the current project | P1 |
| FR-65 | Command `/checkout <branch>` switches the working directory to a specific branch | P1 |
| FR-66 | Command `/push` pushes the current branch to the configured remote (if `GIT_REMOTE_URL` is set) | P1 |
| FR-67 | Command `/diff` shows the diff of uncommitted changes or the last commit | P1 |
| FR-68 | Initial commit on `main` branch is created at project init with a `.gitignore` (node_modules, .env, etc.) | P0 |

### 3.9 File Upload Support

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-80 | Detect incoming file uploads (documents, images, archives, code files) from Telegram and WhatsApp | P0 |
| FR-81 | Save uploaded files to `<project_dir>/uploads/<original_filename>`. If a file with the same name exists, append a numeric suffix (e.g., `file_2.py`) | P0 |
| FR-82 | Confirm upload with file path relative to project root (e.g., "📎 Saved to `uploads/schema.sql`") | P0 |
| FR-83 | If the upload message includes a text caption, treat the caption as a prompt that references the uploaded file. Prepend "The user has uploaded a file at `uploads/<filename>`. " to the prompt sent to OpenCode | P0 |
| FR-84 | If the upload has no caption, just save and confirm — do not trigger OpenCode | P0 |
| FR-85 | Command `/uploads` lists all files in the `uploads/` directory of the current project | P1 |
| FR-86 | Command `/rm <path>` deletes a file from the project directory (with confirmation prompt) | P1 |
| FR-87 | Size limit: reject files larger than `MAX_UPLOAD_SIZE_MB` (configurable, default 50MB) | P0 |

---

## 4. Bot Commands Reference

| Command | Description | Platform |
|---------|-------------|----------|
| `/start` | Initialize bot, create default project directory | Both |
| `/help` | Show command reference | Both |
| `/new <name>` | Create and switch to a new project | Both |
| `/switch <name>` | Switch active project | Both |
| `/projects` | List all projects | Both |
| `/files` | List files in current project (tree) | Both |
| `/cat <path>` | View file contents | Both |
| `/status` | Show session status (project, model, task) | Both |
| `/model <name>` | Switch OpenCode model | Both |
| `/models` | List available models | Both |
| `/apikey <provider> <key>` | Configure API key (auto-deleted on Telegram) | Both |
| `/apikey list` | Show configured providers (masked keys) | Both |
| `/cancel` | Cancel the currently running OpenCode task | Both |
| `/clear` | Clear session state (keeps project files) | Both |
| `/branches` | List all Git branches in current project | Both |
| `/checkout <branch>` | Switch to a specific Git branch | Both |
| `/push` | Push current branch to remote (requires `GIT_REMOTE_URL`) | Both |
| `/diff` | Show diff of uncommitted changes or last commit | Both |
| `/uploads` | List uploaded files in current project | Both |
| `/rm <path>` | Delete a file from project directory (with confirmation) | Both |

---

## 5. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NF-01 | API key encryption at rest (AES-256-GCM) | Security |
| NF-02 | User whitelist via chat ID (configurable in .env) | Security |
| NF-03 | Process isolation: one OpenCode subprocess per session, queued | Stability |
| NF-04 | Graceful shutdown: SIGTERM kills running OpenCode processes cleanly | Reliability |
| NF-05 | Configurable task timeout (default 10 min) | Reliability |
| NF-06 | Message throttling: max 1 edit/send per 2s per chat (Telegram), max 1 message per 3s (WhatsApp) | Platform compliance |
| NF-07 | Structured logging (pino) with session context | Observability |
| NF-08 | Environment-based configuration (.env file) | Operability |
| NF-09 | Docker-ready (Dockerfile + docker-compose.yml) | Deployment |
| NF-10 | Memory: no more than 200MB base + 100MB per active OpenCode session | Performance |
| NF-11 | File upload path sanitization (no directory traversal) | Security |
| NF-12 | Git operations are non-blocking — failure does not prevent task output delivery | Reliability |

---

## 6. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js 20+ / TypeScript 5+ | ESM modules |
| Telegram SDK | grammy | Lightweight, well-typed Telegram Bot API framework |
| WhatsApp SDK | whatsapp-web.js or Baileys | Unofficial; risk of account ban noted in README |
| Process Management | Node child_process (spawn) | Streaming stdout/stderr via readline |
| Encryption | Node crypto (AES-256-GCM) | For API key storage |
| Logging | pino | Structured JSON logging |
| Testing | vitest | Unit + integration tests |
| Containerization | Docker + docker-compose | Optional but recommended |
| Package Manager | pnpm | — |
| Git | simple-git | Programmatic Git operations (branch, commit, push) |

---

## 7. Project Structure

```
coderelay/
├─ src/
│   ├─ index.ts                    # Entry point
│   ├─ config.ts                   # Env config loader
│   ├─ transport/
│   │   ├─ telegram.ts             # Telegram bot adapter
│   │   ├─ whatsapp.ts             # WhatsApp adapter
│   │   └─ types.ts                # Shared transport interface
│   ├─ session/
│   │   ├─ manager.ts              # Session lifecycle & multi-user group mapping
│   │   └─ store.ts                # Persistent session state
│   ├─ runner/
│   │   ├─ opencode.ts             # OpenCode subprocess manager
│   │   ├─ parser.ts               # Output stream parser
│   │   └─ workflow-prompt.ts      # System prompt template
│   ├─ formatter/
│   │   ├─ telegram.ts             # Telegram MarkdownV2 formatter
│   │   └─ whatsapp.ts             # WhatsApp formatter
│   ├─ crypto/
│   │   └─ keystore.ts             # AES-256-GCM key encryption
│   ├─ git/
│   │   └─ manager.ts              # Git init, branch, commit, push via simple-git
│   ├─ files/
│   │   └─ handler.ts              # File upload receive, save, dedup naming
│   └─ commands/
│       ├─ index.ts                # Command router
│       ├─ project.ts              # /new, /switch, /projects, /files, /cat
│       ├─ model.ts                # /model, /models, /apikey
│       ├─ session.ts              # /status, /cancel, /clear
│       ├─ git.ts                  # /branches, /checkout, /push, /diff
│       └─ file.ts                 # /uploads, /rm
├─ tests/
│   ├─ runner.test.ts
│   ├─ parser.test.ts
│   ├─ session.test.ts
│   ├─ crypto.test.ts
│   ├─ git.test.ts
│   └─ files.test.ts
├─ .env.example
├─ Dockerfile
├─ docker-compose.yml
├─ tsconfig.json
├─ package.json
└─ README.md
```

---

## 8. Configuration (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token from BotFather | (required) |
| `WHATSAPP_ENABLED` | Enable WhatsApp adapter | `false` |
| `ALLOWED_CHAT_IDS` | Comma-separated whitelist of chat IDs | (required) |
| `WORKSPACE_ROOT` | Root directory for project workspaces | `./workspaces` |
| `OPENCODE_BIN` | Path to the opencode binary | `opencode` |
| `TASK_TIMEOUT_MS` | Max execution time per OpenCode task | `600000` |
| `MASTER_KEY` | 32-byte hex key for API key encryption | (required, generate with `openssl rand -hex 32`) |
| `DEFAULT_MODEL` | Default OpenCode model name | `claude-sonnet-4-20250514` |
| `LOG_LEVEL` | Logging level | `info` |
| `GIT_REMOTE_URL` | Optional Git remote URL for `/push` command | (empty — local only) |
| `GIT_USER_NAME` | Git commit author name | `CodeRelay` |
| `GIT_USER_EMAIL` | Git commit author email | `bridge@localhost` |
| `MAX_UPLOAD_SIZE_MB` | Maximum file upload size in MB | `50` |

---

## 9. Workflow System Prompt

The following system prompt is prepended to every user request sent to OpenCode. It enforces the spec-first, TDD workflow:

> For every coding request, follow this exact workflow:
>
> 1. **SPEC**: Create or update SPEC.md with a brief specification of what you are about to build. Include acceptance criteria.
> 2. **TEST**: Write failing tests (test files in `tests/` directory) based on the spec. Run them to confirm they fail.
> 3. **IMPLEMENT**: Write the minimum code to make all tests pass. Iterate until green.
> 4. **README**: Generate or update README.md with a features summary and usage instructions.
> 5. **CHANGELOG**: If this is a modification to an existing project, create or append to CHANGELOG.md with a dated entry describing what changed.
>
> Always announce which step you are on (e.g., `[SPEC] Writing specification...`, `[TEST] Creating test cases...`).

---

## 10. Error Handling

| Scenario | Behavior |
|----------|----------|
| OpenCode not found in PATH | Send error message with installation instructions; do not crash |
| OpenCode process exits non-zero | Send last 20 lines of stderr to chat, formatted as error block |
| Task timeout exceeded | Kill process (SIGTERM → SIGKILL after 5s), notify user |
| Invalid `/apikey` format | Reply with usage example; do not store anything |
| Telegram API rate limit (429) | Exponential backoff with jitter, queue pending messages |
| WhatsApp disconnection | Attempt reconnection with backoff; notify Telegram channel if configured |
| Concurrent request on same session | Queue with position notification ("Your request is #2 in queue") |
| Disk space exhaustion | Check before spawning; warn if <500MB free |
| File upload exceeds size limit | Reject with message showing limit and actual size |
| File upload with duplicate name | Append numeric suffix (`_2`, `_3`, ...) and confirm with actual saved path |
| Git commit failure | Notify user with error; task output is still delivered (git failure is non-blocking) |
| Git push failure (no remote / auth) | Notify user; suggest checking `GIT_REMOTE_URL` and credentials |
| Group member not whitelisted | Silently ignore messages from non-whitelisted users; respond only to whitelisted members or if group ID itself is whitelisted |

---

## 11. Security Considerations

- API keys are never logged, echoed in messages, or stored in plaintext. Encrypted with AES-256-GCM using `MASTER_KEY`.
- On Telegram, `/apikey` messages are deleted immediately after processing via `deleteMessage` API.
- On WhatsApp, the user is warned that message deletion is not guaranteed on their device and should manually delete.
- Chat ID whitelist prevents unauthorized users from interacting with the bot.
- OpenCode processes run as the same user as the bot; consider running in a Docker container with limited capabilities for isolation.
- The bot does not expose any HTTP endpoints (Telegram long-polling mode); webhook mode should be behind HTTPS reverse proxy.
- Uploaded files are saved only to the session's project directory; path traversal in filenames is sanitized (strip `..`, `/`, `\`).
- In Telegram groups, admin-only commands (`/model`, `/apikey`, `/new`, `/switch`) check membership status via Telegram API before executing.
- Git credentials for `/push` (if using HTTPS remote) should be configured via Git credential helper or SSH keys on the host, never stored in `.env`.

---

## 12. Future Extensions (Out of Scope for v1.2)

- Web dashboard for session monitoring and project file browsing
- Voice message transcription (Telegram/WhatsApp voice → Whisper → text → OpenCode)
- OpenCode library/API integration if/when available (replacing CLI subprocess)
- PR auto-creation (auto-open pull/merge request on remote after push)
- Image/screenshot input support (OCR → text → OpenCode)
- Scheduled tasks (cron-like recurring OpenCode invocations)
- Session export (zip entire project directory and send as file)

---

## Appendix A: OpenCode CLI Invocation

The runner module constructs and spawns the OpenCode command as follows (pseudocode):

```typescript
const child = spawn(OPENCODE_BIN, [prompt], {
  cwd: sessionProjectDir,
  env: { ...process.env, ...modelEnvVars },
  stdio: ['ignore', 'pipe', 'pipe']
});
```

The exact CLI flags and non-interactive mode invocation should be confirmed against the current OpenCode documentation at build time, as the tool is actively evolving.
