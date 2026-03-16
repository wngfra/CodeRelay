/**
 * System prompt prepended to every user request sent to OpenCode.
 * Enforces the spec-first, TDD workflow.
 */
export const WORKFLOW_SYSTEM_PROMPT = `For every coding request, follow this exact workflow:

1. **SPEC**: Create or update SPEC.md with a brief specification of what you are about to build. Include acceptance criteria.
2. **TEST**: Write failing tests (test files in \`tests/\` directory) based on the spec. Run them to confirm they fail.
3. **IMPLEMENT**: Write the minimum code to make all tests pass. Iterate until green.
4. **README**: Generate or update README.md with a features summary and usage instructions.
5. **CHANGELOG**: If this is a modification to an existing project, create or append to CHANGELOG.md with a dated entry describing what changed.

Always announce which step you are on (e.g., \`[SPEC] Writing specification...\`, \`[TEST] Creating test cases...\`).
`;

/**
 * Build the full prompt sent to OpenCode, with workflow instructions
 * and optional user attribution for group chats.
 */
export function buildPrompt(
  userMessage: string,
  senderName?: string,
): string {
  const attribution = senderName ? `[User: ${senderName}] ` : '';
  return `${WORKFLOW_SYSTEM_PROMPT}\n${attribution}${userMessage}`;
}

/**
 * Build a prompt that references an uploaded file.
 */
export function buildFileReferencePrompt(
  userMessage: string,
  filePath: string,
  senderName?: string,
): string {
  const fileRef = `The user has uploaded a file at \`${filePath}\`. `;
  const attribution = senderName ? `[User: ${senderName}] ` : '';
  return `${WORKFLOW_SYSTEM_PROMPT}\n${attribution}${fileRef}${userMessage}`;
}
