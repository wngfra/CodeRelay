import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { sanitizeFilename, deduplicateFilename, FileHandler } from '../src/files/handler.js';

describe('sanitizeFilename', () => {
  it('strips directory traversal sequences', () => {
    expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
  });

  it('strips forward slashes', () => {
    expect(sanitizeFilename('path/to/file.txt')).toBe('pathtofile.txt');
  });

  it('strips backslashes', () => {
    expect(sanitizeFilename('path\\to\\file.txt')).toBe('pathtofile.txt');
  });

  it('strips leading dots', () => {
    expect(sanitizeFilename('.hidden')).toBe('hidden');
  });

  it('returns unnamed_file for empty input', () => {
    expect(sanitizeFilename('')).toBe('unnamed_file');
  });

  it('preserves normal filenames', () => {
    expect(sanitizeFilename('my-file_v2.ts')).toBe('my-file_v2.ts');
  });
});

describe('deduplicateFilename', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuntia-files-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns original name if no conflict', () => {
    const name = deduplicateFilename(tmpDir, 'file.txt');
    expect(name).toBe('file.txt');
  });

  it('appends _2 on first conflict', () => {
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), '');
    const name = deduplicateFilename(tmpDir, 'file.txt');
    expect(name).toBe('file_2.txt');
  });

  it('appends _3 on second conflict', () => {
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), '');
    fs.writeFileSync(path.join(tmpDir, 'file_2.txt'), '');
    const name = deduplicateFilename(tmpDir, 'file.txt');
    expect(name).toBe('file_3.txt');
  });

  it('handles files without extensions', () => {
    fs.writeFileSync(path.join(tmpDir, 'Makefile'), '');
    const name = deduplicateFilename(tmpDir, 'Makefile');
    expect(name).toBe('Makefile_2');
  });
});

describe('FileHandler', () => {
  let tmpDir: string;
  let handler: FileHandler;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuntia-handler-test-'));
    process.env.MASTER_KEY = 'a'.repeat(64);
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.ALLOWED_CHAT_IDS = '123';
    process.env.MAX_UPLOAD_SIZE_MB = '1';
    handler = new FileHandler();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves an uploaded file', async () => {
    const data = Buffer.from('hello world');
    const result = await handler.saveUpload(tmpDir, 'test.txt', data);

    expect(result.success).toBe(true);
    expect(result.relativePath).toBe('uploads/test.txt');
    expect(fs.existsSync(result.absolutePath)).toBe(true);
    expect(fs.readFileSync(result.absolutePath, 'utf8')).toBe('hello world');
  });

  it('rejects files exceeding size limit', async () => {
    const data = Buffer.alloc(2 * 1024 * 1024); // 2MB, limit is 1MB
    const result = await handler.saveUpload(tmpDir, 'big.bin', data);

    expect(result.success).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('deduplicates filenames', async () => {
    await handler.saveUpload(tmpDir, 'test.txt', Buffer.from('first'));
    const result = await handler.saveUpload(tmpDir, 'test.txt', Buffer.from('second'));

    expect(result.success).toBe(true);
    expect(result.relativePath).toBe('uploads/test_2.txt');
  });

  it('lists uploaded files', async () => {
    await handler.saveUpload(tmpDir, 'a.txt', Buffer.from('a'));
    await handler.saveUpload(tmpDir, 'b.txt', Buffer.from('b'));

    const uploads = handler.listUploads(tmpDir);
    expect(uploads).toContain('a.txt');
    expect(uploads).toContain('b.txt');
    expect(uploads).toHaveLength(2);
  });

  it('returns empty list when no uploads directory', () => {
    const uploads = handler.listUploads('/nonexistent/path');
    expect(uploads).toHaveLength(0);
  });

  it('deletes a file', async () => {
    await handler.saveUpload(tmpDir, 'deleteme.txt', Buffer.from('test'));
    const deleted = handler.deleteFile(tmpDir, 'uploads/deleteme.txt');
    expect(deleted).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'uploads/deleteme.txt'))).toBe(false);
  });

  it('returns false when deleting non-existent file', () => {
    const deleted = handler.deleteFile(tmpDir, 'nonexistent.txt');
    expect(deleted).toBe(false);
  });

  it('blocks directory traversal on delete', () => {
    const deleted = handler.deleteFile(tmpDir, '../../etc/passwd');
    expect(deleted).toBe(false);
  });

  it('lists project files with tree view', async () => {
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), '');
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '');

    const files = handler.listFiles(tmpDir);
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.includes('src/'))).toBe(true);
    expect(files.some((f) => f.includes('package.json'))).toBe(true);
  });

  it('reads a file', () => {
    fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'content');
    const content = handler.readFile(tmpDir, 'test.txt');
    expect(content).toBe('content');
  });

  it('returns null for non-existent file read', () => {
    const content = handler.readFile(tmpDir, 'nonexistent.txt');
    expect(content).toBeNull();
  });

  it('blocks directory traversal on read', () => {
    const content = handler.readFile(tmpDir, '../../etc/passwd');
    expect(content).toBeNull();
  });
});
