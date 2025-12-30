import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Moon,
  Shield,
  Question,
  SignIn,
  SignOut,
  Trash,
  WifiHigh,
  WifiSlash,
  Lock,
  Globe,
  Star,
  Bookmark,
  Monitor,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { SettingItem, SettingSection } from '@/components/settings';
import { useAuth } from '@/shared/auth-context';
import { clearAll } from '../../lib/store';
import { router } from 'expo-router';
import { useSettingsStorage } from '../../shared/useSettingsStorage';
import { getThemeColors } from '@/shared/theme-constants';
import { discourseApi } from '@/shared/discourseApi';
import { offlineManager } from '@/shared/offline-support';
import { clearQueryCache } from '@/shared/query-client';

export default function SettingsScreen(): React.ReactElement {
  const { themeMode, setThemeMode, isDark } = useTheme();
  const { isAuthenticated, signOut, user } = useAuth();
  const { settings, updateSettings, loading: settingsLoading } = useSettingsStorage();
  const [busyAction, setBusyAction] = useState<null | 'signOut' | 'revoke' | 'delete'>(null);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; totalSize: number } | null>(null);
  const [cacheStatsLoading, setCacheStatsLoading] = useState(false);

  // Configure header
  useScreenHeader({
    title: "Settings",
    canGoBack: true,
    withSafeTop: false,
    tone: "bg",
    compact: true,
    titleFontSize: 20,
  }, [isDark]);

  // Memoize theme colors - dark mode always uses AMOLED
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

  const appVersion = useMemo(
    () => Application.nativeApplicationVersion || '0.1.0',
    []
  );

  const safeOpenURL = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to open link', 'Please try again later.');
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
      Alert.alert('Unable to open link', 'Please try again later.');
    }
  }, []);

  // Theme handlers with haptics
  const handleFollowSystemToggle = useCallback(
    async (enabled: boolean) => {
      Haptics.selectionAsync().catch(() => {});
      if (enabled) {
        await setThemeMode('system');
      } else {
        // When disabling system, use current resolved theme
        const newMode = isDark ? 'dark' : 'light';
        await setThemeMode(newMode);
      }
    },
    [isDark, setThemeMode]
  );

  const handleThemeSelect = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    Alert.alert(
      'Choose Theme',
      '',
      [
        {
          text: 'Light',
          onPress: async () => {
            await setThemeMode('light');
          },
        },
        {
          text: 'Dark (AMOLED)',
          onPress: async () => {
            await setThemeMode('dark');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [setThemeMode]);

  // Security handlers
  const handleSignOut = useCallback(async () => {
    if (busyAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyAction('signOut');
              await signOut();
              console.log('User signed out successfully');
              router.replace('/(auth)/signin');
            } catch (error) {
              console.error('Sign out failed:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setBusyAction(null);
            }
          },
        },
      ]
    );
  }, [busyAction, signOut]);

  const handleRevokeKey = useCallback(() => {
    if (busyAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Revoke User API Key',
      'This will revoke your API key and sign you out. You will need to reconnect to use the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyAction('revoke');
              await signOut();
              // Clear all AsyncStorage
              try {
                await AsyncStorage.clear();
              } catch (error) {
                console.error('Failed to clear AsyncStorage:', error);
              }
              // Clear SecureStore
              try {
                await clearAll();
              } catch (error) {
                console.error('Failed to clear SecureStore:', error);
              }
              router.replace('/(auth)/signin');
            } catch (error) {
              console.error('Revoke failed:', error);
              Alert.alert('Error', 'Failed to revoke key. Please try again.');
            } finally {
              setBusyAction(null);
            }
          },
        },
      ]
    );
  }, [busyAction, signOut]);

  const handleDeleteAccount = useCallback(() => {
    if (busyAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    // First confirmation
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Are you absolutely sure?',
              'This will permanently delete your account and all associated data. This action cannot be reversed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => {
                    setDeletePassword('');
                    setDeleteError(null);
                    setShowDeletePrompt(true);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [busyAction]);

  // Other handlers
  const handleContactSupport = useCallback(() => {
    safeOpenURL('mailto:support@fomio.app?subject=Support Request');
  }, [safeOpenURL]);

  const handlePrivacyPolicy = useCallback(() => {
    safeOpenURL('https://fomio.app/privacy');
  }, [safeOpenURL]);

  const handleTermsOfService = useCallback(() => {
    safeOpenURL('https://fomio.app/terms');
  }, [safeOpenURL]);

  const handleRateApp = useCallback(() => {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/fomio'
        : 'https://play.google.com/store/apps/details?id=com.fomio.app';
    safeOpenURL(url);
  }, [safeOpenURL]);

  // Settings handlers with persistence
  const handleOfflineModeToggle = useCallback(
    async (value: boolean) => {
      await updateSettings({ offlineMode: value });
    },
    [updateSettings]
  );

  const handleAutoSaveToggle = useCallback(
    async (value: boolean) => {
      await updateSettings({ autoSave: value });
    },
    [updateSettings]
  );

  const handleConfirmDeleteAccount = useCallback(async () => {
    if (busyAction) return;
    if (!user?.username) {
      setDeleteError('Account info unavailable. Please sign in again.');
      return;
    }
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your password to delete your account.');
      return;
    }

    try {
      setBusyAction('delete');
      setDeleteError(null);
      const response = await discourseApi.deleteAccount(user.username, deletePassword);
      if (!response.success) {
        const message = response.error || response.errors?.join(', ') || 'Failed to delete account.';
        setDeleteError(message);
        return;
      }

      await signOut();
      try {
        await AsyncStorage.clear();
      } catch (error) {
        console.error('Failed to clear AsyncStorage:', error);
      }
      try {
        await clearAll();
      } catch (error) {
        console.error('Failed to clear SecureStore:', error);
      }
      setShowDeletePrompt(false);
      setDeletePassword('');
      router.replace('/(auth)/signin');
    } catch (error) {
      console.error('Delete account failed:', error);
      setDeleteError('Failed to delete account. Please try again.');
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, deletePassword, signOut, user?.username]);

  const handleCancelDeletePrompt = useCallback(() => {
    if (busyAction) return;
    setShowDeletePrompt(false);
    setDeletePassword('');
    setDeleteError(null);
  }, [busyAction]);

  const refreshCacheStats = useCallback(async () => {
    setCacheStatsLoading(true);
    try {
      const stats = await offlineManager.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    } finally {
      setCacheStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCacheStats();
  }, [refreshCacheStats]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const cacheSubtitle = cacheStats
    ? `Free up storage space (${cacheStats.count} items, ${formatBytes(cacheStats.totalSize)})`
    : cacheStatsLoading
      ? 'Free up storage space (calculating...)'
      : 'Free up storage space';

  const handleClearCache = useCallback(() => {
    if (isClearingCache) return;
    Alert.alert('Clear Cache', 'This will free up storage space. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        onPress: async () => {
          try {
            setIsClearingCache(true);
            await offlineManager.clearAll();
            clearQueryCache();
            discourseApi.clearCache();
            try {
              await AsyncStorage.removeItem('fomio-query-cache');
              await AsyncStorage.removeItem('compose_draft_meta_v1');
            } catch (storageError) {
              console.error('Failed to clear cache storage:', storageError);
            }
            await refreshCacheStats();
            Alert.alert('Cache Cleared', 'Cached data has been removed.');
          } catch (error) {
            console.error('Cache clear failed:', error);
            Alert.alert('Error', 'Failed to clear cache. Please try again.');
          } finally {
            setIsClearingCache(false);
          }
        },
      },
    ]);
  }, [isClearingCache, refreshCacheStats]);

  const getBusyIndicator = (action: 'signOut' | 'revoke' | 'delete') => {
    if (busyAction !== action) return undefined;
    return (
      <View style={styles.busyIndicator}>
        <ActivityIndicator color={colors.destructive} size="small" />
        <Text style={[styles.busyLabel, { color: colors.secondary }]}>Working...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {settingsLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.secondary }]}>Loading preferences…</Text>
          </View>
        )}

        {/* Appearance */}
        <SettingSection title="Appearance">
          <SettingItem
            title="Follow System Theme"
            subtitle="Automatically match device settings"
            icon={<Monitor size={24} color={colors.accent} weight="regular" />}
            rightElement={
              <Switch
                value={themeMode === 'system'}
                onValueChange={handleFollowSystemToggle}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
                disabled={settingsLoading}
              />
            }
            showChevron={false}
          />

          {themeMode !== 'system' && (
            <SettingItem
              title="Theme"
              subtitle={themeMode === 'dark' ? 'Dark (AMOLED)' : 'Light'}
              icon={<Moon size={24} color={colors.accent} weight="regular" />}
              onPress={handleThemeSelect}
            />
          )}
        </SettingSection>

        {/* Content & Privacy */}
        <SettingSection title="Content & Privacy">
          <SettingItem
            title="Privacy Settings"
            subtitle="Control who can see your activity (coming soon)"
            icon={<Shield size={24} color={colors.accent} weight="regular" />}
            showChevron={false}
          />

          <SettingItem
            title="Blocked Users"
            subtitle="Manage your blocked users list (coming soon)"
            icon={<Lock size={24} color={colors.accent} weight="regular" />}
            showChevron={false}
          />
        </SettingSection>

        {/* Data & Storage */}
        <SettingSection title="Data & Storage">
          <SettingItem
            title="Offline Mode"
            subtitle="Browse without internet connection (coming soon)"
            icon={
              settings.offlineMode ? (
                <WifiSlash size={24} color={colors.accent} weight="fill" />
              ) : (
                <WifiHigh size={24} color={colors.accent} weight="regular" />
              )
            }
            rightElement={
              <Switch
                value={settings.offlineMode}
                onValueChange={handleOfflineModeToggle}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
                disabled
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="Auto-save Drafts"
            subtitle="Automatically save your posts"
            icon={<Bookmark size={24} color={colors.accent} weight="regular" />}
            rightElement={
              <Switch
                value={settings.autoSave}
                onValueChange={handleAutoSaveToggle}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
                disabled={settingsLoading}
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="Clear Cache"
            subtitle={cacheSubtitle}
            icon={<Trash size={24} color={colors.accent} weight="regular" />}
            onPress={handleClearCache}
            rightElement={
              isClearingCache ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : undefined
            }
            disabled={isClearingCache}
          />
        </SettingSection>

        {/* Support & Feedback */}
        <SettingSection title="Support & Feedback">
          <SettingItem
            title="Contact Support"
            subtitle="Get help with your account"
            icon={<Question size={24} color={colors.accent} weight="regular" />}
            onPress={handleContactSupport}
          />

          <SettingItem
            title="Rate Fomio"
            subtitle="Help us improve with your feedback"
            icon={<Star size={24} color={colors.accent} weight="regular" />}
            onPress={handleRateApp}
          />

          <SettingItem
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            icon={<Shield size={24} color={colors.accent} weight="regular" />}
            onPress={handlePrivacyPolicy}
          />

          <SettingItem
            title="Terms of Service"
            subtitle="Read our terms of service"
            icon={<Globe size={24} color={colors.accent} weight="regular" />}
            onPress={handleTermsOfService}
          />
        </SettingSection>

        {/* Account Actions */}
        {isAuthenticated ? (
          <SettingSection title="Account">
            <SettingItem
              title="Revoke User API Key"
              subtitle="Revoke your API key and sign out"
              icon={<Lock size={24} color={colors.destructive} weight="regular" />}
              onPress={handleRevokeKey}
              rightElement={getBusyIndicator('revoke')}
              isDestructive={true}
              disabled={!!busyAction}
            />
            <SettingItem
              title="Sign Out"
              subtitle="Sign out of your account"
              icon={<SignOut size={24} color={colors.destructive} weight="regular" />}
              onPress={handleSignOut}
              rightElement={getBusyIndicator('signOut')}
              isDestructive={true}
              disabled={!!busyAction}
            />

            <SettingItem
              title="Delete Account"
              subtitle="Permanently delete your account"
              icon={<Trash size={24} color={colors.destructive} weight="regular" />}
              onPress={handleDeleteAccount}
              rightElement={getBusyIndicator('delete')}
              isDestructive={true}
              disabled={!!busyAction}
            />
          </SettingSection>
        ) : (
          <SettingSection title="Account">
            <SettingItem
              title="Sign In"
              subtitle="Sign in to access your account settings"
              icon={<SignIn size={24} color={colors.accent} weight="regular" />}
              onPress={() => router.push('/(auth)/signin')}
            />
          </SettingSection>
        )}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: colors.secondary }]}>Fomio v{appVersion}</Text>
          <Text style={[styles.appDescription, { color: colors.secondary }]}>
            A modern, privacy-focused community
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showDeletePrompt} transparent animationType="fade" onRequestClose={handleCancelDeletePrompt}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Confirm deletion</Text>
            <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
              Enter your password to delete your account permanently.
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={(value) => {
                setDeletePassword(value);
                if (deleteError) {
                  setDeleteError(null);
                }
              }}
              placeholder="Password"
              placeholderTextColor={colors.secondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busyAction}
              style={[
                styles.modalInput,
                { borderColor: colors.border, color: colors.foreground },
              ]}
            />
            {deleteError ? (
              <Text style={[styles.modalError, { color: colors.destructive }]}>
                {deleteError}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                onPress={handleCancelDeletePrompt}
                disabled={!!busyAction}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancel,
                  { borderColor: colors.border },
                  { opacity: pressed || busyAction ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.modalButtonText, { color: colors.secondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDeleteAccount}
                disabled={!!busyAction || !deletePassword.trim()}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalDelete,
                  { borderColor: colors.destructive },
                  { opacity: pressed || busyAction || !deletePassword.trim() ? 0.7 : 1 },
                ]}
              >
                {busyAction === 'delete' ? (
                  <ActivityIndicator color={colors.destructive} size="small" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.destructive }]}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '400',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  appVersion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  busyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  busyLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalError: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -8,
    marginBottom: 12,
  },
  modalButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalDelete: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
