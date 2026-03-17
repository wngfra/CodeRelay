# Testing

Nuntia uses [Vitest](https://vitest.dev/) for unit and integration tests.

## Running Tests

```bash
npm test                    # Run all tests once
npm run test:watch          # Watch mode (re-run on changes)
npx vitest run tests/parser.test.ts   # Single file
```

## Test Suite

| File | Module | Tests | Coverage |
|------|--------|-------|----------|
| `tests/parser.test.ts` | Output parser | 22 | ANSI stripping, stage detection, diff/error/test classification, stateful parser |
| `tests/crypto.test.ts` | Crypto keystore | 13 | Encrypt/decrypt round-trips, keystore file ops, key masking |
| `tests/session.test.ts` | Session store | 9 | Session CRUD, persistence, task state, restart recovery |
| `tests/git.test.ts` | Git manager | 7 | Branch name derivation from task prompts |
| `tests/files.test.ts` | File handler | 22 | Filename sanitization, dedup, upload/delete/list, path traversal |
| `tests/runner.test.ts` | Workflow prompt | 6 | Prompt building, file references, attribution |

**Total: 79 tests**

## Environment Setup

Tests set their own environment variables. Most test files include a `beforeEach` that sets:

```typescript
beforeEach(() => {
  process.env.MASTER_KEY = 'a'.repeat(64);
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  process.env.ALLOWED_CHAT_IDS = '123';
});
```

::: warning
The config module caches its result. If you modify env vars in tests, call `resetConfig()` from `src/config.ts` to force a reload.
:::

## Writing Tests

### Pattern: Temp Directories

Tests that involve file system operations use temporary directories:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuntia-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

### Pattern: Unit Testing Pure Functions

For pure functions (parser, sanitizer, branch name derivation), test directly:

```typescript
import { describe, it, expect } from 'vitest';
import { deriveBranchName } from '../src/git/manager.js';

describe('deriveBranchName', () => {
  it('kebab-cases the task prompt', () => {
    const name = deriveBranchName('add auth middleware');
    expect(name).toMatch(/^add-auth-middleware-\d{8}-\d{6}$/);
  });
});
```

### Pattern: Testing Classes with Dependencies

For classes that depend on config, set env vars before instantiation:

```typescript
beforeEach(() => {
  process.env.MAX_UPLOAD_SIZE_MB = '1';
  resetConfig();  // Clear cached config
  handler = new FileHandler();
});
```

### What to Test

| Module Type | Test Focus |
|-------------|-----------|
| Pure functions | Input/output correctness, edge cases |
| File operations | Temp directory, cleanup, error handling |
| Crypto | Round-trip encryption, tamper detection |
| Session store | CRUD, persistence to disk, crash recovery |
| Parser | Pattern matching, stage transitions, ANSI handling |
| Filename handling | Sanitization, dedup, path traversal |

### What Not to Test (Here)

- Transport adapters (require real API connections) — mock in integration tests
- `src/index.ts` orchestrator (integration test territory)
- OpenCode subprocess spawning (requires `opencode` binary)

## Config

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,           // Explicit imports (import { describe, it } from 'vitest')
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/transport/*.ts'],
    },
  },
});
```

Coverage excludes the entry point and transport adapters (which require external services).

## Adding a New Test File

1. Create `tests/mymodule.test.ts`
2. Import from `vitest` and the module under test
3. Set up environment variables in `beforeEach` if needed
4. Use temp directories for file system tests
5. Run with `npx vitest run tests/mymodule.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MyClass } from '../src/mymodule.js';

describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    process.env.MASTER_KEY = 'a'.repeat(64);
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.ALLOWED_CHAT_IDS = '123';
    instance = new MyClass();
  });

  it('does the thing', () => {
    const result = instance.doThing('input');
    expect(result).toBe('expected');
  });
});
```
