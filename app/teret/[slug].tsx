/**
 * Teret View - Shows bytes filtered by category (Teret)
 * 
 * Deep link: fomio://teret/{slug}
 * Query param: ?byId=true - When slug is actually a numeric ID
 * 
 * Maps to Discourse: Category (subcategory with parent_category_id)
 * 
 * UI Spec:
 * - Header with Teret name and parent Hub
 * - Filtered feed of ByteCards
 * - Pull-to-refresh
 * - Empty state when no bytes
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Hash, Warning, ArrowClockwise } from 'phosphor-react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useTheme } from '@/components/theme';
import { useHeader } from '@/components/ui/header';
import { ByteCard } from '@/components/bytes/ByteCard';
import { ByteCardSkeleton } from '@/components/bytes/ByteCardSkeleton';
import { topicSummaryToByte } from '@/shared/adapters/topicSummaryToByte';
import { discourseApi } from '@/shared/discourseApi';
import { logger } from '@/shared/logger';
import { getThemeColors } from '@/shared/theme-constants';
import { useAdaptiveContentLayout } from '@/shared/hooks/useAdaptiveContentLayout';
import { useFluidNav } from '@/shared/navigation/fluidNavContext';
import * as Haptics from 'expo-haptics';

interface TeretData {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  topic_count: number;
  parentHub?: {
    id: number;
    name: string;
    slug: string;
  };
}

export default function TeretScreen(): React.ReactElement {
  const { slug, byId } = useLocalSearchParams<{ slug: string; byId?: string }>();
  const { isDark, isAmoled } = useTheme();
  const { setHeader, resetHeader, registerScrollHandler } = useHeader();
  const { scrollY, setUpHandler } = useFluidNav();
  const flatListRef = useRef<Animated.FlatList<any>>(null);

  const [teret, setTeret] = useState<TeretData | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const themeColors = getThemeColors(isDark);
  const colors = useMemo(
    () => ({
      background: isAmoled ? '#000000' : isDark ? '#18181b' : '#ffffff',
      text: themeColors.foreground,
      secondary: themeColors.secondary,
      error: themeColors.destructive,
      accent: themeColors.accent,
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

  // Scroll handler for fluid nav
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Register scroll-to-top handler
  useEffect(() => {
    const handleScrollUp = () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };
    setUpHandler(handleScrollUp);
    return () => setUpHandler(() => {});
  }, [setUpHandler]);

  // Load teret data and topics
  const loadData = useCallback(async () => {
    if (!slug) return;

    try {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');

      // Fetch categories to find the teret
      const categoriesResponse = await discourseApi.getCategories(true);
      if (!categoriesResponse.success || !categoriesResponse.data) {
        throw new Error('Failed to load categories');
      }

      const allCategories = categoriesResponse.data.category_list?.categories || [];

      // Flatten nested categories if needed
      let flatCategories: any[] = [];
      const hasNestedStructure = allCategories.some(
        (cat: any) => cat.subcategory_list && cat.subcategory_list.length > 0
      );

      if (hasNestedStructure) {
        allCategories.forEach((cat: any) => {
          if (!cat.parent_category_id) {
            flatCategories.push(cat);
          }
          if (cat.subcategory_list && Array.isArray(cat.subcategory_list)) {
            cat.subcategory_list.forEach((subcat: any) => {
              flatCategories.push({
                ...subcat,
                parent_category_id: cat.id,
                parent_category: {
                  id: cat.id,
                  name: cat.name,
                  slug: cat.slug,
                },
              });
            });
          }
        });
      } else {
        flatCategories = allCategories;
      }

      // Find the target category by slug or ID
      let targetCategory: any;
      if (byId === 'true') {
        // slug is actually an ID
        const categoryId = parseInt(slug, 10);
        targetCategory = flatCategories.find((cat: any) => cat.id === categoryId);
      } else {
        // slug is a slug
        targetCategory = flatCategories.find((cat: any) => cat.slug === slug);
      }

      if (!targetCategory) {
        throw new Error(`Teret "${slug}" not found`);
      }

      // Find parent hub
      const parentHub = targetCategory.parent_category_id
        ? flatCategories.find((cat: any) => cat.id === targetCategory.parent_category_id)
        : null;

      const teretData: TeretData = {
        id: targetCategory.id,
        name: targetCategory.name,
        slug: targetCategory.slug,
        description: targetCategory.description || '',
        color: targetCategory.color || themeColors.accent,
        topic_count: targetCategory.topic_count || 0,
        parentHub: parentHub
          ? {
              id: parentHub.id,
              name: parentHub.name,
              slug: parentHub.slug,
            }
          : undefined,
      };

      setTeret(teretData);

      // Fetch topics for this category
      const topicsResponse = await discourseApi.getTopics(
        `?category=${targetCategory.id}&order=created&period=all`
      );

      if (!topicsResponse.success || !topicsResponse.data) {
        throw new Error('Failed to load topics');
      }

      const topicsData = topicsResponse.data.topic_list?.topics || [];
      setTopics(topicsData);

      logger.info('Teret data loaded', {
        teretSlug: slug,
        teretName: teretData.name,
        topicCount: topicsData.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load teret';
      logger.error('Failed to load teret data', { error: message, slug });
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

  // Configure header when teret data is available
  useFocusEffect(
    useCallback(() => {
      if (teret) {
        setHeader({
          title: `#${teret.name}`,
          subtitle: teret.parentHub ? `in ${teret.parentHub.name}` : undefined,
          canGoBack: true,
          tone: 'bg',
        });
      } else {
        setHeader({
          title: 'Teret',
          canGoBack: true,
          tone: 'bg',
        });
      }
      return () => resetHeader();
    }, [teret, setHeader, resetHeader])
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // Handle byte press
  const handleBytePress = useCallback((topic: any) => {
    router.push(`/feed/${topic.id}`);
  }, []);

  // Render topic item
  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const byte = topicSummaryToByte(item);
      return <ByteCard byte={byte} onPress={() => handleBytePress(item)} />;
    },
    [handleBytePress]
  );

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>
            Loading teret...
          </Text>
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
  if (topics.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Hash size={48} color={colors.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No bytes yet</Text>
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            Be the first to post in #{teret?.name}
          </Text>
          <TouchableOpacity
            onPress={() => router.push(`/compose?teret=${teret?.slug}`)}
            style={[styles.createButton, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.createButtonText}>Create a Byte</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.FlatList
        ref={flatListRef}
        data={topics}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.listContent, adaptiveLayout.contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.secondary}
          />
        }
        ListHeaderComponent={
          teret?.description ? (
            <View style={styles.descriptionContainer}>
              <Text style={[styles.description, { color: colors.secondary }]}>
                {teret.description}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  createButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  descriptionContainer: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});
