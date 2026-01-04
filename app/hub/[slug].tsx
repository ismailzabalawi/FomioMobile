/**
 * Hub View - Shows terets within a Hub (parent category)
 * 
 * Deep link: fomio://hub/{slug}
 * Query param: ?byId=true - When slug is actually a numeric ID
 * 
 * Maps to Discourse: Parent Category (categories without parent_category_id)
 * 
 * UI Spec:
 * - Header with Hub name
 * - List of Terets (subcategories) within this Hub
 * - Teret cards show topic count and description
 * - Tapping a Teret navigates to the Teret feed
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Folder, Warning, ArrowClockwise, TrendUp, Hash } from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { useHeader } from '@/components/ui/header';
import { discourseApi } from '@/shared/discourseApi';
import { logger } from '@/shared/logger';
import { getThemeColors } from '@/shared/theme-constants';
import { useAdaptiveContentLayout } from '@/shared/hooks/useAdaptiveContentLayout';
import * as Haptics from 'expo-haptics';

interface HubData {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  topic_count: number;
}

interface TeretItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  topic_count: number;
  post_count: number;
}

function TeretCard({
  teret,
  onPress,
  colors,
}: {
  teret: TeretItem;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.teretCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${teret.name} teret with ${teret.topic_count} topics`}
    >
      <View style={styles.teretHeader}>
        <View style={styles.teretInfo}>
          <Text style={[styles.teretName, { color: colors.text }]} numberOfLines={1}>
            #{teret.name}
          </Text>
        </View>
        {teret.topic_count > 5 && (
          <View style={styles.trendingBadge}>
            <TrendUp size={12} color={colors.accent} weight="fill" />
          </View>
        )}
      </View>
      {teret.description ? (
        <Text style={[styles.teretDescription, { color: colors.secondary }]} numberOfLines={2}>
          {teret.description}
        </Text>
      ) : null}
      <View style={styles.teretStats}>
        <Text style={[styles.teretStat, { color: colors.secondary }]}>
          {teret.topic_count} {teret.topic_count === 1 ? 'topic' : 'topics'}
        </Text>
        <Text style={[styles.teretStat, { color: colors.secondary }]}>
          {teret.post_count} {teret.post_count === 1 ? 'post' : 'posts'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HubScreen(): React.ReactElement {
  const { slug, byId } = useLocalSearchParams<{ slug: string; byId?: string }>();
  const { isDark, isAmoled } = useTheme();
  const { setHeader, resetHeader, registerScrollHandler } = useHeader();

  const [hub, setHub] = useState<HubData | null>(null);
  const [terets, setTerets] = useState<TeretItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const themeColors = getThemeColors(isDark);
  const colors = useMemo(
    () => ({
      background: isAmoled ? '#000000' : isDark ? '#18181b' : '#ffffff',
      card: isAmoled ? '#0a0a0a' : isDark ? '#27272a' : '#f8fafc',
      text: themeColors.foreground,
      secondary: themeColors.secondary,
      error: themeColors.destructive,
      accent: themeColors.accent,
      border: isAmoled ? '#27272a' : isDark ? '#3f3f46' : '#e2e8f0',
    }),
    [isAmoled, isDark, themeColors]
  );
  const adaptiveLayout = useAdaptiveContentLayout();

  // Header-aware scroll handler
  const { onScroll: headerScrollHandler, unregister: unregisterHeaderScroll } = useMemo(
    () => registerScrollHandler(() => {}),
    [registerScrollHandler]
  );

  useEffect(() => unregisterHeaderScroll, [unregisterHeaderScroll]);

  // Load hub data and terets
  const loadData = useCallback(async () => {
    if (!slug) return;

    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');

      // Fetch categories
      const categoriesResponse = await discourseApi.getCategories(true);
      if (!categoriesResponse.success || !categoriesResponse.data) {
        throw new Error('Failed to load categories');
      }

      const allCategories = categoriesResponse.data.category_list?.categories || [];

      // Find the target hub (parent category) by slug or ID
      let targetHub: any;
      if (byId === 'true') {
        const hubId = parseInt(slug, 10);
        targetHub = allCategories.find(
          (cat: any) => cat.id === hubId && !cat.parent_category_id
        );
      } else {
        targetHub = allCategories.find(
          (cat: any) => cat.slug === slug && !cat.parent_category_id
        );
      }

      if (!targetHub) {
        throw new Error(`Hub "${slug}" not found`);
      }

      const hubData: HubData = {
        id: targetHub.id,
        name: targetHub.name,
        slug: targetHub.slug,
        description: targetHub.description || '',
        color: targetHub.color || themeColors.accent,
        topic_count: targetHub.topic_count || 0,
      };

      setHub(hubData);

      // Find terets (subcategories) of this hub
      // Handle both nested and flat structures
      let subcategories: any[] = [];

      // Check for nested subcategory_list
      if (targetHub.subcategory_list && Array.isArray(targetHub.subcategory_list)) {
        subcategories = targetHub.subcategory_list;
      } else {
        // Check for flat structure with parent_category_id
        subcategories = allCategories.filter(
          (cat: any) => cat.parent_category_id === targetHub.id
        );
      }

      const teretsList: TeretItem[] = subcategories
        .map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          color: cat.color || themeColors.accent,
          topic_count: cat.topic_count || 0,
          post_count: cat.post_count || 0,
        }))
        .sort((a, b) => b.topic_count - a.topic_count);

      setTerets(teretsList);

      logger.info('Hub data loaded', {
        hubSlug: slug,
        hubName: hubData.name,
        teretCount: teretsList.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load hub';
      logger.error('Failed to load hub data', { error: message, slug });
      setHasError(true);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [slug, byId, themeColors.accent]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Configure header when hub data is available
  useFocusEffect(
    useCallback(() => {
      if (hub) {
        setHeader({
          title: hub.name,
          canGoBack: true,
          tone: 'bg',
        });
      } else {
        setHeader({
          title: 'Hub',
          canGoBack: true,
          tone: 'bg',
        });
      }
      return () => resetHeader();
    }, [hub, setHeader, resetHeader])
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // Handle teret press
  const handleTeretPress = useCallback((teret: TeretItem) => {
    router.push(`/teret/${teret.slug}`);
  }, []);

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>Loading hub...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Warning size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
          <TouchableOpacity onPress={loadData} style={styles.retryButton}>
            <ArrowClockwise size={16} color={colors.error} />
            <Text style={[styles.retryText, { color: colors.error }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (terets.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Folder size={48} color={colors.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No terets yet</Text>
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            This hub doesn't have any terets
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, adaptiveLayout.contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        onScroll={headerScrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.secondary}
          />
        }
      >
        {hub?.description ? (
          <View style={styles.descriptionContainer}>
            <Text style={[styles.description, { color: colors.secondary }]}>
              {hub.description}
            </Text>
          </View>
        ) : null}

        <View style={styles.teretsContainer}>
          <View style={styles.sectionHeader}>
            <Hash size={16} color={colors.secondary} />
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
              Terets in this Hub
            </Text>
          </View>
          {terets.map((teret) => (
            <TeretCard
              key={teret.id}
              teret={teret}
              onPress={() => handleTeretPress(teret)}
              colors={colors}
            />
          ))}
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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginTop: 16,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  descriptionContainer: {
    paddingVertical: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  teretsContainer: {
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  teretCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  teretHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  teretInfo: {
    flex: 1,
  },
  teretName: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendingBadge: {
    marginLeft: 8,
  },
  teretDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  teretStats: {
    flexDirection: 'row',
    gap: 16,
  },
  teretStat: {
    fontSize: 12,
    fontWeight: '500',
  },
});
