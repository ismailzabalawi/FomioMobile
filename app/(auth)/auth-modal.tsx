import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import { logger } from '@/shared/logger';
import { signIn } from '@/lib/auth';

/**
 * Auth Modal - UI wrapper for sign-in flow
 * 
 * This is a thin UI wrapper around lib/auth.ts:signIn().
 * All authentication logic is handled by signIn(), which:
 * - On iOS: Handles browser session and callback synchronously
 * - On Android: Opens browser, returns immediately; callback screen handles completion
 */
export default function AuthModalScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const tokens = getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light');
  const params = useLocalSearchParams<{ returnTo?: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authStarted, setAuthStarted] = useState(false);

  const colors = useMemo(() => ({
    background: tokens.colors.background,
    text: tokens.colors.text,
    muted: tokens.colors.muted,
    accent: tokens.colors.accent,
    onAccent: tokens.colors.onAccent,
    border: tokens.colors.border,
    danger: tokens.colors.danger,
    dangerSoft: tokens.colors.dangerSoft,
  }), [tokens]);

  // Start auth flow on mount
  useEffect(() => {
    let mounted = true;

    async function startAuth(): Promise<void> {
      if (authStarted) return;
      
      try {
        setAuthStarted(true);
        setIsLoading(true);
        setError(null);
        
        logger.info('AuthModal: Starting sign-in flow...');
        
        // Use unified signIn() from lib/auth.ts
        // This handles: RSA key generation, browser session, payload decryption, storage, and OTP warming
        const success = await signIn();
        
        if (!mounted) return;
        
        if (success) {
          logger.info('AuthModal: Sign-in successful');
          // signIn() emits 'auth:signed-in' event, which will trigger useAuth hook
          // to refresh user data. Navigate for immediate feedback.
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          
          const returnTo = params.returnTo;
          if (returnTo) {
            logger.info('AuthModal: Navigating to returnTo', { returnTo });
            router.replace(decodeURIComponent(returnTo) as any);
          } else {
            router.replace('/(tabs)');
          }
        } else {
          throw new Error('Sign-in failed. Please try again.');
        }
      } catch (err: any) {
        logger.error('AuthModal: Sign-in failed', err);
        
        if (!mounted) return;
        
        // Provide user-friendly error messages
        let displayError = 'Sign-in failed. Please try again.';
        
        const errorMessage = err?.message || '';
        if (errorMessage.toLowerCase().includes('cancel') || errorMessage.toLowerCase().includes('cancelled')) {
          displayError = 'Sign-in was cancelled. Please try again when ready.';
          // On cancel, close the modal instead of showing error
          router.back();
          return;
        } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
          displayError = 'Network error. Please check your internet connection and try again.';
        } else if (errorMessage.toLowerCase().includes('decrypt') || errorMessage.toLowerCase().includes('payload')) {
          displayError = 'Failed to process authorization response. Please try again.';
        } else if (errorMessage) {
          displayError = errorMessage;
        }
        
        setError(displayError);
        setIsLoading(false);
      }
    }

    startAuth();

    return () => {
      mounted = false;
    };
  }, [authStarted, params.returnTo]);

  // Handle close button
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  }, []);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setAuthStarted(false);
  }, []);

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={24} color={colors.text} weight="bold" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sign In</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.errorContainer}>
          <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try Again"
          >
            <Text style={[styles.retryButtonText, { color: colors.onAccent }]}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.cancelButtonText, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={24} color={colors.text} weight="bold" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Sign In</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Opening secure sign in...
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 200,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

