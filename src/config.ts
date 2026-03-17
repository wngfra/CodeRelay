import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';

dotenvConfig();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export interface AppConfig {
  telegramBotToken: string;
  whatsappEnabled: boolean;
  allowedChatIds: Set<string>;
  workspaceRoot: string;
  opencodeBin: string;
  taskTimeoutMs: number;
  masterKey: string;
  defaultModel: string;
  logLevel: string;
  gitRemoteUrl: string;
  gitUserName: string;
  gitUserEmail: string;
  maxUploadSizeMb: number;
}

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (_config) return _config;

  const allowedRaw = requireEnv('ALLOWED_CHAT_IDS');
  const allowedSet = new Set(
    allowedRaw.split(',').map((id) => id.trim()).filter(Boolean),
  );

  _config = {
    telegramBotToken: requireEnv('TELEGRAM_BOT_TOKEN'),
    whatsappEnabled: optionalEnv('WHATSAPP_ENABLED', 'false') === 'true',
    allowedChatIds: allowedSet,
    workspaceRoot: path.resolve(optionalEnv('WORKSPACE_ROOT', './workspaces')),
    opencodeBin: optionalEnv('OPENCODE_BIN', 'opencode'),
    taskTimeoutMs: parseInt(optionalEnv('TASK_TIMEOUT_MS', '600000'), 10),
    masterKey: requireEnv('MASTER_KEY'),
    defaultModel: optionalEnv('DEFAULT_MODEL', 'claude-sonnet-4-20250514'),
    logLevel: optionalEnv('LOG_LEVEL', 'info'),
    gitRemoteUrl: optionalEnv('GIT_REMOTE_URL', ''),
    gitUserName: optionalEnv('GIT_USER_NAME', 'Nuntia'),
    gitUserEmail: optionalEnv('GIT_USER_EMAIL', 'nuntia@localhost'),
    maxUploadSizeMb: parseInt(optionalEnv('MAX_UPLOAD_SIZE_MB', '50'), 10),
  };

  return _config;
}

/** Reset config cache — useful for testing */
export function resetConfig(): void {
  _config = null;
}
