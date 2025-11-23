/**
 * Unit tests for logger utility
 */

import { logger, logError, withLogging } from '../../shared/logger';

// Mock console methods
const originalConsole = global.console;
beforeEach(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
});

describe('Logger Utility', () => {
  describe('logger.info', () => {
    it('should log info messages in development', () => {
      logger.info('Test info message');
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info message')
      );
    });

    it('should not log info messages in production', () => {
      const originalDev = __DEV__;
      (global as any).__DEV__ = false;
      
      logger.info('Test info message');
      
      expect(console.log).not.toHaveBeenCalled();
      
      (global as any).__DEV__ = originalDev;
    });

    it('should handle context argument', () => {
      logger.info('Test message', { data: 'test' });
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test message')
      );
    });
  });

  describe('logger.warn', () => {
    it('should log warning messages', () => {
      logger.warn('Test warning');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warning')
      );
    });
  });

  describe('logger.error', () => {
    it('should log error messages without error object', () => {
      logger.error('Test error');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error')
      );
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error object');
      logger.error('Error occurred:', error);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Error occurred:')
      );
    });

    it('should not log when error is explicitly null', () => {
      logger.error('Test error', null);
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should handle null errors gracefully (expected SecureStore failures)', () => {
      logger.error('SecureStore operation failed', null);
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should log error messages with context but no error object', () => {
      logger.error('Test error', undefined, { component: 'TestComponent' });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error')
      );
    });
  });

  describe('logger.debug', () => {
    it('should log debug messages in development', () => {
      logger.debug('Debug message');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Debug message')
      );
    });

    it('should not log debug messages in production', () => {
      const originalDev = __DEV__;
      (global as any).__DEV__ = false;
      
      logger.debug('Debug message');
      
      expect(console.debug).not.toHaveBeenCalled();
      
      (global as any).__DEV__ = originalDev;
    });
  });

  describe('logger.auth', () => {
    it('should log authentication events', () => {
      logger.auth('sign-in', true, { userId: '123' });
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Auth sign-in: SUCCESS')
      );
    });
  });

  describe('logError function', () => {
    it('should log errors with context', () => {
      const error = new Error('Test error');
      const context = { component: 'TestComponent' };
      logError(error, context);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Unhandled Error')
      );
    });

    it('should handle errors without context', () => {
      const error = new Error('Test error');
      logError(error);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Unhandled Error')
      );
    });
  });

  describe('withLogging function', () => {
    it('should wrap async operation with logging', async () => {
      const testOperation = async () => 'test result';
      const result = await withLogging(testOperation, 'TestOperation');
      
      expect(result).toBe('test result');
    });
  });
});

