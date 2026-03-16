/**
 * Model & API key management commands: /model, /models, /apikey
 */

import type { SessionManager } from '../session/manager.js';
import type { IncomingMessage, TransportAdapter } from '../transport/types.js';
import { storeApiKey, listProviders, getApiKey, maskKey } from '../crypto/keystore.js';
import { loadConfig } from '../config.js';
import path from 'node:path';

const AVAILABLE_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'gpt-4o',
  'gpt-4o-mini',
  'o3',
  'o4-mini',
  'gemini-2.5-pro',
  'deepseek-r1',
  'deepseek-v3',
];

export class ModelCommands {
  constructor(private sessionManager: SessionManager) {}

  async handleModel(
    msg: IncomingMessage,
    transport: TransportAdapter,
    modelName: string,
  ): Promise<void> {
    if (!modelName) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'Usage: `/model <model-name>`\nUse `/models` to see available models.',
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
      return;
    }

    this.sessionManager.updateSession(msg.chatId, { model: modelName });

    await transport.sendMessage({
      chatId: msg.chatId,
      text: `Model switched to: \`${modelName}\``,
      replyToMessageId: msg.messageId,
      parseMode: 'markdown',
    });
  }

  async handleModels(msg: IncomingMessage, transport: TransportAdapter): Promise<void> {
    const session = this.sessionManager.getSession(msg.chatId);
    const currentModel = session?.model || loadConfig().defaultModel;

    const list = AVAILABLE_MODELS
      .map((m) => `${m === currentModel ? '→ ' : '  '}\`${m}\`${m === currentModel ? ' (active)' : ''}`)
      .join('\n');

    await transport.sendMessage({
      chatId: msg.chatId,
      text: `*Available Models:*\n${list}\n\nUse \`/model <name>\` to switch. Custom model names are also accepted.`,
      replyToMessageId: msg.messageId,
      parseMode: 'markdown',
    });
  }

  async handleApiKey(
    msg: IncomingMessage,
    transport: TransportAdapter,
    args: string,
  ): Promise<void> {
    const config = loadConfig();
    const bridgeDir = path.join(config.workspaceRoot, '.bridge');

    // Handle /apikey list
    if (args.trim().toLowerCase() === 'list') {
      const providers = listProviders(bridgeDir);
      if (providers.length === 0) {
        await transport.sendMessage({
          chatId: msg.chatId,
          text: 'No API keys configured. Use `/apikey <provider> <key>` to add one.',
          replyToMessageId: msg.messageId,
          parseMode: 'markdown',
        });
        return;
      }

      const list = providers.map((p) => {
        const key = getApiKey(bridgeDir, p);
        return `  \`${p}\`: ${key ? maskKey(key) : '****'}`;
      }).join('\n');

      await transport.sendMessage({
        chatId: msg.chatId,
        text: `*Configured API Keys:*\n${list}`,
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
      return;
    }

    // Parse /apikey <provider> <key>
    const parts = args.trim().split(/\s+/);
    if (parts.length < 2) {
      await transport.sendMessage({
        chatId: msg.chatId,
        text: 'Usage: `/apikey <provider> <key>`\nExample: `/apikey anthropic sk-ant-...`\nOr: `/apikey list`',
        replyToMessageId: msg.messageId,
        parseMode: 'markdown',
      });
      return;
    }

    const [provider, ...keyParts] = parts;
    const apiKey = keyParts.join(' ');

    storeApiKey(bridgeDir, provider, apiKey);

    // Delete the user's message containing the key (Telegram only)
    if (msg.platform === 'telegram') {
      try {
        await transport.deleteMessage(msg.chatId, msg.messageId);
      } catch {
        // Best effort — might not have permission
      }
    }

    await transport.sendMessage({
      chatId: msg.chatId,
      text: `API key for \`${provider}\` has been stored securely.${msg.platform === 'whatsapp' ? '\n\n⚠️ Please manually delete your message containing the key.' : ''}`,
      replyToMessageId: msg.platform === 'whatsapp' ? msg.messageId : undefined,
      parseMode: 'markdown',
    });
  }
}
