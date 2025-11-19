import React, { useState, useCallback, useEffect } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/components/theme';
import { AppHeader } from '@/components/ui/AppHeader';
import { ByteCard } from '@/components/feed/ByteCard';
import { discourseApi } from '../../shared/discourseApi';
import { logger } from '../../shared/logger';

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
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    accent: isDark ? '#3b82f6' : '#0ea5e9',
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

// Format date helper for activity timestamp
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  } catch (error) {
    return 'Unknown time';
  }
};

// Helper to render ByteCard from Topic
function renderTopicCard(topic: Topic, onPress: () => void, onCategoryPress?: () => void) {
  return (
    <ByteCard
      id={topic.id}
      title={topic.title}
      hub={topic.category.name}
      author={{
        name: topic.author.name,
        avatar: topic.author.avatar,
      }}
      replies={topic.replyCount}
      activity={formatDate(topic.lastPostedAt || topic.createdAt)}
      onPress={onPress}
      onCategoryPress={onCategoryPress}
      unreadCount={topic.unreadCount}
      isBookmarked={topic.isBookmarked}
      likeCount={topic.likeCount}
      hasMedia={topic.hasMedia}
      coverImage={topic.coverImage}
    />
  );
}

export default function FeedScreen(): React.ReactElement {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { isDark, isAmoled } = useTheme();
  const [terets, setTerets] = useState<Teret[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageTitle, setPageTitle] = useState('Feed');
  const [isHubView, setIsHubView] = useState(false);
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    error: '#ef4444',
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
        console.log('🔍 Feed Debug:', {
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
        
        console.log('🔍 Subcategories Debug:', {
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
          
          const terets = subcategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description || '',
            slug: cat.slug,
            color: cat.color || '#000000',
            text_color: cat.text_color || '#ffffff',
            topic_count: cat.topic_count || 0,
            post_count: cat.post_count || 0,
            parent_category_id: cat.parent_category_id,
            parent_category: {
              id: targetCategory.id,
              name: targetCategory.name,
              color: targetCategory.color || '#000000',
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

          const transformedTopics = topicsResponse.data.topic_list.topics.map((topic: any) => {
            // Extract first image from excerpt if available
            const excerpt = topic.excerpt || '';
            const hasMedia = /<img|<video|<iframe/i.test(excerpt);
            const coverImageMatch = excerpt.match(/<img[^>]+src=["']([^"']+)["']/i);
            const coverImage = coverImageMatch ? coverImageMatch[1] : undefined;

            return {
            id: topic.id,
            title: topic.title,
              excerpt: excerpt,
            author: {
              username: topic.last_poster_username || 'Unknown',
              name: topic.last_poster_username || 'Unknown',
              avatar: '',
            },
            category: {
              id: topic.category_id,
              name: targetCategory.name,
              color: targetCategory.color || '#000000',
              slug: targetCategory.slug,
            },
            tags: topic.tags || [],
            createdAt: topic.created_at,
            replyCount: topic.reply_count || 0,
            likeCount: topic.like_count || 0,
            isPinned: topic.pinned || false,
            isClosed: topic.closed || false,
            isArchived: topic.archived || false,
            lastPostedAt: topic.last_posted_at,
            lastPoster: {
              username: topic.last_poster_username || 'Unknown',
              name: topic.last_poster_username || 'Unknown',
            },
            views: topic.views || 0,
            slug: topic.slug,
            url: `https://meta.techrebels.info/t/${topic.slug}/${topic.id}`,
              unreadCount: topic.unread_count || 0,
              isBookmarked: topic.bookmarked || false,
              hasMedia,
              coverImage,
            };
          });

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

        // Map category names based on real TechRebels structure
        const categoryMap: { [key: number]: string } = {
          4: 'General',
          5: 'Technology',
          6: 'Industry-specific Discussions',
          8: 'Support & Troubleshooting',
          9: 'Off-topic Discussions',
          43: 'Announcements',
        };

        const transformedTopics = topicsResponse.data.topic_list.topics.slice(0, 20).map((topic: any) => {
            // Extract first image from excerpt if available
            const excerpt = topic.excerpt || '';
            const hasMedia = /<img|<video|<iframe/i.test(excerpt);
            const coverImageMatch = excerpt.match(/<img[^>]+src=["']([^"']+)["']/i);
            const coverImage = coverImageMatch ? coverImageMatch[1] : undefined;

            return {
          id: topic.id,
          title: topic.title,
              excerpt: excerpt,
          author: {
            username: topic.last_poster_username || 'Unknown',
            name: topic.last_poster_username || 'Unknown',
            avatar: '',
          },
          category: {
            id: topic.category_id,
            name: categoryMap[topic.category_id] || 'Unknown',
            color: '#000000',
            slug: 'unknown',
          },
          tags: topic.tags || [],
          createdAt: topic.created_at,
          replyCount: topic.reply_count || 0,
          likeCount: topic.like_count || 0,
          isPinned: topic.pinned || false,
          isClosed: topic.closed || false,
          isArchived: topic.archived || false,
          lastPostedAt: topic.last_posted_at,
          lastPoster: {
            username: topic.last_poster_username || 'Unknown',
            name: topic.last_poster_username || 'Unknown',
          },
          views: topic.views || 0,
          slug: topic.slug,
          url: `https://meta.techrebels.info/t/${topic.slug}/${topic.id}`,
              unreadCount: topic.unread_count || 0,
              isBookmarked: topic.bookmarked || false,
              hasMedia,
              coverImage,
            };
          });

        setTopics(transformedTopics);
        setTerets([]);
      }
    } catch (error) {
      logger.error('Failed to load feed data', { error: (error as Error).message, category });
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

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
    console.log('Teret pressed:', teret.name);
    router.push(`/feed?category=${teret.slug}`);
  }, []);

  const handleBytePress = useCallback((topic: Topic) => {
    console.log('Byte pressed:', topic.id);
    router.push(`/feed/${topic.id}`);
  }, []);

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader 
          title={pageTitle}
          canGoBack
          withSafeTop={false}
          tone="bg"
        />
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
        <AppHeader 
          title={pageTitle}
          canGoBack
          withSafeTop={false}
          tone="bg"
        />
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
      <AppHeader 
        title={pageTitle}
        canGoBack
        tone="bg"
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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