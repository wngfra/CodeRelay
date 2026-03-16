# Logger

**File:** `src/logger.ts`

Structured JSON logging via [pino](https://github.com/pinojs/pino). All modules create child loggers tagged with a module name for filtering.

## Exports

### `rootLogger`

```typescript
const rootLogger: pino.Logger
```

The root pino logger instance. Level is set from the `LOG_LEVEL` environment variable (default `'info'`). In non-production environments, outputs to stdout via `pino/file` transport.

### `createLogger(module)`

```typescript
function createLogger(module: string): pino.Logger
```

Creates a child logger tagged with `{ module }`. Use this in every module for contextual logging.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `module` | `string` | Module identifier (e.g., `'session'`, `'git'`, `'runner'`) |

**Returns:** `pino.Logger` — child logger with the module context.

**Example:**

```typescript
import { createLogger } from './logger.js';

const log = createLogger('git');
log.info({ projectDir: '/path', branch: 'main' }, 'Repo initialized');
// → {"level":30,"module":"git","projectDir":"/path","branch":"main","msg":"Repo initialized"}

log.error({ err }, 'Commit failed');
```

## Log Levels

Configured via `LOG_LEVEL` env var:

| Level | Value | Use Case |
|-------|-------|----------|
| `trace` | 10 | Verbose debugging |
| `debug` | 20 | Development debugging |
| `info` | 30 | Normal operation (default) |
| `warn` | 40 | Non-critical issues |
| `error` | 50 | Errors requiring attention |
| `fatal` | 60 | Application crash |
