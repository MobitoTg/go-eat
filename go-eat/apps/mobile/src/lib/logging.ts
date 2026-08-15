/**
 * The app's only logging surface. Deliberately minimal — this is on-device debug output, not a
 * telemetry pipeline (Principle V: nothing here is transmitted or retained beyond the OS's own log
 * buffer).
 */
function write(level: 'info' | 'warn' | 'error', message: string, detail?: unknown): void {
  if (process.env.NODE_ENV === 'test' && !process.env.GOEAT_LOG_IN_TESTS) return;
  // eslint-disable-next-line no-console -- this IS the logging implementation.
  console[level](`[go-eat] ${message}`, detail ?? '');
}

export const log = {
  info: (message: string, detail?: unknown): void => write('info', message, detail),
  warn: (message: string, detail?: unknown): void => write('warn', message, detail),
  error: (message: string, detail?: unknown): void => write('error', message, detail),
};
