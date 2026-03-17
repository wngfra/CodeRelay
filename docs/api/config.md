# Config

**File:** `src/config.ts`

Loads configuration from `.env` environment variables into a typed object. The result is cached after the first call.

## Interface: `AppConfig`

```typescript
interface AppConfig {
  telegramBotToken: string;
  whatsappEnabled: boolean;
  allowedChatIds: Set<string>;
  workspaceRoot: string;       // Resolved to absolute path
  opencodeBin: string;
  taskTimeoutMs: number;
  masterKey: string;           // 64 hex chars (32 bytes)
  defaultModel: string;
  logLevel: string;
  gitRemoteUrl: string;
  gitUserName: string;
  gitUserEmail: string;
  maxUploadSizeMb: number;
}
```

## Functions

### `loadConfig()`

```typescript
function loadConfig(): AppConfig
```

Loads environment variables and returns a typed `AppConfig` object. `dotenv.config()` is called at module import time (when `src/config.ts` is first imported). `loadConfig()` itself reads from `process.env` and caches the result. Subsequent calls return the cached object.

**Throws** if required variables (`TELEGRAM_BOT_TOKEN`, `ALLOWED_CHAT_IDS`, `MASTER_KEY`) are missing.

**Example:**

```typescript
import { loadConfig } from './config.js';

const config = loadConfig();
console.log(config.workspaceRoot);  // '/abs/path/to/workspaces'
console.log(config.allowedChatIds); // Set { '123456789' }
```

### `resetConfig()`

```typescript
function resetConfig(): void
```

Clears the cached config. The next call to `loadConfig()` will re-read environment variables. Useful in tests.

**Example:**

```typescript
import { loadConfig, resetConfig } from './config.js';

process.env.DEFAULT_MODEL = 'gpt-4o';
resetConfig();
const config = loadConfig();
console.log(config.defaultModel); // 'gpt-4o'
```

## Environment Variable Mapping

| Env Variable | Config Field | Required | Default |
|-------------|--------------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | `telegramBotToken` | Yes | — |
| `WHATSAPP_ENABLED` | `whatsappEnabled` | No | `false` |
| `ALLOWED_CHAT_IDS` | `allowedChatIds` | Yes | — |
| `WORKSPACE_ROOT` | `workspaceRoot` | No | `./workspaces` |
| `OPENCODE_BIN` | `opencodeBin` | No | `opencode` |
| `TASK_TIMEOUT_MS` | `taskTimeoutMs` | No | `600000` |
| `MASTER_KEY` | `masterKey` | Yes | — |
| `DEFAULT_MODEL` | `defaultModel` | No | `claude-sonnet-4-20250514` |
| `LOG_LEVEL` | `logLevel` | No | `info` |
| `GIT_REMOTE_URL` | `gitRemoteUrl` | No | `''` |
| `GIT_USER_NAME` | `gitUserName` | No | `Nuntia` |
| `GIT_USER_EMAIL` | `gitUserEmail` | No | `nuntia@localhost` |
| `MAX_UPLOAD_SIZE_MB` | `maxUploadSizeMb` | No | `50` |
