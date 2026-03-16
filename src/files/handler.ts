/**
 * File Handler — receives file uploads from chat, saves them to the
 * active project directory with deduplication naming, and validates
 * file size limits.
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';

const log = createLogger('files');

/**
 * Sanitize a filename to prevent directory traversal.
 * Strips .., /, \ and other dangerous characters.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/^\.+/, '')
    .trim() || 'unnamed_file';
}

/**
 * Generate a unique filename if a file with the same name exists.
 * Appends _2, _3, etc. before the extension.
 */
export function deduplicateFilename(dir: string, filename: string): string {
  const safeName = sanitizeFilename(filename);
  let targetPath = path.join(dir, safeName);

  if (!fs.existsSync(targetPath)) return safeName;

  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);
  let counter = 2;

  while (fs.existsSync(targetPath)) {
    const newName = `${base}_${counter}${ext}`;
    targetPath = path.join(dir, newName);
    counter++;
  }

  return path.basename(targetPath);
}

export interface SaveResult {
  success: boolean;
  relativePath: string;
  absolutePath: string;
  error?: string;
}

export class FileHandler {
  private config = loadConfig();

  /**
   * Save an uploaded file to the project's uploads/ directory.
   */
  async saveUpload(
    projectDir: string,
    filename: string,
    data: Buffer,
  ): Promise<SaveResult> {
    // Check file size
    const maxBytes = this.config.maxUploadSizeMb * 1024 * 1024;
    if (data.length > maxBytes) {
      return {
        success: false,
        relativePath: '',
        absolutePath: '',
        error: `File too large: ${(data.length / 1024 / 1024).toFixed(1)}MB exceeds limit of ${this.config.maxUploadSizeMb}MB`,
      };
    }

    const uploadsDir = path.join(projectDir, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const finalName = deduplicateFilename(uploadsDir, filename);
    const absolutePath = path.join(uploadsDir, finalName);
    const relativePath = `uploads/${finalName}`;

    try {
      fs.writeFileSync(absolutePath, data);
      log.info({ projectDir, relativePath }, 'File saved');
      return { success: true, relativePath, absolutePath };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to save file';
      log.error({ projectDir, filename, err }, 'File save failed');
      return { success: false, relativePath: '', absolutePath: '', error };
    }
  }

  /**
   * List files in the uploads/ directory.
   */
  listUploads(projectDir: string): string[] {
    const uploadsDir = path.join(projectDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) return [];

    return fs.readdirSync(uploadsDir).filter((f) => {
      const stat = fs.statSync(path.join(uploadsDir, f));
      return stat.isFile();
    });
  }

  /**
   * Delete a file from the project directory.
   * Returns true if deleted, false if not found.
   */
  deleteFile(projectDir: string, relativePath: string): boolean {
    // Sanitize to prevent directory traversal
    const cleanPath = relativePath.replace(/\.\./g, '').replace(/^\//, '');
    const absolutePath = path.join(projectDir, cleanPath);

    // Ensure the resolved path is within the project directory
    const resolved = path.resolve(absolutePath);
    const resolvedProject = path.resolve(projectDir);
    if (!resolved.startsWith(resolvedProject)) {
      log.warn({ relativePath }, 'Path traversal attempt blocked');
      return false;
    }

    if (!fs.existsSync(absolutePath)) return false;

    try {
      fs.unlinkSync(absolutePath);
      log.info({ projectDir, relativePath: cleanPath }, 'File deleted');
      return true;
    } catch (err) {
      log.error({ projectDir, relativePath: cleanPath, err }, 'File delete failed');
      return false;
    }
  }

  /**
   * List files in the project directory (tree view, max depth).
   */
  listFiles(projectDir: string, maxDepth = 2): string[] {
    const results: string[] = [];

    const walk = (dir: string, depth: number, prefix: string) => {
      if (depth > maxDepth) return;

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      // Sort: directories first, then files
      entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        if (entry.isDirectory()) {
          results.push(`${prefix}${entry.name}/`);
          walk(path.join(dir, entry.name), depth + 1, prefix + '  ');
        } else {
          results.push(`${prefix}${entry.name}`);
        }
      }
    };

    walk(projectDir, 0, '');
    return results;
  }

  /**
   * Read a file's contents from the project directory.
   */
  readFile(projectDir: string, relativePath: string): string | null {
    const cleanPath = relativePath.replace(/\.\./g, '').replace(/^\//, '');
    const absolutePath = path.join(projectDir, cleanPath);

    // Prevent directory traversal
    const resolved = path.resolve(absolutePath);
    const resolvedProject = path.resolve(projectDir);
    if (!resolved.startsWith(resolvedProject)) return null;

    if (!fs.existsSync(absolutePath)) return null;

    try {
      return fs.readFileSync(absolutePath, 'utf8');
    } catch {
      return null;
    }
  }
}
