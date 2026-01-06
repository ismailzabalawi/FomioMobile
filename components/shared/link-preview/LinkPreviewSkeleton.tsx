/**
 * LinkPreviewSkeleton - Loading placeholder for link preview cards
 * 
 * Provides provider-aware placeholder with simple muted background
 * (No shimmer - using progressive image loading instead)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import type { OneboxProvider } from './types';

interface LinkPreviewSkeletonProps {
  provider?: OneboxProvider;
}

/**
 * Skeleton component for link preview cards
 */
export function LinkPreviewSkeleton({ provider = 'generic' }: LinkPreviewSkeletonProps) {
  const { isDark, isAmoled } = useTheme();
  const mode = isDark ? (isAmoled ? 'darkAmoled' : 'dark') : 'light';
  const tokens = getTokens(mode);

  // Provider-specific placeholder icon/text
  const getPlaceholderIcon = () => {
    switch (provider) {
      case 'youtube':
        return '▶';
      case 'twitter':
        return '🐦';
      case 'github':
        return '🐙';
      case 'wikipedia':
        return '📚';
      default:
        return '🔗';
    }
  };

  const isVideo = provider === 'youtube';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.colors.surfaceMuted,
          borderColor: tokens.colors.border,
        },
      ]}
    >
      {isVideo && (
        <View
          style={[
            styles.imagePlaceholder,
            {
              backgroundColor: tokens.colors.surfaceMuted,
            },
          ]}
        >
          <Text style={[styles.icon, { color: tokens.colors.muted }]}>
            {getPlaceholderIcon()}
          </Text>
        </View>
      )}
      <View style={styles.textContainer}>
        <View
          style={[
            styles.titleSkeleton,
            {
              backgroundColor: tokens.colors.border,
            },
          ]}
        />
        <View
          style={[
            styles.descriptionSkeleton,
            {
              backgroundColor: tokens.colors.border,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 16,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    opacity: 0.3,
  },
  textContainer: {
    padding: 16,
    gap: 12,
  },
  titleSkeleton: {
    height: 20,
    borderRadius: 4,
    width: '80%',
    opacity: 0.4,
  },
  descriptionSkeleton: {
    height: 16,
    borderRadius: 4,
    width: '100%',
    opacity: 0.3,
  },
});

