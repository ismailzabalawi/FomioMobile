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
    try {
      const safeMessage = String(message || 'Unknown error');
      const timestamp = new Date().toISOString();
      const levelName = String(LogLevel[level] || 'UNKNOWN');
      
      let contextStr = '';
      if (context !== null && context !== undefined) {
        try {
          const serialized = JSON.stringify(context);
          // Check if serialization resulted in null string
          if (serialized === 'null' || serialized === null) {
            contextStr = ' | Context: [null value]';
          } else if (!serialized || serialized === 'undefined' || serialized === '') {
            contextStr = ' | Context: [empty]';
          } else {
            contextStr = ` | Context: ${serialized}`;
          }
        } catch (stringifyError) {
          // If JSON.stringify fails, use a safe fallback
          const errorMsg = stringifyError instanceof Error 
            ? stringifyError.message 
            : String(stringifyError);
          contextStr = ` | Context: [Unable to serialize: ${errorMsg}]`;
        }
      }
      
      const formatted = `[${timestamp}] ${levelName}: ${safeMessage}${contextStr}`;
      
      // Final validation with String() wrapper - ensure we never return null/undefined/empty
      const safeFormatted = String(formatted);
      if (!safeFormatted || 
          safeFormatted === 'null' || 
          safeFormatted === 'undefined' || 
          safeFormatted.trim().length === 0) {
        return `[ERROR] ${safeMessage} | Format validation failed`;
      }
      
      return safeFormatted;
    } catch (formatError) {
      // Ultimate fallback if formatMessage itself fails
      const errorMsg = formatError instanceof Error 
        ? formatError.message 
        : String(formatError);
      return `[ERROR] ${String(message || 'Unknown error')} | Format error: ${errorMsg}`;
    }
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
      const safeMessage = String(message || 'Unknown error');
      
      // Early exit for null errors (expected SecureStore behavior on iOS simulator)
      if (error === null) {
        return;
      }

      // Suppress noisy SecureStore getApiKey failures that show as null in dev
      const lowerMessage = safeMessage.toLowerCase();
      if (lowerMessage.includes('userapikeymanager: failed to get api key')) {
        return;
      }
      
      // Handle undefined error - log message only
      if (error === undefined) {
        try {
          const formatted = this.formatMessage(LogLevel.ERROR, safeMessage, context);
          // Use String() wrapper to ensure React Native LogBox receives a valid string
          console.error(String(formatted || `[ERROR] ${safeMessage}`));
        } catch {
          console.error(`[ERROR] ${safeMessage}`);
        }
        return;
      }
      
      // Early detection: Check if error object stringifies to null BEFORE processing
      // This prevents React Native LogBox from showing "ERROR null"
      // Also check if error.message is "null" string (common SecureStore issue)
      try {
        const preCheck = JSON.stringify(error);
        if (preCheck === 'null' || preCheck === null) {
          // Error object is null - skip logging (expected SecureStore behavior)
          return;
        }
        // Also check if error has a message that's just "null"
        if (error && typeof error === 'object' && error.message === 'null') {
          // Error message is literally "null" - skip logging
          return;
        }
        if (String(error) === 'null' || String(error) === 'undefined') {
          // Error stringifies to "null" - skip logging
          return;
        }
      } catch {
        // If stringify fails, continue with processing
      }
      
      // Process error object safely
      let errorInfo: any;
      
      if (error instanceof Error) {
        errorInfo = {
          name: String(error.name || 'Error'),
          message: String(error.message || 'Unknown error'),
          stack: error.stack ? String(error.stack) : undefined,
        };
      } else if (typeof error === 'object' && error !== null) {
        // Non-Error object - validate it's serializable and not null
        try {
          const testStringify = JSON.stringify(error);
          if (testStringify === 'null' || testStringify === null || testStringify === '{}') {
            // Skip logging null or empty objects
            return;
          }
          // Additional check: if error has a message property that's null
          if (error.message === null || error.message === 'null') {
            return;
          }
          errorInfo = error;
        } catch {
          // Not serializable - create safe representation
          const errorString = String(error);
          if (errorString === 'null' || errorString === 'undefined') {
            return;
          }
          errorInfo = {
            message: errorString || 'Non-serializable error object',
            type: typeof error,
            constructor: error?.constructor?.name || 'Unknown',
          };
        }
      } else {
        // Primitive value
        errorInfo = {
          message: String(error) || 'Unknown error value',
          type: typeof error,
          value: error,
        };
      }
      
      // Final validation - if errorInfo is still problematic, skip logging
      if (!errorInfo || errorInfo === null || errorInfo === undefined) {
        return;
      }
      
      // Create safe context for logging
      let safeContext: any = { error: errorInfo };
      if (context && typeof context === 'object' && context !== null) {
        try {
          const merged = { error: errorInfo, ...context };
          // Validate merged context doesn't stringify to null
          const contextTest = JSON.stringify(merged);
          if (contextTest && contextTest !== 'null' && contextTest !== null) {
            safeContext = merged;
          }
        } catch {
          // If merging fails, use minimal context
          safeContext = { error: errorInfo };
        }
      }
      
      // Suppress noisy SecureStore/storage errors that stringify poorly (iOS simulator)
      const errorMsg = String(errorInfo?.message || errorInfo || 'Unknown error');
      const combined = `${safeMessage} ${errorMsg}`.toLowerCase();
      if (
        combined.includes('securestore') ||
        combined.includes('exponentexperiencedata') ||
        combined.includes('not a directory') ||
        combined.includes('failed to create storage directory') ||
        combined.includes('nscocoaerrordomain')
      ) {
        return;
      }
      
      // Log with maximum safety - use direct logging to avoid React Native LogBox issues
      // When SecureStore fails on iOS simulator, it can produce errors that stringify to null
      // We completely bypass formatMessage and use the simplest possible logging
      try {
        // Check if context or errorInfo would cause issues
        let shouldUseSimpleLogging = false;
        
        try {
          const contextCheck = JSON.stringify(safeContext);
          if (contextCheck === 'null' || contextCheck === null || !contextCheck) {
            shouldUseSimpleLogging = true;
          }
        } catch {
          shouldUseSimpleLogging = true;
        }
        
        // Also check errorInfo message
        const errorMsg = String(errorInfo?.message || errorInfo || 'Unknown error');
        if (errorMsg === 'null' || errorMsg === 'undefined' || !errorMsg || errorMsg.trim().length === 0) {
          // Error message is problematic - skip logging entirely
          return;
        }
        
        if (shouldUseSimpleLogging) {
          // Use simplest possible logging - no formatMessage, no context
          console.error(`[ERROR] ${safeMessage} | ${errorMsg}`);
          return;
        }
        
        // Try formatMessage only if context is safe
        const fallbackLine = `[ERROR] ${safeMessage}${errorMsg ? ` | ${errorMsg}` : ''}`;

        // Try to format, but never emit a null/undefined string to LogBox
        let logLine: string | null = null;
        try {
          const formatted = this.formatMessage(LogLevel.ERROR, safeMessage, safeContext);
          const candidate = String(formatted);
          const trimmed = candidate.trim();
          const lower = trimmed.toLowerCase();

          if (trimmed && lower !== 'null' && lower !== 'undefined') {
            logLine = trimmed;
          }
        } catch {
          // ignore and fall back
        }

        console.error(logLine || fallbackLine);
      } catch (logError) {
        // Ultimate fallback: use the simplest possible logging
        const errorMsg = String(errorInfo?.message || errorInfo || 'Unknown error');
        console.error(`[ERROR] ${safeMessage} | ${errorMsg}`);
      }
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
