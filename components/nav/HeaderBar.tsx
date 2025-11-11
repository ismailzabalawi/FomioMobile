import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/components/theme';
import { ArrowLeft, UserCircle } from 'phosphor-react-native';
import { router } from 'expo-router';

export interface HeaderBarProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showProfileButton?: boolean;
  onProfilePress?: () => void;
  style?: ViewStyle;
}

// UI Spec: HeaderBar — Three-section header with navigation, title, and profile. Accessible and themed.
export function HeaderBar({
  title,
  showBackButton = true,
  onBack,
  showProfileButton = true,
  onProfilePress,
  style,
}: HeaderBarProps) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#fff'),
    text: isDark ? '#f4f4f5' : '#1e293b',
    divider: isAmoled ? '#000000' : (isDark ? '#334155' : '#e2e8f0'),
  };

  function handleBackPress() {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }

  function handleProfilePress() {
    if (onProfilePress) {
      onProfilePress();
    } else {
      // Navigate to profile page
      router.push('/(profile)/' as any);
    }
  }

  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.divider }, style]}>
      {/* Left Section - Navigation */}
      <View style={styles.side}>
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.iconButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Go back to previous screen"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={28} color={colors.text} weight="bold" />
          </TouchableOpacity>
        )}
      </View>

      {/* Center Section - Title */}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>

      {/* Right Section - Profile */}
      <View style={styles.side}>
        {showProfileButton && (
          <TouchableOpacity
            onPress={handleProfilePress}
            style={styles.iconButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Profile"
            accessibilityHint="Open profile page"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <UserCircle size={28} color={colors.text} weight="bold" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  } as ViewStyle,
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  } as TextStyle,
  side: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  iconButton: {
    padding: 8,
    borderRadius: 8,
  } as ViewStyle,
  icon: {
    fontSize: 24,
  } as TextStyle,
}); 