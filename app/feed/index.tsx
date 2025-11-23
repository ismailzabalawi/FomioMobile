import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Hash, 
  Fire, 
  TrendUp, 
  Warning,
  ArrowClockwise
} from 'phosphor-react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/components/theme';
import { useHeader } from '@/components/ui/header';
import { ByteCard } from '@/components/bytes/ByteCard';
import { ByteCardSkeleton } from '@/components/bytes/ByteCardSkeleton';
import { topicSummaryToByte } from '@/shared/adapters/topicSummaryToByte';
import { discourseApi } from '../../shared/discourseApi';
import { logger } from '../../shared/logger';
import { getThemeColors } from '../../shared/theme-constants';

interface Teret {
  id: number;
  name: string;
  description: string;
  slug: string;
  color: string;
  text_color: string;
  topic_count: number;
  post_count: number;
  parent_category_id: number;
  parent_category: {
    id: number;
    name: string;
    color: string;
    slug: string;
  };
}

interface Topic {
  id: number;
  title: string;
  excerpt: string;
  author: {
    username: string;
    name: string;
    avatar: string;
  };
  category: {
    id: number;
    name: string;
    color: string;
    slug: string;
  };
  tags: string[];
  createdAt: string;
  replyCount: number;
  likeCount: number;
  isPinned: boolean;
  isClosed: boolean;
  isArchived: boolean;
  lastPostedAt: string;
  lastPoster: {
    username: string;
    name: string;
  };
  views: number;
  slug: string;
  url: string;
  unreadCount?: number;
  isBookmarked?: boolean;
  hasMedia?: boolean;
  coverImage?: string;
}

