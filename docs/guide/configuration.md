# Configuration

All configuration is via environment variables loaded from a `.env` file.

## Required Variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token from [@BotFather](https://t.me/BotFather) |
| `ALLOWED_CHAT_IDS` | Comma-separated whitelist of chat IDs (user IDs or group IDs) |
| `MASTER_KEY` | 32-byte hex string for AES-256-GCM encryption. Generate: `openssl rand -hex 32` |

## Optional Variables

### Transport

| Variable | Default | Description |
|----------|---------|-------------|
| `WHATSAPP_ENABLED` | `false` | Set to `true` to enable the WhatsApp adapter |

### Workspace

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_ROOT` | `./workspaces` | Root directory for all project workspaces |
| `OPENCODE_BIN` | `opencode` | Path to the OpenCode CLI binary |
| `TASK_TIMEOUT_MS` | `600000` | Maximum task execution time (10 minutes) |

### Model

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_MODEL` | `claude-sonnet-4-20250514` | Default OpenCode model |

### Git

| Variable | Default | Description |
|----------|---------|-------------|
| `GIT_REMOTE_URL` | _(empty)_ | Remote URL for `/push`. Leave empty for local-only |
| `GIT_USER_NAME` | `Nuntia` | Git commit author name |
| `GIT_USER_EMAIL` | `nuntia@localhost` | Git commit author email |

### Files

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum file upload size in MB |

### Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Pino log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

## Example `.env`

```dotenv
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v
WHATSAPP_ENABLED=false
ALLOWED_CHAT_IDS=111222333,444555666
WORKSPACE_ROOT=./workspaces
OPENCODE_BIN=opencode
TASK_TIMEOUT_MS=600000
MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
DEFAULT_MODEL=claude-sonnet-4-20250514
LOG_LEVEL=info
GIT_REMOTE_URL=
GIT_USER_NAME=Nuntia
GIT_USER_EMAIL=nuntia@localhost
MAX_UPLOAD_SIZE_MB=50
```

## Directory Structure

The workspace root organizes projects by platform and chat:

```
WORKSPACE_ROOT/
├── tg_<user_chat_id>/          # Telegram DM
│   ├── default/                # Default project
│   └── my-api/                 # Named project (via /new)
├── tg_group_<group_id>/        # Telegram group (shared by all members)
│   └── default/
├── wa_<chat_jid>/              # WhatsApp chat
│   └── default/
└── .nuntia/                    # Internal state
    ├── sessions.json           # Session persistence
    ├── keystore.json           # Encrypted API keys
    └── whatsapp-auth/          # WhatsApp auth state
```

Each project directory contains:

```
default/
├── uploads/       # User-uploaded files
├── .git/          # Auto-initialized Git repo
├── .gitignore     # Default ignore rules
└── ...            # Project files created by OpenCode
```

## WhatsApp Setup

When `WHATSAPP_ENABLED=true`, the bot prints a QR code to the terminal on first start. Scan it with WhatsApp to authenticate. Auth state is persisted to `<WORKSPACE_ROOT>/.nuntia/whatsapp-auth/`, so you only need to scan once.

::: warning
WhatsApp Web automation uses an unofficial API. There is a risk of account restrictions. Use a dedicated number.
:::

## Chat ID Whitelist

The `ALLOWED_CHAT_IDS` variable controls access. It accepts:

- **User chat IDs** — for Telegram DMs
- **Group chat IDs** — whitelists the entire group (all members can interact)
- **Individual user IDs** — checked as fallback if the group ID is not whitelisted

Messages from non-whitelisted chats are silently ignored.
