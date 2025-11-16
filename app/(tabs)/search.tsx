import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  MagnifyingGlass, 
  Fire, 
  TrendUp, 
  Hash,
  ArrowRight,
  Warning,
  ArrowClockwise,
  CaretDown,
  CaretUp,
  Clock,
  Rocket
} from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { AppHeader } from '@/components/ui/AppHeader';
import { ByteCard } from '@/components/feed/ByteCard';
import { useSearch } from '../../shared/useSearch';
import { searchTopics } from '../../lib/discourse';
import { useAuth } from '../../shared/useAuth';
import { useCategories } from '../../shared/useCategories';
import { useTerets } from '../../shared/useTerets';
import { useRecentTopics } from '../../shared/useRecentTopics';
import { router } from 'expo-router';

// UI Components
function DiscoverSection({ title, children, isLoading, hasError, onRetry }: { 
  title: string; 
  children: React.ReactNode;
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    text: isDark ? '#9ca3af' : '#6b7280',
    error: '#ef4444',
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {isLoading && <ActivityIndicator size="small" color={colors.text} />}
        {hasError && onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <ArrowClockwise size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function HubCard({ category, onPress }: { category: any; onPress: () => void }) {
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
      style={[styles.hubCard, { 
        backgroundColor: colors.background, 
        borderColor: colors.border 
      }]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${category.name} hub`}
    >
      <View style={styles.hubHeader}>
        <View style={[styles.hubIcon, { backgroundColor: category.color + '20' }]}>
          <Text style={[styles.hubIconText, { color: category.color }]}>
            {category.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.hubInfo}>
          <Text style={[styles.hubName, { color: colors.text }]} numberOfLines={1}>
            {category.name}
          </Text>
          <Text style={[styles.hubDescription, { color: colors.secondary }]} numberOfLines={2}>
            {category.description || 'No description available'}
          </Text>
        </View>
        {category.topic_count > 5 && (
          <View style={styles.popularBadge}>
            <Fire size={12} color={colors.accent} weight="fill" />
          </View>
        )}
      </View>
      <View style={styles.hubStats}>
        <Text style={[styles.hubStat, { color: colors.secondary }]}>
          {category.topic_count} topics
        </Text>
        <Text style={[styles.hubStat, { color: colors.secondary }]}>
          {category.post_count} posts
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function TeretCard({ teret, onPress }: { teret: any; onPress: () => void }) {
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

// Helper to render ByteCard from topic data
function renderTopicCard(topic: any, onPress: () => void, onCategoryPress?: () => void) {
  return (
    <ByteCard
      id={topic.id}
      title={topic.title}
      hub={topic.category?.name || 'Uncategorized'}
      author={{
        name: topic.author?.name || 'Unknown',
        avatar: topic.author?.avatar,
      }}
      replies={topic.replyCount || 0}
      activity={formatDate(topic.lastPostedAt || topic.createdAt || new Date().toISOString())}
      onPress={onPress}
      onCategoryPress={onCategoryPress}
    />
  );
}

function ComingSoonSection({ title, description }: { title: string; description: string }) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    accent: isDark ? '#3b82f6' : '#0ea5e9',
  };

  return (
    <View style={[styles.comingSoonContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.comingSoonIcon}>
        <Rocket size={48} color={colors.accent} weight="fill" />
      </View>
      <Text style={[styles.comingSoonTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.comingSoonDescription, { color: colors.secondary }]}>{description}</Text>
      <View style={styles.comingSoonBadge}>
        <Clock size={16} color={colors.accent} />
        <Text style={[styles.comingSoonBadgeText, { color: colors.accent }]}>Coming Soon</Text>
      </View>
    </View>
  );
}

function SearchResults({ results, isLoading, hasError, onRetry, searchQuery }: {
  results: {
    bytes: any[];
    comments: any[];
    users: any[];
    hubs: any[];
    totalResults: number;
  };
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  searchQuery: string;
}) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    error: '#ef4444',
    accent: isDark ? '#3b82f6' : '#0ea5e9',
  };

  console.log('🔍 SearchResults render:', { 
    resultsCount: results.totalResults, 
    isLoading, 
    hasError, 
    searchQuery,
    bytesCount: results.bytes.length,
    commentsCount: results.comments.length
  });

  if (isLoading) {
    return (
      <View style={styles.searchResultsContainer}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={[styles.searchResultsText, { color: colors.secondary }]}>
          Searching...
        </Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.searchResultsContainer}>
        <Warning size={48} color={colors.error} />
        <Text style={[styles.searchResultsText, { color: colors.error }]}>
          Search failed
        </Text>
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <ArrowClockwise size={16} color={colors.error} />
          <Text style={[styles.retryText, { color: colors.error }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (results.totalResults === 0) {
    return (
      <View style={styles.searchResultsContainer}>
        <MagnifyingGlass size={48} color={colors.secondary} />
        <Text style={[styles.searchResultsText, { color: colors.secondary }]}>
          {searchQuery.length > 0 && searchQuery.length < 3 
            ? 'Type at least 3 characters to search'
            : 'No results found'
          }
        </Text>
      </View>
    );
  }

  // Group results by type
  const topics = results.bytes || [];
  const categories = results.hubs || [];
  const users = results.users || [];

  return (
    <ScrollView style={styles.searchResultsList} showsVerticalScrollIndicator={false}>
      {/* Topics */}
      {topics.length > 0 && (
        <View style={styles.searchSection}>
          <Text style={[styles.searchSectionTitle, { color: colors.text }]}>
            Topics ({topics.length})
          </Text>
          {topics.map((result) => (
            <View key={`topic-${result.id}`}>
              {renderTopicCard(
                result,
                () => router.push(`/feed/${result.id}`),
                result.category?.slug ? () => router.push(`/feed?category=${result.category.slug}`) : undefined
              )}
            </View>
          ))}
        </View>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <View style={styles.searchSection}>
          <Text style={[styles.searchSectionTitle, { color: colors.text }]}>
            Categories ({categories.length})
          </Text>
          {categories.map((result) => (
            <HubCard key={`category-${result.id}`} category={result} onPress={() => {
              router.push(`/feed?category=${result.slug}`);
            }} />
          ))}
        </View>
      )}

      {/* Users */}
      {users.length > 0 && (
        <View style={styles.searchSection}>
          <Text style={[styles.searchSectionTitle, { color: colors.text }]}>
            Users ({users.length})
          </Text>
          {users.map((result) => (
            <TouchableOpacity
              key={`user-${result.id}`}
              style={[styles.userCard, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => {
                // Navigate to user profile (you can implement this later)
                console.log('Navigate to user:', result.author?.username);
              }}
            >
              <View style={styles.userCardHeader}>
                {result.author?.avatar ? (
                  <Image source={{ uri: result.author.avatar }} style={styles.userAvatar} />
                ) : (
                  <View style={[styles.userAvatar, { backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={[styles.userAvatarFallback, { color: colors.background }]}>
                      {result.author?.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>{result.title}</Text>
                  <Text style={[styles.userUsername, { color: colors.secondary }]}>
                    @{result.author?.username}
                  </Text>
                </View>
              </View>
              {result.content && (
                <Text style={[styles.userBio, { color: colors.secondary }]} numberOfLines={2}>
                  {result.content}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default function SearchScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'hubs' | 'terets' | 'bytes'>('all');
  
  // Enhanced hooks for real data
  const { 
    search, 
    quickSearch,
    advancedSearch,
    results, 
    isLoading: isSearchLoading, 
    hasError: hasSearchError, 
    retry: retrySearch,
    searchType,
    filters
  } = useSearch();
  const { categories, isLoading: isCategoriesLoading, hasError: hasCategoriesError, retry: retryCategories } = useCategories();
  const { terets, isLoading: isTeretsLoading, hasError: hasTeretsError, retry: retryTerets } = useTerets();
  const { topics: recentTopics, isLoading: isRecentLoading, hasError: hasRecentError, retry: retryRecent } = useRecentTopics();
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: isDark ? '#3b82f6' : '#0ea5e9',
    input: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
  };

  const { isAuthenticated } = useAuth();
  
  // Enhanced search handling with debouncing
  const handleSearch = useCallback(async (query: string) => {
    console.log('🔍 Search triggered:', query);
    setSearchQuery(query);
    
    if (query.trim() && query.trim().length >= 3) {
      try {
        // Use the new API
        const results = await searchTopics(query.trim());
        console.log('🔍 Search results:', results);
        // The useSearch hook will handle the results display
        search(query);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else if (query.trim()) {
      quickSearch(query);
    }
  }, [search, quickSearch]);

  // Handle search input
  const handleSearchInput = useCallback((query: string) => {
    console.log('🔍 Search input changed:', query);
    setSearchQuery(query);
    
    if (query.trim().length >= 2) {
      // getSuggestions(query); // Removed as per edit hint
    }
  }, []);

  // Handle navigation
  const handleHubPress = useCallback((category: any) => {
    console.log('Hub pressed:', category.name);
    // Navigate to category feed
    router.push(`/feed?category=${category.slug}`);
  }, []);

  const handleTeretPress = useCallback((teret: any) => {
    console.log('Teret pressed:', teret.name);
    // Navigate to teret (subcategory) feed
    router.push(`/feed?category=${teret.slug}`);
  }, []);

  const handleBytePress = useCallback((topic: any) => {
    console.log('Byte pressed:', topic.id);
    // Navigate to topic detail
    router.push(`/feed/${topic.id}`);
  }, []);

  const renderTabButton = (tab: 'all' | 'hubs' | 'terets' | 'bytes', label: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        { 
          backgroundColor: activeTab === tab ? colors.primary : 'transparent',
          borderColor: colors.border 
        }
      ]}
      onPress={() => setActiveTab(tab)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label} tab`}
    >
      <Text style={[
        styles.tabButtonText,
        { color: activeTab === tab ? '#ffffff' : colors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Show search results if there's a query
  if (searchQuery.trim()) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader 
          title="Search Results" 
          canGoBack
          withSafeTop={false}
          tone="bg"
        />
        
        <View style={styles.searchContainer}>
          <MagnifyingGlass size={20} color={colors.secondary} weight="regular" />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search topics, categories, or users..."
            placeholderTextColor={colors.secondary}
            value={searchQuery}
            onChangeText={handleSearch}
            accessible
            accessibilityLabel="Search input"
          />
        </View>

        {/* Search Suggestions */}
        {/* Removed suggestions section as per edit hint */}

        <SearchResults 
          results={results || { bytes: [], comments: [], users: [], hubs: [], totalResults: 0 }}
          isLoading={isSearchLoading}
          hasError={hasSearchError}
          onRetry={retrySearch}
          searchQuery={searchQuery}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader 
        title="Discover" 
        canGoBack={false}
        withSafeTop={false}
        tone="bg"
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isCategoriesLoading || isTeretsLoading || isRecentLoading}
            onRefresh={() => {
              retryCategories();
              retryTerets();
              retryRecent();
            }}
            tintColor={colors.secondary}
          />
        }
      >
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.input }]}>
          <MagnifyingGlass size={20} color={colors.secondary} weight="regular" />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search topics, categories, or users..."
            placeholderTextColor={colors.secondary}
            value={searchQuery}
            onChangeText={handleSearch}
            accessible
            accessibilityLabel="Search input"
          />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {renderTabButton('all', 'All')}
          {renderTabButton('hubs', 'Hubs')}
          {renderTabButton('terets', 'Terets')}
          {renderTabButton('bytes', 'Bytes')}
        </View>

        {/* Content based on active tab */}
        {activeTab === 'all' && (
          <>
            {/* Popular Hubs */}
            <DiscoverSection 
              title="Popular Hubs" 
              isLoading={isCategoriesLoading}
              hasError={hasCategoriesError}
              onRetry={retryCategories}
            >
                          <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {categories.map((category) => (
                <HubCard key={category.id} category={category} onPress={() => handleHubPress(category)} />
              ))}
            </ScrollView>
            </DiscoverSection>

            {/* Recent Bytes */}
            <DiscoverSection 
              title="Recent Bytes" 
              isLoading={isRecentLoading}
              hasError={hasRecentError}
              onRetry={retryRecent}
            >
              {recentTopics.map((topic) => (
                <View key={topic.id}>
                  {renderTopicCard(
                    topic,
                    () => handleBytePress(topic),
                    topic.category?.slug ? () => router.push(`/feed?category=${topic.category.slug}`) : undefined
                  )}
                </View>
              ))}
            </DiscoverSection>
          </>
        )}

        {activeTab === 'hubs' && (
          <ComingSoonSection 
            title="Hub Navigation"
            description="Browse and explore different hubs with their terets. Navigate through the TechRebels community structure."
          />
        )}

        {activeTab === 'terets' && (
          <ComingSoonSection 
            title="Teret Discovery"
            description="Discover trending terets and explore subcategories within each hub. Find your niche communities."
          />
        )}

        {activeTab === 'bytes' && (
          <ComingSoonSection 
            title="Latest Bytes"
            description="Browse the most recent bytes from across all terets. Stay updated with the latest discussions."
          />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  horizontalScrollContent: {
    paddingRight: 16,
  },
  hubCard: {
    marginRight: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  hubHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  hubIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hubIconText: {
    fontSize: 20,
    fontWeight: '600',
  },
  hubInfo: {
    flex: 1,
    minWidth: 0, // Allows text to shrink
  },
  hubName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    flexShrink: 1, // Allows text to shrink if needed
  },
  hubDescription: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1, // Allows text to shrink if needed
  },
  popularBadge: {
    marginLeft: 8,
  },
  hubStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hubStat: {
    fontSize: 12,
    fontWeight: '500',
  },
  teretCard: {
    width: 180,
    marginRight: 12,
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
    marginHorizontal: 16,
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
  searchResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  searchResultsText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  searchResultsList: {
    paddingHorizontal: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  retryText: {
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: '80%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dropdownLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  dropdownLoadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  dropdownError: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  dropdownErrorText: {
    marginTop: 10,
    fontSize: 16,
  },
  dropdownEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 16,
  },
  dropdownList: {
    maxHeight: 300, // Limit height for dropdown
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  comingSoonContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  comingSoonIcon: {
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  comingSoonDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
  },
  comingSoonBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchSection: {
    marginBottom: 24,
  },
  searchSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  userCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 12,
    fontWeight: '500',
  },
  userBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  userAvatarFallback: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 