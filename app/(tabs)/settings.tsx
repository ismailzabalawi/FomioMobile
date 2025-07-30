import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  Alert,
  Linking,
  Platform,
  Animated,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Moon, 
  Sun, 
  Bell, 
  Shield, 
  User, 
  Gear, 
  Question, 
  SignOut, 
  Trash,
  Download,
  WifiHigh,
  WifiSlash,
  Eye,
  EyeSlash,
  Lock,
  Globe,
  Heart,
  Star,
  Bookmark,
  Notification,
  Monitor
} from 'phosphor-react-native';
import { useTheme } from '../../components/shared/theme-provider';
import { HeaderBar } from '../../components/nav/HeaderBar';
import { useAuth } from '../../shared/useAuth';
import { useDiscourseUser } from '../../shared/useDiscourseUser';

interface SettingItemProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  isDestructive?: boolean;
}

function SettingItem({ 
  title, 
  subtitle, 
  icon, 
  onPress, 
  rightElement, 
  showChevron = true,
  isDestructive = false 
}: SettingItemProps) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    destructive: isDark ? '#ef4444' : '#dc2626',
  };

  return (
    <TouchableOpacity
      style={[styles.settingItem, { 
        backgroundColor: colors.background, 
        borderBottomColor: colors.border 
      }]}
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={[
            styles.settingTitle, 
            { color: isDestructive ? colors.destructive : colors.text }
          ]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.secondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showChevron && onPress && (
          <Text style={[styles.chevron, { color: colors.secondary }]}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    text: isDark ? '#9ca3af' : '#6b7280',
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen(): JSX.Element {
  const { isDark, isAmoled, theme, setTheme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const { user: discourseUser, loading: userLoading } = useDiscourseUser();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [showNSFW, setShowNSFW] = useState(false);
  
  // Animation for AMOLED toggle
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: isDark ? '#3b82f6' : '#0ea5e9',
    destructive: isDark ? '#ef4444' : '#dc2626',
  };

  const getThemeDisplayName = () => {
    if (isAmoled) return 'AMOLED Dark';
    if (isDark) return 'Dark Mode';
    return 'Light Mode';
  };

  const toggleLightDark = () => {
    if (isDark) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  const toggleDarkAmoled = () => {
    if (isAmoled) {
      setTheme('dark');
    } else {
      setTheme('amoled');
    }
  };

  // Animate AMOLED toggle when dark mode changes
  useEffect(() => {
    if (isDark) {
      // Slide in and fade in with spring
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Slide out and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isDark, slideAnim, opacityAnim]);

  // Initialize animation state based on current theme
  useEffect(() => {
    if (isDark) {
      slideAnim.setValue(1);
      opacityAnim.setValue(1);
    } else {
      slideAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => {
          try {
            await signOut();
            console.log('User signed out successfully');
          } catch (error) {
            console.error('Sign out failed:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        }},
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          console.log('Account deletion requested');
          // Implement account deletion logic
        }},
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@fomio.app?subject=Support Request');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://fomio.app/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://fomio.app/terms');
  };

  const handleRateApp = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/app/fomio');
    } else {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.fomio.app');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar 
        title="Settings" 
        showBackButton={false}
        showProfileButton={false}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <SettingSection title="Appearance">
          <SettingItem
            title="Dark Mode"
            subtitle={isDark ? 'Enabled' : 'Disabled'}
            icon={<Moon size={24} color={colors.primary} weight="fill" />}
            onPress={toggleLightDark}
            rightElement={
              <View style={styles.themeToggle}>
                <Sun size={16} color={colors.secondary} weight={isDark ? 'regular' : 'fill'} />
                <Switch
                  value={isDark}
                  onValueChange={toggleLightDark}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={isDark ? '#ffffff' : '#ffffff'}
                />
                <Moon size={16} color={colors.secondary} weight={isDark ? 'fill' : 'regular'} />
              </View>
            }
            showChevron={false}
          />
          
          <Animated.View
            style={{
              opacity: opacityAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
              maxHeight: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 80],
              }),
              overflow: 'hidden',
            }}
          >
            <SettingItem
              title="AMOLED Mode"
              subtitle={isAmoled ? 'True black background' : 'Standard dark background'}
              icon={<Monitor size={24} color={colors.primary} weight="fill" />}
              onPress={toggleDarkAmoled}
              rightElement={
                <Switch
                  value={isAmoled}
                  onValueChange={toggleDarkAmoled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={isAmoled ? '#ffffff' : '#ffffff'}
                />
              }
              showChevron={false}
            />
          </Animated.View>
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications">
          <SettingItem
            title="Push Notifications"
            subtitle="Receive notifications for new activity"
            icon={<Bell size={24} color={colors.primary} weight="fill" />}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notificationsEnabled ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />
          
          <SettingItem
            title="Notification Preferences"
            subtitle="Customize what you're notified about"
            icon={<Notification size={24} color={colors.primary} weight="regular" />}
            onPress={() => console.log('Open notification preferences')}
          />
        </SettingSection>

        {/* Content & Privacy */}
        <SettingSection title="Content & Privacy">
          <SettingItem
            title="Show NSFW Content"
            subtitle="Display sensitive content in feeds"
            icon={<Eye size={24} color={colors.primary} weight="regular" />}
            rightElement={
              <Switch
                value={showNSFW}
                onValueChange={setShowNSFW}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={showNSFW ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />
          
          <SettingItem
            title="Privacy Settings"
            subtitle="Control who can see your activity"
            icon={<Shield size={24} color={colors.primary} weight="regular" />}
            onPress={() => console.log('Open privacy settings')}
          />
          
          <SettingItem
            title="Blocked Users"
            subtitle="Manage your blocked users list"
            icon={<Lock size={24} color={colors.primary} weight="regular" />}
            onPress={() => console.log('Open blocked users')}
          />
        </SettingSection>

        {/* Data & Storage */}
        <SettingSection title="Data & Storage">
          <SettingItem
            title="Offline Mode"
            subtitle="Browse without internet connection"
            icon={offlineMode ? <WifiSlash size={24} color={colors.primary} weight="fill" /> : <WifiHigh size={24} color={colors.primary} weight="regular" />}
            rightElement={
              <Switch
                value={offlineMode}
                onValueChange={setOfflineMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={offlineMode ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />
          
          <SettingItem
            title="Auto-save Drafts"
            subtitle="Automatically save your posts"
            icon={<Bookmark size={24} color={colors.primary} weight="regular" />}
            rightElement={
              <Switch
                value={autoSave}
                onValueChange={setAutoSave}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={autoSave ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />
          
          <SettingItem
            title="Clear Cache"
            subtitle="Free up storage space"
            icon={<Trash size={24} color={colors.primary} weight="regular" />}
            onPress={() => {
              Alert.alert('Clear Cache', 'This will free up storage space. Continue?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', onPress: () => console.log('Cache cleared') },
              ]);
            }}
          />
        </SettingSection>

        {/* Support & Feedback */}
        <SettingSection title="Support & Feedback">
          <SettingItem
            title="Contact Support"
            subtitle="Get help with your account"
            icon={<Question size={24} color={colors.primary} weight="regular" />}
            onPress={handleContactSupport}
          />
          
          <SettingItem
            title="Rate Fomio"
            subtitle="Help us improve with your feedback"
            icon={<Star size={24} color={colors.primary} weight="regular" />}
            onPress={handleRateApp}
          />
          
          <SettingItem
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            icon={<Shield size={24} color={colors.primary} weight="regular" />}
            onPress={handlePrivacyPolicy}
          />
          
          <SettingItem
            title="Terms of Service"
            subtitle="Read our terms of service"
            icon={<Globe size={24} color={colors.primary} weight="regular" />}
            onPress={handleTermsOfService}
          />
        </SettingSection>

        {/* Account Actions */}
        <SettingSection title="Account">
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

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: colors.secondary }]}>
            Fomio v1.0.0
          </Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  sectionContent: {
    backgroundColor: 'transparent',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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