function TeretCard({ teret, onPress }: { teret: Teret; onPress: () => void }) {
  const { isDark, isAmoled } = useTheme();
  const themeColors = getThemeColors(isDark);
  const colors = {
    background: isAmoled ? themeColors.background : (isDark ? themeColors.card : themeColors.background),
    text: themeColors.foreground,
    secondary: themeColors.secondary,
    border: themeColors.border,
    accent: themeColors.accent,
  };

  return (
    <TouchableOpacity
      style={[styles.teretCard, { 
        backgroundColor: colors.background, 
        borderColor: colors.border 
      }]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${teret.name} teret`}
    >
      <View style={styles.teretHeader}>
        <View style={styles.teretInfo}>
          <Text style={[styles.teretName, { color: colors.text }]} numberOfLines={1}>
            #{teret.name}
          </Text>
          <Text style={[styles.teretHub, { color: colors.secondary }]}>
            in {teret.parent_category.name}
          </Text>
        </View>
        {teret.topic_count > 5 && (
          <View style={styles.trendingBadge}>
            <TrendUp size={12} color={colors.accent} weight="fill" />
          </View>
        )}
      </View>
      <Text style={[styles.teretDescription, { color: colors.secondary }]} numberOfLines={2}>
        {teret.description || 'No description available'}
      </Text>
      <View style={styles.teretStats}>
        <Text style={[styles.teretStat, { color: colors.secondary }]}>
          {teret.topic_count} topics
        </Text>
        <Text style={[styles.teretStat, { color: colors.secondary }]}>
          {teret.post_count} posts
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// formatDate removed - now handled by formatTimeAgo in ByteCard component

// Helper to render ByteCard from Topic
function renderTopicCard(
  topic: any, // Raw topic from Discourse API
  onPress: () => void,
  onCategoryPress?: () => void
) {
  const byte = topicSummaryToByte(topic);
  return (
    <ByteCard
      byte={byte}
      onPress={onPress}
    />
  );
}

export default function FeedScreen(): React.ReactElement {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { isDark, isAmoled } = useTheme();
  const { setHeader, resetHeader, registerScrollHandler } = useHeader();
  const [terets, setTerets] = useState<Teret[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageTitle, setPageTitle] = useState('Feed');
  const [isHubView, setIsHubView] = useState(false);

  // Header-aware scroll handler (updates header isScrolled while allowing page-specific logic)
  const { onScroll: headerScrollHandler, unregister: unregisterHeaderScroll } = useMemo(
    () => registerScrollHandler(() => {}),
    [registerScrollHandler]
  );

  useEffect(() => unregisterHeaderScroll, [unregisterHeaderScroll]);

  // Configure header - use useFocusEffect to ensure header is set when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setHeader({
        title: pageTitle,
        canGoBack: true,
        tone: "bg",
      });
      return () => {
        resetHeader();
      };
    }, [pageTitle, setHeader, resetHeader])
  );
  
  const themeColors = getThemeColors(isDark);
  const colors = {
    background: isAmoled ? themeColors.background : (isDark ? themeColors.background : themeColors.background),
    text: themeColors.foreground,
    secondary: themeColors.secondary,
    error: themeColors.destructive,
  };

  // Load data based on category parameter
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      if (category) {
        // Check if this is a hub (parent category) or teret (subcategory)
        const categoriesResponse = await discourseApi.getCategories();
        if (!categoriesResponse.success || !categoriesResponse.data) {
          throw new Error('Failed to load categories');
        }

        const allCategories = categoriesResponse.data.category_list.categories;
        const targetCategory = allCategories.find((cat: any) => cat.slug === category);
        
        // Debug logging
        logger.debug('Feed Debug', {
          category,
          targetCategory: targetCategory ? {
            id: targetCategory.id,
            name: targetCategory.name,
            slug: targetCategory.slug,
            parent_category_id: targetCategory.parent_category_id,
            topic_count: targetCategory.topic_count,
          } : null,
          allCategories: allCategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            parent_category_id: cat.parent_category_id,
          })),
        });
        
        if (!targetCategory) {
          throw new Error('Category not found');
        }

        // Check if this category has subcategories (terets)
        const subcategories = allCategories.filter((cat: any) => cat.parent_category_id === targetCategory.id);
        
        logger.debug('Subcategories Debug', {
          targetCategoryId: targetCategory.id,
          subcategoriesCount: subcategories.length,
          subcategories: subcategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            parent_category_id: cat.parent_category_id,
          })),
        });
        
        if (subcategories.length > 0) {
          // This is a hub with terets, show the terets
          setIsHubView(true);
          setPageTitle(targetCategory.name);
          
          const currentThemeColors = getThemeColors(isDark);
          const terets = subcategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description || '',
            slug: cat.slug,
            color: cat.color || currentThemeColors.foreground,
            text_color: cat.text_color || currentThemeColors.background,
            topic_count: cat.topic_count || 0,
            post_count: cat.post_count || 0,
            parent_category_id: cat.parent_category_id,
            parent_category: {
              id: targetCategory.id,
              name: targetCategory.name,
              color: targetCategory.color || themeColors.foreground,
              slug: targetCategory.slug,
            },
          }));

          setTerets(terets);
          setTopics([]);
        } else {
          // This is either a teret or a hub without subcategories, load its topics directly
          setIsHubView(false);
          setPageTitle(targetCategory.parent_category_id ? `#${targetCategory.name}` : targetCategory.name);
          
          const topicsResponse = await discourseApi.getTopics(`?category=${targetCategory.id}&order=created&period=all`);
          if (!topicsResponse.success || !topicsResponse.data) {
            throw new Error('Failed to load topics');
          }

          const topicsData = topicsResponse.data.topic_list.topics;

          // Map topics directly - adapter will use data from API response
          // Use raw topics directly - adapter will handle mapping
          const transformedTopics = topicsData;

          setTopics(transformedTopics);
          setTerets([]);
        }
      } else {
        // No category specified, show all recent topics
        setIsHubView(false);
        setPageTitle('Latest Bytes');
        
        const topicsResponse = await discourseApi.getTopics('?order=created&period=all');
        if (!topicsResponse.success || !topicsResponse.data) {
          throw new Error('Failed to load topics');
        }

        const topicsData = topicsResponse.data.topic_list.topics.slice(0, 20);

        // Map category names based on real TechRebels structure
        const categoryMap: { [key: number]: string } = {
          4: 'General',
          5: 'Technology',
          6: 'Industry-specific Discussions',
          8: 'Support & Troubleshooting',
          9: 'Off-topic Discussions',
          43: 'Announcements',
        };

        // Use raw topics directly - adapter will handle mapping
        const transformedTopics = topicsData;

        setTopics(transformedTopics);
        setTerets([]);
      }
    } catch (error) {
      logger.error('Failed to load feed data', { error: (error as Error).message, category });
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [category, isDark]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // Load data on mount and when category changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle navigation
  const handleTeretPress = useCallback((teret: Teret) => {
    logger.debug('Teret pressed', { teretName: teret.name, teretSlug: teret.slug });
    router.push(`/feed?category=${teret.slug}`);
  }, []);

  const handleBytePress = useCallback((topic: any) => {
    logger.debug('Byte pressed', { topicId: topic.id });
    router.push(`/feed/${topic.id}`);
  }, []);

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Warning size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            Failed to load content
          </Text>
          <TouchableOpacity onPress={loadData} style={styles.retryButton}>
            <ArrowClockwise size={16} color={colors.error} />
            <Text style={[styles.retryText, { color: colors.error }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {isHubView ? (
          // Show terets for this hub
          <View style={styles.teretsContainer}>
            {terets.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Hash size={48} color={colors.secondary} />
                <Text style={[styles.emptyText, { color: colors.secondary }]}>
                  No terets found in this hub
                </Text>
              </View>
            ) : (
              terets.map((teret) => (
                <TeretCard key={teret.id} teret={teret} onPress={() => handleTeretPress(teret)} />
              ))
            )}
          </View>
        ) : (
          // Show topics for this teret or all topics
          <View style={styles.topicsContainer}>
            {topics.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Hash size={48} color={colors.secondary} />
                <Text style={[styles.emptyText, { color: colors.secondary }]}>
                  No bytes found
                </Text>
              </View>
            ) : (
              topics.map((topic) => (
                <View key={topic.id}>
                  {renderTopicCard(
                    topic,
                    () => handleBytePress(topic),
                    () => router.push(`/feed?category=${topic.category.slug}`)
                  )}
                </View>
              ))
            )}
          </View>
        )}
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
    paddingBottom: 32,
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
    paddingVertical: 48,
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
    padding: 8,
    marginTop: 16,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  teretsContainer: {
    paddingHorizontal: 16,
  },
  topicsContainer: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
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
    marginBottom: 2,
  },
  teretHub: {
    fontSize: 12,
    fontWeight: '500',
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
    justifyContent: 'space-between',
  },
  teretStat: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 