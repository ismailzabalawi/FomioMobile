import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import { logger } from '@/shared/logger';
import { signIn } from '@/lib/auth';
import { mapAuthError } from '@/lib/auth-errors';
import { useAuth } from '@/shared/auth-context';
import { discourseApi } from '@/shared/discourseApi';

/**
 * Auth Modal - Unified sign-in flow for iOS and Android
 * 
 * Uses WebBrowser.openAuthSessionAsync which provides:
 * - iOS: ASWebAuthenticationSession
 * - Android: Chrome Custom Tabs
 * 
 * This follows OAuth best practices with external user-agent,
 * providing better security, password manager compatibility,
 * and a consistent experience across platforms.
 */
export default function AuthModalScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const tokens = getTokens(isAmoled ? 'darkAmoled' : isDark ? 'dark' : 'light');
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { setAuthenticatedUser } = useAuth();
  const config = Constants.expoConfig?.extra || {};
  const baseUrl = config.DISCOURSE_BASE_URL;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authStartedRef = useRef(false);

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
      // Use ref to avoid re-triggering effect when auth starts
      if (authStartedRef.current) return;
      authStartedRef.current = true;
      
      try {
        setIsLoading(true);
        setError(null);
        
        logger.info('AuthModal: Starting unified sign-in flow...', { platform: Platform.OS });

        if (!baseUrl) {
          throw new Error('Missing DISCOURSE_BASE_URL config. Please update app config.');
        }

        // Unified approach: signIn() handles both iOS and Android using system browser
        const success = await signIn();

        if (!mounted) return;

        if (success) {
          logger.info('AuthModal: Sign-in successful');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

          // Fetch user data and update auth context
          try {
            const userResponse = await discourseApi.getCurrentUser();
            if (userResponse.success && userResponse.data) {
              const DISCOURSE_URL = baseUrl || 'https://meta.fomio.app';
              const username = userResponse.data.username || 'unknown';
              const appUser = {
                id: userResponse.data.id?.toString() || '0',
                username: username,
                name: userResponse.data.name || username || 'Unknown User',
                email: userResponse.data.email || '',
                avatar: userResponse.data.avatar_template
                  ? `${DISCOURSE_URL}${userResponse.data.avatar_template.replace('{size}', '120')}`
                  : '',
                bio: userResponse.data.bio_raw || '',
                followers: 0,
                following: 0,
                bytes: userResponse.data.topic_count || 0,
                comments: userResponse.data.post_count || 0,
                joinedDate: userResponse.data.created_at
                  ? new Date(userResponse.data.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Unknown',
              };
              
              setAuthenticatedUser(appUser);
              logger.info('AuthModal: User context updated', { username: appUser.username });
            }
          } catch (userError) {
            logger.warn('AuthModal: Failed to fetch user data (non-critical)', userError);
          }

          const returnTo = params.returnTo;
          if (returnTo) {
            logger.info('AuthModal: Navigating to returnTo', { returnTo });
            router.replace(decodeURIComponent(returnTo) as any);
          } else {
            logger.info('AuthModal: Navigating to tabs');
            router.replace('/(tabs)' as any);
          }
        } else {
          throw new Error('Sign-in failed. Please try again.');
        }
      } catch (err: any) {
        if (!mounted) return;
        
        const displayError = mapAuthError(err);
        const isCancellation = displayError.toLowerCase().includes('cancel') || 
                               displayError.toLowerCase().includes('cancelled');
        
        if (isCancellation) {
          // Don't log cancellations as errors - they're expected user actions
          // On cancel, close the modal instead of showing error
          router.back();
          return;
        }
        
        // Only log actual errors
        logger.error('AuthModal: Sign-in failed', err);

        setError(displayError);
        setIsLoading(false);
      }
    }

    startAuth();

    return () => {
      mounted = false;
    };
  }, [baseUrl, params.returnTo, setAuthenticatedUser]);

  // Handle close button
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  }, []);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    authStartedRef.current = false;
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

  // Show loading state (both platforms now use system browser)
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
