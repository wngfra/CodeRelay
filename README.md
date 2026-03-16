<div align="center">

<img src="logo.svg" alt="CodeRelay" width="160">

# CodeRelay

**Chat-to-code pipeline for Telegram and WhatsApp.**

[![Version](https://img.shields.io/badge/version-1.2.0-blue?style=flat-square)](https://github.com/wngfra/CodeRelay/releases)
[![Docs](https://img.shields.io/badge/docs-live-brightgreen?style=flat-square)](https://wngfra.github.io/CodeRelay/)
[![Deploy Docs](https://img.shields.io/github/actions/workflow/status/wngfra/CodeRelay/deploy-docs.yml?label=docs%20deploy&style=flat-square)](https://github.com/wngfra/CodeRelay/actions/workflows/deploy-docs.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-orange?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-43853d?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

Connect Telegram and WhatsApp to [OpenCode](https://github.com/opencode-ai/opencode)'s multi-agent coding system.<br>
Send natural language requests via chat. Get real-time streaming feedback as agents execute.

[Documentation](https://wngfra.github.io/CodeRelay/) &#8226; [Getting Started](https://wngfra.github.io/CodeRelay/guide/getting-started) &#8226; [API Reference](https://wngfra.github.io/CodeRelay/api/)

</div>

---

## Overview

CodeRelay is a self-hosted messaging bot that bridges chat platforms to OpenCode's planner-coder-reviewer pipeline. Users send coding requests via Telegram or WhatsApp and receive procedural, stage-by-stage feedback as the task executes. Each conversation maps to an isolated project directory with automatic Git branching, TDD workflow enforcement, and encrypted API key storage.

```
You (Telegram/WhatsApp)
  │
  ▼
CodeRelay ──► OpenCode CLI ──► Agent Pipeline
  │                                │
  ◄── streaming stage output ──────┘
  ◄── task summary + git branch ───┘
```

## Features

| | Feature | Detail |
|---|---------|--------|
| **Transport** | Dual platform | Telegram (grammY) + WhatsApp (Baileys) with per-platform rate limiting |
| **Streaming** | Real-time output | Stage transitions sent immediately; code batched every 2-3s. Telegram edits in place |
| **Workflow** | TDD enforcement | Every task: SPEC &rarr; TEST &rarr; IMPLEMENT &rarr; README &rarr; CHANGELOG |
| **Git** | Auto branching | Completed tasks committed to `<task-brief>-<YYYYMMDD-HHmmss>` branches |
| **Security** | Encrypted keys | AES-256-GCM at rest. `/apikey` messages auto-deleted on Telegram |
| **Collaboration** | Multi-user groups | Shared project per group, user attribution, admin-restricted commands |
| **Files** | Upload support | Images, docs, archives saved with dedup naming + path traversal protection |
| **Commands** | 20 bot commands | Projects, models, git, files, session management |
| **Queue** | Sequential tasks | One process per session, requests queued with position notifications |
| **Deploy** | Docker-ready | Dockerfile + docker-compose.yml included |

## Quick Start

```bash
git clone https://github.com/wngfra/CodeRelay.git && cd CodeRelay
npm install
cp .env.example .env
```

Set the three required values in `.env`:

```dotenv
TELEGRAM_BOT_TOKEN=<from @BotFather>
ALLOWED_CHAT_IDS=<your chat ID>
MASTER_KEY=<openssl rand -hex 32>
```

Then run:

```bash
npm run dev          # development
# — or —
npm run build && npm start   # production
```

> **Docker:** `docker compose up -d` after configuring `.env`.

## Commands

| Command | Description | | Command | Description |
|---------|-------------|-|---------|-------------|
| `/start` | Init bot + project | | `/model <n>` | Switch model |
| `/help` | Command reference | | `/models` | List models |
| `/new <name>` | New project | | `/apikey <p> <k>` | Store API key |
| `/switch <name>` | Switch project | | `/cancel` | Cancel task |
| `/projects` | List projects | | `/status` | Session info |
| `/files` | File tree | | `/branches` | Git branches |
| `/cat <path>` | View file | | `/checkout <b>` | Switch branch |
| `/uploads` | List uploads | | `/push` | Push to remote |
| `/rm <path>` | Delete file | | `/diff` | Show diff |
| `/clear` | Reset session | | | |

> In groups, `/model`, `/apikey`, `/new`, `/switch` require admin.

## Configuration

All config via `.env`. See [`.env.example`](.env.example) or the [Configuration docs](https://wngfra.github.io/CodeRelay/guide/configuration).

| Variable | Required | Default |
|----------|:--------:|---------|
| `TELEGRAM_BOT_TOKEN` | Yes | &mdash; |
| `ALLOWED_CHAT_IDS` | Yes | &mdash; |
| `MASTER_KEY` | Yes | &mdash; |
| `WHATSAPP_ENABLED` | | `false` |
| `WORKSPACE_ROOT` | | `./workspaces` |
| `OPENCODE_BIN` | | `opencode` |
| `TASK_TIMEOUT_MS` | | `600000` |
| `DEFAULT_MODEL` | | `claude-sonnet-4-20250514` |
| `GIT_REMOTE_URL` | | &mdash; |
| `MAX_UPLOAD_SIZE_MB` | | `50` |

## Architecture

```
src/
├── transport/    Telegram + WhatsApp adapters (TransportAdapter interface)
├── session/      Chat → project directory mapping, task queue, persistence
├── runner/       OpenCode subprocess, output parser, workflow prompt
├── formatter/    Platform-specific output (MarkdownV2 / WhatsApp)
├── crypto/       AES-256-GCM API key encryption
├── git/          Auto-init, branch, commit, push via simple-git
├── files/        Upload save, dedup, path traversal protection
├── commands/     20 bot commands across 5 modules
└── index.ts      Orchestrator — wires everything together
```

Full architecture diagrams and data flow in the [Architecture docs](https://wngfra.github.io/CodeRelay/guide/architecture).

## Documentation

Comprehensive docs at **[wngfra.github.io/CodeRelay](https://wngfra.github.io/CodeRelay/)**:

- **[Getting Started](https://wngfra.github.io/CodeRelay/guide/getting-started)** &mdash; install, configure, first interaction
- **[Commands](https://wngfra.github.io/CodeRelay/guide/commands)** &mdash; all 20 commands with examples
- **[Architecture](https://wngfra.github.io/CodeRelay/guide/architecture)** &mdash; system diagram, data flow, concurrency model
- **[Security](https://wngfra.github.io/CodeRelay/guide/security)** &mdash; encryption, access control, hardening
- **[API Reference](https://wngfra.github.io/CodeRelay/api/)** &mdash; every exported class, function, interface, and type
- **[Contributing](https://wngfra.github.io/CodeRelay/contributing/development)** &mdash; dev setup, adding transports, adding commands, testing

Docs auto-deploy to GitHub Pages on every push to `main`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run with tsx (development) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output |
| `npm test` | Run tests (vitest, 79 tests) |
| `npm run lint` | Type-check without emitting |
| `npm run docs:dev` | Docs dev server |
| `npm run docs:build` | Build docs site |

## Security

- API keys &rarr; AES-256-GCM encrypted, never logged or echoed
- `/apikey` messages &rarr; auto-deleted on Telegram
- Chat ID whitelist &rarr; unauthorized messages silently ignored
- File uploads &rarr; sanitized against directory traversal
- Git credentials &rarr; use SSH keys, not `.env`
- Process isolation &rarr; run in Docker for additional hardening

See the full [Security guide](https://wngfra.github.io/CodeRelay/guide/security).

## Tech Stack

| | Technology | Purpose |
|---|-----------|---------|
| | Node.js 20+ / TypeScript 5+ | Runtime (ESM) |
| | grammY | Telegram Bot API |
| | @whiskeysockets/baileys | WhatsApp Web |
| | simple-git | Programmatic Git |
| | pino | Structured JSON logging |
| | vitest | Unit + integration tests |
| | VitePress | Documentation site |
| | Docker | Containerized deployment |

## License

[Apache 2.0](LICENSE)
