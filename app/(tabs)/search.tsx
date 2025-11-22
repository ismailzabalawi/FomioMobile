import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  MagnifyingGlass, 
  Fire, 
  Hash,
  Warning,
  ArrowClockwise,
  Rocket
} from 'phosphor-react-native';
import { useTheme } from '@/components/theme';
import { useScreenHeader } from '@/shared/hooks/useScreenHeader';
import { ByteCard } from '@/components/bytes/ByteCard';
import { searchResultToByte } from '@/shared/adapters/searchResultToByte';
import { useSearch } from '../../shared/useSearch';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

// formatDate removed - now handled by formatTimeAgo in ByteCard component

// Helper to render ByteCard from topic data
function renderTopicCard(topic: any, onPress: () => void, onCategoryPress?: () => void) {
  const byte = searchResultToByte(topic);
  return (
    <ByteCard
      byte={byte}
      onPress={onPress}
    />
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

function SearchTypeChips({
  activeType,
  onChange,
}: {
  activeType: 'all' | 'bytes' | 'hubs' | 'users';
  onChange: (type: 'all' | 'bytes' | 'hubs' | 'users') => void;
}) {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    activeBg: isDark ? '#3b82f6' : '#0ea5e9',
    inactiveBg: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#f3f4f6'),
  };

  const types = [
    { key: 'all' as const, label: 'All' },
    { key: 'bytes' as const, label: 'Bytes' },
    { key: 'hubs' as const, label: 'Hubs' },
    { key: 'users' as const, label: 'Users' },
  ];

  return (
    <View style={styles.chipsContainer}>
      {types.map((t) => (
        <TouchableOpacity
          key={t.key}
          onPress={() => onChange(t.key)}
          style={[
            styles.chip,
            {
              backgroundColor: activeType === t.key ? colors.activeBg : colors.inactiveBg,
              borderColor: activeType === t.key ? colors.activeBg : colors.border,
            }
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Filter by ${t.label}`}
        >
          <Text style={[
            styles.chipText,
            { color: activeType === t.key ? '#ffffff' : colors.text }
          ]}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SearchResults({ results, isLoading, hasError, onRetry, searchQuery, errorMessage }: {
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
  errorMessage?: string;
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

  // Normalize results to ensure all properties are arrays
  const normalizedResults = {
    bytes: results?.bytes || [],
    comments: results?.comments || [],
    users: results?.users || [],
    hubs: results?.hubs || [],
    totalResults: results?.totalResults || 0
  };

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
        <Text style={[styles.searchResultsText, { color: colors.error, fontWeight: '600' }]}>
          {errorMessage || 'Search failed'}
        </Text>
        {errorMessage && errorMessage.length > 60 && (
          <Text style={[styles.searchResultsText, { color: colors.secondary, fontSize: 12, marginTop: 8, fontWeight: '400' }]}>
            {errorMessage}
          </Text>
        )}
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <ArrowClockwise size={16} color={colors.error} />
          <Text style={[styles.retryText, { color: colors.error }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (normalizedResults.totalResults === 0) {
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
  const topics = normalizedResults.bytes;
  const categories = normalizedResults.hubs;
  const users = normalizedResults.users;

  return (
    <ScrollView style={styles.searchResultsList} showsVerticalScrollIndicator={false}>
      {/* Bytes */}
      {topics.length > 0 && (
        <View style={styles.searchSection}>
          <Text style={[styles.searchSectionTitle, { color: colors.text }]}>
            Bytes ({topics.length})
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

      {/* Hubs */}
      {categories.length > 0 && (
        <View style={styles.searchSection}>
          <Text style={[styles.searchSectionTitle, { color: colors.text }]}>
            Hubs ({categories.length})
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

// Placeholder cards for empty state
function EmptyStateCards() {
  const { isDark, isAmoled } = useTheme();
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#27272a' : '#f9fafb'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    accent: isDark ? '#3b82f6' : '#0ea5e9',
  };

  const cards = [
    {
      icon: Rocket,
      title: "Search is just waking up 🚀",
      text: "Start typing to search for bytes, hubs, and users. As Fomio grows, you'll find more content here.",
    },
    {
      icon: Fire,
      title: "Help us start the fire",
      text: "Create bytes, join hubs, and engage with the community. This page will come alive with your contributions.",
    },
    {
      icon: Hash,
      title: "Explore what's here",
      text: "Use the search bar above to find topics, categories, or people. Try searching for keywords related to your interests.",
    },
  ];

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Animated.View
            key={index}
            entering={FadeInDown.delay(index * 200).duration(400).springify()}
            style={[styles.placeholderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <IconComponent size={32} color={colors.accent} weight="duotone" />
            <Text style={[styles.placeholderTitle, { color: colors.text }]}>
              {card.title}
            </Text>
            <Text style={[styles.placeholderText, { color: colors.secondary }]}>
              {card.text}
            </Text>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

export default function SearchScreen(): React.ReactElement {
  const { isDark, isAmoled } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    search, 
    advancedSearch,
    results, 
    isLoading: isSearchLoading, 
    hasError: hasSearchError, 
    error: searchError,
    retry: retrySearch,
    searchType,
  } = useSearch();

  // Configure header
  useScreenHeader({
    title: searchQuery.trim() ? "Search Results" : "Search",
    canGoBack: searchQuery.trim() ? true : false,
    withSafeTop: false,
    tone: "bg",
  }, [searchQuery]);
  
  const colors = {
    background: isAmoled ? '#000000' : (isDark ? '#18181b' : '#ffffff'),
    card: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
    text: isDark ? '#f9fafb' : '#111827',
    secondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: isDark ? '#3b82f6' : '#0ea5e9',
    input: isAmoled ? '#000000' : (isDark ? '#1f2937' : '#ffffff'),
  };

  // Enhanced search handling
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const trimmed = query.trim();
    if (trimmed.length >= 3) {
      search(trimmed);
    }
  }, [search]);

  // Show search results if there's a query
  if (searchQuery.trim()) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
            blurOnSubmit={false}
            returnKeyType="search"
            autoFocus={true}
            onSubmitEditing={() => {
              const trimmed = searchQuery.trim();
              if (trimmed.length >= 3) {
                search(trimmed);
              }
            }}
          />
        </View>

        <SearchTypeChips
          activeType={searchType as 'all' | 'bytes' | 'hubs' | 'users'}
          onChange={(type) => {
            if (searchQuery.trim().length >= 3) {
              // Map Fomio types to Discourse API types
              const discourseType = 
                type === 'bytes' ? 'topic' : 
                type === 'hubs' ? 'category' : 
                type === 'users' ? 'user' : 
                'all';
              advancedSearch(searchQuery.trim(), { type: discourseType } as any);
            }
          }}
        />

        <SearchResults 
          results={results ? {
            bytes: results.bytes || [],
            comments: results.comments || [],
            users: results.users || [],
            hubs: results.hubs || [],
            totalResults: results.totalResults || 0
          } : { bytes: [], comments: [], users: [], hubs: [], totalResults: 0 }}
          isLoading={isSearchLoading}
          hasError={hasSearchError}
          onRetry={retrySearch}
          searchQuery={searchQuery}
          errorMessage={searchError || undefined}
        />
      </SafeAreaView>
    );
  }

  // Empty state with placeholder cards
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
          blurOnSubmit={false}
          returnKeyType="search"
          onSubmitEditing={() => {
            const trimmed = searchQuery.trim();
            if (trimmed.length >= 3) {
              search(trimmed);
            }
          }}
        />
      </View>

      <EmptyStateCards />
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
    paddingHorizontal: 16,
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
  placeholderCard: {
    marginBottom: 16,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  hubCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
    minWidth: 0,
  },
  hubName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    flexShrink: 1,
  },
  hubDescription: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
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
    marginTop: 16,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
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
