---
layout: home

hero:
  name: CodeRelay
  text: Chat-to-Code Pipeline
  tagline: Connect Telegram and WhatsApp to OpenCode's multi-agent coding system. Send requests via chat, get real-time streaming feedback.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: View on GitHub
      link: https://github.com/wngfra/CodeRelay

features:
  - title: Dual Transport
    details: Telegram (grammY) and WhatsApp (Baileys) adapters with platform-specific formatting and rate limiting.
  - title: Real-Time Streaming
    details: Agent stage transitions and code output streamed to chat. Telegram uses message editing for live updates.
  - title: TDD Workflow
    details: Every task follows SPEC, TEST, IMPLEMENT, README, CHANGELOG — enforced by system prompt.
  - title: Auto Git Branching
    details: Completed tasks auto-commit to descriptive branches like add-auth-middleware-20260316-143022.
  - title: Encrypted Keys
    details: API keys encrypted at rest with AES-256-GCM. Auto-deleted on Telegram after processing.
  - title: Multi-User Groups
    details: Shared project per group chat with user attribution, task queue, and admin-restricted commands.
  - title: File Uploads
    details: Upload images, documents, or code files. Reference them in prompts for context-aware coding.
  - title: 20 Bot Commands
    details: Full command set for projects, models, git branches, files, and session management.
---
