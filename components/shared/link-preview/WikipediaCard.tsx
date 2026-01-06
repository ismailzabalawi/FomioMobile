/**
 * WikipediaCard - Wikipedia article link preview card
 * 
 * Horizontal layout: small image on left, title + summary on right
 * Wikipedia logo as favicon
 * Clean, knowledge-base aesthetic
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import type { LinkPreview } from './types';
import { PremiumPressable } from './PremiumPressable';

interface WikipediaCardProps {
  preview: LinkPreview;
  onPress?: () => void;
}

/**
 * Wikipedia card component with summary layout
 */
export function WikipediaCard({ preview, onPress }: WikipediaCardProps) {
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
      const { Linking } = require('react-native');
      Linking.openURL(preview.url).catch(() => {});
    }
  };

  const siteName = preview.siteName || 'Wikipedia';

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
        <View style={styles.content}>
          {preview.image && (
            <Image
              source={{ uri: preview.image }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              accessibilityLabel={preview.title || 'Wikipedia article image'}
              placeholderContentFit="cover"
            />
          )}
          
          <View style={styles.textContainer}>
            <View style={styles.header}>
              {preview.favicon && (
                <Image
                  source={{ uri: preview.favicon }}
                  style={styles.favicon}
                  contentFit="contain"
                  accessibilityLabel="Wikipedia logo"
                />
              )}
              <Text
                style={[
                  styles.siteName,
                  {
                    color: tokens.colors.accent,
                  },
                ]}
              >
                {siteName}
              </Text>
            </View>
            
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
                numberOfLines={4}
              >
                {preview.description}
              </Text>
            )}
          </View>
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
  content: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  textContainer: {
    flex: 1,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  siteName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
});

