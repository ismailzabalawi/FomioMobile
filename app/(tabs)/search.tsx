import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Image,
  ListRenderItem,
  ScrollView
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
import { goToProfile } from '@/shared/navigation/profile';
import Animated, { FadeInDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import { getThemeColors } from '@/shared/theme-constants';
import { useFluidNav } from '@/shared/navigation/fluidNavContext';
import * as Haptics from 'expo-haptics';
import { SearchInput } from '@/components/search/SearchInput';
import { FluidChip } from '@/shared/ui/FluidChip';
import { FluidSection } from '@/shared/ui/FluidSection';
import { getTokens } from '@/shared/design/tokens';

// UI Spec: SearchScreen
// - Uses semantic theme tokens from getThemeColors
// - Debounced search (500ms) for better UX
// - Server-side type filtering via backend API
// - FlatList for optimized rendering
// - AMOLED dark mode support with true black baseline

type SearchType = 'all' | 'bytes' | 'hubs' | 'users';

// Helper to map frontend SearchType to backend type
function mapSearchTypeToBackendType(frontendType: SearchType): 'topic' | 'category' | 'user' | 'all' {
  switch (frontendType) {
    case 'bytes':
      return 'topic';
    case 'hubs':
      return 'category';
    case 'users':
      return 'user';
    case 'all':
    default:
      return 'all';
  }
}

interface SearchResultItem {
  id: string;
  type: 'byte' | 'hub' | 'user';
  data: any;
}

// Helper to render ByteCard from topic data
function renderTopicCard(topic: any, onPressByteId: (byteId: number | string) => void) {
  const byte = searchResultToByte(topic);
  return (
    <ByteCard
      byte={byte}
      onPressByteId={onPressByteId}
    />
  );
}

function HubCard({ category, onPress }: { category: any; onPress: () => void }) {
  const { themeMode, isAmoled, isDark } = useTheme();
  const colors = getThemeColors(themeMode, isAmoled);
  const tokens = useMemo(() => getTokens(isDark ? 'dark' : 'light'), [isDark]);
  const handleBytePress = useCallback((byteId: number | string) => {
    router.push(`/feed/${byteId}` as any);
  }, []);

  return (
    <TouchableOpacity
      className="mb-3"
      style={[
        {
          padding: 16,
          backgroundColor: tokens.colors.surfaceFrost,
          borderColor: tokens.colors.border,
          borderWidth: 1,
          borderRadius: tokens.radii.lg,
        },
        tokens.shadows.soft,
      ]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${category.name} hub`}
    >
      <View className="flex-row items-start mb-3">
        <View 
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: (category.color || colors.accent) + '20' }}
        >
          <Text 
            className="text-xl font-semibold"
            style={{ color: category.color || colors.accent }}
          >
            {category.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center">
            <Text 
              className="text-base font-bold mb-1 flex-shrink"
              style={{ color: colors.foreground }}
              numberOfLines={1}
            >
              {category.name}
            </Text>
            {category.topic_count > 5 && (
              <View className="ml-2">
                <Fire size={12} color={colors.accent} weight="fill" />
              </View>
            )}
          </View>
          <Text 
            className="text-sm flex-shrink"
            style={{ color: colors.secondary }}
            numberOfLines={2}
          >
            {category.description || 'No description available'}
          </Text>
        </View>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-xs font-medium" style={{ color: colors.secondary }}>
          {category.topic_count} topics
        </Text>
        <Text className="text-xs font-medium" style={{ color: colors.secondary }}>
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
  activeType: SearchType;
  onChange: (type: SearchType) => void;
}) {
  const { isDark } = useTheme();

  const types: { key: SearchType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'bytes', label: 'Bytes' },
    { key: 'hubs', label: 'Hubs' },
    { key: 'users', label: 'Users' },
  ];

  return (
    <View className="flex-row px-4 mb-3 gap-2">
      {types.map((t) => (
        <FluidChip
          key={t.key}
          label={t.label}
          selected={activeType === t.key}
          onPress={() => onChange(t.key)}
          mode={isDark ? 'dark' : 'light'}
        />
      ))}
    </View>
  );
}

function SearchResults({ 
  results, 
  isLoading, 
  hasError, 
  onRetry, 
  searchQuery,
  errorMessage,
  scrollHandler,
  onRef
}: {
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
  scrollHandler?: any;
  onRef?: (ref: Animated.FlatList<any> | null) => void;
}) {
  const { themeMode, isAmoled, isDark } = useTheme();
  const colors = getThemeColors(themeMode, isAmoled);
  const tokens = useMemo(() => getTokens(isDark ? 'dark' : 'light'), [isDark]);

  // Use results directly from backend (server-side filtering)
  const normalizedResults = useMemo(() => ({
    bytes: results?.bytes || [],
    comments: results?.comments || [],
    users: results?.users || [],
    hubs: results?.hubs || [],
    totalResults: results?.totalResults || 0
  }), [results]);

  // Build flat list data
  const listData = useMemo<SearchResultItem[]>(() => {
    const items: SearchResultItem[] = [];
    
    if (normalizedResults.bytes.length > 0) {
      normalizedResults.bytes.forEach((byte) => {
        items.push({ id: `byte-${byte.id}`, type: 'byte', data: byte });
      });
    }
    
    if (normalizedResults.hubs.length > 0) {
      normalizedResults.hubs.forEach((hub) => {
        items.push({ id: `hub-${hub.id}`, type: 'hub', data: hub });
      });
    }
    
    if (normalizedResults.users.length > 0) {
      normalizedResults.users.forEach((user) => {
        items.push({ id: `user-${user.id}`, type: 'user', data: user });
      });
    }
    
    return items;
  }, [normalizedResults]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center py-12 px-4">
        <Animated.View entering={FadeInDown.duration(300).springify()}>
          <FluidSection mode={isDark ? 'dark' : 'light'} style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 32 }}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text className="text-base mt-4" style={{ color: colors.secondary }}>
              Searching...
            </Text>
          </FluidSection>
        </Animated.View>
      </View>
    );
  }

  if (hasError) {
    return (
      <View className="flex-1 justify-center items-center px-4 py-12">
        <Animated.View entering={FadeInDown.duration(300).springify()}>
          <FluidSection mode={isDark ? 'dark' : 'light'} style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 32 }}>
            <Warning size={48} color={colors.destructive} />
            <Text 
              className="text-base font-semibold mt-4 text-center"
              style={{ color: colors.destructive }}
            >
              {errorMessage || 'Search failed'}
            </Text>
            {errorMessage && errorMessage.length > 60 && (
              <Text 
                className="text-xs mt-2 text-center"
                style={{ color: colors.secondary }}
              >
                {errorMessage}
              </Text>
            )}
            <TouchableOpacity 
              onPress={onRetry} 
              className="flex-row items-center gap-2 px-4 py-2 mt-4"
              style={[
                {
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderRadius: tokens.radii.md,
                },
              ]}
            >
              <ArrowClockwise size={16} color={colors.destructive} />
              <Text className="text-sm font-semibold" style={{ color: colors.destructive }}>
                Retry
              </Text>
            </TouchableOpacity>
          </FluidSection>
        </Animated.View>
      </View>
    );
  }

  if (normalizedResults.totalResults === 0) {
    return (
      <View className="flex-1 justify-center items-center px-4 py-12">
        <Animated.View entering={FadeInDown.duration(300).springify()}>
          <FluidSection mode={isDark ? 'dark' : 'light'} style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 32 }}>
            <MagnifyingGlass size={48} color={colors.secondary} />
            <Text className="text-base mt-4 text-center" style={{ color: colors.secondary }}>
              {searchQuery.length > 0 && searchQuery.length < 3 
                ? 'Type at least 3 characters to search'
                : 'No results found'
              }
            </Text>
          </FluidSection>
        </Animated.View>
      </View>
    );
  }

  const renderItem: ListRenderItem<SearchResultItem> = ({ item, index }) => {
    // Stagger delay based on index (max 8 items staggered)
    const staggerDelay = Math.min(index, 8) * tokens.motion.stagger;

    if (item.type === 'byte') {
      return (
        <Animated.View 
          className="mb-3"
          entering={FadeInDown.delay(staggerDelay).duration(350).springify()}
        >
          {renderTopicCard(item.data, handleBytePress)}
        </Animated.View>
      );
    }

    if (item.type === 'hub') {
      return (
        <Animated.View entering={FadeInDown.delay(staggerDelay).duration(350).springify()}>
          <HubCard 
            category={item.data} 
            onPress={() => router.push(`/feed?category=${item.data.slug}`)} 
          />
        </Animated.View>
      );
    }

    if (item.type === 'user') {
      const username = item.data.author?.username || item.data.username;
      return (
        <Animated.View entering={FadeInDown.delay(staggerDelay).duration(350).springify()}>
          <TouchableOpacity
            className="mb-3"
            style={[
              {
                padding: 16,
                backgroundColor: tokens.colors.surfaceFrost,
                borderColor: tokens.colors.border,
                borderWidth: 1,
                borderRadius: tokens.radii.lg,
              },
              tokens.shadows.soft,
            ]}
            onPress={() => {
              if (username) {
                goToProfile(username);
              } else {
                console.warn('User result missing username:', item.data);
              }
            }}
          >
            <View className="flex-row items-center mb-2">
              {item.data.author?.avatar ? (
                <Image 
                  source={{ uri: item.data.author.avatar }} 
                  className="w-8 h-8 rounded-full mr-3"
                />
              ) : (
                <View 
                  className="w-8 h-8 rounded-full mr-3 justify-center items-center"
                  style={{ backgroundColor: colors.secondary }}
                >
                  <Text 
                    className="text-xs font-semibold"
                    style={{ color: tokens.colors.surfaceFrost }}
                  >
                    {item.data.author?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View className="flex-1">
                <Text 
                  className="text-base font-bold mb-0.5"
                  style={{ color: colors.foreground }}
                >
                  {item.data.title}
                </Text>
                <Text 
                  className="text-xs font-medium"
                  style={{ color: colors.secondary }}
                >
                  @{item.data.author?.username}
                </Text>
              </View>
            </View>
            {item.data.content && (
              <Text 
                className="text-sm"
                style={{ color: colors.secondary }}
                numberOfLines={2}
              >
                {item.data.content}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      );
    }

    return null;
  };

  return (
    <Animated.FlatList
      ref={onRef}
      data={listData}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      style={{ flex: 1 }}
      contentContainerStyle={{ 
        paddingHorizontal: 16, 
        paddingBottom: 32,
        flexGrow: listData.length === 0 ? 1 : 0
      }}
      showsVerticalScrollIndicator={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      scrollEnabled={true}
      ListHeaderComponent={
        normalizedResults.totalResults > 0 ? (
          <Animated.View 
            entering={FadeInDown.duration(300).springify()}
            className="mb-4"
          >
            <FluidSection mode={isDark ? 'dark' : 'light'} style={{ paddingVertical: 12 }}>
              <Text 
                className="text-lg font-bold"
                style={{ color: colors.foreground }}
              >
                {normalizedResults.totalResults} result{normalizedResults.totalResults !== 1 ? 's' : ''}
              </Text>
            </FluidSection>
          </Animated.View>
        ) : null
      }
    />
  );
}

// Placeholder cards for empty state with FluidSection styling
function EmptyStateCards() {
  const { themeMode, isAmoled, isDark } = useTheme();
  const colors = getThemeColors(themeMode, isAmoled);
  const tokens = useMemo(() => getTokens(isDark ? 'dark' : 'light'), [isDark]);

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
    <Animated.ScrollView 
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Animated.View
            key={index}
            entering={FadeInDown.delay(index * tokens.motion.stagger).duration(400).springify()}
            className="mb-4"
          >
            <FluidSection mode={isDark ? 'dark' : 'light'} style={{ alignItems: 'center' }}>
              <IconComponent size={32} color={colors.accent} weight="duotone" />
              <Text 
                className="text-lg font-bold mt-4 mb-2 text-center"
                style={{ color: colors.foreground }}
              >
                {card.title}
              </Text>
              <Text 
                className="text-sm text-center leading-5"
                style={{ color: colors.secondary }}
              >
                {card.text}
              </Text>
            </FluidSection>
          </Animated.View>
        );
      })}
    </Animated.ScrollView>
  );
}

export default function SearchScreen(): React.ReactElement {
  const { themeMode, isAmoled } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<SearchType>('all');
  const { scrollY, setUpHandler } = useFluidNav();
  const flatListRef = useRef<Animated.FlatList<any>>(null);
  
  const { 
    search, 
    searchWithDebounce,
    results, 
    isLoading: isSearchLoading, 
    hasError: hasSearchError, 
    error: searchError,
    retry: retrySearch,
  } = useSearch();

  const colors = useMemo(() => getThemeColors(themeMode, isAmoled), [themeMode, isAmoled]);

  // Configure header
  useScreenHeader({
    title: searchQuery.trim() ? "Search Results" : "Search",
    canGoBack: searchQuery.trim() ? true : false,
    withSafeTop: false,
    tone: "bg",
    compact: true,
    titleFontSize: 20,
  }, [searchQuery, themeMode]);

  // Debounced search handling with type filter
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const trimmed = query.trim();
    
    if (trimmed.length >= 3) {
      // Use debounced search with type filter
      const backendType = mapSearchTypeToBackendType(activeType);
      searchWithDebounce(trimmed, { type: backendType }, 500);
    } else if (trimmed.length === 0) {
      // Clear results when query is empty
      setActiveType('all');
    }
  }, [searchWithDebounce, activeType]);

  // Handle search type change - trigger new search with type filter
  const handleTypeChange = useCallback((type: SearchType) => {
    setActiveType(type);
    if (searchQuery.trim().length >= 3) {
      const backendType = mapSearchTypeToBackendType(type);
      search(searchQuery.trim(), { type: backendType });
    }
  }, [searchQuery, search]);

  // Fluid nav: Scroll-to-top handler
  const handleScrollToTop = useCallback(() => {
    console.log('[Search] Scroll-to-top handler called');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Share scroll position with fluid nav and keep scroll-to-top handler accessible
  useEffect(() => {
    console.log('[Search] Registering scroll-to-top handler');
    setUpHandler(() => handleScrollToTop);
    return () => {
      console.log('[Search] Clearing scroll-to-top handler');
      setUpHandler(null);
    };
  }, [handleScrollToTop, setUpHandler]);

  // Animated scroll handler for fluid nav
  const animatedScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Reset shared scroll on mount so tab bar starts composed on this screen
  useEffect(() => {
    scrollY.value = 0;
  }, [scrollY]);

  // Handle search submission
  const handleSearchSubmit = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length >= 3) {
      const backendType = mapSearchTypeToBackendType(activeType);
      search(trimmed, { type: backendType });
    }
  }, [searchQuery, activeType, search]);

  // Show search results if there's a query
  if (searchQuery.trim()) {
    return (
      <SafeAreaView 
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        <SearchInput
          value={searchQuery}
          onChangeText={handleSearch}
          onSubmitEditing={handleSearchSubmit}
        />

        <SearchTypeChips
          activeType={activeType}
          onChange={handleTypeChange}
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
          scrollHandler={animatedScrollHandler}
          onRef={(ref) => { flatListRef.current = ref; }}
        />
      </SafeAreaView>
    );
  }

  // Empty state with placeholder cards
  return (
    <SafeAreaView 
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <SearchInput
        value={searchQuery}
        onChangeText={handleSearch}
        onSubmitEditing={handleSearchSubmit}
      />

      <EmptyStateCards />
    </SafeAreaView>
  );
}
