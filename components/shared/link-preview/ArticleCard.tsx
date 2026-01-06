/**
 * ArticleCard - Generic article/news link preview card
 * 
 * Expanded layout: full-width image, title, description, site name + favicon
 * Progressive image loading via expo-image
 * Handles missing images gracefully
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import type { LinkPreview } from './types';
import { PremiumPressable } from './PremiumPressable';

interface ArticleCardProps {
  preview: LinkPreview;
  onPress?: () => void;
}

/**
 * Article card component for generic link previews
 */
export function ArticleCard({ preview, onPress }: ArticleCardProps) {
  const { isDark, isAmoled } = useTheme();
  const mode = isDark ? (isAmoled ? 'darkAmoled' : 'dark') : 'light';
  const tokens = getTokens(mode);

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    try {
      await WebBrowser.openBrowserAsync(preview.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: tokens.colors.accent,
      });
    } catch (error) {
      // Fallback to Linking if WebBrowser fails
      const { Linking } = require('react-native');
      Linking.openURL(preview.url).catch(() => {});
    }
  };

  const siteName = preview.siteName || preview.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  return (
    <PremiumPressable onPress={handlePress} style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: tokens.colors.surfaceMuted,
            borderColor: tokens.colors.border,
            shadowColor: tokens.colors.shadow || '#000',
          },
        ]}
      >
        {preview.image && (
          <Image
            source={{ uri: preview.image }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            accessibilityLabel={preview.title || 'Link preview image'}
            placeholderContentFit="cover"
          />
        )}
        
        <View style={styles.content}>
          {preview.favicon && (
            <View style={styles.faviconContainer}>
              <Image
                source={{ uri: preview.favicon }}
                style={styles.favicon}
                contentFit="contain"
                accessibilityLabel="Site favicon"
              />
            </View>
          )}
          
          {preview.title && (
            <Text
              style={[
                styles.title,
                {
                  color: tokens.colors.text,
                },
              ]}
              numberOfLines={2}
            >
              {preview.title}
            </Text>
          )}
          
          {preview.description && (
            <Text
              style={[
                styles.description,
                {
                  color: tokens.colors.muted,
                },
              ]}
              numberOfLines={3}
            >
              {preview.description}
            </Text>
          )}
          
          <Text
            style={[
              styles.siteName,
              {
                color: tokens.colors.accent,
              },
            ]}
            numberOfLines={1}
          >
            {siteName}
          </Text>
        </View>
      </View>
    </PremiumPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  faviconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  favicon: {
    width: 16,
    height: 16,
    marginRight: 6,
    borderRadius: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  siteName: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 4,
  },
});

