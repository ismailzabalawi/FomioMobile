/**
 * GitHubCard - GitHub repository link preview card
 * 
 * Custom native card (no WebView)
 * Shows: org/repo, description, stars, forks, primary language with color dot
 * Uses Phosphor icons for GitHub logo
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { GithubLogo, Star, GitFork } from 'phosphor-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/components/theme';
import { getTokens } from '@/shared/design/tokens';
import type { LinkPreview } from './types';
import { PremiumPressable } from './PremiumPressable';

interface GitHubCardProps {
  preview: LinkPreview;
  onPress?: () => void;
}

/**
 * Language color mapping (popular languages)
 */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#239120',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  Swift: '#fa7343',
  Kotlin: '#A97BFF',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Vue: '#4fc08d',
  React: '#61dafb',
  Dart: '#00B4AB',
  Shell: '#89e051',
};

/**
 * Extract owner/repo from URL
 */
function extractRepoInfo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, '').split('#')[0].split('?')[0],
  };
}

/**
 * GitHub card component with repo stats
 */
export function GitHubCard({ preview, onPress }: GitHubCardProps) {
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

  const repoInfo = extractRepoInfo(preview.url);
  const repoName = preview.siteName || (repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : 'GitHub');
  const language = preview.repoStats?.language;
  const languageColor = language ? LANGUAGE_COLORS[language] || tokens.colors.accent : undefined;

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
        <View style={styles.header}>
          <GithubLogo size={20} weight="fill" color={tokens.colors.text} />
          <Text
            style={[
              styles.repoName,
              {
                color: tokens.colors.text,
              },
            ]}
            numberOfLines={1}
          >
            {repoName}
          </Text>
        </View>
        
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
        
        <View style={styles.footer}>
          {preview.repoStats && (
            <>
              {preview.repoStats.stars > 0 && (
                <View style={styles.stat}>
                  <Star size={14} weight="fill" color={tokens.colors.muted} />
                  <Text
                    style={[
                      styles.statText,
                      {
                        color: tokens.colors.muted,
                      },
                    ]}
                  >
                    {formatNumber(preview.repoStats.stars)}
                  </Text>
                </View>
              )}
              
              {preview.repoStats.forks > 0 && (
                <View style={styles.stat}>
                  <GitFork size={14} weight="fill" color={tokens.colors.muted} />
                  <Text
                    style={[
                      styles.statText,
                      {
                        color: tokens.colors.muted,
                      },
                    ]}
                  >
                    {formatNumber(preview.repoStats.forks)}
                  </Text>
                </View>
              )}
              
              {language && (
                <View style={styles.languageContainer}>
                  <View
                    style={[
                      styles.languageDot,
                      {
                        backgroundColor: languageColor || tokens.colors.accent,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.languageText,
                      {
                        color: tokens.colors.muted,
                      },
                    ]}
                  >
                    {language}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </PremiumPressable>
  );
}

/**
 * Format number with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  repoName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  languageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  languageText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

