import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/components/theme';
import { getThemeColors } from '@/shared/theme-constants';

export interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingSection = memo(function SettingSection({
  title,
  children,
}: SettingSectionProps) {
  const { themeMode, isDark } = useTheme();
  const colors = getThemeColors(themeMode, isDark);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
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
});

