/**
 * Parses streaming output from OpenCode CLI.
 * Strips ANSI codes, classifies lines into agent stages,
 * detects diffs, test results, and error messages.
 */

/** Agent stages in the OpenCode pipeline */
export type AgentStage =
  | 'planning'
  | 'writing'
  | 'reviewing'
  | 'testing'
  | 'complete'
  | 'error'
  | 'unknown';

export interface ParsedLine {
  raw: string;
  cleaned: string;
  stage: AgentStage;
  isDiff: boolean;
  isTestResult: boolean;
  isError: boolean;
  isStageTransition: boolean;
}

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g;

const STAGE_PATTERNS: Array<{ pattern: RegExp; stage: AgentStage }> = [
  { pattern: /\[SPEC\]/i, stage: 'planning' },
  { pattern: /\[PLAN(NING)?\]/i, stage: 'planning' },
  { pattern: /\[TEST(ING)?\]/i, stage: 'testing' },
  { pattern: /\[IMPLEMENT(ATION)?\]/i, stage: 'writing' },
  { pattern: /\[WRIT(E|ING)\]/i, stage: 'writing' },
  { pattern: /\[REVIEW(ING)?\]/i, stage: 'reviewing' },
  { pattern: /\[README\]/i, stage: 'writing' },
  { pattern: /\[CHANGELOG\]/i, stage: 'writing' },
  { pattern: /\[COMPLETE(D)?\]/i, stage: 'complete' },
  { pattern: /\[ERROR\]/i, stage: 'error' },
  // Common OpenCode agent patterns
  { pattern: /^(planner|planning)\s*:/i, stage: 'planning' },
  { pattern: /^(coder|coding|writing)\s*:/i, stage: 'writing' },
  { pattern: /^(reviewer|reviewing)\s*:/i, stage: 'reviewing' },
  { pattern: /^(tester|testing)\s*:/i, stage: 'testing' },
];

const DIFF_PATTERNS = [
  /^[+-]{3}\s/,
  /^@@\s/,
  /^diff --git/,
  /^[+-]\s/,
  /^index [0-9a-f]+/,
];

const TEST_RESULT_PATTERNS = [
  /^\s*(PASS|FAIL|ERROR)\s/i,
  /tests?\s+(passed|failed|error)/i,
  /\d+\s+(passing|failing|pending)/i,
  /test\s+suites?:/i,
  /Tests:\s+\d+/i,
  /\u2713|\u2717|✓|✗|✔|✘/,
];

const ERROR_PATTERNS = [
  /^error(\s*:|\[)/i,
  /^(TypeError|ReferenceError|SyntaxError|Error):/,
  /^\s*at\s+/,
  /ENOENT|EACCES|EPERM/,
  /command\s+not\s+found/i,
];

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

export function parseLine(raw: string, currentStage: AgentStage = 'unknown'): ParsedLine {
  const cleaned = stripAnsi(raw).trimEnd();

  // Check for stage transitions
  let stage = currentStage;
  let isStageTransition = false;

  for (const { pattern, stage: matchedStage } of STAGE_PATTERNS) {
    if (pattern.test(cleaned)) {
      stage = matchedStage;
      isStageTransition = stage !== currentStage;
      break;
    }
  }

  const isDiff = DIFF_PATTERNS.some((p) => p.test(cleaned));
  const isTestResult = TEST_RESULT_PATTERNS.some((p) => p.test(cleaned));
  const isError = ERROR_PATTERNS.some((p) => p.test(cleaned));

  if (isError && stage === 'unknown') {
    stage = 'error';
  }

  return {
    raw,
    cleaned,
    stage,
    isDiff,
    isTestResult,
    isError,
    isStageTransition,
  };
}

/**
 * Stateful stream parser that tracks the current agent stage
 * across multiple lines.
 */
export class OutputStreamParser {
  private currentStage: AgentStage = 'unknown';
  private buffer: ParsedLine[] = [];

  parse(rawLine: string): ParsedLine {
    const parsed = parseLine(rawLine, this.currentStage);
    if (parsed.isStageTransition) {
      this.currentStage = parsed.stage;
    }
    this.buffer.push(parsed);
    return parsed;
  }

  getCurrentStage(): AgentStage {
    return this.currentStage;
  }

  getBuffer(): ParsedLine[] {
    return [...this.buffer];
  }

  reset(): void {
    this.currentStage = 'unknown';
    this.buffer = [];
  }
}

/**
 * Extract the last N lines of stderr for error reporting.
 */
export function extractErrorTail(stderr: string, lines = 20): string {
  const allLines = stderr.split('\n');
  const tail = allLines.slice(-lines);
  return tail.map(stripAnsi).join('\n');
}

/**
 * Derive a stage-friendly label for display.
 */
export function stageLabel(stage: AgentStage): string {
  const labels: Record<AgentStage, string> = {
    planning: 'Planning',
    writing: 'Writing',
    reviewing: 'Reviewing',
    testing: 'Testing',
    complete: 'Complete',
    error: 'Error',
    unknown: 'Processing',
  };
  return labels[stage];
}
