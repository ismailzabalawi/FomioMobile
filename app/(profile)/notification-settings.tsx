import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChatCircle,
  At,
  Heart,
  Envelope,
  Star,
  Bell,
  Users,
  Check,
} from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { useHeader } from '@/components/ui/header';
import { useNotificationPreferences } from '../../shared/useNotificationPreferences';

interface SettingItemProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  comingSoon?: boolean;
}

function SettingItem({
  title,
  subtitle,
  icon,
  onPress,
  rightElement,
  showChevron = true,
  comingSoon = false,
}: SettingItemProps) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : isDark ? '#1f2937' : '#ffffff',
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    disabledText: isDark ? '#6b7280' : '#9ca3af',
    disabledIcon: isDark ? '#6b7280' : '#9ca3af',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  return (
    <TouchableOpacity
      style={[
        styles.settingItem,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          opacity: comingSoon ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      disabled={!onPress || comingSoon}
      accessible
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          {comingSoon
            ? React.cloneElement(icon as React.ReactElement<any>, {
                color: colors.disabledIcon,
              })
            : icon}
        </View>
        <View style={styles.settingText}>
          <Text
            style={[
              styles.settingTitle,
              { color: comingSoon ? colors.disabledText : colors.text },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.settingSubtitle,
                { color: comingSoon ? colors.disabledText : colors.secondary },
              ]}
            >
              {subtitle}
              {comingSoon && ' • Coming soon'}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showChevron && onPress && !comingSoon && (
          <Text style={[styles.chevron, { color: colors.secondary }]}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SettingSection({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { isDark } = useTheme();
  const colors = {
    text: isDark ? '#9ca3af' : '#6b7280',
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {description && (
        <Text style={[styles.sectionDescription, { color: colors.text }]}>
          {description}
        </Text>
      )}
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

const LIKE_FREQUENCY_OPTIONS: Array<{ value: 'always' | 'daily' | 'weekly' | 'never'; label: string }> = [
  { value: 'always', label: 'Always' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'never', label: 'Never' },
];

export default function NotificationSettingsScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const { setHeader, resetHeader } = useHeader();
  const { preferences, setPreference, isLoading } = useNotificationPreferences();
  const [likeFrequencyModalVisible, setLikeFrequencyModalVisible] = useState(false);

  // Configure header
  React.useEffect(() => {
    setHeader({
      title: "Notification Preferences",
      canGoBack: true,
      withSafeTop: false,
      tone: "bg",
    });
    return () => resetHeader();
  }, [setHeader, resetHeader]);

  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: isDark ? '#3b82f6' : '#0ea5e9',
  };

  const getLikeFrequencyLabel = () => {
    const option = LIKE_FREQUENCY_OPTIONS.find(opt => opt.value === preferences.likeFrequency);
    return option?.label || 'Always';
  };

  const handleLikeFrequencySelect = (value: 'always' | 'daily' | 'weekly' | 'never') => {
    setPreference('likeFrequency', value);
    setLikeFrequencyModalVisible(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.secondary }}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Categories */}
        <SettingSection title="Notification Categories">
          <SettingItem
            title="Replies & Quotes"
            subtitle="When someone responds to your Byte"
            icon={<ChatCircle size={24} color={colors.secondary} weight="fill" />}
            comingSoon={true}
            rightElement={
              <Switch
                value={preferences.replies}
                onValueChange={(value) => setPreference('replies', value)}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={preferences.replies ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="Mentions"
            subtitle="When someone mentions your username"
            icon={<At size={24} color={colors.secondary} weight="fill" />}
            comingSoon={true}
            rightElement={
              <Switch
                value={preferences.mentions}
                onValueChange={(value) => setPreference('mentions', value)}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={preferences.mentions ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="Likes"
            subtitle="Likes on your Bytes"
            icon={<Heart size={24} color={colors.secondary} weight="fill" />}
            comingSoon={true}
            rightElement={
              <Switch
                value={preferences.likes}
                onValueChange={(value) => setPreference('likes', value)}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={preferences.likes ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="Private Messages"
            subtitle="Direct messages sent to you"
            icon={<Envelope size={24} color={colors.secondary} weight="fill" />}
            comingSoon={true}
            rightElement={
              <Switch
                value={preferences.privateMessages}
                onValueChange={(value) => setPreference('privateMessages', value)}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={preferences.privateMessages ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="Badges & Achievements"
            subtitle="Badges you've earned"
            icon={<Star size={24} color={colors.secondary} weight="fill" />}
            comingSoon={true}
            rightElement={
              <Switch
                value={preferences.badges}
                onValueChange={(value) => setPreference('badges', value)}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={preferences.badges ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="System Notifications"
            subtitle="Reminders, admin messages, and updates"
            icon={<Bell size={24} color={colors.secondary} weight="regular" />}
            comingSoon={true}
            rightElement={
              <Switch
                value={preferences.system}
                onValueChange={(value) => setPreference('system', value)}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={preferences.system ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="Following Activity"
            subtitle="Activity on Bytes you follow"
            icon={<Users size={24} color={colors.secondary} weight="regular" />}
            comingSoon={true}
            rightElement={
              <Switch
                value={preferences.following}
                onValueChange={(value) => setPreference('following', value)}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={preferences.following ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />
        </SettingSection>

        {/* Like Notifications */}
        <SettingSection title="Like Notifications">
          <SettingItem
            title="Like notifications"
            subtitle={getLikeFrequencyLabel()}
            icon={<Heart size={24} color={colors.primary} weight="regular" />}
            onPress={() => setLikeFrequencyModalVisible(true)}
            rightElement={
              <Text style={[styles.frequencyValue, { color: colors.secondary }]}>
                {getLikeFrequencyLabel()}
              </Text>
            }
          />
        </SettingSection>

        {/* Push Notifications */}
        <SettingSection
          title="Push Notifications"
          description="Push notifications are coming soon."
        >
          <SettingItem
            title="Enable Push"
            subtitle="Receive push notifications"
            icon={<Bell size={24} color={colors.secondary} weight="regular" />}
            rightElement={
              <Switch
                value={preferences.pushEnabled}
                onValueChange={(value) => setPreference('pushEnabled', value)}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={preferences.pushEnabled ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="Sound"
            subtitle="Play sound for push notifications"
            icon={<Bell size={24} color={colors.secondary} weight="regular" />}
            rightElement={
              <Switch
                value={preferences.pushSound}
                onValueChange={(value) => setPreference('pushSound', value)}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={preferences.pushSound ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />

          <SettingItem
            title="Alert"
            subtitle="Show alert for push notifications"
            icon={<Bell size={24} color={colors.secondary} weight="regular" />}
            rightElement={
              <Switch
                value={preferences.pushAlert}
                onValueChange={(value) => setPreference('pushAlert', value)}
                disabled={true}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={preferences.pushAlert ? '#ffffff' : '#ffffff'}
              />
            }
            showChevron={false}
          />
        </SettingSection>
      </ScrollView>

      {/* Like Frequency Modal */}
      <Modal
        visible={likeFrequencyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLikeFrequencyModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLikeFrequencyModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Like Notifications
            </Text>
            {LIKE_FREQUENCY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  { borderBottomColor: colors.border },
                  preferences.likeFrequency === option.value && {
                    backgroundColor: `${colors.primary}20`,
                  },
                ]}
                onPress={() => handleLikeFrequencySelect(option.value)}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>
                  {option.label}
                </Text>
                {preferences.likeFrequency === option.value && (
                  <Check size={20} color={colors.primary} weight="bold" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalCancel, { borderTopColor: colors.border }]}
              onPress={() => setLikeFrequencyModalVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.secondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 4,
    marginHorizontal: 16,
  },
  sectionDescription: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 8,
    marginHorizontal: 16,
    fontStyle: 'italic',
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
  frequencyValue: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '400',
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});


