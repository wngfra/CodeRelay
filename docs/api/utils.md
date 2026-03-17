---
title: Utils API
description: API reference for shared utility functions including checkDiskSpace() for workspace health monitoring.
---

# Utils

**File:** `src/utils.ts`

Shared utility functions.

## Functions

### `checkDiskSpace(dirPath)`

```typescript
async function checkDiskSpace(dirPath: string): Promise<boolean>
```

Checks if there is at least 500MB of free disk space at the given path. Uses `df -k` on Unix-like systems.

**Fail-open behavior:** Returns `true` if the check fails (e.g., unsupported platform, command error). This ensures tasks are not blocked by a disk check failure.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `dirPath` | `string` | Directory path to check |

**Returns:** `Promise<boolean>` — `true` if >= 500MB free or check failed, `false` if low space.

**Example:**

```typescript
import { checkDiskSpace } from './utils.js';

const ok = await checkDiskSpace('/data/workspaces');
if (!ok) {
  console.warn('Low disk space — task may fail');
}
```
