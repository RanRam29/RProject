function formatMessage(level: string, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const extra = args.length > 0 ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : '';
  return `[${timestamp}] [${level}] ${message}${extra}`;
}

export const logger = {
  info(message: string, ...args: unknown[]): void {
    console.log(formatMessage('INFO', message, ...args));
  },

  warn(message: string, ...args: unknown[]): void {
    console.warn(formatMessage('WARN', message, ...args));
  },

  error(message: string, ...args: unknown[]): void {
    console.error(formatMessage('ERROR', message, ...args));
  },
};

export default logger;
