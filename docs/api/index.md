# API Reference

Complete reference for every exported class, function, interface, and type in Nuntia.

## Module Map

| Module | File | Exports |
|--------|------|---------|
| [Config](/api/config) | `src/config.ts` | `AppConfig`, `loadConfig()`, `resetConfig()` |
| [Logger](/api/logger) | `src/logger.ts` | `rootLogger`, `createLogger()` |
| [Utils](/api/utils) | `src/utils.ts` | `checkDiskSpace()` |
| [Transport Types](/api/transport-types) | `src/transport/types.ts` | `Platform`, `IncomingMessage`, `IncomingFile`, `OutgoingMessage`, `OutgoingFile`, `TransportAdapter`, `MessageHandler` |
| [Telegram Adapter](/api/transport-telegram) | `src/transport/telegram.ts` | `TelegramAdapter` |
| [WhatsApp Adapter](/api/transport-whatsapp) | `src/transport/whatsapp.ts` | `WhatsAppAdapter` |
| [Session Store](/api/session-store) | `src/session/store.ts` | `SessionData`, `SessionStore` |
| [Session Manager](/api/session-manager) | `src/session/manager.ts` | `QueuedRequest`, `SessionManager` |
| [Output Parser](/api/parser) | `src/runner/parser.ts` | `AgentStage`, `ParsedLine`, `OutputStreamParser`, `stripAnsi()`, `parseLine()`, `extractErrorTail()`, `stageLabel()` |
| [Workflow Prompt](/api/workflow-prompt) | `src/runner/workflow-prompt.ts` | `WORKFLOW_SYSTEM_PROMPT`, `buildPrompt()`, `buildFileReferencePrompt()` |
| [OpenCode Runner](/api/opencode-runner) | `src/runner/opencode.ts` | `TaskOptions`, `TaskResult`, `RunnerEvent`, `OpenCodeRunner` |
| [Crypto Keystore](/api/crypto) | `src/crypto/keystore.ts` | `encrypt()`, `decrypt()`, `storeApiKey()`, `getApiKey()`, `listProviders()`, `maskKey()` |
| [Git Manager](/api/git) | `src/git/manager.ts` | `deriveBranchName()`, `GitManager` |
| [File Handler](/api/files) | `src/files/handler.ts` | `sanitizeFilename()`, `deduplicateFilename()`, `SaveResult`, `FileHandler` |
| [Formatters](/api/formatters) | `src/formatter/telegram.ts` | `escapeMarkdownV2()`, `formatStageTransition()`, `formatCodeBlock()`, `formatError()`, `formatDiff()`, `formatTaskSummary()`, `formatOutputBatch()`, `truncateWithNotice()` |
| | `src/formatter/whatsapp.ts` | `formatStageTransition()`, `formatCodeBlock()`, `formatError()`, `formatTaskSummary()`, `formatOutputBatch()`, `truncateWithNotice()` |
| [Command Router](/api/command-router) | `src/commands/index.ts` | `CommandContext`, `CommandRouter` |
| [Command Modules](/api/command-modules) | `src/commands/*.ts` | `ProjectCommands`, `ModelCommands`, `SessionCommands`, `GitCommands`, `FileCommands` |

## Export Summary

| Category | Count |
|----------|-------|
| Interfaces | 13 |
| Types | 4 |
| Classes | 14 |
| Functions | 21 |
| Constants | 2 |
| Source files | 23 |
