import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'CodeRelay',
  description: 'Telegram + WhatsApp to OpenCode multi-agent coding interface',
  lang: 'en-US',
  base: '/CodeRelay/',

  head: [
    ['meta', { name: 'theme-color', content: '#4f46e5' }],
  ],

  themeConfig: {
    logo: undefined,
    siteTitle: 'CodeRelay',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Contributing', link: '/contributing/development' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Configuration', link: '/guide/configuration' },
          ],
        },
        {
          text: 'Usage',
          items: [
            { text: 'Bot Commands', link: '/guide/commands' },
            { text: 'File Uploads', link: '/guide/file-uploads' },
            { text: 'Git Workflow', link: '/guide/git-workflow' },
          ],
        },
        {
          text: 'Internals',
          items: [
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Security', link: '/guide/security' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
          ],
        },
        {
          text: 'Core',
          items: [
            { text: 'Config', link: '/api/config' },
            { text: 'Logger', link: '/api/logger' },
            { text: 'Utils', link: '/api/utils' },
          ],
        },
        {
          text: 'Transport',
          items: [
            { text: 'Transport Types', link: '/api/transport-types' },
            { text: 'Telegram Adapter', link: '/api/transport-telegram' },
            { text: 'WhatsApp Adapter', link: '/api/transport-whatsapp' },
          ],
        },
        {
          text: 'Session',
          items: [
            { text: 'Session Store', link: '/api/session-store' },
            { text: 'Session Manager', link: '/api/session-manager' },
          ],
        },
        {
          text: 'Runner',
          items: [
            { text: 'Output Parser', link: '/api/parser' },
            { text: 'Workflow Prompt', link: '/api/workflow-prompt' },
            { text: 'OpenCode Runner', link: '/api/opencode-runner' },
          ],
        },
        {
          text: 'Services',
          items: [
            { text: 'Crypto Keystore', link: '/api/crypto' },
            { text: 'Git Manager', link: '/api/git' },
            { text: 'File Handler', link: '/api/files' },
            { text: 'Formatters', link: '/api/formatters' },
          ],
        },
        {
          text: 'Commands',
          items: [
            { text: 'Command Router', link: '/api/command-router' },
            { text: 'Command Modules', link: '/api/command-modules' },
          ],
        },
      ],

      '/contributing/': [
        {
          text: 'Contributing',
          items: [
            { text: 'Development Setup', link: '/contributing/development' },
            { text: 'Adding a Transport', link: '/contributing/adding-transport' },
            { text: 'Adding Commands', link: '/contributing/adding-commands' },
            { text: 'Testing', link: '/contributing/testing' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/wngfra/CodeRelay' },
    ],

    editLink: {
      pattern: 'https://github.com/wngfra/CodeRelay/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'CodeRelay',
    },

    outline: {
      level: [2, 3],
    },
  },
});
