import React, { useMemo, useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Switch } from 'react-native';
import { router } from 'expo-router';
import { Bell, Gear, PencilSimple } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { SettingItem, SettingSection } from '@/components/settings';
import { getThemeColors } from '@/shared/theme-constants';

export default function ManageProfileScreen(): React.ReactElement {
  const { themeMode, isDark } = useTheme();
  const colors = useMemo(() => getThemeColors(themeMode, isDark), [themeMode, isDark]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleNotificationsToggle = useCallback((value: boolean) => {
    setNotificationsEnabled(value);
    // Local preference only for now; can be wired to remote settings later.
    console.log('Notifications enabled:', value);
  }, []);

  useScreenHeader({
    title: 'Profile & Settings',
    canGoBack: true,
    withSafeTop: false,
    tone: 'bg',
    compact: true,
    titleFontSize: 20,
  }, [isDark]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
        <SettingSection title="Profile">
          <SettingItem
            title="Edit profile"
            subtitle="Avatar, bio, links"
            icon={<PencilSimple size={20} color={colors.accent} weight="fill" />}
            onPress={() => router.push('/(profile)/edit-profile')}
          />
        </SettingSection>

        <SettingSection title="Preferences">
          <SettingItem
            title="Push notifications"
            subtitle="Receive activity alerts"
            icon={<Bell size={20} color={colors.accent} weight="fill" />}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
              />
            }
            showChevron={false}
          />
          <SettingItem
            title="Notifications"
            subtitle="Choose what reaches you"
            icon={<Bell size={20} color={colors.accent} weight="fill" />}
            onPress={() => router.push('/(profile)/notification-settings')}
          />
          <SettingItem
            title="Settings"
            subtitle="Theme, privacy, account"
            icon={<Gear size={20} color={colors.accent} weight="fill" />}
            onPress={() => router.push('/(profile)/settings')}
          />
        </SettingSection>
      </ScrollView>
    </SafeAreaView>
  );
}
