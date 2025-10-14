/**
 * Logger simple pour l'application
 * Peut être étendu avec une solution plus robuste comme winston ou pino
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  disabled?: boolean;
  level?: LogLevel;
  prefix?: string;
}

// Ordre des niveaux de log pour pouvoir filtrer
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Configuration globale du logger
const globalConfig = {
  disabled: process.env.NODE_ENV === 'production',
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  showTimestamp: true
};

export class Logger {
  private disabled: boolean;
  private level: LogLevel;
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.disabled = options.disabled ?? globalConfig.disabled;
    this.level = options.level ?? globalConfig.level;
    this.prefix = options.prefix ? `[${options.prefix}]` : '';
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.disabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = globalConfig.showTimestamp ? `[${new Date().toISOString()}]` : '';
    return `${timestamp}${this.prefix}[${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    console.debug(this.formatMessage('debug', message), ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    console.info(this.formatMessage('info', message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', message), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    console.error(this.formatMessage('error', message), ...args);
  }
}

// Exportation d'une instance par défaut
export const logger = new Logger();

// Fonction utilitaire pour créer un logger avec un préfixe
export const createLogger = (prefix: string): Logger => {
  return new Logger({ prefix });
}; 