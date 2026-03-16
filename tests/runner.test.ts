import { describe, it, expect } from 'vitest';
import { buildPrompt, buildFileReferencePrompt, WORKFLOW_SYSTEM_PROMPT } from '../src/runner/workflow-prompt.js';

describe('buildPrompt', () => {
  it('prepends workflow system prompt', () => {
    const result = buildPrompt('fix the login bug');
    expect(result).toContain(WORKFLOW_SYSTEM_PROMPT);
    expect(result).toContain('fix the login bug');
  });

  it('includes sender attribution when provided', () => {
    const result = buildPrompt('fix the login bug', 'Alice');
    expect(result).toContain('[User: Alice]');
    expect(result).toContain('fix the login bug');
  });

  it('omits attribution when no sender name', () => {
    const result = buildPrompt('fix the login bug');
    expect(result).not.toContain('[User:');
  });

  it('includes workflow steps', () => {
    const result = buildPrompt('do something');
    expect(result).toContain('SPEC');
    expect(result).toContain('TEST');
    expect(result).toContain('IMPLEMENT');
    expect(result).toContain('README');
    expect(result).toContain('CHANGELOG');
  });
});

describe('buildFileReferencePrompt', () => {
  it('includes file reference', () => {
    const result = buildFileReferencePrompt(
      'implement this UI',
      'uploads/mockup.png',
    );
    expect(result).toContain('uploaded a file at `uploads/mockup.png`');
    expect(result).toContain('implement this UI');
  });

  it('includes both attribution and file reference', () => {
    const result = buildFileReferencePrompt(
      'implement this',
      'uploads/design.fig',
      'Bob',
    );
    expect(result).toContain('[User: Bob]');
    expect(result).toContain('uploads/design.fig');
    expect(result).toContain('implement this');
  });
});
