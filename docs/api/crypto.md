# Crypto Keystore

**File:** `src/crypto/keystore.ts`

AES-256-GCM encryption for API key storage. Keys are encrypted with a master key and persisted to a JSON file.

## Functions

### `encrypt(plaintext)`

```typescript
function encrypt(plaintext: string): EncryptedData
```

Encrypts a plaintext string using AES-256-GCM.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `plaintext` | `string` | The string to encrypt |

**Returns:** `{ iv: string, tag: string, ciphertext: string }` — all hex-encoded.

Each call generates a random 16-byte IV, so encrypting the same plaintext twice produces different ciphertexts.

### `decrypt(data)`

```typescript
function decrypt(data: EncryptedData): string
```

Decrypts an `EncryptedData` payload back to the original plaintext.

**Throws** if the auth tag doesn't match (tampered data) or the master key is wrong.

### `storeApiKey(nuntiaDir, provider, apiKey)`

```typescript
function storeApiKey(nuntiaDir: string, provider: string, apiKey: string): void
```

Encrypts and persists an API key for a provider. Overwrites any existing key for the same provider.

**Storage:** Writes to `<nuntiaDir>/keystore.json`. Creates the directory and file if they don't exist.

### `getApiKey(nuntiaDir, provider)`

```typescript
function getApiKey(nuntiaDir: string, provider: string): string | null
```

Retrieves and decrypts a stored API key. Returns `null` if no key exists for the provider.

### `listProviders(nuntiaDir)`

```typescript
function listProviders(nuntiaDir: string): string[]
```

Returns an array of provider names that have stored keys (e.g., `['anthropic', 'openai']`).

### `maskKey(key)`

```typescript
function maskKey(key: string): string
```

Returns a display-safe masked version of a key:

| Input | Output |
|-------|--------|
| `'sk-ant-api03-abc...xyz'` | `'sk-a...xyz'` (first 4 + `...` + last 4) |
| `'shortkey'` (8 chars or less) | `'****'` |

## Storage Format

`keystore.json`:

```json
{
  "anthropic": {
    "iv": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    "tag": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    "ciphertext": "deadbeef..."
  },
  "openai": {
    "iv": "...",
    "tag": "...",
    "ciphertext": "..."
  }
}
```

## Algorithm Details

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM |
| Key | 32 bytes from `MASTER_KEY` env var |
| IV | 16 bytes, random per encryption |
| Auth Tag | 16 bytes |
| Encoding | Hex for all binary values |

## Example

```typescript
import { storeApiKey, getApiKey, listProviders, maskKey } from './crypto/keystore.js';

const nuntiaDir = '/data/workspaces/.nuntia';

// Store
storeApiKey(nuntiaDir, 'anthropic', 'sk-ant-api03-real-key-here');

// Retrieve
const key = getApiKey(nuntiaDir, 'anthropic');
console.log(key);  // 'sk-ant-api03-real-key-here'

// List
console.log(listProviders(nuntiaDir));  // ['anthropic']

// Mask for display
console.log(maskKey(key!));  // 'sk-a...here'
```
