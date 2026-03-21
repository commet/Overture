type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
}

const isDev = process.env.NODE_ENV === 'development';

function formatEntry(entry: LogEntry): string {
  if (isDev) {
    const prefix = entry.context ? `[${entry.context}]` : '';
    return `${prefix} ${entry.message}`;
  }
  return JSON.stringify(entry);
}

function createLog(level: LogLevel) {
  return (message: string, opts?: { context?: string; data?: unknown }) => {
    const entry: LogEntry = {
      level,
      message,
      context: opts?.context,
      data: opts?.data,
      timestamp: new Date().toISOString(),
    };

    const formatted = formatEntry(entry);

    switch (level) {
      case 'debug':
        if (isDev) console.debug(formatted, opts?.data ?? '');
        break;
      case 'info':
        console.info(formatted, isDev && opts?.data ? opts.data : '');
        break;
      case 'warn':
        console.warn(formatted, isDev && opts?.data ? opts.data : '');
        break;
      case 'error':
        console.error(formatted, isDev && opts?.data ? opts.data : '');
        break;
    }
  };
}

export const log = {
  debug: createLog('debug'),
  info: createLog('info'),
  warn: createLog('warn'),
  error: createLog('error'),
};
