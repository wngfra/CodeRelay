/**
 * Utility functions shared across modules.
 */

import { execSync } from 'node:child_process';
import { createLogger } from './logger.js';

const log = createLogger('utils');

/**
 * Check if there's at least 500MB of free disk space at the given path.
 * Returns true if space is sufficient or if the check fails (fail-open).
 */
export async function checkDiskSpace(dirPath: string): Promise<boolean> {
  try {
    // Use df on Unix-like systems
    const output = execSync(`df -k "${dirPath}" 2>/dev/null`, { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    if (lines.length < 2) return true;

    const parts = lines[1].split(/\s+/);
    // Available space is typically the 4th column (in KB)
    const availableKB = parseInt(parts[3], 10);
    if (isNaN(availableKB)) return true;

    const availableMB = availableKB / 1024;
    const sufficient = availableMB >= 500;

    if (!sufficient) {
      log.warn({ availableMB: Math.round(availableMB) }, 'Low disk space');
    }

    return sufficient;
  } catch {
    // Fail open — don't block tasks if we can't check
    return true;
  }
}
