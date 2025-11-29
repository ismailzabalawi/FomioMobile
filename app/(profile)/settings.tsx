import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Moon,
  Sun,
  Bell,
  Shield,
  Question,
  SignIn,
  SignOut,
  Trash,
  WifiHigh,
  WifiSlash,
  Eye,
  Lock,
  Globe,
  Star,
  Bookmark,
  Notification,
  Monitor,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { SettingItem, SettingSection } from '@/components/settings';
import { useAuth } from '@/shared/auth-context';
import { revokeKey } from '../../lib/discourse';
import { clearAll } from '../../lib/store';
import { router } from 'expo-router';
import { useDiscourseUser } from '../../shared/useDiscourseUser';
import { useSettingsStorage } from '../../shared/useSettingsStorage';
import { getThemeColors } from '@/shared/theme-constants';

export default function SettingsScreen(): React.ReactElement {
  const { themeMode, setThemeMode, isDark } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const { user: discourseUser, loading: userLoading } = useDiscourseUser();
  const { settings, updateSettings } = useSettingsStorage();

  // Configure header
  useScreenHeader({
    title: "Settings",
    canGoBack: true,
    withSafeTop: false,
    tone: "bg",
    compact: true,
    titleFontSize: 20,
  }, []);

  // Memoize theme colors - dark mode always uses AMOLED
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);

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
              await signOut();
              console.log('User signed out successfully');
              router.replace('/(auth)/signin');
            } catch (error) {
              console.error('Sign out failed:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  }, [signOut]);

  const handleRevokeKey = useCallback(() => {
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
            }
          },
        },
      ]
    );
  }, []);

  const handleDeleteAccount = useCallback(() => {
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
                      // Clear all local data
                      await AsyncStorage.clear();
                      await clearAll();
                      // TODO: Implement API call to delete account
                      console.log('Account deletion requested');
                      router.replace('/(auth)/signin');
                    } catch (error) {
                      console.error('Delete account failed:', error);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, []);

  // Other handlers
  const handleContactSupport = useCallback(() => {
    Linking.openURL('mailto:support@fomio.app?subject=Support Request');
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL('https://fomio.app/privacy');
  }, []);

  const handleTermsOfService = useCallback(() => {
    Linking.openURL('https://fomio.app/terms');
  }, []);

  const handleRateApp = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/app/fomio');
    } else {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.fomio.app');
    }
  }, []);

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
      // This is a local preference, not persisted to useSettingsStorage
      // as it might be synced with Discourse settings
      console.log('Notifications enabled:', value);
    },
    []
  );

  const handleNSFWToggle = useCallback(
    async (value: boolean) => {
      await updateSettings({ showNSFW: value });
    },
    [updateSettings]
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
                value={true} // TODO: Connect to actual notification preference
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
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
            title="Show NSFW Content"
            subtitle="Display sensitive content in feeds"
            icon={<Eye size={24} color={colors.accent} weight="regular" />}
            rightElement={
              <Switch
                value={settings.showNSFW}
                onValueChange={handleNSFWToggle}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="Privacy Settings"
            subtitle="Control who can see your activity"
            icon={<Shield size={24} color={colors.accent} weight="regular" />}
            onPress={() => console.log('Open privacy settings')}
          />

          <SettingItem
            title="Blocked Users"
            subtitle="Manage your blocked users list"
            icon={<Lock size={24} color={colors.accent} weight="regular" />}
            onPress={() => console.log('Open blocked users')}
          />
        </SettingSection>

        {/* Data & Storage */}
        <SettingSection title="Data & Storage">
          <SettingItem
            title="Offline Mode"
            subtitle="Browse without internet connection"
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
              onPress={() => router.push('/(auth)/signin' as any)}
            />
          </SettingSection>
        )}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: colors.secondary }]}>Fomio v1.0.0</Text>
          <Text style={[styles.appDescription, { color: colors.secondary }]}>
            A modern, privacy-focused forum app
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
