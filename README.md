# CodeRelay

Self-hosted bot that connects Telegram and WhatsApp to [OpenCode](https://github.com/opencode-ai/opencode)'s multi-agent coding pipeline. Send natural language coding requests via chat and receive real-time streaming feedback as OpenCode's agents execute the task.

## Features

- **Dual transport** — Telegram (grammY, long polling) and WhatsApp (Baileys, QR auth)
- **Real-time streaming** — agent stage transitions and output streamed to chat with batched throttling
- **TDD workflow enforcement** — every task follows SPEC → TEST → IMPLEMENT → README → CHANGELOG
- **Per-chat project directories** — isolated workspaces with Git auto-init
- **Auto Git branching** — completed tasks committed to `<task-brief>-<YYYYMMDD-HHmmss>` branches
- **Task queue** — sequential execution per session with position notifications
- **File uploads** — images, documents, archives saved to project with dedup naming and path traversal protection
- **AES-256-GCM key encryption** — API keys encrypted at rest, auto-deleted on Telegram
- **Multi-user groups** — shared project per group, user attribution, admin-only restricted commands
- **20 bot commands** — projects, models, git, files, session management

## Prerequisites

- Node.js 20+
- [OpenCode CLI](https://github.com/opencode-ai/opencode) installed and on PATH
- Telegram bot token from [@BotFather](https://t.me/BotFather)

## Quick Start

```bash
# Clone and install
git clone <repo-url> coderelay && cd coderelay
npm install

# Configure
cp .env.example .env
# Edit .env — set TELEGRAM_BOT_TOKEN, ALLOWED_CHAT_IDS, MASTER_KEY (generate with: openssl rand -hex 32)

# Run
npm run dev        # development (tsx, auto-reload)
npm run build      # compile TypeScript
npm start          # production (from dist/)
```

## Docker

```bash
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

## Configuration

All configuration is via `.env` file (see `.env.example`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | — | Token from @BotFather |
| `ALLOWED_CHAT_IDS` | Yes | — | Comma-separated whitelist of chat IDs |
| `MASTER_KEY` | Yes | — | 32-byte hex key for API key encryption |
| `WHATSAPP_ENABLED` | No | `false` | Enable WhatsApp adapter |
| `WORKSPACE_ROOT` | No | `./workspaces` | Root for project directories |
| `OPENCODE_BIN` | No | `opencode` | Path to opencode binary |
| `TASK_TIMEOUT_MS` | No | `600000` | Task timeout (10 min) |
| `DEFAULT_MODEL` | No | `claude-sonnet-4-20250514` | Default model |
| `LOG_LEVEL` | No | `info` | Logging level |
| `GIT_REMOTE_URL` | No | — | Remote for `/push` |
| `GIT_USER_NAME` | No | `CodeRelay` | Commit author name |
| `GIT_USER_EMAIL` | No | `bridge@localhost` | Commit author email |
| `MAX_UPLOAD_SIZE_MB` | No | `50` | Upload size limit |

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize bot and default project |
| `/help` | Show command reference |
| `/new <name>` | Create and switch to a new project |
| `/switch <name>` | Switch active project |
| `/projects` | List all projects |
| `/files` | List project files (tree view) |
| `/cat <path>` | View file contents |
| `/status` | Show session info (project, model, task) |
| `/model <name>` | Switch OpenCode model |
| `/models` | List available models |
| `/apikey <provider> <key>` | Store API key (auto-deleted on Telegram) |
| `/apikey list` | Show configured providers (masked) |
| `/cancel` | Cancel running task |
| `/clear` | Clear session state |
| `/branches` | List Git branches |
| `/checkout <branch>` | Switch Git branch |
| `/push` | Push current branch to remote |
| `/diff` | Show diff |
| `/uploads` | List uploaded files |
| `/rm <path>` | Delete a file |

In group chats, `/model`, `/apikey`, `/new`, and `/switch` require admin permissions.

## How It Works

1. User sends a message in Telegram/WhatsApp
2. Bot resolves the chat to a project directory and session
3. If a file is attached, it's saved to `uploads/` in the project
4. The message is prepended with a system prompt enforcing TDD workflow, then passed to OpenCode CLI
5. OpenCode's stdout is parsed line-by-line — stage transitions, diffs, test results, and errors are detected
6. Output is streamed to chat (Telegram: edit-in-place status message; WhatsApp: incremental messages)
7. On completion, all changes are auto-committed to a new branch named from the task
8. A summary (branch name, files changed, test status) is sent to chat

## Workspace Layout

```
workspaces/
├── tg_<chat_id>/            # Telegram DM projects
├── tg_group_<chat_id>/      # Telegram group shared projects
├── wa_<chat_id>/            # WhatsApp projects
│   ├── default/             # Default project
│   │   ├── uploads/         # User-uploaded files
│   │   ├── .git/
│   │   └── ...
│   └── my-project/          # Named project via /new
└── .bridge/                 # Session state, encrypted keys
    ├── sessions.json
    ├── keystore.json
    └── whatsapp-auth/
```

## Scripts

```bash
npm run dev          # Run with tsx (development)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled output
npm test             # Run tests (vitest)
npm run test:watch   # Run tests in watch mode
npm run lint         # Type-check without emitting
```

## Security Notes

- API keys are AES-256-GCM encrypted at rest — never logged or echoed
- `/apikey` messages are auto-deleted on Telegram
- Chat ID whitelist prevents unauthorized access
- File uploads are sanitized against directory traversal
- Git credentials for `/push` should use SSH keys or credential helpers, not `.env`
- Consider running in Docker for process isolation

## License

See [LICENSE](LICENSE).
