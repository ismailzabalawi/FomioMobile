/**
 * Enhanced Form Validation & User Feedback System
 * Comprehensive form validation with real-time feedback and accessibility
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../components/shared/theme-provider';
import { logger } from './logger';
import { 
  spacing, 
  getThemeColors,
  createTextStyle,
  animation,
} from './design-system';

const getScreenWidth = () => {
  try {
    return Dimensions.get('window').width;
  } catch {
    return 375; // Default fallback for test environment
  }
};

// =============================================================================
// VALIDATION TYPES AND INTERFACES
// =============================================================================

export interface ValidationRule {
  name: string;
  message: string;
  validator: (value: any, formData?: Record<string, any>) => boolean | Promise<boolean>;
  severity?: 'error' | 'warning' | 'info';
  debounceMs?: number;
}

export interface FieldValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
  isValidating: boolean;
  hasBeenTouched: boolean;
  hasBeenBlurred: boolean;
}

export interface ValidationError {
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface FormValidation {
  isValid: boolean;
  isValidating: boolean;
  fields: Record<string, FieldValidation>;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
  persistent?: boolean;
}

// =============================================================================
// VALIDATION RULES LIBRARY
// =============================================================================

export const validationRules = {
  // Required field validation
  required: (message = 'This field is required'): ValidationRule => ({
    name: 'required',
    message,
    validator: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value != null && value !== '';
    },
  }),
  
  // Email validation
  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    name: 'email',
    message,
    validator: (value) => {
      if (!value) return true; // Allow empty if not required
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
  }),
  
  // Minimum length validation
  minLength: (min: number, message?: string): ValidationRule => ({
    name: 'minLength',
    message: message || `Must be at least ${min} characters`,
    validator: (value) => {
      if (!value) return true; // Allow empty if not required
      return value.length >= min;
    },
  }),
  
  // Maximum length validation
  maxLength: (max: number, message?: string): ValidationRule => ({
    name: 'maxLength',
    message: message || `Must be no more than ${max} characters`,
    validator: (value) => {
      if (!value) return true; // Allow empty if not required
      return value.length <= max;
    },
  }),
  
  // Pattern validation
  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule => ({
    name: 'pattern',
    message,
    validator: (value) => {
      if (!value) return true; // Allow empty if not required
      return regex.test(value);
    },
  }),
  
  // Password strength validation
  passwordStrength: (message = 'Password must contain at least 8 characters, including uppercase, lowercase, and numbers'): ValidationRule => ({
    name: 'passwordStrength',
    message,
    validator: (value) => {
      if (!value) return true; // Allow empty if not required
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasMinLength = value.length >= 8;
      return hasUpper && hasLower && hasNumber && hasMinLength;
    },
  }),
  
  // Confirm password validation
  confirmPassword: (passwordField: string, message = 'Passwords do not match'): ValidationRule => ({
    name: 'confirmPassword',
    message,
    validator: (value, formData) => {
      if (!value || !formData) return true;
      return value === formData[passwordField];
    },
  }),
  
  // Username validation
  username: (message = 'Username must be 3-20 characters and contain only letters, numbers, and underscores'): ValidationRule => ({
    name: 'username',
    message,
    validator: (value) => {
      if (!value) return true; // Allow empty if not required
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      return usernameRegex.test(value);
    },
  }),
  
  // URL validation
  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    name: 'url',
    message,
    validator: (value) => {
      if (!value) return true; // Allow empty if not required
      
      // Check for valid HTTP/HTTPS URLs only
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        return false;
      }
      
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
  }),
  
  // Custom async validation
  custom: (
    validator: (value: any, formData?: Record<string, any>) => boolean | Promise<boolean>,
    message = 'Invalid value',
    debounceMs = 500
  ): ValidationRule => ({
    name: 'custom',
    message,
    validator,
    debounceMs,
  }),
};

// =============================================================================
// FORM VALIDATION MANAGER
// =============================================================================

class FormValidationManager {
  private validationTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Validate single field
  async validateField(
    fieldName: string,
    value: any,
    rules: ValidationRule[],
    formData?: Record<string, any>
  ): Promise<FieldValidation> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const infos: ValidationError[] = [];
    let isValidating = false;
    
    for (const rule of rules) {
      try {
        // Handle debounced validation
        if (rule.debounceMs && rule.debounceMs > 0) {
          isValidating = true;
          
          // Clear existing timeout
          const timeoutKey = `${fieldName}_${rule.name}`;
          const existingTimeout = this.validationTimeouts.get(timeoutKey);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }
          
          // Set new timeout
          const timeout = setTimeout(async () => {
            const result = await rule.validator(value, formData);
            if (!result) {
              const error: ValidationError = {
                rule: rule.name,
                message: rule.message,
                severity: rule.severity || 'error',
              };
              
              // Add to appropriate array based on severity
              switch (error.severity) {
                case 'warning':
                  warnings.push(error);
                  break;
                case 'info':
                  infos.push(error);
                  break;
                default:
                  errors.push(error);
              }
            }
            this.validationTimeouts.delete(timeoutKey);
          }, rule.debounceMs);
          
          this.validationTimeouts.set(timeoutKey, timeout);
        } else {
          // Immediate validation
          const result = await rule.validator(value, formData);
          if (!result) {
            const error: ValidationError = {
              rule: rule.name,
              message: rule.message,
              severity: rule.severity || 'error',
            };
            
            // Add to appropriate array based on severity
            switch (error.severity) {
              case 'warning':
                warnings.push(error);
                break;
              case 'info':
                infos.push(error);
                break;
              default:
                errors.push(error);
            }
          }
        }
      } catch (error) {
        logger.error(`Validation error for field ${fieldName}, rule ${rule.name}:`, error);
        errors.push({
          rule: rule.name,
          message: 'Validation failed',
          severity: 'error',
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
      isValidating,
      hasBeenTouched: false,
      hasBeenBlurred: false,
    };
  }
  
  // Validate entire form
  async validateForm(
    formData: Record<string, any>,
    fieldRules: Record<string, ValidationRule[]>
  ): Promise<FormValidation> {
    const fields: Record<string, FieldValidation> = {};
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];
    const allInfos: ValidationError[] = [];
    let isValidating = false;
    
    for (const [fieldName, rules] of Object.entries(fieldRules)) {
      const fieldValidation = await this.validateField(
        fieldName,
        formData[fieldName],
        rules,
        formData
      );
      
      fields[fieldName] = fieldValidation;
      allErrors.push(...fieldValidation.errors);
      allWarnings.push(...fieldValidation.warnings);
      allInfos.push(...fieldValidation.infos);
      
      if (fieldValidation.isValidating) {
        isValidating = true;
      }
    }
    
    return {
      isValid: allErrors.length === 0,
      isValidating,
      fields,
      errors: allErrors,
      warnings: allWarnings,
      infos: allInfos,
    };
  }
  
  // Clear validation timeouts
  clearTimeouts() {
    this.validationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.validationTimeouts.clear();
  }
}

// Global validation manager
export const formValidationManager = new FormValidationManager();

// =============================================================================
// TOAST NOTIFICATION MANAGER
// =============================================================================

class ToastManager {
  private toasts: ToastNotification[] = [];
  private listeners: ((toasts: ToastNotification[]) => void)[] = [];
  private idCounter = 0;
  
  // Show toast notification
  show(toast: Omit<ToastNotification, 'id'>): string {
    const id = `toast_${++this.idCounter}`;
    const newToast: ToastNotification = {
      ...toast,
      id,
      duration: toast.duration ?? (toast.type === 'error' ? 5000 : 3000),
    };
    
    this.toasts.push(newToast);
    this.notifyListeners();
    
    // Auto-dismiss if not persistent
    if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newToast.duration);
    }
    
    logger.info(`Toast shown: ${newToast.type} - ${newToast.title}`);
    return id;
  }
  
  // Dismiss toast
  dismiss(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notifyListeners();
  }
  
  // Dismiss all toasts
  dismissAll() {
    this.toasts = [];
    this.notifyListeners();
  }
  
  // Add listener
  addListener(listener: (toasts: ToastNotification[]) => void) {
    this.listeners.push(listener);
    listener(this.toasts); // Immediate call with current state
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  // Notify listeners
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener([...this.toasts]);
      } catch (error) {
        logger.error('Error in toast listener:', error);
      }
    });
  }
  
  // Get current toasts
  getToasts(): ToastNotification[] {
    return [...this.toasts];
  }
}

// Global toast manager
export const toastManager = new ToastManager();

// =============================================================================
// REACT HOOKS
// =============================================================================

// Hook for form validation
export function useFormValidation(
  initialData: Record<string, any> = {},
  fieldRules: Record<string, ValidationRule[]> = {}
) {
  const [formData, setFormData] = useState(initialData);
  const [validation, setValidation] = useState<FormValidation>({
    isValid: true,
    isValidating: false,
    fields: {},
    errors: [],
    warnings: [],
    infos: [],
  });
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [blurredFields, setBlurredFields] = useState<Set<string>>(new Set());
  
  // Validate form whenever data changes
  useEffect(() => {
    const validateForm = async () => {
      const newValidation = await formValidationManager.validateForm(formData, fieldRules);
      
      // Update touched and blurred states
      Object.keys(newValidation.fields).forEach(fieldName => {
        newValidation.fields[fieldName].hasBeenTouched = touchedFields.has(fieldName);
        newValidation.fields[fieldName].hasBeenBlurred = blurredFields.has(fieldName);
      });
      
      setValidation(newValidation);
    };
    
    validateForm();
  }, [formData, fieldRules, touchedFields, blurredFields]);
  
  // Update field value
  const updateField = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setTouchedFields(prev => new Set(prev).add(fieldName));
  }, []);
  
  // Mark field as blurred
  const blurField = useCallback((fieldName: string) => {
    setBlurredFields(prev => new Set(prev).add(fieldName));
  }, []);
  
  // Reset form
  const reset = useCallback((newData: Record<string, any> = {}) => {
    setFormData(newData);
    setTouchedFields(new Set());
    setBlurredFields(new Set());
  }, []);
  
  // Get field validation state
  const getFieldValidation = useCallback((fieldName: string): FieldValidation => {
    return validation.fields[fieldName] || {
      isValid: true,
      errors: [],
      warnings: [],
      infos: [],
      isValidating: false,
      hasBeenTouched: false,
      hasBeenBlurred: false,
    };
  }, [validation.fields]);
  
  return {
    formData,
    validation,
    updateField,
    blurField,
    reset,
    getFieldValidation,
    isValid: validation.isValid,
    isValidating: validation.isValidating,
  };
}

// Hook for toast notifications
export function useToast() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  
  useEffect(() => {
    const unsubscribe = toastManager.addListener(setToasts);
    return unsubscribe;
  }, []);
  
  const showToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    return toastManager.show(toast);
  }, []);
  
  const dismissToast = useCallback((id: string) => {
    toastManager.dismiss(id);
  }, []);
  
  const dismissAllToasts = useCallback(() => {
    toastManager.dismissAll();
  }, []);
  
  // Convenience methods
  const showSuccess = useCallback((title: string, message?: string, action?: ToastNotification['action']) => {
    return showToast({ type: 'success', title, message, action });
  }, [showToast]);
  
  const showError = useCallback((title: string, message?: string, action?: ToastNotification['action']) => {
    return showToast({ type: 'error', title, message, action });
  }, [showToast]);
  
  const showWarning = useCallback((title: string, message?: string, action?: ToastNotification['action']) => {
    return showToast({ type: 'warning', title, message, action });
  }, [showToast]);
  
  const showInfo = useCallback((title: string, message?: string, action?: ToastNotification['action']) => {
    return showToast({ type: 'info', title, message, action });
  }, [showToast]);
  
  return {
    toasts,
    showToast,
    dismissToast,
    dismissAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

// Field validation display component
interface FieldValidationDisplayProps {
  validation: FieldValidation;
  showOnlyOnBlur?: boolean;
}

export function FieldValidationDisplay({ 
  validation, 
  showOnlyOnBlur = false 
}: FieldValidationDisplayProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  // Don't show validation messages until field has been blurred (if configured)
  if (showOnlyOnBlur && !validation.hasBeenBlurred) {
    return null;
  }
  
  const hasMessages = validation.errors.length > 0 || validation.warnings.length > 0 || validation.infos.length > 0;
  
  if (!hasMessages && !validation.isValidating) {
    return null;
  }
  
  return (
    <View style={styles.validationContainer}>
      {validation.isValidating && (
        <Text style={[
          createTextStyle('caption', colors.textSecondary),
          styles.validationMessage,
        ]}>
          Validating...
        </Text>
      )}
      
      {validation.errors.map((error, index) => (
        <Text
          key={`error-${index}`}
          style={[
            createTextStyle('caption', colors.error),
            styles.validationMessage,
          ]}
          accessibilityRole="alert"
        >
          {error.message}
        </Text>
      ))}
      
      {validation.warnings.map((warning, index) => (
        <Text
          key={`warning-${index}`}
          style={[
            createTextStyle('caption', colors.warning || colors.textSecondary),
            styles.validationMessage,
          ]}
        >
          {warning.message}
        </Text>
      ))}
      
      {validation.infos.map((info, index) => (
        <Text
          key={`info-${index}`}
          style={[
            createTextStyle('caption', colors.textTertiary),
            styles.validationMessage,
          ]}
        >
          {info.message}
        </Text>
      ))}
    </View>
  );
}

// Toast notification component
interface ToastNotificationProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

export function ToastNotificationComponent({ toast, onDismiss }: ToastNotificationProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: animation.duration.normal,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: animation.duration.normal,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);
  
  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: animation.duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: animation.duration.fast,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
    });
  };
  
  const getToastColors = () => {
    switch (toast.type) {
      case 'success':
        return { background: colors.success || '#10B981', text: '#FFFFFF' };
      case 'error':
        return { background: colors.error, text: '#FFFFFF' };
      case 'warning':
        return { background: colors.warning || '#F59E0B', text: '#FFFFFF' };
      case 'info':
        return { background: colors.primary, text: '#FFFFFF' };
      default:
        return { background: colors.surface, text: colors.text };
    }
  };
  
  const toastColors = getToastColors();
  
  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: toastColors.background,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.toastContent}>
        <View style={styles.toastText}>
          <Text style={[
            createTextStyle('headline', toastColors.text),
            styles.toastTitle,
          ]}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text style={[
              createTextStyle('body', toastColors.text),
              styles.toastMessage,
            ]}>
              {toast.message}
            </Text>
          )}
        </View>
        
        {toast.action && (
          <TouchableOpacity
            style={styles.toastAction}
            onPress={toast.action.onPress}
            accessibilityLabel={toast.action.label}
          >
            <Text style={[
              createTextStyle('label', toastColors.text),
              styles.toastActionText,
            ]}>
              {toast.action.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {!toast.persistent && (
        <TouchableOpacity
          style={styles.toastDismiss}
          onPress={handleDismiss}
          accessibilityLabel="Dismiss notification"
        >
          <Text style={[styles.toastDismissText, { color: toastColors.text }]}>
            ×
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  validationContainer: {
    marginTop: spacing.xs,
  },
  
  validationMessage: {
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  
  toast: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    borderRadius: 8,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  toastText: {
    flex: 1,
  },
  
  toastTitle: {
    fontWeight: '600',
  },
  
  toastMessage: {
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  
  toastAction: {
    marginLeft: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  
  toastActionText: {
    fontWeight: '600',
  },
  
  toastDismiss: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  toastDismissText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

// TouchableOpacity import
import { TouchableOpacity } from 'react-native';

