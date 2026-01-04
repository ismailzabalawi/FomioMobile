/**
 * Deep Link Tester - Dev-only screen for testing deep links
 * 
 * Provides buttons to open every supported deep link for quick verification.
 * Use this after any navigation refactor to ensure deep links still work.
 * 
 * Access: Only available in __DEV__ mode
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Clipboard } from 'react-native';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { ArrowLeft, Copy, Check, Warning } from 'phosphor-react-native';
import { getThemeColors } from '@/shared/theme-constants';
import * as Haptics from 'expo-haptics';

interface TestLink {
  label: string;
  url: string;
  category: 'content' | 'navigation' | 'auth-required' | 'legacy' | 'edge-case';
  description?: string;
}

const TEST_LINKS: TestLink[] = [
  // Content routes
  { label: 'Home', url: 'fomio://home', category: 'content' },
  { label: 'Home (empty)', url: 'fomio://', category: 'content' },
  { label: 'Byte 123', url: 'fomio://byte/123', category: 'content' },
  { label: 'Byte with comments', url: 'fomio://byte/123/comments', category: 'content' },
  { label: 'Teret (design)', url: 'fomio://teret/design', category: 'content' },
  { label: 'Teret by ID', url: 'fomio://teret/id/5', category: 'content' },
  { label: 'Hub (technology)', url: 'fomio://hub/technology', category: 'content' },
  { label: 'Hub by ID', url: 'fomio://hub/id/3', category: 'content' },
  { label: 'Profile (ismail)', url: 'fomio://profile/ismail', category: 'content' },
  
  // Navigation routes
  { label: 'Search', url: 'fomio://search', category: 'navigation' },
  { label: 'Search with query', url: 'fomio://search?q=react%20native', category: 'navigation' },
  
  // Auth-required routes
  { label: 'My Profile', url: 'fomio://me', category: 'auth-required', description: 'Requires auth' },
  { label: 'Notifications', url: 'fomio://notifications', category: 'auth-required', description: 'Requires auth' },
  { label: 'Compose', url: 'fomio://compose', category: 'auth-required', description: 'Requires auth' },
  { label: 'Compose in teret', url: 'fomio://compose?teret=general', category: 'auth-required', description: 'Requires auth' },
  { label: 'Settings', url: 'fomio://settings', category: 'auth-required', description: 'Requires auth' },
  { label: 'Edit Profile', url: 'fomio://settings/profile', category: 'auth-required', description: 'Requires auth' },
  { label: 'Notification Settings', url: 'fomio://settings/notifications', category: 'auth-required', description: 'Requires auth' },
  
  // Legacy aliases
  { label: 'Legacy: topic/123', url: 'fomio://topic/123', category: 'legacy', description: 'Maps to byte/123' },
  { label: 'Legacy: t/456', url: 'fomio://t/456', category: 'legacy', description: 'Maps to byte/456' },
  { label: 'Legacy: u/ismail', url: 'fomio://u/ismail', category: 'legacy', description: 'Maps to profile/ismail' },
  
  // Edge cases
  { label: 'Triple slash', url: 'fomio:///byte/123', category: 'edge-case', description: 'Should still work' },
  { label: 'Unknown path', url: 'fomio://something/weird', category: 'edge-case', description: 'Falls back to home' },
  { label: 'Special chars in query', url: 'fomio://search?q=hello%20world%21', category: 'edge-case' },
];

const CATEGORY_LABELS: Record<TestLink['category'], string> = {
  'content': 'Content Routes',
  'navigation': 'Navigation',
  'auth-required': 'Auth Required',
  'legacy': 'Legacy Aliases',
  'edge-case': 'Edge Cases',
};

const CATEGORY_ORDER: TestLink['category'][] = [
  'content',
  'navigation',
  'auth-required',
  'legacy',
  'edge-case',
];

export default function DeepLinkTester(): React.ReactElement {
  const { themeMode, isDark, isAmoled } = useTheme();
  const colors = useMemo(() => getThemeColors(themeMode, isAmoled), [themeMode, isAmoled]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [lastOpened, setLastOpened] = useState<string | null>(null);

  useScreenHeader({
    title: 'Deep Link Tester',
    canGoBack: true,
    tone: 'bg',
  }, [isDark]);

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setLastOpened(url);
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open', `Unable to open: ${url}`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to open link: ${error}`);
    }
  }, []);

  const handleCopyLink = useCallback(async (url: string) => {
    try {
      Haptics.selectionAsync().catch(() => {});
      Clipboard.setString(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  }, []);

  // Group links by category
  const groupedLinks = useMemo(() => {
    const groups: Record<TestLink['category'], TestLink[]> = {
      'content': [],
      'navigation': [],
      'auth-required': [],
      'legacy': [],
      'edge-case': [],
    };
    
    TEST_LINKS.forEach(link => {
      groups[link.category].push(link);
    });
    
    return groups;
  }, []);

  const renderLink = useCallback((link: TestLink) => {
    const isCopied = copiedUrl === link.url;
    const isLastOpened = lastOpened === link.url;
    
    return (
      <View key={link.url} style={styles.linkRow}>
        <TouchableOpacity
          style={[
            styles.linkButton,
            {
              backgroundColor: isAmoled ? '#0a0a0a' : isDark ? '#27272a' : '#f8fafc',
              borderColor: isLastOpened ? colors.accent : (isDark ? '#3f3f46' : '#e2e8f0'),
              borderWidth: isLastOpened ? 2 : 1,
            },
          ]}
          onPress={() => handleOpenLink(link.url)}
          onLongPress={() => handleCopyLink(link.url)}
        >
          <View style={styles.linkContent}>
            <Text style={[styles.linkLabel, { color: colors.foreground }]}>
              {link.label}
            </Text>
            <Text style={[styles.linkUrl, { color: colors.secondary }]} numberOfLines={1}>
              {link.url}
            </Text>
            {link.description && (
              <Text style={[styles.linkDescription, { color: colors.accent }]}>
                {link.description}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => handleCopyLink(link.url)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isCopied ? (
              <Check size={18} color={colors.accent} weight="bold" />
            ) : (
              <Copy size={18} color={colors.secondary} />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  }, [colors, isDark, isAmoled, copiedUrl, lastOpened, handleOpenLink, handleCopyLink]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <View style={[styles.infoBox, { backgroundColor: isDark ? '#1a1a2e' : '#e8f4fd', borderColor: colors.accent }]}>
          <Warning size={20} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Tap to open link. Long press to copy. Test after any navigation changes.
          </Text>
        </View>

        {/* Grouped links */}
        {CATEGORY_ORDER.map(category => {
          const links = groupedLinks[category];
          if (links.length === 0) return null;
          
          return (
            <View key={category} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
                {CATEGORY_LABELS[category]}
              </Text>
              {links.map(renderLink)}
            </View>
          );
        })}

        {/* Terminal commands */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
            Terminal Commands
          </Text>
          <View style={[styles.codeBox, { backgroundColor: isDark ? '#0a0a0a' : '#f1f5f9' }]}>
            <Text style={[styles.codeText, { color: colors.foreground }]}>
              # iOS Simulator{'\n'}
              xcrun simctl openurl booted "fomio://byte/123"{'\n\n'}
              # Android Emulator{'\n'}
              adb shell am start -W -a android.intent.action.VIEW -d "fomio://byte/123"
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  linkRow: {
    marginBottom: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  linkContent: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  linkUrl: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
  },
  linkDescription: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
  },
  codeBox: {
    padding: 12,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
    lineHeight: 18,
  },
});

