/**
 * WhatsApp formatter.
 * WhatsApp supports limited formatting: *bold*, _italic_, ~strikethrough~, ```code```.
 * No message editing capability — use incremental messages.
 */

import type { AgentStage, ParsedLine } from '../runner/parser.js';
import { stageLabel } from '../runner/parser.js';

/**
 * Format a stage transition message for WhatsApp.
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
  return `${icon} *${stageLabel(stage)}*`;
}

/**
 * Format code output as a WhatsApp code block.
 */
export function formatCodeBlock(code: string): string {
  return `\`\`\`\n${code}\n\`\`\``;
}

/**
 * Format an error message for WhatsApp.
 */
export function formatError(error: string): string {
  return `❌ *Error*\n\`\`\`\n${error}\n\`\`\``;
}

/**
 * Format the task completion summary for WhatsApp.
 */
export function formatTaskSummary(
  branchName: string | null,
  filesChanged: string[],
  testsPassed: boolean | null,
): string {
  const parts: string[] = ['✅ *Task Complete*\n'];

  if (branchName) {
    parts.push(`📌 Branch: \`${branchName}\``);
  }

  if (filesChanged.length > 0) {
    const fileList = filesChanged.slice(0, 10).map((f) => `  - ${f}`).join('\n');
    parts.push(`📁 Files changed (${filesChanged.length}):\n${fileList}`);
    if (filesChanged.length > 10) {
      parts.push(`  ... and ${filesChanged.length - 10} more`);
    }
  }

  if (testsPassed !== null) {
    parts.push(testsPassed ? '🧪 Tests: ✅ Passed' : '🧪 Tests: ❌ Failed');
  }

  return parts.join('\n');
}

/**
 * Format a batch of output lines for WhatsApp.
 */
export function formatOutputBatch(lines: ParsedLine[], maxLength = 4000): string {
  const formatted = lines.map((line) => {
    if (line.isStageTransition) {
      return formatStageTransition(line.stage);
    }
    return line.cleaned;
  });

  let result = formatted.join('\n');
  if (result.length > maxLength) {
    result = result.slice(0, maxLength) + '\n... [truncated]';
  }
  return result;
}

/**
 * Truncate text to a max length for WhatsApp.
 */
export function truncateWithNotice(text: string, maxLength = 4000): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\n\n[truncated — full output in project directory]';
}
