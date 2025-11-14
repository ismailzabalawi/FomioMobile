import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/components/theme';

export interface AvatarProps {
  source?: { uri: string } | number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  style?: ViewStyle;
}

export function Avatar({ source, size = 'md', fallback, style }: AvatarProps) {
  const { isDark } = useTheme();

  const getSizeStyle = () => {
    switch (size) {
      case 'sm': return { width: 32, height: 32, borderRadius: 16 };
      case 'md': return { width: 40, height: 40, borderRadius: 20 };
      case 'lg': return { width: 56, height: 56, borderRadius: 28 };
      case 'xl': return { width: 80, height: 80, borderRadius: 40 };
      default: return { width: 40, height: 40, borderRadius: 20 };
    }
  };

  const getFallbackTextSize = () => {
    switch (size) {
      case 'sm': return 12;
      case 'md': return 16;
      case 'lg': return 20;
      case 'xl': return 28;
      default: return 16;
    }
  };

  const avatarStyle: StyleProp<ViewStyle> = [
    styles.base,
    getSizeStyle(),
    {
      backgroundColor: isDark ? '#4b5563' : '#e5e7eb',
    },
    style,
  ];

  const fallbackTextStyle: StyleProp<TextStyle> = [
    styles.fallbackText,
    {
      fontSize: getFallbackTextSize(),
      color: isDark ? '#f9fafb' : '#374151',
    },
  ];

  if (source) {
    return (
      <View style={avatarStyle}>
        <Image source={source} style={[getSizeStyle(), styles.image]} />
      </View>
    );
  }

  return (
    <View style={avatarStyle}>
      <Text style={fallbackTextStyle}>
        {fallback ? fallback.charAt(0).toUpperCase() : '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  fallbackText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

