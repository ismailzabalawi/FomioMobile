import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Pressable } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';

export interface SettingItemProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  isDestructive?: boolean;
}

export const SettingItem = memo(function SettingItem({
  title,
  subtitle,
  icon,
  onPress,
  rightElement,
  showChevron = true,
  isDestructive = false,
}: SettingItemProps) {
  const { themeMode, isDark } = useTheme();
  const colors = getThemeColors(themeMode, isDark);

  const handlePress = () => {
    if (onPress) {
      // Add haptic feedback
      Haptics.selectionAsync().catch(() => {});
      onPress();
    }
  };

  const content = (
    <View
      style={[
        styles.settingItem,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.settingText}>
          <Text
            style={[
              styles.settingTitle,
              { color: isDestructive ? colors.destructive : colors.foreground },
            ]}
          >
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
          <View style={styles.chevron}>
            <CaretRight size={18} color={colors.secondary} weight="regular" />
          </View>
        )}
      </View>
    </View>
  );

  if (Platform.OS === 'android' && onPress) {
    return (
      <Pressable
        onPress={handlePress}
        disabled={!onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        android_ripple={{
          color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          borderless: true,
          radius: 20,
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

