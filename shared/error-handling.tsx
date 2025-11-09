/**
 * Comprehensive Error Handling System
 * Advanced error boundaries, recovery mechanisms, and user feedback
 */

import React, { Component, ReactNode, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/shared/theme-provider';
import { logger } from './logger';
import { 
  spacing, 
  getThemeColors,
  createTextStyle,
  animation,
} from './design-system';

const { width: screenWidth } = Dimensions.get('window');

// =============================================================================
// ERROR TYPES AND INTERFACES
// =============================================================================

export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

export interface AppError {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'validation' | 'runtime' | 'permission' | 'unknown';
  context?: Record<string, any>;
  recoverable: boolean;
  userMessage: string;
  actionSuggestions: string[];
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  lastErrorTime: number;
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

class ErrorManager {
  private errors: Map<string, AppError> = new Map();
  private errorListeners: ((error: AppError) => void)[] = [];
  private maxErrors = 100;
  
  // Generate unique error ID
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Create standardized error object
  createError(
    error: Error,
    category: AppError['category'] = 'runtime',
    severity: AppError['severity'] = 'medium',
    context?: Record<string, any>
  ): AppError {
    const errorId = this.generateErrorId();
    
    const appError: AppError = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      severity,
      category,
      context,
      recoverable: this.isRecoverable(error, category),
      userMessage: this.getUserFriendlyMessage(error, category),
      actionSuggestions: this.getActionSuggestions(error, category),
    };
    
    this.errors.set(errorId, appError);
    this.notifyListeners(appError);
    
    // Keep only recent errors
    if (this.errors.size > this.maxErrors) {
      const oldestKey = this.errors.keys().next().value;
      if (oldestKey !== undefined) {
        this.errors.delete(oldestKey);
      }
    }
    
    return appError;
  }
  
  // Determine if error is recoverable
  private isRecoverable(error: Error, category: AppError['category']): boolean {
    switch (category) {
      case 'network':
        return true; // Network errors are usually recoverable
      case 'validation':
        return true; // Validation errors can be fixed by user
      case 'permission':
        return true; // Permission errors can be resolved
      case 'runtime':
        return !error.message.includes('Cannot read property'); // Some runtime errors are recoverable
      default:
        return false;
    }
  }
  
  // Get user-friendly error message
  private getUserFriendlyMessage(error: Error, category: AppError['category']): string {
    switch (category) {
      case 'network':
        if (error.message.includes('timeout')) {
          return 'The request took too long. Please check your connection and try again.';
        }
        if (error.message.includes('offline')) {
          return 'You appear to be offline. Please check your internet connection.';
        }
        return 'Unable to connect to the server. Please try again.';
        
      case 'validation':
        return 'Please check your input and try again.';
        
      case 'permission':
        return 'Permission required to access this feature. Please grant the necessary permissions.';
        
      case 'runtime':
        return 'Something went wrong. Please try refreshing the app.';
        
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  
  // Get action suggestions for error recovery
  private getActionSuggestions(error: Error, category: AppError['category']): string[] {
    switch (category) {
      case 'network':
        return [
          'Check your internet connection',
          'Try again in a few moments',
          'Switch to a different network',
        ];
        
      case 'validation':
        return [
          'Review your input',
          'Check required fields',
          'Ensure data format is correct',
        ];
        
      case 'permission':
        return [
          'Grant required permissions',
          'Check app settings',
          'Restart the app',
        ];
        
      case 'runtime':
        return [
          'Refresh the app',
          'Restart the app',
          'Clear app cache',
        ];
        
      default:
        return [
          'Try again',
          'Restart the app',
          'Contact support if problem persists',
        ];
    }
  }
  
  // Add error listener
  addErrorListener(listener: (error: AppError) => void) {
    this.errorListeners.push(listener);
    
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }
  
  // Notify all listeners
  private notifyListeners(error: AppError) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        logger.error('Error in error listener:', err);
      }
    });
  }
  
  // Get error by ID
  getError(id: string): AppError | undefined {
    return this.errors.get(id);
  }
  
  // Get recent errors
  getRecentErrors(limit = 10): AppError[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  // Clear errors
  clearErrors() {
    this.errors.clear();
  }
  
  // Report error to analytics/logging service
  reportError(error: AppError) {
    logger.error('App Error:', {
      id: error.id,
      message: error.message,
      category: error.category,
      severity: error.severity,
      stack: error.stack,
      context: error.context,
    });
    
    // In production, this would send to analytics service
    if (error.severity === 'critical') {
      // Send to crash reporting service
      console.error('CRITICAL ERROR:', error);
    }
  }
}

// Global error manager instance
export const errorManager = new ErrorManager();

// =============================================================================
// ERROR BOUNDARY COMPONENTS
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'screen' | 'component';
  name?: string;
}

interface ErrorFallbackProps {
  error: AppError;
  retry: () => void;
  reset: () => void;
  level: 'app' | 'screen' | 'component';
}

