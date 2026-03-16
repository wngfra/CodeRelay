# File Uploads

CodeRelay supports receiving file uploads from both Telegram and WhatsApp. Uploaded files are saved to the active project directory and can be referenced in coding prompts.

## Supported File Types

Any file type is accepted, including:

- Images (PNG, JPG, SVG) — useful for UI mockups
- Documents (PDF, TXT, MD)
- Code files (TS, JS, PY, etc.)
- Archives (ZIP, TAR.GZ)
- Data files (JSON, CSV, SQL)

## How It Works

### Upload Only (No Caption)

Send a file without any text. The file is saved and confirmed:

```
📎 Saved to uploads/schema.sql
```

No OpenCode task is triggered.

### Upload with Caption

Send a file with a text caption. The file is saved first, then the caption is sent to OpenCode with a reference to the uploaded file:

```
[You send a file "homepage.png" with caption: "implement this UI design"]

→ Saved to uploads/homepage.png
→ [Processing...]
```

The prompt sent to OpenCode includes:
> The user has uploaded a file at `uploads/homepage.png`. implement this UI design

### Referencing Uploaded Files Later

After uploading a file, you can reference it in subsequent prompts by path:

```
Look at uploads/homepage.png and add a dark mode variant
```

## File Naming

### Sanitization

Filenames are sanitized to prevent directory traversal attacks:

- `..` sequences are stripped
- Forward slashes (`/`) and backslashes (`\`) are stripped
- Leading dots are stripped
- Empty names become `unnamed_file`

### Deduplication

If a file with the same name already exists, a numeric suffix is appended:

| Upload | Saved As |
|--------|----------|
| `design.png` | `uploads/design.png` |
| `design.png` (again) | `uploads/design_2.png` |
| `design.png` (again) | `uploads/design_3.png` |

## Size Limits

Files exceeding `MAX_UPLOAD_SIZE_MB` (default 50MB) are rejected:

```
File too large: 72.3MB exceeds limit of 50MB
```

Configure the limit in `.env`:

```dotenv
MAX_UPLOAD_SIZE_MB=100
```

## Managing Uploads

### List Uploads

```
/uploads
```

Shows all files in the current project's `uploads/` directory.

### Delete a File

```
/rm uploads/old-mockup.png
→ Deleted: uploads/old-mockup.png
```

Path traversal is blocked — you can only delete files within the project directory.

## Storage Location

Uploaded files are stored at:

```
<WORKSPACE_ROOT>/<platform_prefix>_<chat_id>/<project>/uploads/<filename>
```

For example:
```
workspaces/tg_123456789/default/uploads/schema.sql
```
