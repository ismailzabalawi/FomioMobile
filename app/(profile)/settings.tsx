import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Moon,
  Bell,
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
  Notification,
  Monitor,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { SettingItem, SettingSection } from '@/components/settings';
import { useAuth } from '@/shared/auth-context';
import { revokeKey } from '../../lib/discourse';
import { clearAll } from '../../lib/store';
import { router } from 'expo-router';
import { useSettingsStorage } from '../../shared/useSettingsStorage';
import { getThemeColors } from '@/shared/theme-constants';

export default function SettingsScreen(): React.ReactElement {
  const { themeMode, setThemeMode, isDark } = useTheme();
  const { isAuthenticated, signOut } = useAuth();
  const { settings, updateSettings, loading: settingsLoading } = useSettingsStorage();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [busyAction, setBusyAction] = useState<null | 'signOut' | 'revoke' | 'delete'>(null);

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
              await revokeKey();
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
  }, [busyAction]);

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
                  onPress: async () => {
                    try {
                      setBusyAction('delete');
                      // Clear all local data
                      await AsyncStorage.clear();
                      await clearAll();
                      // TODO: Implement API call to delete account
                      console.log('Account deletion requested');
                      router.replace('/(auth)/signin');
                    } catch (error) {
                      console.error('Delete account failed:', error);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    } finally {
                      setBusyAction(null);
                    }
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

  const handleClearCache = useCallback(() => {
    Alert.alert('Clear Cache', 'This will free up storage space. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        onPress: () => {
          console.log('Cache cleared');
          // TODO: Implement actual cache clearing
        },
      },
    ]);
  }, []);

  // Settings handlers with persistence
  const handleNotificationsToggle = useCallback(
    async (value: boolean) => {
      setNotificationsEnabled(value);
      // This is a local preference, not persisted to useSettingsStorage
      // as it might be synced with Discourse settings
      console.log('Notifications enabled:', value);
    },
    []
  );

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

        {/* Notifications */}
        <SettingSection title="Notifications">
          <SettingItem
            title="Push Notifications"
            subtitle="Receive notifications for new activity"
            icon={<Bell size={24} color={colors.accent} weight="fill" />}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
                disabled={settingsLoading}
              />
            }
            showChevron={false}
          />

          {isAuthenticated && (
            <SettingItem
              title="Notification Preferences"
              subtitle="Customize what you're notified about"
              icon={<Notification size={24} color={colors.accent} weight="regular" />}
              onPress={() => router.push('/(profile)/notification-settings')}
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
            subtitle="Free up storage space"
            icon={<Trash size={24} color={colors.accent} weight="regular" />}
            onPress={handleClearCache}
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
              isDestructive={true}
            />
            <SettingItem
              title="Sign Out"
              subtitle="Sign out of your account"
              icon={<SignOut size={24} color={colors.destructive} weight="regular" />}
              onPress={handleSignOut}
              isDestructive={true}
            />

            <SettingItem
              title="Delete Account"
              subtitle="Permanently delete your account"
              icon={<Trash size={24} color={colors.destructive} weight="regular" />}
              onPress={handleDeleteAccount}
              isDestructive={true}
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
});
