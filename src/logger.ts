import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const rootLogger = pino({
  level: LOG_LEVEL,
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
});

export function createLogger(module: string): pino.Logger {
  return rootLogger.child({ module });
}
