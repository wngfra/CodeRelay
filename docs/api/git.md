---
title: Git Manager API
description: API reference for GitManager and deriveBranchName() handling repo initialization, task branching, auto-commits, push, and diff via simple-git.
---

# Git Manager

**File:** `src/git/manager.ts`

Programmatic Git operations via [simple-git](https://github.com/steveukx/git-js). Handles repo initialization, task branching, auto-commits, push, and diff.

## Functions

### `deriveBranchName(taskPrompt)`

```typescript
function deriveBranchName(taskPrompt: string): string
```

Generates a branch name from a task prompt.

**Algorithm:**

1. Take the first ~40 characters of the prompt
2. Lowercase
3. Strip non-alphanumeric characters (except spaces and hyphens)
4. Replace spaces with hyphens
5. Collapse multiple hyphens
6. Trim leading/trailing hyphens
7. Append `-YYYYMMDD-HHmmss` timestamp
8. Fall back to `task` if the result is empty

**Examples:**

| Input | Output |
|-------|--------|
| `'add auth middleware'` | `add-auth-middleware-20260316-143022` |
| `'fix bug #123 (urgent!)'` | `fix-bug-123-urgent-20260316-143022` |
| `''` | `task-20260316-143022` |
| `'!!!@@@'` | `task-20260316-143022` |

## Class: `GitManager`

```typescript
class GitManager {
  constructor();
}
```

Reads `GIT_USER_NAME`, `GIT_USER_EMAIL`, and `GIT_REMOTE_URL` from config.

### Methods

#### `initRepo(projectDir)`

```typescript
async initRepo(projectDir: string): Promise<void>
```

Initializes a Git repo in the project directory (if not already initialized):

1. `git init`
2. Configure `user.name` and `user.email`
3. Create `.gitignore` (if missing) with default rules
4. `git add .gitignore && git commit -m "Initial commit"`
5. Rename branch to `main`

No-ops if `.git/` already exists.

#### `commitTask(projectDir, taskPrompt)`

```typescript
async commitTask(
  projectDir: string,
  taskPrompt: string
): Promise<{ branchName: string; filesChanged: string[] } | null>
```

Creates a task branch, stages all changes, and commits:

1. Ensures repo is initialized (calls `initRepo`)
2. Derives branch name from task prompt
3. Creates and checks out the branch (`git checkout -b`)
4. Stages all changes (`git add -A`)
5. If no changes, checks out `main` and returns `null`
6. Commits with message `[Nuntia] <first 100 chars of prompt>`
7. Returns `{ branchName, filesChanged }`

Returns `null` if there are no changes to commit or if an error occurs. Errors are logged but not thrown (non-blocking).

#### `listBranches(projectDir)`

```typescript
async listBranches(
  projectDir: string
): Promise<{ current: string; all: string[] }>
```

Returns the current branch name and all local branch names. Falls back to `{ current: 'main', all: ['main'] }` on error.

#### `checkout(projectDir, branchName)`

```typescript
async checkout(projectDir: string, branchName: string): Promise<boolean>
```

Checks out a branch. Returns `true` on success, `false` on failure.

#### `push(projectDir)`

```typescript
async push(
  projectDir: string
): Promise<{ success: boolean; message: string }>
```

Pushes the current branch to the configured remote:

1. Returns error if `GIT_REMOTE_URL` is not configured
2. Adds `origin` remote if not already present
3. Pushes with `--set-upstream`
4. Returns `{ success, message }`

#### `getDiff(projectDir)`

```typescript
async getDiff(projectDir: string): Promise<string>
```

Returns the diff of uncommitted changes. If the working tree is clean, returns the diff of the last commit (`HEAD~1..HEAD`). Returns `'No changes found'` if neither exists.

## Non-Blocking Design

All `GitManager` methods catch errors internally and return safe fallback values. Git failures never prevent task output delivery. Errors are logged via pino.
