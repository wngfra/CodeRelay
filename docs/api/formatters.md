---
title: Formatters API
description: API reference for Telegram MarkdownV2 and WhatsApp plain-text formatting functions including stage transitions, code blocks, diffs, and task summaries.
---

# Formatters

**Files:** `src/formatter/telegram.ts`, `src/formatter/whatsapp.ts`

Platform-specific output formatting. Both modules export the same function signatures with different implementations.

## Telegram Formatter

**File:** `src/formatter/telegram.ts`

Formats output for Telegram's [MarkdownV2](https://core.telegram.org/bots/api#markdownv2-style) parse mode.

### `escapeMarkdownV2(text)`

```typescript
function escapeMarkdownV2(text: string): string
```

Escapes all MarkdownV2 special characters: `_ * [ ] ( ) ~ \` > # + - = | { } . ! \`.

```typescript
escapeMarkdownV2('hello_world');  // 'hello\\_world'
escapeMarkdownV2('2 + 2 = 4');   // '2 \\+ 2 \\= 4'
```

### `formatStageTransition(stage)`

```typescript
function formatStageTransition(stage: AgentStage): string
```

Returns an emoji + bold label in MarkdownV2:

| Stage | Output |
|-------|--------|
| `planning` | `📋 *Planning*` |
| `writing` | `✍️ *Writing*` |
| `reviewing` | `🔍 *Reviewing*` |
| `testing` | `🧪 *Testing*` |
| `complete` | `✅ *Complete*` |
| `error` | `❌ *Error*` |

### `formatCodeBlock(code, language?)`

```typescript
function formatCodeBlock(code: string, language?: string): string
```

Wraps code in a fenced code block. Default language is empty.

```typescript
formatCodeBlock('const x = 1;', 'typescript');
// ````typescript
// const x = 1;
// ````
```

### `formatError(error)`

```typescript
function formatError(error: string): string
```

Formats an error with emoji and code block: ``❌ *Error*`` followed by a fenced code block containing the error text.

### `formatDiff(diffLines)`

```typescript
function formatDiff(diffLines: string[]): string
```

Formats diff lines in a `diff`-tagged code block. Truncates at 50 lines with `... [truncated]`.

### `formatTaskSummary(branchName, filesChanged, testsPassed)`

```typescript
function formatTaskSummary(
  branchName: string | null,
  filesChanged: string[],
  testsPassed: boolean | null
): string
```

Formats the task completion summary with branch name, files changed list (max 10 shown), and test status.

### `formatOutputBatch(lines, maxLength?)`

```typescript
function formatOutputBatch(lines: ParsedLine[], maxLength?: number): string
```

Formats a batch of parsed output lines for a single Telegram message. Stage transitions get emoji formatting; other lines are escaped. Default `maxLength` is 4000 characters.

### `truncateWithNotice(text, maxLength?)`

```typescript
function truncateWithNotice(text: string, maxLength?: number): string
```

Truncates text and appends `[truncated — full output in project directory]` if it exceeds `maxLength` (default 4000).

---

## WhatsApp Formatter

**File:** `src/formatter/whatsapp.ts`

Exports a subset of the Telegram formatter's functions, adapted for WhatsApp-compatible formatting. Notably missing `escapeMarkdownV2` (not needed) and `formatDiff` (not implemented for WhatsApp).

- Bold: `*text*`
- Code: triple backticks
- No MarkdownV2 escaping needed

### Differences from Telegram

| Feature | Telegram | WhatsApp |
|---------|----------|----------|
| Bold syntax | `*text*` (MarkdownV2) | `*text*` |
| Code blocks | `` ```language `` | ` ``` ` (no language tag) |
| Special char escaping | Required (`\\_`, `\\*`, etc.) | Not needed |
| Message editing | Supported via `editMessageId` | Not supported |

### Functions

The WhatsApp formatter exports these functions (`escapeMarkdownV2` and `formatDiff` are Telegram-only):

- `formatStageTransition(stage)` — same emoji, WhatsApp bold
- `formatCodeBlock(code)` — no language parameter
- `formatError(error)` — same format
- `formatTaskSummary(branchName, filesChanged, testsPassed)`
- `formatOutputBatch(lines, maxLength?)`
- `truncateWithNotice(text, maxLength?)`

## Usage in the Orchestrator

The entry point (`src/index.ts`) selects the formatter based on the message platform:

```typescript
import * as telegramFmt from './formatter/telegram.js';
import * as whatsappFmt from './formatter/whatsapp.js';

const label = msg.platform === 'telegram'
  ? telegramFmt.formatStageTransition(stage)
  : whatsappFmt.formatStageTransition(stage);
```
