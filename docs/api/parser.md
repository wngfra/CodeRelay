# Output Parser

**File:** `src/runner/parser.ts`

Parses streaming output from the OpenCode CLI. Strips ANSI escape codes, classifies lines into agent stages, and detects diffs, test results, and error messages.

## Types

### `AgentStage`

```typescript
type AgentStage =
  | 'planning'
  | 'writing'
  | 'reviewing'
  | 'testing'
  | 'complete'
  | 'error'
  | 'unknown';
```

## Interfaces

### `ParsedLine`

```typescript
interface ParsedLine {
  raw: string;              // Original line as received
  cleaned: string;          // ANSI-stripped and trimmed
  stage: AgentStage;        // Detected or inherited stage
  isDiff: boolean;          // Line looks like a diff
  isTestResult: boolean;    // Line looks like a test result
  isError: boolean;         // Line looks like an error
  isStageTransition: boolean; // Stage changed from previous
}
```

## Functions

### `stripAnsi(str)`

```typescript
function stripAnsi(str: string): string
```

Removes all ANSI escape codes (colors, cursor movement, OSC sequences) from a string.

```typescript
stripAnsi('\x1b[32mhello\x1b[0m');  // 'hello'
stripAnsi('\x1b[1;31;40mERROR\x1b[0m');  // 'ERROR'
```

### `parseLine(raw, currentStage?)`

```typescript
function parseLine(raw: string, currentStage?: AgentStage): ParsedLine
```

Parses a single line of output. Strips ANSI, classifies the line, and detects stage transitions.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `raw` | `string` | — | Raw output line |
| `currentStage` | `AgentStage` | `'unknown'` | Current stage context |

**Stage detection patterns:**

| Pattern | Stage |
|---------|-------|
| `[SPEC]` | `planning` |
| `[PLAN]`, `[PLANNING]` | `planning` |
| `[TEST]`, `[TESTING]` | `testing` |
| `[IMPLEMENT]`, `[IMPLEMENTATION]` | `writing` |
| `[WRITE]`, `[WRITING]` | `writing` |
| `[REVIEW]`, `[REVIEWING]` | `reviewing` |
| `[README]`, `[CHANGELOG]` | `writing` |
| `[COMPLETE]`, `[COMPLETED]` | `complete` |
| `[ERROR]` | `error` |
| `planner:`, `planning:` | `planning` |
| `coder:`, `coding:`, `writing:` | `writing` |
| `reviewer:`, `reviewing:` | `reviewing` |
| `tester:`, `testing:` | `testing` |

**Diff detection:** Lines matching `+++ `, `--- `, `@@ `, `diff --git`, `+ `, `- `, `index [hex]`.

**Test result detection:** Lines matching `PASS`, `FAIL`, `passing`, `failing`, `Tests:`, checkmark/cross symbols.

**Error detection:** Lines matching `Error:`, `TypeError:`, stack traces (`at ...`), `ENOENT`, `command not found`.

### `extractErrorTail(stderr, lines?)`

```typescript
function extractErrorTail(stderr: string, lines?: number): string
```

Returns the last N lines of stderr with ANSI codes stripped. Default is 20 lines.

### `stageLabel(stage)`

```typescript
function stageLabel(stage: AgentStage): string
```

Maps a stage to a human-readable label:

| Stage | Label |
|-------|-------|
| `planning` | `Planning` |
| `writing` | `Writing` |
| `reviewing` | `Reviewing` |
| `testing` | `Testing` |
| `complete` | `Complete` |
| `error` | `Error` |
| `unknown` | `Processing` |

## Class: `OutputStreamParser`

Stateful parser that tracks the current agent stage across multiple lines.

```typescript
class OutputStreamParser {
  constructor();
  parse(rawLine: string): ParsedLine;
  getCurrentStage(): AgentStage;
  getBuffer(): ParsedLine[];
  reset(): void;
}
```

### Methods

#### `parse(rawLine)`

Parses a line using the current stage as context. Updates the internal stage if a transition is detected. Appends the result to the buffer.

#### `getCurrentStage()`

Returns the last detected stage.

#### `getBuffer()`

Returns a copy of all parsed lines since construction or last `reset()`.

#### `reset()`

Clears the stage to `'unknown'` and empties the buffer.

**Example:**

```typescript
const parser = new OutputStreamParser();

parser.parse('[SPEC] Writing specification...');
console.log(parser.getCurrentStage());  // 'planning'

parser.parse('Analyzing project structure');
console.log(parser.getCurrentStage());  // 'planning' (inherited)

parser.parse('[TEST] Creating test cases...');
console.log(parser.getCurrentStage());  // 'testing'

console.log(parser.getBuffer().length);  // 3
```
