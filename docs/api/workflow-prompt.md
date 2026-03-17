---
title: Workflow Prompt API
description: API reference for WORKFLOW_SYSTEM_PROMPT and buildPrompt() that enforce the spec-first TDD workflow on every OpenCode task.
---

# Workflow Prompt

**File:** `src/runner/workflow-prompt.ts`

The system prompt prepended to every user request sent to OpenCode. Enforces the spec-first, TDD workflow.

## Constants

### `WORKFLOW_SYSTEM_PROMPT`

```typescript
const WORKFLOW_SYSTEM_PROMPT: string
```

The full system prompt text:

> For every coding request, follow this exact workflow:
>
> 1. **SPEC**: Create or update SPEC.md with a brief specification of what you are about to build. Include acceptance criteria.
> 2. **TEST**: Write failing tests (test files in `tests/` directory) based on the spec. Run them to confirm they fail.
> 3. **IMPLEMENT**: Write the minimum code to make all tests pass. Iterate until green.
> 4. **README**: Generate or update README.md with a features summary and usage instructions.
> 5. **CHANGELOG**: If this is a modification to an existing project, create or append to CHANGELOG.md with a dated entry describing what changed.
>
> Always announce which step you are on (e.g., `[SPEC] Writing specification...`, `[TEST] Creating test cases...`).

## Functions

### `buildPrompt(userMessage, senderName?)`

```typescript
function buildPrompt(userMessage: string, senderName?: string): string
```

Constructs the full prompt for OpenCode by prepending the workflow system prompt and optional user attribution.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `userMessage` | `string` | The user's coding request |
| `senderName` | `string?` | Sender name for group attribution |

**Returns:** The complete prompt string.

**Example:**

```typescript
buildPrompt('fix the login bug');
// → WORKFLOW_SYSTEM_PROMPT + '\nfix the login bug'

buildPrompt('fix the login bug', 'Alice');
// → WORKFLOW_SYSTEM_PROMPT + '\n[User: Alice] fix the login bug'
```

### `buildFileReferencePrompt(userMessage, filePath, senderName?)`

```typescript
function buildFileReferencePrompt(
  userMessage: string,
  filePath: string,
  senderName?: string
): string
```

Like `buildPrompt`, but also injects a file reference sentence.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `userMessage` | `string` | The user's coding request |
| `filePath` | `string` | Relative path to the uploaded file |
| `senderName` | `string?` | Sender name for group attribution |

**Example:**

```typescript
buildFileReferencePrompt('implement this UI', 'uploads/mockup.png');
// → WORKFLOW_SYSTEM_PROMPT + '\nThe user has uploaded a file at `uploads/mockup.png`. implement this UI'

buildFileReferencePrompt('implement this', 'uploads/design.fig', 'Bob');
// → WORKFLOW_SYSTEM_PROMPT + '\n[User: Bob] The user has uploaded a file at `uploads/design.fig`. implement this'
```
