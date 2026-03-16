/**
 * Telegram MarkdownV2 formatter.
 * Formats output for Telegram's MarkdownV2 parse mode.
 */

import type { AgentStage, ParsedLine } from '../runner/parser.js';
import { stageLabel } from '../runner/parser.js';

// Characters that must be escaped in MarkdownV2
const ESCAPE_CHARS = /([_*\[\]()~`>#+\-=|{}.!\\])/g;

export function escapeMarkdownV2(text: string): string {
  return text.replace(ESCAPE_CHARS, '\\$1');
}

/**
 * Format a stage transition message for Telegram.
 */
export function formatStageTransition(stage: AgentStage): string {
  const emoji: Record<AgentStage, string> = {
    planning: '📋',
    writing: '✍️',
    reviewing: '🔍',
    testing: '🧪',
    complete: '✅',
    error: '❌',
    unknown: '⏳',
  };
  const icon = emoji[stage] || '⏳';
  return `${icon} *${escapeMarkdownV2(stageLabel(stage))}*`;
}

/**
 * Format code output as a Telegram code block.
 */
export function formatCodeBlock(code: string, language = ''): string {
  // In MarkdownV2 code blocks, we don't need to escape special chars
  const escapedLang = language.replace(/[`]/g, '');
  return `\`\`\`${escapedLang}\n${code}\n\`\`\``;
}

/**
 * Format an error message for Telegram.
 */
export function formatError(error: string): string {
  return `❌ *Error*\n\`\`\`\n${error}\n\`\`\``;
}

/**
 * Format a diff for Telegram display.
 */
export function formatDiff(diffLines: string[]): string {
  const truncated = diffLines.length > 50
    ? [...diffLines.slice(0, 50), '... [truncated]']
    : diffLines;
  return `\`\`\`diff\n${truncated.join('\n')}\n\`\`\``;
}

/**
 * Format the task completion summary.
 */
export function formatTaskSummary(
  branchName: string | null,
  filesChanged: string[],
  testsPassed: boolean | null,
): string {
  const parts: string[] = ['✅ *Task Complete*\n'];

  if (branchName) {
    parts.push(`📌 Branch: \`${escapeMarkdownV2(branchName)}\``);
  }

  if (filesChanged.length > 0) {
    const fileList = filesChanged.slice(0, 10).map((f) => `  \\- \`${escapeMarkdownV2(f)}\``).join('\n');
    parts.push(`📁 Files changed \\(${filesChanged.length}\\):\n${fileList}`);
    if (filesChanged.length > 10) {
      parts.push(`  _\\.\\.\\. and ${filesChanged.length - 10} more_`);
    }
  }

  if (testsPassed !== null) {
    parts.push(testsPassed ? '🧪 Tests: ✅ Passed' : '🧪 Tests: ❌ Failed');
  }

  return parts.join('\n');
}

/**
 * Format a batch of output lines for Telegram.
 * Used for the live-updating status message.
 */
export function formatOutputBatch(lines: ParsedLine[], maxLength = 4000): string {
  const formatted = lines.map((line) => {
    if (line.isStageTransition) {
      return formatStageTransition(line.stage);
    }
    return escapeMarkdownV2(line.cleaned);
  });

  let result = formatted.join('\n');
  if (result.length > maxLength) {
    result = result.slice(0, maxLength) + '\n\\.\\.\\. \\[truncated\\]';
  }
  return result;
}

/**
 * Truncate text to a max length, appending a notice if truncated.
 */
export function truncateWithNotice(text: string, maxLength = 4000): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\n\n[truncated — full output in project directory]';
}
