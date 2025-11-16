/**
 * Logger Utility
 * Centralized logging with different log levels and context support
 */

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean;

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: any;
}

class Logger {
  private isDevelopment = __DEV__;
  private minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;

  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${levelName}: ${message}${contextStr}`;
  }

  debug(message: string, context?: any): void {
    if (this.minLevel <= LogLevel.DEBUG) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: any): void {
    if (this.minLevel <= LogLevel.INFO) {
      console.info(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: any): void {
    if (this.minLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  error(message: string, error?: Error | any, context?: any): void {
    if (this.minLevel <= LogLevel.ERROR) {
      const errorInfo = error instanceof Error 
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
      
      console.error(this.formatMessage(LogLevel.ERROR, message, { error: errorInfo, ...context }));
    }
  }

  /**
   * Log authentication events
   */
  auth(event: string, success: boolean, context?: any): void {
    const status = success ? 'SUCCESS' : 'FAILURE';
    this.info(`Auth ${event}: ${status}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Helper function to log errors with context
 */
export function logError(error: Error | any, context?: any): void {
  logger.error('Unhandled Error', error, context);
}

/**
 * Wrap async operations with logging
 */
export async function withLogging<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  logger.debug(`Starting ${operationName}`);
  try {
    const result = await operation();
    logger.debug(`Completed ${operationName}`);
    return result;
  } catch (error) {
    logger.error(`Failed ${operationName}`, error);
    throw error;
  }
}

