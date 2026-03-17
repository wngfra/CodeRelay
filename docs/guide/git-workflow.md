---
title: Git Workflow
description: How Nuntia automatically manages Git repositories, creates descriptive task branches, commits changes on completion, and pushes to remotes.
---

# Git Workflow

Nuntia automatically manages Git repositories for each project, creating branches and commits for every completed task.

## Auto-Initialization

When a new project is created (via `/new` or `/start`), Nuntia:

1. Runs `git init`
2. Configures `user.name` and `user.email` from `GIT_USER_NAME` / `GIT_USER_EMAIL`
3. Creates a `.gitignore` with default rules (`node_modules/`, `dist/`, `.env`, `*.log`)
4. Creates an initial commit on the `main` branch

## Task Branching

When a coding task completes successfully, Nuntia:

1. **Creates a new branch** from the current HEAD
2. **Stages all changes** (`git add -A`)
3. **Commits** with the message `[Nuntia] <task description>`
4. **Reports** the branch name and changed files to chat

### Branch Naming

Branch names are derived from the task prompt:

```
Task: "add authentication middleware with JWT support"
Branch: add-authentication-middleware-with-jwt-s-20260316-143022
```

Rules:
- First ~40 characters of the prompt
- Lowercased and kebab-cased
- Non-alphanumeric characters (except hyphens) stripped
- `YYYYMMDD-HHmmss` timestamp appended
- Falls back to `task-<timestamp>` for empty/special-char-only prompts

### Example Output

After task completion, the bot sends:

```
✅ Task Complete

📌 Branch: add-auth-middleware-20260316-143022
📁 Files changed (5):
  - src/middleware/auth.ts
  - src/middleware/jwt.ts
  - tests/auth.test.ts
  - SPEC.md
  - README.md
🧪 Tests: ✅ Passed
```

## Git Commands

### `/branches`

Lists all local branches with the current one marked:

```
→ add-auth-middleware-20260316-143022 (current)
  fix-login-bug-20260315-091500
  main
```

### `/checkout <branch>`

Switches to a specific branch:

```
/checkout main
→ Switched to branch: main
```

### `/diff`

Shows uncommitted changes. If the working tree is clean, shows the diff of the last commit.

### `/push`

Pushes the current branch to the configured remote. Requires `GIT_REMOTE_URL` in `.env`.

```
/push
→ Pushed successfully: Pushed add-auth-middleware-20260316-143022 to origin
```

## Non-Blocking Design

Git operations are intentionally non-blocking:

- If `git commit` fails, the task output is still delivered to chat
- If `git push` fails, the user is notified with the error message
- A missing Git repo is auto-initialized before each task

This ensures coding output is never lost due to Git issues.

## Remote Configuration

To enable `/push`, set the remote URL in `.env`:

```dotenv
GIT_REMOTE_URL=git@github.com:your-org/project.git
```

Authentication should use SSH keys or a Git credential helper configured on the host. Do not store Git credentials in `.env`.
