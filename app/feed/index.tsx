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
  ArrowLeft, 
  Hash, 
  Fire, 
  TrendUp, 
  Star, 
  Users, 
  Heart,
  ChatCircle,
  BookmarkSimple,
  Share,
  Warning,
  ArrowClockwise
} from 'phosphor-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/components/theme';
import { HeaderBar } from '../../components/nav/HeaderBar';
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

function ByteCard({ topic, onPress }: { topic: Topic; onPress: () => void }) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    accent: isDark ? '#3b82f6' : '#0ea5e9',
  };

  // Handle empty avatar URLs
  const avatarSource = topic.author.avatar && topic.author.avatar.trim() !== '' 
    ? { uri: topic.author.avatar } 
    : undefined;

  // Format the date
  const formatDate = (dateString: string) => {
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

  // Format numbers for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <TouchableOpacity
      style={[styles.byteCard, { 
        backgroundColor: colors.background, 
        borderColor: colors.border 
      }]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${topic.title} topic`}
    >
      <View style={styles.byteHeader}>
        {avatarSource ? (
          <View style={styles.byteAvatar}>
            <Text style={[styles.byteAvatarFallback, { color: colors.background }]}>
              {topic.author.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        ) : (
          <View style={[styles.byteAvatar, { backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={[styles.byteAvatarFallback, { color: colors.background }]}>
              {topic.author.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.byteInfo}>
          <Text style={[styles.byteAuthor, { color: colors.text }]}>{topic.author.name}</Text>
          <Text style={[styles.byteMeta, { color: colors.secondary }]}>
            {topic.category.name} • {formatDate(topic.createdAt)}
          </Text>
        </View>
        {topic.isPinned && (
          <View style={styles.pinnedBadge}>
            <Star size={12} color={colors.accent} weight="fill" />
          </View>
        )}
      </View>
      <Text style={[styles.byteTitle, { color: colors.text }]} numberOfLines={2}>
        {topic.title}
      </Text>
      <Text style={[styles.byteContent, { color: colors.secondary }]} numberOfLines={3}>
        {topic.excerpt || 'No content available'}
      </Text>
      {topic.tags && topic.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {topic.tags.slice(0, 3).map((tag: string, index: number) => (
            <View key={index} style={[styles.tag, { backgroundColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.secondary }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.byteActions}>
        <View style={styles.byteAction}>
          <Heart size={16} weight="regular" color={colors.secondary} />
          <Text style={[styles.byteActionText, { color: colors.secondary }]}>
            {formatNumber(topic.likeCount)}
          </Text>
        </View>
        <View style={styles.byteAction}>
          <ChatCircle size={16} weight="regular" color={colors.secondary} />
          <Text style={[styles.byteActionText, { color: colors.secondary }]}>
            {formatNumber(topic.replyCount)}
          </Text>
        </View>
        <View style={styles.byteAction}>
          <Users size={14} weight="regular" color={colors.secondary} />
          <Text style={[styles.byteActionText, { color: colors.secondary }]}>
            {formatNumber(topic.views || 0)}
          </Text>
        </View>
        <View style={styles.byteAction}>
          <BookmarkSimple size={16} weight="regular" color={colors.secondary} />
        </View>
        <View style={styles.byteAction}>
          <Share size={16} weight="regular" color={colors.secondary} />
        </View>
      </View>
    </TouchableOpacity>
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

          const transformedTopics = topicsResponse.data.topic_list.topics.map((topic: any) => ({
            id: topic.id,
            title: topic.title,
            excerpt: topic.excerpt || '',
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
          }));

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

        const transformedTopics = topicsResponse.data.topic_list.topics.slice(0, 20).map((topic: any) => ({
          id: topic.id,
          title: topic.title,
          excerpt: topic.excerpt || '',
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
        }));

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
        <HeaderBar 
          title={pageTitle}
          showBackButton={true}
          showProfileButton={true}
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
        <HeaderBar 
          title={pageTitle}
          showBackButton={true}
          showProfileButton={true}
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
      <HeaderBar 
        title={pageTitle}
        showBackButton={true}
        showProfileButton={true}
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
                <ByteCard key={topic.id} topic={topic} onPress={() => handleBytePress(topic)} />
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
  byteCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  byteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  byteAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#6b7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  byteInfo: {
    flex: 1,
  },
  byteAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  byteMeta: {
    fontSize: 12,
  },
  byteTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
  },
  byteContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  byteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  byteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  byteActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  byteAvatarFallback: {
    fontSize: 12,
    fontWeight: '600',
  },
  pinnedBadge: {
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 