// Enhanced Error Boundary with recovery mechanisms
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: 0,
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component', name } = this.props;
    
    // Create standardized error
    const appError = errorManager.createError(
      error,
      'runtime',
      level === 'app' ? 'critical' : 'high',
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: name || `${level}ErrorBoundary`,
        level,
      }
    );
    
    // Update state with error info
    this.setState({
      errorInfo,
      errorId: appError.id,
    });
    
    // Report error
    errorManager.reportError(appError);
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }
    
    logger.error(`Error caught by ${level} boundary:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }
  
  retry = () => {
    const { retryCount, lastErrorTime } = this.state;
    const now = Date.now();
    
    // Prevent rapid retries
    if (now - lastErrorTime < 1000) {
      return;
    }
    
    // Limit retry attempts
    if (retryCount >= 3) {
      Alert.alert(
        'Too Many Attempts',
        'Please restart the app or contact support if the problem persists.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: retryCount + 1,
      lastErrorTime: now,
    });
  };
  
  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: 0,
    });
  };
  
  render() {
    const { hasError, errorId } = this.state;
    const { children, fallback: Fallback, level = 'component' } = this.props;
    
    if (hasError && errorId) {
      const error = errorManager.getError(errorId);
      
      if (error && Fallback) {
        return (
          <Fallback
            error={error}
            retry={this.retry}
            reset={this.reset}
            level={level}
          />
        );
      }
      
      // Default fallback
      if (error) {
        return <DefaultErrorFallback error={error} retry={this.retry} reset={this.reset} level={level} />;
      } else {
        return (
          <View style={[styles.container, { backgroundColor: '#f5f5f5' }]}>
            <Text style={[createTextStyle('body', '#333')]}>
              An unexpected error occurred.
            </Text>
          </View>
        );
      }
    }
    
    return children;
  }
}

// =============================================================================
// ERROR FALLBACK COMPONENTS
// =============================================================================

// Default error fallback component
function DefaultErrorFallback({ error, retry, reset, level }: ErrorFallbackProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  if (!error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[createTextStyle('body', colors.text)]}>
          An unexpected error occurred.
        </Text>
      </View>
    );
  }
  
  const isAppLevel = level === 'app';
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.icon, { color: colors.error }]}>⚠️</Text>
        </View>
        
        {/* Error Message */}
        <Text style={[
          createTextStyle(isAppLevel ? 'title' : 'headline', colors.text),
          styles.title,
        ]}>
          {isAppLevel ? 'Something went wrong' : 'Unable to load content'}
        </Text>
        
        <Text style={[
          createTextStyle('body', colors.textSecondary),
          styles.message,
        ]}>
          {error.userMessage}
        </Text>
        
        {/* Action Suggestions */}
        {error.actionSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            <Text style={[
              createTextStyle('caption', colors.textTertiary),
              styles.suggestionsTitle,
            ]}>
              Try these steps:
            </Text>
            {error.actionSuggestions.map((suggestion, index) => (
              <Text key={index} style={[
                createTextStyle('caption', colors.textSecondary),
                styles.suggestion,
              ]}>
                • {suggestion}
              </Text>
            ))}
          </View>
        )}
        
        {/* Action Buttons */}
        <View style={styles.actions}>
          {error.recoverable && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={retry}
              accessibilityLabel="Try again"
              accessibilityHint="Attempt to recover from the error"
            >
              <Text style={[createTextStyle('label', colors.background)]}>
                Try Again
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
            onPress={reset}
            accessibilityLabel="Reset"
            accessibilityHint="Reset the error state"
          >
            <Text style={[createTextStyle('label', colors.text)]}>
              {isAppLevel ? 'Restart App' : 'Reset'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Error Details (Development only) */}
        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={[createTextStyle('caption', colors.textTertiary)]}>
              Error ID: {error.id}
            </Text>
            <Text style={[createTextStyle('caption', colors.textTertiary)]}>
              Category: {error.category} | Severity: {error.severity}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// Compact error fallback for smaller components
export function CompactErrorFallback({ error, retry, level }: ErrorFallbackProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  return (
    <View style={[styles.compactContainer, { backgroundColor: colors.surface }]}>
      <Text style={[createTextStyle('caption', colors.textSecondary), styles.compactMessage]}>
        {error?.userMessage || 'Unable to load'}
      </Text>
      {error?.recoverable && (
        <TouchableOpacity onPress={retry} style={styles.compactButton}>
          <Text style={[createTextStyle('caption', colors.primary)]}>
            Retry
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// =============================================================================
// ERROR HANDLING HOOKS
// =============================================================================

// Hook for handling async errors
export function useErrorHandler() {
  const handleError = React.useCallback((
    error: Error,
    category: AppError['category'] = 'runtime',
    context?: Record<string, any>
  ) => {
    const appError = errorManager.createError(error, category, 'medium', context);
    errorManager.reportError(appError);
    
    // Show user-friendly error message
    Alert.alert(
      'Error',
      appError.userMessage,
      [
        { text: 'OK' },
        ...(appError.recoverable ? [{ text: 'Retry', onPress: () => {/* Implement retry logic */} }] : []),
      ]
    );
  }, []);
  
  return handleError;
}

// Hook for error boundary state
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);
  
  const resetError = React.useCallback(() => {
    setError(null);
  }, []);
  
  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);
  
  // Throw error to trigger error boundary
  if (error) {
    throw error;
  }
  
  return { captureError, resetError };
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  
  content: {
    alignItems: 'center',
    maxWidth: screenWidth - spacing.xl * 2,
  },
  
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  icon: {
    fontSize: 40,
  },
  
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  
  message: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  
  suggestions: {
    marginBottom: spacing.xl,
    alignSelf: 'stretch',
  },
  
  suggestionsTitle: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  
  suggestion: {
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  
  primaryButton: {
    // backgroundColor set dynamically
  },
  
  secondaryButton: {
    borderWidth: 1,
    // borderColor set dynamically
  },
  
  debugInfo: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: 4,
    marginVertical: spacing.xs,
  },
  
  compactMessage: {
    flex: 1,
  },
  
  compactButton: {
    marginLeft: spacing.sm,
  },
});

