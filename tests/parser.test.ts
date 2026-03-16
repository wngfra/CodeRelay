import { describe, it, expect } from 'vitest';
import {
  stripAnsi,
  parseLine,
  OutputStreamParser,
  extractErrorTail,
  stageLabel,
} from '../src/runner/parser.js';

describe('stripAnsi', () => {
  it('removes ANSI color codes', () => {
    expect(stripAnsi('\x1b[32mhello\x1b[0m')).toBe('hello');
  });

  it('removes complex ANSI sequences', () => {
    expect(stripAnsi('\x1b[1;31;40mERROR\x1b[0m')).toBe('ERROR');
  });

  it('returns plain text unchanged', () => {
    expect(stripAnsi('plain text')).toBe('plain text');
  });

  it('removes OSC sequences', () => {
    expect(stripAnsi('\x1b]0;title\x07text')).toBe('text');
  });
});

describe('parseLine', () => {
  it('detects [SPEC] stage transition', () => {
    const result = parseLine('[SPEC] Writing specification...');
    expect(result.stage).toBe('planning');
    expect(result.isStageTransition).toBe(true);
  });

  it('detects [TEST] stage transition', () => {
    const result = parseLine('[TEST] Creating test cases...');
    expect(result.stage).toBe('testing');
    expect(result.isStageTransition).toBe(true);
  });

  it('detects [IMPLEMENT] stage', () => {
    const result = parseLine('[IMPLEMENT] Writing code...');
    expect(result.stage).toBe('writing');
  });

  it('detects [REVIEW] stage', () => {
    const result = parseLine('[REVIEW] Checking code...');
    expect(result.stage).toBe('reviewing');
  });

  it('detects [COMPLETE] stage', () => {
    const result = parseLine('[COMPLETE] All done');
    expect(result.stage).toBe('complete');
  });

  it('does not detect stage on regular text', () => {
    const result = parseLine('just some regular output');
    expect(result.stage).toBe('unknown');
    expect(result.isStageTransition).toBe(false);
  });

  it('detects diff lines', () => {
    expect(parseLine('+++ b/file.ts').isDiff).toBe(true);
    expect(parseLine('--- a/file.ts').isDiff).toBe(true);
    expect(parseLine('@@ -1,3 +1,4 @@').isDiff).toBe(true);
    expect(parseLine('diff --git a/f b/f').isDiff).toBe(true);
  });

  it('detects test results', () => {
    expect(parseLine('PASS src/test.ts').isTestResult).toBe(true);
    expect(parseLine('FAIL src/test.ts').isTestResult).toBe(true);
    expect(parseLine('Tests: 5 passed').isTestResult).toBe(true);
  });

  it('detects errors', () => {
    expect(parseLine('Error: something broke').isError).toBe(true);
    expect(parseLine('TypeError: undefined is not a function').isError).toBe(true);
    expect(parseLine('  at Object.<anonymous> (test.js:1:1)').isError).toBe(true);
  });

  it('strips ANSI from raw input', () => {
    const result = parseLine('\x1b[32m[SPEC] planning\x1b[0m');
    expect(result.cleaned).toBe('[SPEC] planning');
    expect(result.stage).toBe('planning');
  });

  it('preserves current stage when no transition', () => {
    const result = parseLine('some output', 'writing');
    expect(result.stage).toBe('writing');
    expect(result.isStageTransition).toBe(false);
  });
});

describe('OutputStreamParser', () => {
  it('tracks stage transitions across lines', () => {
    const parser = new OutputStreamParser();

    parser.parse('[SPEC] Starting...');
    expect(parser.getCurrentStage()).toBe('planning');

    parser.parse('Analyzing project...');
    expect(parser.getCurrentStage()).toBe('planning');

    parser.parse('[TEST] Writing tests...');
    expect(parser.getCurrentStage()).toBe('testing');

    parser.parse('[IMPLEMENT] Writing code...');
    expect(parser.getCurrentStage()).toBe('writing');
  });

  it('buffers all parsed lines', () => {
    const parser = new OutputStreamParser();
    parser.parse('line 1');
    parser.parse('line 2');
    parser.parse('line 3');

    expect(parser.getBuffer()).toHaveLength(3);
  });

  it('resets state', () => {
    const parser = new OutputStreamParser();
    parser.parse('[SPEC] Starting...');
    parser.reset();

    expect(parser.getCurrentStage()).toBe('unknown');
    expect(parser.getBuffer()).toHaveLength(0);
  });
});

describe('extractErrorTail', () => {
  it('extracts last N lines', () => {
    const stderr = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n');
    const tail = extractErrorTail(stderr, 5);
    const lines = tail.split('\n');
    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe('line 26');
  });

  it('returns all lines if fewer than N', () => {
    const stderr = 'line 1\nline 2';
    const tail = extractErrorTail(stderr, 20);
    expect(tail).toBe('line 1\nline 2');
  });

  it('strips ANSI from output', () => {
    const stderr = '\x1b[31mError: fail\x1b[0m';
    const tail = extractErrorTail(stderr);
    expect(tail).toBe('Error: fail');
  });
});

describe('stageLabel', () => {
  it('returns human-readable labels', () => {
    expect(stageLabel('planning')).toBe('Planning');
    expect(stageLabel('writing')).toBe('Writing');
    expect(stageLabel('reviewing')).toBe('Reviewing');
    expect(stageLabel('testing')).toBe('Testing');
    expect(stageLabel('complete')).toBe('Complete');
    expect(stageLabel('error')).toBe('Error');
    expect(stageLabel('unknown')).toBe('Processing');
  });
});
