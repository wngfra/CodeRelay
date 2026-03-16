import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  encrypt,
  decrypt,
  storeApiKey,
  getApiKey,
  listProviders,
  maskKey,
} from '../src/crypto/keystore.js';

// Set up test environment
const TEST_MASTER_KEY = 'a'.repeat(64); // 32 bytes in hex

beforeEach(() => {
  process.env.MASTER_KEY = TEST_MASTER_KEY;
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  process.env.ALLOWED_CHAT_IDS = '123';
});

describe('encrypt/decrypt', () => {
  it('round-trips a string', () => {
    const plaintext = 'sk-ant-api-key-12345';
    const encrypted = encrypt(plaintext);

    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(plaintext);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for the same input (random IV)', () => {
    const plaintext = 'test-key';
    const e1 = encrypt(plaintext);
    const e2 = encrypt(plaintext);

    expect(e1.ciphertext).not.toBe(e2.ciphertext);
    expect(decrypt(e1)).toBe(plaintext);
    expect(decrypt(e2)).toBe(plaintext);
  });

  it('handles empty strings', () => {
    const encrypted = encrypt('');
    expect(decrypt(encrypted)).toBe('');
  });

  it('handles unicode strings', () => {
    const plaintext = 'key-with-unicode-chars';
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });
});

describe('keystore file operations', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderelay-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('stores and retrieves an API key', () => {
    storeApiKey(tmpDir, 'anthropic', 'sk-ant-12345');
    const retrieved = getApiKey(tmpDir, 'anthropic');
    expect(retrieved).toBe('sk-ant-12345');
  });

  it('returns null for non-existent provider', () => {
    const retrieved = getApiKey(tmpDir, 'nonexistent');
    expect(retrieved).toBeNull();
  });

  it('lists stored providers', () => {
    storeApiKey(tmpDir, 'anthropic', 'key1');
    storeApiKey(tmpDir, 'openai', 'key2');
    const providers = listProviders(tmpDir);
    expect(providers).toContain('anthropic');
    expect(providers).toContain('openai');
    expect(providers).toHaveLength(2);
  });

  it('overwrites existing key for same provider', () => {
    storeApiKey(tmpDir, 'anthropic', 'old-key');
    storeApiKey(tmpDir, 'anthropic', 'new-key');
    const retrieved = getApiKey(tmpDir, 'anthropic');
    expect(retrieved).toBe('new-key');
  });

  it('persists to disk', () => {
    storeApiKey(tmpDir, 'test', 'test-key');
    const filePath = path.join(tmpDir, 'keystore.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(raw.test).toBeDefined();
    expect(raw.test.ciphertext).toBeDefined();
    // Should NOT be plaintext
    expect(raw.test.ciphertext).not.toBe('test-key');
  });
});

describe('maskKey', () => {
  it('masks middle of key', () => {
    expect(maskKey('sk-ant-api-key-12345')).toBe('sk-a...2345');
  });

  it('masks short keys entirely', () => {
    expect(maskKey('short')).toBe('****');
  });

  it('handles exactly 8 chars', () => {
    expect(maskKey('12345678')).toBe('****');
  });

  it('handles 9+ chars', () => {
    expect(maskKey('123456789')).toBe('1234...6789');
  });
});
