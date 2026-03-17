---
title: Development Setup
description: Development environment setup, project layout, npm scripts, tech stack overview, and module dependency graph for Nuntia contributors.
---

# Development Setup

## Clone and Install

```bash
git clone https://github.com/wngfra/Nuntia.git
cd Nuntia
npm install
```

## Project Layout

```
nuntia/
├── src/                      # TypeScript source
│   ├── index.ts              # Entry point / orchestrator
│   ├── config.ts             # Environment config loader
│   ├── logger.ts             # Pino logging
│   ├── utils.ts              # Shared utilities
│   ├── transport/            # Platform adapters
│   ├── session/              # Session state management
│   ├── runner/               # OpenCode subprocess + parser
│   ├── formatter/            # Platform-specific output formatting
│   ├── crypto/               # API key encryption
│   ├── git/                  # Git operations
│   ├── files/                # File upload handling
│   └── commands/             # Bot command handlers
├── tests/                    # Vitest test files
├── docs/                     # VitePress documentation site
├── dist/                     # Compiled output (gitignored)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `tsx src/index.ts` | Run in development mode |
| `npm run build` | `tsc` | Compile TypeScript |
| `npm start` | `node dist/index.js` | Run production build |
| `npm test` | `vitest run` | Run all tests |
| `npm run test:watch` | `vitest` | Tests in watch mode |
| `npm run lint` | `tsc --noEmit` | Type-check without building |
| `npm run docs:dev` | `vitepress dev docs` | Documentation dev server |
| `npm run docs:build` | `vitepress build docs` | Build documentation site |
| `npm run docs:preview` | `vitepress preview docs` | Preview built docs |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ / TypeScript 5+ (ESM) |
| Telegram | grammY |
| WhatsApp | @whiskeysockets/baileys |
| Git | simple-git |
| Encryption | Node crypto (AES-256-GCM) |
| Logging | pino |
| Testing | vitest |
| Docs | VitePress |
| Containerization | Docker + docker-compose |

## Module Dependencies

```
index.ts (orchestrator)
├── config.ts          ← standalone, no imports from src/
├── logger.ts          ← standalone
├── utils.ts           ← logger
├── transport/types.ts ← standalone (interfaces only)
├── transport/telegram.ts ← types, config, logger
├── transport/whatsapp.ts ← types, config, logger
├── session/store.ts   ← transport/types
├── session/manager.ts ← store, config, logger, transport/types
├── runner/parser.ts   ← standalone
├── runner/workflow-prompt.ts ← standalone
├── runner/opencode.ts ← parser, workflow-prompt, config, logger
├── formatter/telegram.ts ← runner/parser
├── formatter/whatsapp.ts ← runner/parser
├── crypto/keystore.ts ← config
├── git/manager.ts     ← config, logger
├── files/handler.ts   ← config, logger
└── commands/          ← session, runner, git, files, crypto, transport/types
```

Modules with no internal dependencies (`config`, `logger`, `transport/types`, `runner/parser`, `runner/workflow-prompt`) are safe to modify without cascading changes.

## Environment for Development

Create a `.env` file with test values:

```dotenv
TELEGRAM_BOT_TOKEN=test-token
ALLOWED_CHAT_IDS=123
MASTER_KEY=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
LOG_LEVEL=debug
```

For actual bot testing, use a real token from [@BotFather](https://t.me/BotFather).

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| One OpenCode process per session | Prevents file system race conditions |
| Git failures are non-blocking | Task output is always delivered |
| Config is cached (`loadConfig()`) | Reads `.env` once; `resetConfig()` for tests |
| Session `taskRunning` reset on startup | The process that was running is gone |
| MarkdownV2 with plain text fallback | Telegram formatting is fragile |
| Fail-open disk space check | Don't block tasks on a utility check failure |
| Transport throttling per chat | Platform rate limits (2s TG, 3s WA) |
