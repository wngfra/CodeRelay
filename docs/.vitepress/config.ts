import { defineConfig, type HeadConfig } from 'vitepress';

const HOSTNAME = 'https://wngfra.github.io';
const BASE = '/Nuntia/';
const SITE_URL = `${HOSTNAME}${BASE}`;
const SITE_TITLE = 'Nuntia';
const SITE_DESCRIPTION =
  'Connect Telegram and WhatsApp to OpenCode multi-agent AI coding. Send natural language requests via chat, get real-time streaming code output, automatic Git branching, and TDD workflow enforcement.';

export default defineConfig({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  lang: 'en-US',
  base: BASE,

  // ── Sitemap ────────────────────────────────────────────────
  sitemap: {
    hostname: SITE_URL,
  },

  // ── Global <head> tags ─────────────────────────────────────
  head: [
    // Basics
    ['meta', { name: 'theme-color', content: '#dc2626' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}logo.svg` }],

    // Open Graph (base; title/description/url overridden per-page via transformPageData)
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: SITE_TITLE }],
    ['meta', { property: 'og:image', content: `${SITE_URL}logo.svg` }],
    ['meta', { property: 'og:locale', content: 'en_US' }],

    // Twitter Card (base; title/description overridden per-page via transformPageData)
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:image', content: `${SITE_URL}logo.svg` }],

    // Additional SEO
    ['meta', { name: 'author', content: 'Nuntia Contributors' }],
    [
      'meta',
      {
        name: 'keywords',
        content:
          'Nuntia, Telegram bot, WhatsApp bot, OpenCode, AI coding, multi-agent, TDD, chat-to-code, code generation, Git automation',
      },
    ],

    // JSON-LD: SoftwareApplication
    [
      'script',
      { type: 'application/ld+json' },
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Nuntia',
        description: SITE_DESCRIPTION,
        url: 'https://github.com/wngfra/Nuntia',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Linux, macOS, Windows (via Docker)',
        license: 'https://opensource.org/licenses/Apache-2.0',
        programmingLanguage: 'TypeScript',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        codeRepository: 'https://github.com/wngfra/Nuntia',
      }),
    ],

    // JSON-LD: WebSite (helps search engines understand site search)
    [
      'script',
      { type: 'application/ld+json' },
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Nuntia Documentation',
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: 'en-US',
      }),
    ],
  ],

  // ── Per-page <head> transforms ─────────────────────────────
  transformPageData(pageData) {
    const canonicalUrl = `${SITE_URL}${pageData.relativePath}`
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '.html');

    const pageTitle = pageData.frontmatter.title
      ? `${pageData.frontmatter.title} | ${SITE_TITLE}`
      : SITE_TITLE;

    const pageDescription =
      pageData.frontmatter.description || SITE_DESCRIPTION;

    const head: HeadConfig[] = [
      ['link', { rel: 'canonical', href: canonicalUrl }],
      ['meta', { property: 'og:title', content: pageTitle }],
      ['meta', { property: 'og:description', content: pageDescription }],
      ['meta', { property: 'og:url', content: canonicalUrl }],
      ['meta', { name: 'twitter:title', content: pageTitle }],
      ['meta', { name: 'twitter:description', content: pageDescription }],
    ];

    // JSON-LD: TechArticle for each documentation page
    if (pageData.relativePath !== 'index.md') {
      head.push([
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: pageData.frontmatter.title || pageData.title,
          description: pageDescription,
          url: canonicalUrl,
          isPartOf: {
            '@type': 'WebSite',
            name: 'Nuntia Documentation',
            url: SITE_URL,
          },
        }),
      ]);
    }

    return { frontmatter: { ...pageData.frontmatter, head } };
  },

  // ── Theme ──────────────────────────────────────────────────
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Nuntia',

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
          items: [{ text: 'Overview', link: '/api/' }],
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
            {
              text: 'Adding a Transport',
              link: '/contributing/adding-transport',
            },
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
      { icon: 'github', link: 'https://github.com/wngfra/Nuntia' },
    ],

    editLink: {
      pattern: 'https://github.com/wngfra/Nuntia/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the Apache 2.0 License.',
      copyright: 'Nuntia',
    },

    outline: {
      level: [2, 3],
    },
  },
});
