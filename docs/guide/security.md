# Security

## API Key Protection

API keys stored via `/apikey` are protected at multiple levels:

### Encryption at Rest

Keys are encrypted with **AES-256-GCM** before writing to disk:

- 16-byte random IV per entry (no IV reuse)
- 16-byte authentication tag (tamper detection)
- Master key from `MASTER_KEY` environment variable (32 bytes / 64 hex chars)

Stored in `<WORKSPACE_ROOT>/.nuntia/keystore.json`:

```json
{
  "anthropic": {
    "iv": "a1b2c3...",
    "tag": "d4e5f6...",
    "ciphertext": "789abc..."
  }
}
```

### Message Deletion

- **Telegram:** The `/apikey` message is automatically deleted via `deleteMessage` API after processing
- **WhatsApp:** The user is warned to manually delete the message (WhatsApp doesn't support reliable bot-initiated deletion)

### No Logging

API keys are never:
- Written to log output
- Echoed back in chat messages
- Stored in plaintext anywhere

The `/apikey list` command shows only masked keys: `sk-a...xyz9`

## Access Control

### Chat ID Whitelist

The `ALLOWED_CHAT_IDS` environment variable controls who can interact with the bot:

- Messages from non-whitelisted chats are **silently ignored** (no error response)
- Both the **chat ID** (session key) and the **sender's user ID** are checked
- For groups, whitelisting the group ID allows all group members to interact

### Admin-Only Commands

In Telegram groups, sensitive commands require admin permission (checked via `getChatMember` API):

| Command | Reason |
|---------|--------|
| `/model` | Changes model for all group members |
| `/apikey` | Manages shared API keys |
| `/new` | Creates shared project directories |
| `/switch` | Changes active project for entire group |

## File Upload Security

### Path Traversal Prevention

Uploaded filenames are sanitized before saving:

- `../` and `..\\` sequences are stripped
- Forward slashes and backslashes are stripped
- Leading dots are stripped

File read and delete operations validate that the resolved absolute path is within the project directory. Attempts to access paths outside the project are blocked.

### Size Limits

Files exceeding `MAX_UPLOAD_SIZE_MB` (default 50MB) are rejected before download.

## Process Isolation

Each OpenCode task runs as a child process with:

- `cwd` set to the session's project directory
- `stdin` set to `ignore` (no interactive input)
- Configurable timeout (`TASK_TIMEOUT_MS`, default 10 minutes)
- Kill escalation: SIGTERM, then SIGKILL after 5 seconds

### Docker Deployment

For additional isolation, run Nuntia in Docker:

```yaml
services:
  nuntia:
    build: .
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    volumes:
      - workspaces:/data/workspaces
```

## Network Exposure

- **No HTTP endpoints** — Telegram uses long polling by default
- If using webhook mode, place behind an HTTPS reverse proxy
- WhatsApp connection is outbound-only (WebSocket to WhatsApp servers)

## Git Credentials

For `/push` with HTTPS remotes, configure authentication via:

- SSH keys on the host (recommended)
- Git credential helper (`git config credential.helper store`)

Never store Git passwords in `.env` or environment variables.

## Recommendations

1. **Generate a strong `MASTER_KEY`:** `openssl rand -hex 32`
2. **Restrict `ALLOWED_CHAT_IDS`** to only trusted users
3. **Run in Docker** for process-level isolation
4. **Use SSH keys** for Git remote authentication
5. **Set `LOG_LEVEL=warn`** in production to avoid verbose output
6. **Use a dedicated WhatsApp number** — unofficial API carries ban risk
