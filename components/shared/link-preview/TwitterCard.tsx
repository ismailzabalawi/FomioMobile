/**
 * TwitterCard - Twitter/X tweet link preview card
 * 
 * WebView embed using Twitter's oEmbed API
 * Fallback to article-style if WebView fails
 * Respect dark/light theme
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import type { LinkPreview } from './types';
import { PremiumPressable } from './PremiumPressable';
import { ArticleCard } from './ArticleCard';

interface TwitterCardProps {
  preview: LinkPreview;
  onPress?: () => void;
}

/**
 * Build Twitter embed HTML
 */
function buildTwitterEmbedHtml(url: string, theme: 'light' | 'dark'): string {
  const escapedUrl = url.replace(/"/g, '&quot;');
  const themeParam = theme === 'dark' ? 'dark' : 'light';
  
  // Use Twitter's oEmbed API via a proxy or directly embed
  // Note: Twitter requires server-side rendering for oEmbed, so we use a simple iframe fallback
  // For production, you'd want to fetch the oEmbed HTML server-side
  
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      html, body { 
        margin: 0; 
        padding: 0; 
        background: ${theme === 'dark' ? '#000000' : '#FFFFFF'};
        height: 100%;
        overflow: hidden;
      }
      .container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        padding: 16px;
      }
      .fallback {
        text-align: center;
        color: ${theme === 'dark' ? '#FFFFFF' : '#000000'};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .link {
        color: ${theme === 'dark' ? '#1DA1F2' : '#1DA1F2'};
        text-decoration: none;
        margin-top: 8px;
        display: inline-block;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="fallback">
        <p>Twitter embed not available</p>
        <a href="${escapedUrl}" class="link" target="_blank">View on Twitter</a>
      </div>
    </div>
  </body>
</html>`;
}

/**
 * Twitter card component with WebView embed
 */
export function TwitterCard({ preview, onPress }: TwitterCardProps) {
  const { isDark, isAmoled } = useTheme();
  const mode = isDark ? (isAmoled ? 'darkAmoled' : 'dark') : 'light';
  const tokens = getTokens(mode);
  const theme = isDark ? 'dark' : 'light';

  const [webViewError, setWebViewError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // For now, fallback to article card since Twitter oEmbed requires server-side rendering
  // In production, you'd fetch the oEmbed HTML from your backend
  // For now, use ArticleCard as fallback
  if (webViewError || !preview.tweetId) {
    return <ArticleCard preview={preview} onPress={onPress} />;
  }

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

  const embedHtml = buildTwitterEmbedHtml(preview.url, theme);

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
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={tokens.colors.accent} />
          </View>
        )}
        
        <WebView
          source={{ html: embedHtml }}
          style={[
            styles.webview,
            {
              backgroundColor: tokens.colors.surfaceMuted,
              opacity: isLoading ? 0 : 1,
            },
          ]}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setWebViewError(true);
            setIsLoading(false);
          }}
          javaScriptEnabled
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          // Note: Twitter embed requires proper oEmbed API integration
          // This is a placeholder that falls back to ArticleCard
        />
        
        {/* Fallback content if WebView fails */}
        {webViewError && (
          <View style={styles.fallbackContent}>
            <Text
              style={[
                styles.fallbackText,
                {
                  color: tokens.colors.text,
                },
              ]}
            >
              {preview.title || 'View on Twitter'}
            </Text>
            {preview.description && (
              <Text
                style={[
                  styles.fallbackDescription,
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
                styles.fallbackLink,
                {
                  color: tokens.colors.accent,
                },
              ]}
            >
              twitter.com
            </Text>
          </View>
        )}
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
    minHeight: 200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  webview: {
    width: '100%',
    minHeight: 200,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  fallbackContent: {
    padding: 16,
    gap: 12,
  },
  fallbackText: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  fallbackDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  fallbackLink: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});

