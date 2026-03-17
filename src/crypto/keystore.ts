import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCODING = 'hex';

interface EncryptedData {
  iv: string;
  tag: string;
  ciphertext: string;
}

interface KeyStore {
  [provider: string]: EncryptedData;
}

function getMasterKey(): Buffer {
  const config = loadConfig();
  const keyBuf = Buffer.from(config.masterKey, 'hex');
  if (keyBuf.length !== 32) {
    throw new Error('MASTER_KEY must be a 32-byte (64 hex char) value');
  }
  return keyBuf;
}

export function encrypt(plaintext: string): EncryptedData {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', ENCODING);
  ciphertext += cipher.final(ENCODING);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString(ENCODING),
    tag: tag.toString(ENCODING),
    ciphertext,
  };
}

export function decrypt(data: EncryptedData): string {
  const key = getMasterKey();
  const iv = Buffer.from(data.iv, ENCODING);
  const tag = Buffer.from(data.tag, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(data.ciphertext, ENCODING, 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

function getKeystorePath(nuntiaDir: string): string {
  return path.join(nuntiaDir, 'keystore.json');
}

function readKeyStore(nuntiaDir: string): KeyStore {
  const filePath = getKeystorePath(nuntiaDir);
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as KeyStore;
}

function writeKeyStore(nuntiaDir: string, store: KeyStore): void {
  fs.mkdirSync(nuntiaDir, { recursive: true });
  const filePath = getKeystorePath(nuntiaDir);
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf8');
}

export function storeApiKey(
  nuntiaDir: string,
  provider: string,
  apiKey: string,
): void {
  const store = readKeyStore(nuntiaDir);
  store[provider] = encrypt(apiKey);
  writeKeyStore(nuntiaDir, store);
}

export function getApiKey(
  nuntiaDir: string,
  provider: string,
): string | null {
  const store = readKeyStore(nuntiaDir);
  const entry = store[provider];
  if (!entry) return null;
  return decrypt(entry);
}

export function listProviders(nuntiaDir: string): string[] {
  const store = readKeyStore(nuntiaDir);
  return Object.keys(store);
}

export function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '...' + key.slice(-4);
}
