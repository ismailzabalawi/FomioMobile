import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { X } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import { logger } from '@/shared/logger';
import { signIn, processAuthPayload } from '@/lib/auth';
import { parseURLParameters } from '@/lib/auth-utils';
import { mapAuthError } from '@/lib/auth-errors';
import { useAuth } from '@/shared/auth-context';

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
  const navigation = useNavigation();
  const { setAuthenticatedUser } = useAuth();
  const config = Constants.expoConfig?.extra || {};
  const baseUrl = config.DISCOURSE_BASE_URL;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authStartedRef = useRef(false);
  const payloadProcessingRef = useRef(false);
  const [webviewUrl, setWebviewUrl] = useState<string | null>(null);
  const [authProcessActive, setAuthProcessActive] = useState(false);

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
        
        logger.info('AuthModal: Starting sign-in flow...');

        if (!baseUrl) {
          throw new Error('Missing DISCOURSE_BASE_URL config. Please update app config.');
        }

        if (Platform.OS === 'android') {
          // Android: Use in-app WebView instead of external browser
          // This mirrors the DiscourseMobile approach for reliable auth handling
          logger.info('AuthModal: Building WebView auth URL for Android...');
          const { buildAuthUrlForWebView } = require('@/lib/auth');
          const url = await buildAuthUrlForWebView();
          logger.info('AuthModal: WebView URL built, setting state...', { 
            urlLength: url?.length,
            mounted,
          });
          if (!mounted) {
            logger.warn('AuthModal: Component unmounted before URL could be set');
            return;
          }
          setWebviewUrl(url);
          logger.info('AuthModal: WebView URL state set, component should re-render now');
          setIsLoading(false);
          return;
        }

        // iOS: Use ASWebAuthenticationSession via signIn()
        const success = await signIn();

        if (!mounted) return;

        if (success) {
          logger.info('AuthModal: Sign-in successful');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

          const returnTo = params.returnTo;
          if (returnTo) {
            logger.info('AuthModal: Navigating to returnTo', { returnTo });
            router.replace(decodeURIComponent(returnTo) as any);
          } else {
            // Navigate to tabs - Expo Router handles the stack management
            logger.info('AuthModal: Navigating to tabs');
            router.replace('/(tabs)' as any);
          }
        } else {
          throw new Error('Sign-in failed. Please try again.');
        }
      } catch (err: any) {
        logger.error('AuthModal: Sign-in failed', err);
        
        if (!mounted) return;
        
        const displayError = mapAuthError(err);
        if (displayError.toLowerCase().includes('cancel')) {
          // On cancel, close the modal instead of showing error
          router.back();
          return;
        }

        setError(displayError);
        setIsLoading(false);
      }
    }

    startAuth();

    return () => {
      mounted = false;
    };
  }, [baseUrl, params.returnTo]);

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
    payloadProcessingRef.current = false;
    // Re-trigger auth flow by forcing a re-render
    setWebviewUrl(null);
  }, []);

  // Process the auth payload directly in the modal
  // This is more reliable than navigating to a separate callback screen
  const handleAuthPayload = useCallback(async (payload: string) => {
    // Prevent double processing
    if (payloadProcessingRef.current) {
      logger.info('AuthModal: Payload already being processed, skipping');
      return;
    }
    payloadProcessingRef.current = true;
    
    logger.info('AuthModal: Processing auth payload directly...', {
      payloadLength: payload?.length || 0,
    });
    
    setAuthProcessActive(true);
    setIsLoading(true);
    
    try {
      const result = await processAuthPayload(payload);
      
      if (result.success) {
        logger.info('AuthModal: Auth payload processed successfully', {
          username: result.username,
        });
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        
        // Verify authentication by fetching user data
        const { discourseApi } = await import('@/shared/discourseApi');
        const userResponse = await discourseApi.getCurrentUser();
        
        if (userResponse.success && userResponse.data) {
          // Map Discourse user to AppUser (same as callback screen)
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
          logger.info('AuthModal: User authenticated and context updated', { username: appUser.username });
        }
        
        // Navigate to tabs
        const returnTo = params.returnTo;
        if (returnTo) {
          logger.info('AuthModal: Navigating to returnTo', { returnTo });
          router.replace(decodeURIComponent(returnTo) as any);
        } else {
          logger.info('AuthModal: Navigating to tabs');
          router.replace('/(tabs)' as any);
        }
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (err: any) {
      logger.error('AuthModal: Failed to process auth payload', err);
      payloadProcessingRef.current = false;
      setAuthProcessActive(false);
      setIsLoading(false);
      setError(mapAuthError(err));
    }
  }, [params.returnTo, setAuthenticatedUser]);

  const handleWebViewNavigation = useCallback(
    (request: { url?: string }) => {
      const url = request?.url || '';
      
      // Log ALL navigation events for debugging
      logger.info('AuthModal: WebView navigation event', {
        url: url ? url.substring(0, 300) : 'empty',
        platform: Platform.OS,
      });
      
      if (!url) return true;

      // Only consider it an auth redirect if the URL STARTS with fomio://
      // Don't match on 'auth_redirect' substring - that would match the authorization page URL
      // which contains the redirect_uri parameter
      const isCustomSchemeRedirect = url.startsWith('fomio://');
      const hasPayload = url.includes('payload=');

      logger.info('AuthModal: WebView navigation analysis', {
        isCustomSchemeRedirect,
        hasPayload,
        urlStart: url.substring(0, 50),
      });

      // Handle custom scheme redirect (Discourse auth callback)
      if (isCustomSchemeRedirect) {
        const urlParams = parseURLParameters(url);
        const payload = urlParams.payload;
        if (payload) {
          logger.info('AuthModal: Payload found in custom scheme redirect, processing directly');
          // Process the payload directly instead of navigating to callback screen
          handleAuthPayload(payload);
          return false;
        }

        // Custom scheme redirect without payload - this shouldn't happen normally
        logger.warn('AuthModal: Custom scheme redirect without payload', { url: url.substring(0, 100) });
        setError('Authorization completed, but no payload was returned. Please try again.');
        return false;
      }

      // Some WebViews surface the callback as a normal URL; detect payload in query
      if (hasPayload) {
        const urlParams = parseURLParameters(url);
        const payload = urlParams.payload;
        if (payload) {
          logger.info('AuthModal: Payload found in URL query, processing directly');
          handleAuthPayload(payload);
          return false;
        }
      }

      // Allow Discourse URLs to load in the WebView
      if (baseUrl && url.startsWith(baseUrl)) {
        return true;
      }

      // For non-Discourse URLs, open externally (but log it for debugging)
      // This handles things like "Continue with Google" that redirect to external auth
      logger.info('AuthModal: Opening external URL', { url: url.substring(0, 100) });
      Linking.openURL(url).catch((err) => {
        logger.warn('AuthModal: Failed to open external URL', { error: err?.message });
      });
      return false;
    },
    [baseUrl, handleAuthPayload]
  );

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent?: { data?: string } }) => {
      const data = event?.nativeEvent?.data;
      
      // Log all messages for debugging
      logger.info('AuthModal: WebView message received', {
        hasData: !!data,
        dataPreview: data ? data.substring(0, 200) : 'none',
      });
      
      if (!data) return;

      const message = String(data);
      if (!message.includes('payload=')) {
        logger.info('AuthModal: Message does not contain payload, ignoring');
        return;
      }

      logger.info('AuthModal: Payload detected in message, extracting...');
      const urlParams = parseURLParameters(message);
      const payload = urlParams.payload;
      if (!payload) {
        logger.warn('AuthModal: Failed to extract payload from message');
        return;
      }

      logger.info('AuthModal: Payload extracted from message, processing directly');
      handleAuthPayload(payload);
    },
    [handleAuthPayload]
  );

  useEffect(() => {
    const listener = Linking.addEventListener('url', ({ url }) => {
      if (!url) return;
      const urlParams = parseURLParameters(url);
      const payload = urlParams.payload;
      if (payload) {
        logger.info('AuthModal: Payload received via deep link, processing directly');
        handleAuthPayload(payload);
      }
    });

    return () => {
      listener.remove();
    };
  }, [handleAuthPayload]);

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

  // Debug: Log render state
  logger.info('AuthModal: Render check', {
    platform: Platform.OS,
    hasWebviewUrl: !!webviewUrl,
    webviewUrlLength: webviewUrl?.length,
    hasError: !!error,
    isLoading,
  });

  if (Platform.OS === 'android' && webviewUrl) {
    logger.info('AuthModal: Rendering WebView for Android');
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

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>
              Loading sign in…
            </Text>
          </View>
        )}

        {authProcessActive && (
          <View style={styles.authenticatingOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}

        <WebView
          source={{ uri: webviewUrl }}
          style={styles.webview}
          originWhitelist={['*']}
          startInLoadingState
          javaScriptEnabled
          injectedJavaScript={
            Platform.OS === 'android'
              ? `
                (function() {
                  function probe() {
                    try {
                      var href = window.location && window.location.href;
                      if (href && href.indexOf('payload=') !== -1) {
                        window.ReactNativeWebView.postMessage(href);
                      }
                    } catch (e) {}
                  }
                  setInterval(probe, 500);
                })();
              `
              : undefined
          }
          onLoadStart={() => {
            logger.info('AuthModal: WebView load started');
            setIsLoading(true);
          }}
          onLoadEnd={() => {
            logger.info('AuthModal: WebView load ended');
            setIsLoading(false);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            logger.error('AuthModal: WebView error', {
              description: nativeEvent.description,
              url: nativeEvent.url,
            });
          }}
          onShouldStartLoadWithRequest={handleWebViewNavigation}
          onNavigationStateChange={handleWebViewNavigation}
          onMessage={handleWebViewMessage}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
        />
      </SafeAreaView>
    );
  }

  // Show loading state (iOS)
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
  webview: {
    flex: 1,
  },
  authenticatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
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
