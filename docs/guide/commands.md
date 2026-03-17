---
title: Bot Commands
description: Reference for all 19 Nuntia bot commands covering project management, model selection, API keys, session control, Git operations, and file management.
---

# Bot Commands

All commands work on both Telegram and WhatsApp unless noted otherwise.

## Quick Reference

| Command | Description |
|---------|-------------|
| `/start` | Initialize bot and create default project |
| `/help` | Show command list |
| `/new <name>` | Create and switch to a new project |
| `/switch <name>` | Switch active project |
| `/projects` | List all projects |
| `/files` | List project files (tree, depth 2) |
| `/cat <path>` | View file contents |
| `/status` | Show session info |
| `/model <name>` | Switch OpenCode model |
| `/models` | List available models |
| `/apikey <provider> <key>` | Store an API key |
| `/apikey list` | Show configured providers |
| `/cancel` | Cancel running task |
| `/clear` | Clear session state |
| `/branches` | List Git branches |
| `/checkout <branch>` | Switch Git branch |
| `/push` | Push branch to remote |
| `/diff` | Show uncommitted or last-commit diff |
| `/uploads` | List uploaded files |
| `/rm <path>` | Delete a file |

## Project Management

### `/start`

Initializes the bot session for the current chat. Creates a `default` project directory, initializes a Git repo, and shows current settings.

### `/new <name>`

Creates a new project directory and switches to it. The name is sanitized (non-alphanumeric characters replaced with `_`). A Git repo is auto-initialized.

```
/new my-api
→ Created and switched to project: my-api
```

### `/switch <name>`

Switches the active project for the current chat. The project must already exist.

```
/switch my-api
→ Switched to project: my-api
```

### `/projects`

Lists all projects for the current chat, with the active one marked.

```
→ my-api (active)
  default
  experiment
```

### `/files`

Displays a tree view of files in the current project (max depth 2). Hidden files and `node_modules` are excluded.

### `/cat <path>`

Sends the contents of a file as a code block. Large files are truncated at 4000 characters or sent as a document attachment.

```
/cat src/index.ts
```

## Model & API Key Management

### `/model <name>`

Switches the OpenCode model for the current session. Accepts any model name — not restricted to the preset list.

```
/model gpt-4o
→ Model switched to: gpt-4o
```

### `/models`

Lists preset model names with the currently active one marked. Custom model names set via `/model` are also supported.

### `/apikey <provider> <key>`

Stores an API key for a model provider. The key is encrypted with AES-256-GCM before writing to disk.

```
/apikey anthropic sk-ant-api03-...
```

**Telegram:** The user's message containing the key is automatically deleted after processing.

**WhatsApp:** A warning is shown reminding the user to manually delete their message.

### `/apikey list`

Shows all configured providers with masked keys (e.g., `sk-a...xyz9`).

## Session Management

### `/status`

Shows current session state:
- Active project name
- Current model
- Task status (running/idle)
- Queue depth
- Last activity timestamp

### `/cancel`

Sends SIGTERM to the running OpenCode process (SIGKILL after 5 seconds if it doesn't exit). The task is marked complete and any queued requests proceed.

### `/clear`

Resets session state (model, task status) without deleting project files. Kills any running task.

## Git Commands

### `/branches`

Lists all local branches in the current project, with the current branch marked.

### `/checkout <branch>`

Switches the working directory to a specific branch. Fails if the branch doesn't exist or there are conflicts.

### `/push`

Pushes the current branch to the configured remote (`GIT_REMOTE_URL`). Automatically adds the remote as `origin` if not already configured. Returns an error if no remote URL is set.

### `/diff`

Shows the diff of uncommitted changes. If the working tree is clean, shows the diff of the last commit instead.

## File Commands

### `/uploads`

Lists all files in the current project's `uploads/` directory.

### `/rm <path>`

Deletes a file from the project directory. The path is sanitized to prevent directory traversal. The path is relative to the project root.

```
/rm uploads/old-mockup.png
→ Deleted: uploads/old-mockup.png
```

## Group Chat Behavior

In Telegram groups:

- **All members** on the `ALLOWED_CHAT_IDS` whitelist (or if the group ID itself is whitelisted) can send prompts
- **Admin-only commands:** `/model`, `/apikey`, `/new`, `/switch` require Telegram admin status
- **User attribution:** Each message includes `[User: Name]` in the OpenCode prompt
- **Task queue:** Concurrent requests from different users are queued sequentially
- **Reply threading:** Bot responds as a reply to the requesting message
