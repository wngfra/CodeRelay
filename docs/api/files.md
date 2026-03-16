# File Handler

**File:** `src/files/handler.ts`

Handles file uploads from chat, saves to project directories with deduplication naming, validates size limits, and provides file management operations.

## Functions

### `sanitizeFilename(filename)`

```typescript
function sanitizeFilename(filename: string): string
```

Sanitizes a filename to prevent directory traversal attacks.

**Rules:**

| Pattern | Action |
|---------|--------|
| `..` | Stripped |
| `/` | Stripped |
| `\` | Stripped |
| Leading dots | Stripped |
| Empty result | Returns `'unnamed_file'` |

**Examples:**

```typescript
sanitizeFilename('../../../etc/passwd');  // 'etcpasswd'
sanitizeFilename('path/to/file.txt');     // 'pathtofile.txt'
sanitizeFilename('.hidden');              // 'hidden'
sanitizeFilename('my-file_v2.ts');        // 'my-file_v2.ts' (unchanged)
sanitizeFilename('');                     // 'unnamed_file'
```

### `deduplicateFilename(dir, filename)`

```typescript
function deduplicateFilename(dir: string, filename: string): string
```

Returns a unique filename by appending `_2`, `_3`, etc. if a file with the same name already exists in `dir`. The filename is sanitized first.

```typescript
// dir contains: file.txt, file_2.txt
deduplicateFilename(dir, 'file.txt');  // 'file_3.txt'
deduplicateFilename(dir, 'new.txt');   // 'new.txt'
```

## Interfaces

### `SaveResult`

```typescript
interface SaveResult {
  success: boolean;
  relativePath: string;        // e.g., 'uploads/file.txt'
  absolutePath: string;        // Full filesystem path
  error?: string;              // Error message if success is false
}
```

## Class: `FileHandler`

```typescript
class FileHandler {
  constructor();
}
```

Reads `MAX_UPLOAD_SIZE_MB` from config.

### Methods

#### `saveUpload(projectDir, filename, data)`

```typescript
async saveUpload(
  projectDir: string,
  filename: string,
  data: Buffer
): Promise<SaveResult>
```

Saves an uploaded file to `<projectDir>/uploads/<filename>`.

**Behavior:**

1. Checks `data.length` against `MAX_UPLOAD_SIZE_MB` limit
2. Creates `uploads/` directory if missing
3. Deduplicates filename if a file with the same name exists
4. Writes the buffer to disk
5. Returns `SaveResult` with relative and absolute paths

**Rejection example:**

```typescript
const result = await handler.saveUpload(dir, 'big.bin', hugeBuffer);
// { success: false, relativePath: '', absolutePath: '',
//   error: 'File too large: 72.3MB exceeds limit of 50MB' }
```

#### `listUploads(projectDir)`

```typescript
listUploads(projectDir: string): string[]
```

Returns filenames in `<projectDir>/uploads/`. Returns empty array if the directory doesn't exist.

#### `deleteFile(projectDir, relativePath)`

```typescript
deleteFile(projectDir: string, relativePath: string): boolean
```

Deletes a file at the given relative path within the project directory.

**Security:** The resolved absolute path must be within `projectDir`. Directory traversal attempts (e.g., `../../etc/passwd`) are blocked and return `false`.

Returns `true` if deleted, `false` if not found or blocked.

#### `listFiles(projectDir, maxDepth?)`

```typescript
listFiles(projectDir: string, maxDepth?: number): string[]
```

Returns a tree-view listing of files in the project directory. Default `maxDepth` is `2`.

- Directories are listed with trailing `/`
- Hidden files (`.` prefix) and `node_modules` are excluded
- Directories are sorted before files
- Entries are indented with 2-space prefix per depth level

**Example output:**

```
uploads/
  mockup.png
src/
  index.ts
  utils.ts
package.json
README.md
```

#### `readFile(projectDir, relativePath)`

```typescript
readFile(projectDir: string, relativePath: string): string | null
```

Reads a file's contents as UTF-8. Returns `null` if the file doesn't exist or if path traversal is detected.
